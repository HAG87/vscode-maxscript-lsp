import {
    CancellationToken, DocumentHighlight, DocumentHighlightKind,
    DocumentHighlightProvider, Position, ProviderResult, TextDocument,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import { SymbolKind } from './types.js';
import { Utilities } from './utils.js';

/**
 * Maps a symbol kind to the most appropriate DocumentHighlightKind.
 * Definitions/declarations are marked as Write, call-sites as Read, everything else as Text.
 */
function highlightKindFromSymbolKind(kind: SymbolKind): DocumentHighlightKind
{
    switch (kind) {
        case SymbolKind.Declaration:
        case SymbolKind.Function:
        case SymbolKind.Struct:
        case SymbolKind.Plugin:
        case SymbolKind.MacroScript:
        case SymbolKind.Tool:
        case SymbolKind.Utility:
        case SymbolKind.Rollout:
        case SymbolKind.RcMenu:
        case SymbolKind.Attributes:
        case SymbolKind.Event:
            return DocumentHighlightKind.Write;
        case SymbolKind.Call:
        case SymbolKind.Identifier:
            return DocumentHighlightKind.Read;
        default:
            return DocumentHighlightKind.Text;
    }
}

export class mxsDocumentHighlightProvider implements DocumentHighlightProvider
{
    public constructor(private backend: mxsBackend) { }

    provideDocumentHighlights(
        document: TextDocument,
        position: Position,
        _token: CancellationToken): ProviderResult<DocumentHighlight[]>
    {
        return new Promise((resolve) =>
        {
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
                    result.push(new DocumentHighlight(range, highlightKindFromSymbolKind(occurrence.kind)));
                }

                if (result.length > 0) {
                    resolve(result);
                    return;
                }
            }

            // Fallback: if the backend found nothing, at least highlight the word under the cursor.
            const wordRange = document.getWordRangeAtPosition(position);
            resolve(wordRange ? [new DocumentHighlight(wordRange, DocumentHighlightKind.Text)] : undefined);
        });
    }
}
