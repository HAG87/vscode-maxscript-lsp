import
    {
        CancellationToken, DocumentFormattingEditProvider,
        DocumentRangeFormattingEditProvider, FormattingOptions, ProviderResult, Range,
        TextDocument, TextEdit,
    } from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import { ICodeFormatSettings } from '@backend/types.js';
import { Utilities } from 'utils';

export class mxsRangeFormattingProvider implements DocumentRangeFormattingEditProvider
{
    public constructor(private backend: mxsBackend, private options: ICodeFormatSettings){ }

    provideDocumentRangeFormattingEdits(document: TextDocument, range: Range,
        _options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>
    {
        if (token.isCancellationRequested) {
            return [];
        }

        const { code } =
            this.backend.getContext(document.uri.toString()).formatCode(
                {
                    start: document.offsetAt(range.start),
                    stop: document.offsetAt(range.end) - 1
                },
                this.options
            );
        return [TextEdit.replace(range, code)];
    }

    provideDocumentRangesFormattingEdits?(document: TextDocument, ranges: Range[],
        _options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>
    {
        if (token.isCancellationRequested) {
            return [];
        }

        const results: TextEdit[] = [];
        ranges.forEach(range =>
        {
            if (token.isCancellationRequested) {
                return;
            }

            const { code } =
                this.backend.getContext(document.uri.toString()).formatCode(
                    {
                        start: document.offsetAt(range.start),
                        stop: document.offsetAt(range.end) - 1
                    },
                    this.options
                );
            results.push(TextEdit.replace(range, code));
        });
        return results;
    }
}

export class mxsFormattingProvider implements DocumentFormattingEditProvider
{
    public constructor(private backend: mxsBackend, private options: ICodeFormatSettings){ }

    provideDocumentFormattingEdits(document: TextDocument,
        _options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>
    {
        if (token.isCancellationRequested) {
            return [];
        }

        const range = new Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );

        const { code } =
            this.backend.getContext(document.uri.toString()).formatCode(
                Utilities.rangeToLexicalRange(range),
                this.options
            );
        return [TextEdit.replace(range, code)];
    }
}