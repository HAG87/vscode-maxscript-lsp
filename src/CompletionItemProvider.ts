import { CancellationToken, CompletionContext, CompletionItem, CompletionItemProvider, CompletionList, Position, ProviderResult, TextDocument } from "vscode";
import { mxsBackend } from "./backend/Backend";

export class mxsCompletionItems implements CompletionItemProvider
{
    public constructor(private backend: mxsBackend) { }
    
    provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>>
    {
        throw new Error("Method not implemented.");
        /*
        return new Promise((resolve, reject) => {
            this.backend.getCodeCompletionCandidates(document.fileName, position.character, position.line + 1)
                .then((candidates) => {
                    const completionList: CompletionItem[] = [];
                    candidates.forEach((info) => {
                        const item = new CompletionItem(info.name, translateCompletionKind(info.kind));
                        item.sortText = sortKeys[info.kind] + info.name;
                        item.detail = (info.description !== undefined) ? info.description : details[info.kind];

                        completionList.push(item);
                    });

                    resolve(new CompletionList(completionList, false));
                }).catch((reason) => {
                    reject(reason);
                });
        });
        */
    }
    resolveCompletionItem?(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem>
    {
        throw new Error("Method not implemented.");
    }
}