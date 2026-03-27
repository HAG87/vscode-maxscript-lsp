import {
    CancellationToken, DocumentHighlight, DocumentHighlightKind,
    DocumentHighlightProvider, Position, ProviderResult, TextDocument,
    workspace,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import { Utilities } from './utils.js';

export class mxsDocumentHighlightProvider implements DocumentHighlightProvider
{
    public constructor(private backend: mxsBackend) { }

    private nowMs(): number {
        return typeof performance !== 'undefined' ? performance.now() : Date.now();
    }

    provideDocumentHighlights(
        document: TextDocument,
        position: Position,
        token: CancellationToken): ProviderResult<DocumentHighlight[]>
    {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const sourceContext = this.backend.getContext(document.uri.toString());
        const config = workspace.getConfiguration('maxScript');
        const traceRouting = config.get<boolean>('providers.traceRouting', false);
        const tracePerformance = config.get<boolean>('providers.tracePerformance', false);
        const providerStart = tracePerformance ? this.nowMs() : 0;
        const logPerformance = (route: 'AST' | 'None', highlights: number, reason?: string): void => {
            if (!tracePerformance) {
                return;
            }
            const reasonPart = reason ? ` reason=${reason}` : '';
            console.log(`[language-maxscript][Performance] highlightProvider uri=${document.uri.toString()} duration=${(this.nowMs() - providerStart).toFixed(2)}ms route=${route} highlights=${highlights}${reasonPart}`);
        };

        const astHighlights = sourceContext.getAstDocumentHighlights(
            position.line + 1,
            position.character,
            (row1Based) => {
                const lineIndex = row1Based - 1;
                return lineIndex >= 0 && lineIndex < document.lineCount
                    ? document.lineAt(lineIndex).text
                    : undefined;
            },
        );

        if (astHighlights) {
            const result = astHighlights.map((highlight) =>
                new DocumentHighlight(
                    Utilities.lexicalRangeToRange(highlight.range),
                    highlight.kind === 'write' ? DocumentHighlightKind.Write : DocumentHighlightKind.Read,
                ));

            if (result.length > 0) {
                if (traceRouting) {
                    console.log(`[language-maxscript][DocumentHighlightProvider] route=AST highlights=${result.length}`);
                }
                logPerformance('AST', result.length);
                return result;
            }
        }
        if (traceRouting) {
            console.log('[language-maxscript][DocumentHighlightProvider] route=None reason=ast-miss');
        }

        const wordRange = document.getWordRangeAtPosition(position);
        const fallback = wordRange ? [new DocumentHighlight(wordRange, DocumentHighlightKind.Text)] : undefined;
        if (traceRouting && fallback) {
            console.log('[language-maxscript][DocumentHighlightProvider] route=None reason=word-fallback highlights=1');
        }
        if (traceRouting && !fallback) {
            console.log('[language-maxscript][DocumentHighlightProvider] route=None reason=no-match highlights=0');
        }
        logPerformance('None', fallback?.length ?? 0, fallback ? 'word-fallback' : 'no-match');
        return fallback;
    }
}
