/* THIS IS BROKEN! */
import {
  CancellationToken, CompletionContext, CompletionItem, CompletionItemKind,
  CompletionItemProvider, CompletionList, Position, ProviderResult,
  Range, TextDocument,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
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
            const completionList: CompletionItem[] = [];

            // Method to provide API completions
            // vscode will filter the list of completions, so I can provide the entire list, check if there is a perfomance gain providing partial lists
            // completionList.push(...this.completionsFromAPI(document, position, context));

            // antlr-c3 used to provide code completion items
            this.backend.getContext(document.uri.toString())?.getCodeCompletionCandidates(position.line + 1, position.character)
                .then((candidates) =>
                {
                    candidates.forEach((info) =>
                    {
                        const item = new CompletionItem(info.name, translateCompletionKind(info.kind));
                        //     item.sortText = sortKeys[info.kind] + info.name;
                        item.detail = info.description || symbolDescriptionFromEnum(info.kind);
                        completionList.push(item);
                    });
                    if (this.options.completions.dataBaseCompletion) {
                        completionList.push(...this.completionsFromAPI(document, position, context));
                    }
                    resolve(new CompletionList(completionList, false));
                }).catch((reason) =>
                {
                    reject(reason);
                    // completionList.push(...this.completionsFromAPI(document, position, context));
                });
        });
    }
}