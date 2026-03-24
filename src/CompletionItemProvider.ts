import {
  CancellationToken, CompletionContext, CompletionItem, CompletionItemKind,
  CompletionItemProvider, CompletionList, Position, ProviderResult,
  Range, TextDocument, workspace,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import { ASTQuery } from './backend/ast/ASTQuery.js';
import {
    DefinitionBlock, FunctionArgument, FunctionDefinition, FunctionParameter,
    ParameterDefinition, RcMenuItem, RolloutControl, StructDefinition, StructMemberField,
    VariableDeclaration,
} from './backend/ast/ASTNodes.js';
import { Node } from '@strumenta/tylasu';
import {
  maxCompletions, mxsLanguageCompletions,
} from './backend/schemas/mxsCompletions-base.js';
import { mxClassMembers } from './backend/schemas/mxsCompletions-clases.js';
import {
  mxInterfaceMembers,
} from './backend/schemas/mxsCompletions-interfaces.js';
import { mxStructsMembers } from './backend/schemas/mxsCompletions-structs.js';
import {
  symbolDescriptionFromEnum, translateCompletionKind,
} from './Symbol.js';
import { IMaxScriptSettings } from './types.js';

/** Maps an AST semantic node to the most appropriate CompletionItemKind. */
function completionKindForSemanticNode(node: Node): CompletionItemKind {
    if (node instanceof FunctionDefinition) {
        return CompletionItemKind.Function;
    }
    if (node instanceof StructDefinition) {
        return CompletionItemKind.Class;
    }
    if (node instanceof DefinitionBlock) {
        return CompletionItemKind.Module;
    }
    if (node instanceof FunctionArgument || node instanceof FunctionParameter || node instanceof ParameterDefinition) {
        return CompletionItemKind.TypeParameter;
    }
    if (node instanceof StructMemberField) {
        return CompletionItemKind.Field;
    }
    if (node instanceof RolloutControl || node instanceof RcMenuItem) {
        return CompletionItemKind.Event;
    }
    if (node instanceof VariableDeclaration) {
        return node.scope === 'global' || node.scope === 'persistent'
            ? CompletionItemKind.Variable
            : CompletionItemKind.Variable;
    }
    return CompletionItemKind.Variable;
}

export class mxsCompletionProvider implements CompletionItemProvider
{
    private wordPattern: RegExp = /\b(\p{L}[\p{L}0-9]*)\b(?:[ \t\r\n]*[.]?)$/u;

    public constructor(private backend: mxsBackend, private options: IMaxScriptSettings) { }

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
        document: TextDocument, position: Position, _token: CancellationToken, context: CompletionContext
    ): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>>
    {
        return new Promise((resolve, reject) =>
        {
            const sourceContext = this.backend.getContext(document.uri.toString());
            const config = workspace.getConfiguration('maxScript');
            const useAst = config.get<boolean>('providers.ast.completionProvider', true);

            // Strategy 1: API dot completion.
            // If the object left of the dot is a known API class/struct/interface,
            // return ONLY those members — no local vars, no AST symbols.
            if (this.options.completions.dataBaseCompletion &&
                context.triggerKind === 1 && context.triggerCharacter === '.') {
                const apiMembers = this.completionsFromAPI(document, position, context);
                if (apiMembers.length > 0) {
                    resolve(new CompletionList(apiMembers, false));
                    return;
                }
            }

            // Strategy 2: AST member completion.
            // If the cursor is after `identifier.` and that identifier resolves to a
            // user-defined struct/definition in the AST, return ONLY its members.
            if (useAst) {
                const memberResult = sourceContext?.astMemberCompletionsAtPosition(
                    position.line + 1,
                    position.character,
                    document.getText(),
                );
                if (memberResult && memberResult.members.length > 0) {
                    const items: CompletionItem[] = [];
                    for (const member of memberResult.members) {
                        if (!member.name) {
                            continue;
                        }
                        const semanticNode = ASTQuery.findSemanticNodeForDeclaration(memberResult.ast, member);
                        const kind = completionKindForSemanticNode(semanticNode);
                        const item = new CompletionItem(member.name, kind);
                        item.sortText = `0_${member.name}`;
                        items.push(item);
                    }
                    if (items.length > 0) {
                        resolve(new CompletionList(items, false));
                        return;
                    }
                }
            }

            // Strategy 3: Fallback — AST scope declarations + antlr-c3 + API prefix matching.
            const completionList: CompletionItem[] = [];
            const seenNames = new Set<string>();

            if (useAst) {
                const astResult = sourceContext?.astCompletionsAtPosition(
                    position.line + 1,
                    position.character,
                );
                if (astResult) {
                    for (const decl of astResult.declarations) {
                        if (!decl.name) {
                            continue;
                        }
                        seenNames.add(decl.name.toLowerCase());
                        const semanticNode = ASTQuery.findSemanticNodeForDeclaration(astResult.ast, decl);
                        const kind = completionKindForSemanticNode(semanticNode);
                        const item = new CompletionItem(decl.name, kind);
                        item.sortText = `0_${decl.name}`;
                        completionList.push(item);
                    }
                }
            }

            sourceContext?.getCodeCompletionCandidates(position.line + 1, position.character)
                .then((candidates) =>
                {
                    for (const info of candidates) {
                        if (!seenNames.has(info.name.toLowerCase())) {
                            const item = new CompletionItem(info.name, translateCompletionKind(info.kind));
                            item.detail = info.description || symbolDescriptionFromEnum(info.kind);
                            completionList.push(item);
                        }
                    }
                    if (this.options.completions.dataBaseCompletion) {
                        completionList.push(...this.completionsFromAPI(document, position, context));
                    }
                    resolve(new CompletionList(completionList, false));
                }).catch((reason) =>
                {
                    reject(reason);
                });
        });
    }
    /*
    TODO: Implement
    resolveCompletionItem?(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem>
    {
        throw new Error("Method not implemented.");
    }
    */
}