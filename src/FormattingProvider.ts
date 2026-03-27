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
        const ctx = this.backend.borrowContext(document.uri.toString());
        const { code, start, stop } =
            ctx?.formatCode(
                Utilities.rangeToLexicalRange(range),
                this.options
            ) ?? { code: '', start: 0, stop: 0 };
        const resultRange = range.with(
            document.positionAt(start),
            document.positionAt(stop + 1)
        );
        return resultRange ? [TextEdit.replace(resultRange, code)] : undefined;
    }

    //FIXME: unreilable method
    provideDocumentRangesFormattingEdits?(document: TextDocument, ranges: Range[],
        _options: FormattingOptions, _token: CancellationToken): ProviderResult<TextEdit[]>
    {
        const results: TextEdit[] = [];
        const ctx = this.backend.borrowContext(document.uri.toString());
        ranges.forEach(range =>
        {
            const { code, start, stop } =
               ctx?.formatCode(
                    {
                        start: document.offsetAt(range.start),
                        stop: document.offsetAt(range.end) - 1
                    },
                    this.options
                ) ?? { code: '', start: 0, stop: 0 };
            const resultRange = range.with(
                document.positionAt(start),
                document.positionAt(stop + 1)
            );
            results.push(TextEdit.replace(resultRange, code));
        });

        return results.length > 0 ? results : undefined;
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
        const range = new Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );
        const ctx = this.backend.borrowContext(document.uri.toString());
        const { code, start, stop } =
            ctx?.formatCode(
                Utilities.rangeToLexicalRange(range),
                this.options
            ) ?? { code: '', start: 0, stop: 0 };
        const resultRange = range.with(
            document.positionAt(start),
            document.positionAt(stop + 1)
        );
        return resultRange ? [TextEdit.replace(resultRange, code)] : undefined;
    }
}