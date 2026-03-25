import {
    CancellationToken, DocumentHighlight, DocumentHighlightKind,
    DocumentHighlightProvider, Position, ProviderResult, Range, TextDocument,
    workspace,
} from 'vscode';

import type { Position as AstPosition } from '@strumenta/tylasu';
import { mxsBackend } from '@backend/Backend.js';
import { ASTQuery } from '@backend/ast/ASTQuery.js';
import { SymbolKind } from '@backend/types.js';
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

    private astPositionToRange(position: AstPosition): Range {
        return new Range(
            position.start.line - 1,
            position.start.column,
            position.end.line - 1,
            position.end.column,
        );
    }

    /** Finds the range of `name` within the given AST node's position span. */
    private astNameRange(document: TextDocument, position: AstPosition, name: string): Range | undefined {
        const enclosingRange = this.astPositionToRange(position);
        const snippet = document.getText(enclosingRange);
        const offset = snippet.indexOf(name);
        if (offset < 0) {
            return undefined;
        }
        const prefix = snippet.slice(0, offset);
        const lines = prefix.split(/\r?\n/);
        const lineOffset = lines.length - 1;
        const startLine = enclosingRange.start.line + lineOffset;
        const startCharacter = lineOffset === 0
            ? enclosingRange.start.character + lines[0].length
            : lines[lineOffset].length;
        return new Range(startLine, startCharacter, startLine, startCharacter + name.length);
    }

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
                const ast = sourceContext?.getResolvedAST();
                const declaration = sourceContext?.astDeclarationAtPosition(
                    position.line + 1,
                    position.character,
                );

                if (ast && declaration) {
                    const result: DocumentHighlight[] = [];

                    // Declaration site → Write highlight (scoped to name token only)
                    if (declaration.position && declaration.name) {
                        const semanticNode = ASTQuery.findSemanticNodeForDeclaration(ast, declaration);
                        const targetPosition = semanticNode.position ?? declaration.position;
                        const nameRange = this.astNameRange(document, targetPosition, declaration.name);
                        if (nameRange) {
                            result.push(new DocumentHighlight(nameRange, DocumentHighlightKind.Write));
                        }
                    }

                    // All reference sites → Read highlights
                    for (const ref of declaration.references) {
                        if (!ref.position) {
                            continue;
                        }
                        result.push(new DocumentHighlight(
                            this.astPositionToRange(ref.position),
                            DocumentHighlightKind.Read,
                        ));
                    }

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
                        result.push(new DocumentHighlight(range, highlightKindFromSymbolKind(occurrence.kind)));
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
