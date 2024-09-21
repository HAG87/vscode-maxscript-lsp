import {
  CancellationToken, DocumentFormattingEditProvider,
  DocumentRangeFormattingEditProvider, FormattingOptions, ProviderResult, Range,
  TextDocument, TextEdit, workspace,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import { ICodeFormatSettings } from './types.js';
import { Utilities } from './utils.js';

export class mxsRangeFormattingProvider implements DocumentRangeFormattingEditProvider
{
    public constructor(private backend: mxsBackend, private options: ICodeFormatSettings) { }

    provideDocumentRangeFormattingEdits(document: TextDocument, range: Range,
        _options: FormattingOptions, _token: CancellationToken): ProviderResult<TextEdit[]>
    {
        // /*
        return new Promise<TextEdit[]>((resolve) =>
        {
            const { code, start, stop } =
                this.backend.formatCode(
                    document.uri.toString(),
                    Utilities.rangeToLexicalRange(range),
                    this.options
                );
            const resultRange = range.with(
                document.positionAt(start),
                document.positionAt(stop + 1)
            );
            resolve([TextEdit.replace(resultRange, code)]);
        });
        // */
        /*
        const { code, start, stop } =
            this.backend.formatCode(
                document.uri.toString(),
                Utilities.rangeToLexicalRange(range),
                this.options
            );
        const resultRange = range.with(
            document.positionAt(start),
            document.positionAt(stop + 1)
        );
        return [TextEdit.replace(resultRange, code)];
        */
    }
    //FIXME: unreilable method
    provideDocumentRangesFormattingEdits?(document: TextDocument, ranges: Range[],
        _options: FormattingOptions, _token: CancellationToken): ProviderResult<TextEdit[]>
    {
        return new Promise<TextEdit[]>((resolve) =>
        {
            const results: TextEdit[] = [];
            ranges.forEach(range =>
            {
                const { code, start, stop } =
                    this.backend.formatCode(
                        document.uri.toString(),
                        {
                            start: document.offsetAt(range.start),
                            stop: document.offsetAt(range.end) - 1
                        },
                        this.options
                    );
                const resultRange = range.with(
                    document.positionAt(start),
                    document.positionAt(stop + 1)
                );
                results.push(TextEdit.replace(resultRange, code));
            });
            resolve(results);
        });

        /*
        let formatRange: Range = ranges[0];
        if (ranges.length > 1) {
            let start: Position = ranges[0].start;
            let end: Position = ranges[ranges.length - 1].end;
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
        const { code, start, stop } =
            this.backend.formatCode(
                document.uri.toString(),
                {
                    start: document.offsetAt(range.start),
                    stop: document.offsetAt(range.end) - 1
                }
            );
        const resultRange = formatRange.with(
            document.positionAt(start),
            document.positionAt(stop + 1)
        );
        return [TextEdit.replace(resultRange, code)];
        // */
    }
}

export class mxsFormattingProvider implements DocumentFormattingEditProvider
{
    public constructor(private backend: mxsBackend, private options?: ICodeFormatSettings)
    {
        if (!options) {
            options = workspace.getConfiguration('maxScript').get('formatter') as ICodeFormatSettings;
        }
    }

    provideDocumentFormattingEdits(document: TextDocument,
        _options: FormattingOptions, _token: CancellationToken): ProviderResult<TextEdit[]>
    {
        return new Promise<TextEdit[]>((resolve) =>
        {
            const range = new Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );
            const { code, start, stop } =
                this.backend.formatCode(
                    document.uri.toString(),
                    Utilities.rangeToLexicalRange(range),
                    this.options
                );
            const resultRange = range.with(
                document.positionAt(start),
                document.positionAt(stop + 1)
            );
            resolve([TextEdit.replace(resultRange, code)]);
        });
    }
}