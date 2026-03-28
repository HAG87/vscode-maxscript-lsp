import {
    CancellationToken, LinkedEditingRangeProvider, LinkedEditingRanges, Position,
    ProviderResult, Range, TextDocument,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import { Utilities } from './utils.js';
import { IMaxScriptSettings } from 'types.js';

export class mxsLinkedEditingRangeProvider implements LinkedEditingRangeProvider
{
    public constructor(private backend: mxsBackend, private options?: IMaxScriptSettings) { }


    private nowMs(): number {
        return typeof performance !== 'undefined' ? performance.now() : Date.now();
    }

    provideLinkedEditingRanges(
        document: TextDocument,
        position: Position,
        token: CancellationToken): ProviderResult<LinkedEditingRanges>
    {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const traceRouting = this.options?.debug?.traceRouting || false;
        const tracePerformance = this.options?.debug?.tracePerformance || false;
        const providerStart = tracePerformance ? this.nowMs() : 0;
        const logPerformance = (route: 'AST' | 'None', ranges: number, reason?: string): void => {
            if (!tracePerformance) {
                return;
            }
            const reasonPart = reason ? ` reason=${reason}` : '';
            console.log(`[language-maxscript][Performance] linkedEditingRangeProvider uri=${document.uri.toString()} duration=${(this.nowMs() - providerStart).toFixed(2)}ms route=${route} ranges=${ranges}${reasonPart}`);
        };

        const sourceLineText = document.lineAt(position.line).text;
        const lexicalRanges = this.backend.getAstLinkedEditingRanges(
            document.uri.toString(),
            position.line + 1,
            position.character,
            sourceLineText,
        );

        if (lexicalRanges && lexicalRanges.length > 0) {
            const ranges: Range[] = lexicalRanges.map((range) => Utilities.lexicalRangeToRange(range));

            if (traceRouting) {
                console.log(`[language-maxscript][LinkedEditingRangeProvider] route=AST ranges=${ranges.length}`);
            }
            logPerformance('AST', ranges.length);
            return new LinkedEditingRanges(ranges);
        }

        if (traceRouting) {
            console.log('[language-maxscript][LinkedEditingRangeProvider] route=None reason=no-references');
        }
        logPerformance('None', 0, 'no-references');
        return undefined;
    }
}

