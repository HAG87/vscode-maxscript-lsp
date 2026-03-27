import {
    CancellationToken, DocumentHighlight, DocumentHighlightKind,
    DocumentHighlightProvider, Position, ProviderResult, TextDocument,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import { Utilities } from './utils.js';
import { translateHighlightKind } from './Symbol.js';

export class mxsDocumentHighlightProvider implements DocumentHighlightProvider
{
    public constructor(private backend: mxsBackend) { }

    provideDocumentHighlights(
        document: TextDocument,
        position: Position,
        token: CancellationToken): ProviderResult<DocumentHighlight[]>
    {
        if (token.isCancellationRequested) {
            return undefined;
        }
        
        const occurrences = this.backend.getContext(document.uri.toString())
            .symbolInfoAtPositionCtxOccurrences(position.line + 1, position.character);

        if (occurrences) {
            const docUriStr = document.uri.toString();
            // Deduplicate by start position within the current document.
            const seen = new Set<string>();
            const result: DocumentHighlight[] = [];

            for (const occurrence of occurrences) {
                if (!occurrence.definition || occurrence.source !== docUriStr) {
                    continue;
                }

                const range = Utilities.symbolNameRange(occurrence);
                const key = `${range.start.line}:${range.start.character}`;
                if (seen.has(key)) {
                    continue;
                }
                seen.add(key);
                result.push(new DocumentHighlight(range, translateHighlightKind(occurrence.kind)));
            }

            if (result.length > 0) {
                return result;
            }
        }

        // Fallback: if the backend found nothing, at least highlight the word under the cursor.
        const wordRange = document.getWordRangeAtPosition(position);
        return wordRange ? [new DocumentHighlight(wordRange, DocumentHighlightKind.Text)] : undefined;
    }
}
