import
    {
        CancellationToken, DocumentFormattingEditProvider,
        DocumentRangeFormattingEditProvider,
        FormattingOptions,
        TextDocument, TextEdit,
        ProviderResult, Range,
    } from "vscode";
import { mxsBackend } from "./backend/Backend.js";
import { Utilities } from "./utils.js";

export class mxsFormattingProvider implements DocumentFormattingEditProvider
{
    public constructor(private backend: mxsBackend) { }

    provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>
    {
        console.log('format all');
        throw new Error("Method not implemented.");
    }

}
export class mxsRangeFormattingProvider implements DocumentRangeFormattingEditProvider
{
    public constructor(private backend: mxsBackend) { }

    provideDocumentRangeFormattingEdits(document: TextDocument, range: Range, options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>
    {
        let start = document.offsetAt(range.start);
        let end = document.offsetAt(range.end);
        
        // console.log(`format range: ${start} - ${end}`);
        // console.log(range);
        
        this.backend.formatCode(document.uri.toString(), Utilities.rangeToLexicalRange(range));


        /*
        const formatOptions = workspace.getConfiguration("antlr4.format");
        let text = "";

        [text, start, end] = this.backend.formatGrammar(document.fileName, Object.assign({}, formatOptions), start,
            end);
        
        const resultRange = range.with(document.positionAt(start), document.positionAt(end + 1));

        return [TextEdit.replace(resultRange, text)];
        */

        // throw new Error("Method not implemented.");
        return;
    }
    
    provideDocumentRangesFormattingEdits?(document: TextDocument, ranges: Range[], options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>
    {
        console.log('ranges');
        console.log(ranges);
       throw new Error("Method not implemented.");
    }
}