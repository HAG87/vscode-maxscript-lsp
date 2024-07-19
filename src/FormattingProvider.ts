import
    {
        CancellationToken, DocumentFormattingEditProvider,
        DocumentRangeFormattingEditProvider,
        FormattingOptions,
        TextDocument, TextEdit,
        ProviderResult, Range,
    } from "vscode";
import { mxsBackend } from "./backend/Backend.js";

export class mxsFormattingProvider implements DocumentFormattingEditProvider
{
    public constructor(private backend: mxsBackend) { }

    provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>
    {
        throw new Error("Method not implemented.");
    }

}
export class mxsRangeFormattingProvider implements DocumentRangeFormattingEditProvider
{
    public constructor(private backend: mxsBackend) { }

    provideDocumentRangeFormattingEdits(document: TextDocument, range: Range, options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>
    {
        throw new Error("Method not implemented.");
    }
    
    provideDocumentRangesFormattingEdits?(document: TextDocument, ranges: Range[], options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>
    {
        throw new Error("Method not implemented.");
        /*
         let start = document.offsetAt(range.start);
        let end = document.offsetAt(range.end);

        const formatOptions = workspace.getConfiguration("antlr4.format");
        let text = "";
        [text, start, end] = this.backend.formatGrammar(document.fileName, Object.assign({}, formatOptions), start,
            end);
        const resultRange = range.with(document.positionAt(start), document.positionAt(end + 1));

        return [TextEdit.replace(resultRange, text)];
        */
    }
}