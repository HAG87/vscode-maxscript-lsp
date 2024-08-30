import
{
    CancellationToken, DocumentFormattingEditProvider,
    DocumentRangeFormattingEditProvider,
    FormattingOptions,
    TextDocument, TextEdit,
    ProviderResult, Range,
    Position,
} from "vscode";
import { mxsBackend } from "./backend/Backend.js";
import { Utilities } from "./utils.js";

export class mxsRangeFormattingProvider implements DocumentRangeFormattingEditProvider
{
    public constructor(private backend: mxsBackend) { }

    private DocumentRangeFormatting(document: TextDocument, range: Range,): TextEdit[]
    {
        const { code, start, stop, offset } =
            this.backend.formatCode(
                document.uri.toString(),
                Utilities.rangeToLexicalRange(range)
            );

        const resultRange = range.with(
            document.positionAt(start),
            document.positionAt(stop + 1)
        );
        return [TextEdit.replace(resultRange, code)];
    }

    provideDocumentRangeFormattingEdits(document: TextDocument, range: Range, _options: FormattingOptions, _token: CancellationToken): ProviderResult<TextEdit[]>
    {
        // add options!
        // const formatOptions = workspace.getConfiguration("maxscript.format");

        // let _start = document.offsetAt(range.start);
        // let _end = document.offsetAt(range.end);
        return this.DocumentRangeFormatting(document, range);
    }

    provideDocumentRangesFormattingEdits?(document: TextDocument, ranges: Range[], _options: FormattingOptions, _token: CancellationToken): ProviderResult<TextEdit[]>
    {
        // let results: TextEdit[] = [];
        let formatRange: Range = ranges[0];
        // TODO: Replace this with a correct implementation that formats each range.
        // It will need to evaluate a valid parse tree for each range, and compute the edits start and stop
        if (ranges.length > 1) {
            let start: Position = ranges[0].start;
            let end: Position = ranges[ranges.length - 1].end;

            // ranges.forEach()
            for (let i = 1; i <= ranges.length - 1; i++) {
                if (!start.isBeforeOrEqual(ranges[i].start)) {
                    start = ranges[i].start;
                }
                if (!end.isAfterOrEqual(ranges[i].start)) {
                    end = ranges[i].end;
                }
            }
            formatRange = new Range(start, end);
        }
        return this.DocumentRangeFormatting(document, formatRange);
    }
}

export class mxsFormattingProvider implements DocumentFormattingEditProvider
{
    public constructor(private backend: mxsBackend) { }

    provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>
    {
        const range = new Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );

        const { code, start, stop, offset } =
            this.backend.formatCode(
                document.uri.toString(),
                Utilities.rangeToLexicalRange(range)
            );

        const resultRange = range.with(
            document.positionAt(start),
            document.positionAt(stop + 1)
        );
        return [TextEdit.replace(resultRange, code)];
    }
}