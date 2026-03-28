import {
  CancellationToken, CompletionContext, CompletionItem, CompletionItemKind,
  CompletionItemProvider, CompletionList, Position, ProviderResult,
  Range, TextDocument,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import {
  maxCompletions, mxsLanguageCompletions,
} from '@backend/schemas/mxsCompletions-base.js';
import { mxClassMembers } from '@backend/schemas/mxsCompletions-clases.js';
import {
  mxInterfaceMembers,
} from '@backend/schemas/mxsCompletions-interfaces.js';
import { mxStructsMembers } from '@backend/schemas/mxsCompletions-structs.js';
import {
  symbolDescriptionFromEnum, translateCompletionKind,
  translateCompletionKindFromHint,
} from './SymbolTranslator.js';
import { IMaxScriptSettings } from './types.js';

export class mxsCompletionProvider implements CompletionItemProvider
{
    private wordPattern: RegExp = /\b(\p{L}[\p{L}0-9]*)\b(?:[ \t\r\n]*[.]?)$/u;

    public constructor(private backend: mxsBackend, private options: IMaxScriptSettings) { }

    private nowMs(): number {
        return typeof performance !== 'undefined' ? performance.now() : Date.now();
    }

    /**
     * Returns API members for a named object if it is a known API class/struct/interface.
     * Returns undefined when the name is not in the API schema.
     */
    private apiMembersForObject(objectName: string): CompletionItem[] | undefined {
        const parent = mxsLanguageCompletions.has(objectName);
        if (!parent) {
            return undefined;
        }
        switch (parent.kind) {
            case CompletionItemKind.Class:
                return mxClassMembers?.[parent.label as string];
            case CompletionItemKind.Struct:
                return mxStructsMembers?.[parent.label as string];
            case CompletionItemKind.Interface:
                return mxInterfaceMembers?.[parent.label as string];
            default:
                return undefined;
        }
    }

    private completionsFromAPI(document: TextDocument, position: Position, context: CompletionContext): CompletionItem[]
    {
        let wordAtPos: string = '';
        const wordRange = document.getWordRangeAtPosition(position);

        if (wordRange) {
            wordAtPos = document.getText(wordRange);
        } else {
            const txtUntilPos = document.getText(new Range(0, 0, position.line, position.character));
            const wordSearch = this.wordPattern.exec(txtUntilPos) || [];
            if (wordSearch.length > 0) {
                wordAtPos = wordSearch[1];
            }
        }

        if (context.triggerKind === 1 && context.triggerCharacter === '.') {
            const parent = mxsLanguageCompletions.has(wordAtPos);
            if (parent) {
                switch (parent.kind) {
                    case CompletionItemKind.Class:
                        return mxClassMembers?.[parent.label as string];
                    case CompletionItemKind.Struct:
                        return mxStructsMembers?.[parent.label as string];
                    case CompletionItemKind.Interface:
                        return mxInterfaceMembers?.[parent.label as string];
                    default:
                        return [];
                }
            } else {
                return [];
            }
        } else {
            const APIcandidates = mxsLanguageCompletions.contains(wordAtPos);
            return APIcandidates.length > 0 ? APIcandidates : maxCompletions;
        }
        // return all the list
        // return maxCompletions;
    }

    provideCompletionItems(
        document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext
    ): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>>
    {
        return new Promise((resolve, reject) =>
        {
            if (token.isCancellationRequested) {
                resolve(undefined);
                return;
            }

            const cancelSubscription = token.onCancellationRequested(() => {
                cancelSubscription.dispose();
                resolve(undefined);
            });

            const sourceContext = this.backend.borrowContext(document.uri.toString());
            const useAst = this.options.providers.codeCompletion;
            const tracePerformance = this.options.debug?.tracePerformance || false;
            
            const providerStart = tracePerformance ? this.nowMs() : 0;
            const logPerformance = (route: 'AST' | 'API' | 'None', items: number, mode?: 'member' | 'non-member', reason?: string): void => {
                if (!tracePerformance) {
                    return;
                }
                const modePart = mode ? ` mode=${mode}` : '';
                const reasonPart = reason ? ` reason=${reason}` : '';
                console.log(`[language-maxscript][Performance] completionProvider uri=${document.uri.toString()} duration=${(this.nowMs() - providerStart).toFixed(2)}ms route=${route} items=${items}${modePart}${reasonPart}`);
            };

            // Detect member-access context (identifier.partial) via source text,
            // regardless of trigger kind. When in this context, scope variables must
            // NEVER be offered — only members from the resolved object.
            const lineBeforeCursor = document.getText(
                new Range(position.line, 0, position.line, position.character));
            const memberMatch = lineBeforeCursor.match(/(\w+)\.(\w*)$/);

            if (memberMatch) {
                const objectName = memberMatch[1];

                // Path A: known API object — return its type members only.
                if (this.options.providers.dataBaseCompletion) {
                    const apiMembers = this.apiMembersForObject(objectName);
                    if (apiMembers && apiMembers.length > 0) {
                        cancelSubscription.dispose();
                        logPerformance('API', apiMembers.length, 'member');
                        resolve(new CompletionList(apiMembers, false));
                        return;
                    }
                }

                // Path B: user-defined struct/definition resolved by AST.
                if (useAst) {
                    const suggestions = sourceContext.getAstMemberCompletionSuggestions(
                        position.line + 1,
                        position.character,
                        document.getText(),
                    );
                    if (suggestions.length > 0) {
                        const items: CompletionItem[] = [];
                        for (const suggestion of suggestions) {
                            const item = new CompletionItem(
                                suggestion.label,
                                translateCompletionKindFromHint(suggestion.kindHint),
                            );
                            item.sortText = suggestion.sortText;
                            items.push(item);
                        }
                        if (items.length > 0) {
                            cancelSubscription.dispose();
                            logPerformance('AST', items.length, 'member');
                            resolve(new CompletionList(items, false));
                            return;
                        }
                    }
                }

                // Object not resolved — return empty rather than polluting with scope vars.
                cancelSubscription.dispose();
                logPerformance('None', 0, 'member', 'no-object-resolution');
                resolve(new CompletionList([], false));
                return;
            }

            // FUTURE PLAN (control-flow-aware completions):
            // Current visibility is lexical (scope chain + declaration position).
            // Implement CFG-based reachability to avoid suggesting symbols that are
            // out of execution flow at the cursor (branch/path aware visibility).
            // Proposed steps:
            // 1) Build basic blocks per function/definition block.
            // 2) Compute reachable predecessor blocks for cursor location.
            // 3) Filter declarations by both scope and reaching definitions.
            // 4) Keep lexical fallback when CFG cannot be built.

            // Non-member context: AST scope declarations + antlr-c3 + API prefix matching.
            const completionList: CompletionItem[] = [];
            sourceContext.getNonMemberCompletionSuggestions(
                document.uri.toString(),
                position.line + 1,
                position.character,
                useAst,
            ).then((suggestions) =>
                {
                    if (token.isCancellationRequested) {
                        cancelSubscription.dispose();
                        resolve(undefined);
                        return;
                    }

                    for (const suggestion of suggestions) {
                        const item = new CompletionItem(
                            suggestion.label,
                            suggestion.symbolKind !== undefined
                                ? translateCompletionKind(suggestion.symbolKind)
                                : translateCompletionKindFromHint(suggestion.kindHint),
                        );
                        item.sortText = suggestion.sortText;
                        if (suggestion.symbolKind !== undefined) {
                            item.detail = suggestion.detail || symbolDescriptionFromEnum(suggestion.symbolKind);
                        }
                        completionList.push(item);
                    }
                    if (this.options.providers.dataBaseCompletion) {
                        completionList.push(...this.completionsFromAPI(document, position, context));
                    }
                    cancelSubscription.dispose();
                    logPerformance(useAst ? 'AST' : 'None', completionList.length, 'non-member');
                    resolve(new CompletionList(completionList, false));
                }).catch((reason) =>
                {
                    cancelSubscription.dispose();
                    logPerformance('None', 0, undefined, 'error');
                    reject(reason);
                });
        });
    }
    /*
    // TODO: Implement
    resolveCompletionItem?(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem>
    {
        throw new Error("Method not implemented.");
    }
    // */
}