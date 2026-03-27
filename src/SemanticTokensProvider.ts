import {
  CancellationToken, DocumentRangeSemanticTokensProvider,
  DocumentSemanticTokensProvider, Event, EventEmitter, ProviderResult, Range,
  SemanticTokens, SemanticTokensBuilder, SemanticTokensLegend, TextDocument,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import { semTokenModifiers, semTokenTypes } from './types.js';

export const mxsSemtoTokensLegend = new SemanticTokensLegend(semTokenTypes, semTokenModifiers);

/**
 * Always takes a full document as input.
 */
export class mxsSemanticTokensProvider implements DocumentSemanticTokensProvider 
{
    private _onDidChangeSemanticTokens = new EventEmitter<void>();

    constructor(private backend: mxsBackend) { }

    public get onDidChangeSemanticTokens(): Event<void> {
        return this._onDidChangeSemanticTokens.event;
    }

    /**
     * Notify VS Code that semantic tokens have changed and should be refreshed.
     * Call this after reparsing the document.
     */
    public refresh(): void {
        this._onDidChangeSemanticTokens.fire();
    }

    provideDocumentSemanticTokens(document: TextDocument, token: CancellationToken): ProviderResult<SemanticTokens>
    {
        if (token.isCancellationRequested) {
            return undefined;
        }

        // TODO: if no parse tree is available, fallback to simple method
        // const tokens = this.backend.getDocumentSemanticTokens(document.uri.toString());
        const ctx = this.backend.borrowContext(document.uri.toString());
        const tokens = ctx?.getSemanticTokens;

        // some optimizations to recompute the tokens only if they have changed...
        if (!tokens || tokens.length === 0) {
            return undefined;
        }

        const tokensBuilder = new SemanticTokensBuilder(mxsSemtoTokensLegend);
        for (const semToken of tokens) {
            if (token.isCancellationRequested) {
                return undefined;
            }

            tokensBuilder.push(
                new Range(
                    semToken.line - 1,
                    semToken.startCharacter,
                    semToken.line - 1,
                    semToken.startCharacter + semToken.length,
                ),
                semToken.tokenType as string,
                semToken.tokenModifiers as string[],
            );
        }

        return tokensBuilder.build();
    }
    /*
    // TODO(semantic-edits): Feasible, but currently low value with the existing full-refresh model.
    // Notes for future implementation:
    // 1) Update signature to: ProviderResult<SemanticTokens | SemanticTokensEdits>.
    // 2) Keep a per-document cache: { resultId, encodedTokenData }.
    // 3) Build current encoded token data and diff against cached data for previousResultId.
    // 4) Return SemanticTokensEdits only for small/contiguous deltas; otherwise return full SemanticTokens.
    // 5) On unknown previousResultId, cancellation, or large churn, fallback to full tokens.
    provideDocumentSemanticTokensEdits?(document: TextDocument, previousResultId: string, token: CancellationToken): ProviderResult<SemanticTokens>
    {
        throw new Error("Method not implemented.");
    }
    // */
}
/**
 * Works only on a range.
 */
export class mxsRangeSemanticTokensProvider implements DocumentRangeSemanticTokensProvider
{

    constructor(private backend: mxsBackend) { }

    /**
     * Provides all tokens of a document range.
     * @param document 
     * @param range 
     * @param token 
     */
    provideDocumentRangeSemanticTokens(document: TextDocument, range: Range, token: CancellationToken): ProviderResult<SemanticTokens>
    {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const tokens = this.backend.borrowContext(document.uri.toString())?.getSemanticTokens;
        if (!tokens || tokens.length === 0) {
            return undefined;
        }

        const builder = new SemanticTokensBuilder(mxsSemtoTokensLegend);
        const rangeStartLine = range.start.line;
        const rangeStartCharacter = range.start.character;
        const rangeEndLine = range.end.line;
        const rangeEndCharacter = range.end.character;

        for (const semToken of tokens) {
            if (token.isCancellationRequested) {
                return undefined;
            }

            const tokenLine = semToken.line - 1;
            const tokenStart = semToken.startCharacter;
            const tokenEnd = semToken.startCharacter + semToken.length;

            // Skip tokens outside requested line range.
            if (tokenLine < rangeStartLine || tokenLine > rangeEndLine) {
                continue;
            }

            // Line boundary overlap checks.
            if (tokenLine === rangeStartLine && tokenEnd <= rangeStartCharacter) {
                continue;
            }
            if (tokenLine === rangeEndLine && tokenStart >= rangeEndCharacter) {
                continue;
            }

            builder.push(
                new Range(tokenLine, tokenStart, tokenLine, tokenEnd),
                semToken.tokenType as string,
                semToken.tokenModifiers as string[],
            );
        }

        return builder.build();
    }
}