import {
    CancellationToken, FoldingRange, FoldingRangeProvider,
    ProviderResult, TextDocument,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import { Utilities } from './utils.js';
import { IMaxScriptSettings } from 'types.js';

export class mxsFoldingRangeProvider implements FoldingRangeProvider
{
    public constructor(private backend: mxsBackend, private options?: IMaxScriptSettings) { }

    private nowMs(): number {
        return typeof performance !== 'undefined' ? performance.now() : Date.now();
    }

    provideFoldingRanges(
        document: TextDocument,
        _context: unknown,
        token: CancellationToken): ProviderResult<FoldingRange[]>
    {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const traceRouting = this.options?.debug?.traceRouting || false;
        const tracePerformance = this.options?.debug?.tracePerformance || false;
        const providerStart = tracePerformance ? this.nowMs() : 0;
        const logPerformance = (route: 'AST' | 'None', folds: number, reason?: string): void => {
            if (!tracePerformance) {
                return;
            }
            const reasonPart = reason ? ` reason=${reason}` : '';
            console.log(`[language-maxscript][Performance] foldingRangeProvider uri=${document.uri.toString()} duration=${(this.nowMs() - providerStart).toFixed(2)}ms route=${route} folds=${folds}${reasonPart}`);
        };

        const lexicalRanges = this.backend.getAstFoldingRanges(document.uri.toString(), document.getText());
        if (lexicalRanges.length > 0) {
            const ranges = lexicalRanges.map((range) => {
                const vscodeRange = Utilities.lexicalRangeToRange(range);
                return new FoldingRange(vscodeRange.start.line, vscodeRange.end.line);
            });

            if (traceRouting) {
                console.log(`[language-maxscript][FoldingRangeProvider] route=AST ranges=${ranges.length}`);
            }
            logPerformance('AST', ranges.length);
            return ranges;
        }

        if (traceRouting) {
            console.log('[language-maxscript][FoldingRangeProvider] route=None reason=no-ranges');
        }
        logPerformance('None', 0, 'no-ranges');
        return undefined;
    }
}
