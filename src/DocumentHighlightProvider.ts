import {
    CancellationToken, DocumentHighlight, DocumentHighlightKind,
    DocumentHighlightProvider, Position, ProviderResult, TextDocument,
    workspace,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import { Utilities } from './utils.js';
import { translateHighlightKind } from './SymbolTranslator.js';

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
            const sourceContext = this.backend.getContext(document.uri.toString());
            const config = workspace.getConfiguration('maxScript');
            const useAst = config.get<boolean>('providers.ast.documentHighlightProvider', true);
            const fallbackToLegacy = config.get<boolean>('providers.fallbackToLegacy', true);
            const traceRouting = config.get<boolean>('providers.traceRouting', false);

            if (useAst) {
                const astHighlights = sourceContext.getAstDocumentHighlights(
                    position.line + 1,
                    position.character,
                    document.getText(),
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
                        resolve(result);
                        return;
                    }
                }
                if (traceRouting) {
                    console.log('[language-maxscript][DocumentHighlightProvider] route=AST-miss');
                }
            }

            if (fallbackToLegacy) {
                const occurrences = sourceContext.symbolInfoAtPositionCtxOccurrences(
                    position.line + 1,
                    position.character,
                );

                if (occurrences) {
                    const docUriStr = document.uri.toString();
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
                        if (traceRouting) {
                            console.log('[language-maxscript][DocumentHighlightProvider] route=Legacy');
                        }
                        resolve(result);
                        return;
                    }
                }
            }

            // Last resort: word under cursor
            const wordRange = document.getWordRangeAtPosition(position);
            resolve(wordRange ? [new DocumentHighlight(wordRange, DocumentHighlightKind.Text)] : undefined);
        });
    }
}
