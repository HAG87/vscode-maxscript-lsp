import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, Position, ProviderResult, Range, TextDocument } from "vscode";
import { mxsBackend } from "./backend/Backend.js";
import { mxsLanguageCompletions, maxCompletions } from "./backend/schemas/mxsCompletions-base.js";
import { mxClassMembers } from "./backend/schemas/mxsCompletions-clases.js";
import { mxStructsMembers } from "./backend/schemas/mxsCompletions-structs.js";
import { mxInterfaceMembers } from "./backend/schemas/mxsCompletions-interfaces.js";
import { symbolDescriptionFromEnum, translateCompletionKind } from "./Symbol.js";

/** Determines the sort order in the completion list. One value for each SymbolKind. */
const sortKeys = [
    "01", // Keyword
    "06", // TokenVocab
    "07", // Import
    "03", // BuiltInLexerToken
    "03", // VirtualLexerToken
    "03", // FragmentLexerToken
    "03", // LexerToken
    "05", // BuiltInMode
    "05", // LexerMode
    "02", // BuiltInChannel
    "02", // TokenChannel
    "04", // ParserRule
    "08", // Action
    "09", // Predicate
    "00", // Operator
    "10", // Option
];

export class mxsCompletionProvider implements CompletionItemProvider
{
    private wordPattern: RegExp = /\b(\p{L}[\p{L}0-9]*)\b(?:[ \t\r\n]*[.]?)$/u;

    public constructor(private backend: mxsBackend) { }

    private completionsFromAPI(document: TextDocument, position: Position, context: CompletionContext): CompletionItem[]
    {
        let wordAtPos: string = '';
        const wordRange = document.getWordRangeAtPosition(position);    //, this.wordPattern);

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
            // console.log(parent);
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
        // throw new Error("Method not implemented.");
        return new Promise((resolve, reject) =>
        {
            const completionList: CompletionItem[] = [];
            // console.log('---COMPLETIONS---');
            // Method to provide API completions
            // vscode will filter the list of completions, so I can provide the entire list, check if there is a perfomance gain providing partial lists
            // completionList.push(...this.completionsFromAPI(document, position, context));

            // /*
            // antlr-c3 used to provide code completion items
            this.backend.getCodeCompletionCandidates(document.uri.toString(), position.line + 1, position.character)
                .then(({completions: candidates, provideLanguageCompletions}) =>
                {
                    // console.log(candidates);
                    candidates.forEach((info) =>
                    {
                        const item = new CompletionItem(info.name, translateCompletionKind(info.kind));
                        //     item.sortText = sortKeys[info.kind] + info.name;
                        item.detail = info.description || symbolDescriptionFromEnum(info.kind);
                        // console.log(item);
                        completionList.push(item);
                    });
                    // console.log(completionList);
                    if (provideLanguageCompletions) {
                        completionList.push(...this.completionsFromAPI(document, position, context));
                    }
                    resolve(new CompletionList(completionList, false));               
                }).catch((reason) =>
                {
                    reject(reason);
                    // completionList.push(...this.completionsFromAPI(document, position, context));
                });
            // */
            // resolve(new CompletionList(completionList, false));
            // resolve(new CompletionList(completionList, true));
        });
    }
    /*
    resolveCompletionItem?(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem>
    {
        throw new Error("Method not implemented.");
    }
    */
}