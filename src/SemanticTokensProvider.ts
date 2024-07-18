import { CancellationToken, DocumentRangeSemanticTokensProvider, DocumentSemanticTokensProvider, Event, ProviderResult, Range, SemanticTokens, SemanticTokensEdits, TextDocument } from "vscode";
import { mxsBackend } from "./backend/Backend";
/**
 * Always takes a full document as input.
 */
export class mxsSemanticTokensProvider implements DocumentSemanticTokensProvider 
{
    public constructor(private backend: mxsBackend) {}
    onDidChangeSemanticTokens?: Event<void> | undefined;

    provideDocumentSemanticTokens(document: TextDocument, token: CancellationToken): ProviderResult<SemanticTokens>
    {
        throw new Error("Method not implemented.");
        // if no parse tree is available, fallback to Apy and regex method
    }

    provideDocumentSemanticTokensEdits?(document: TextDocument, previousResultId: string, token: CancellationToken): ProviderResult<SemanticTokens | SemanticTokensEdits>
    {
        throw new Error("Method not implemented.");
    }
}
/**
 * Works only on a range.
 */
export class mxsRangeSemanticTokensProvider implements DocumentRangeSemanticTokensProvider
{
    /**
     * Provides all tokens of a document range.
     * @param document 
     * @param range 
     * @param token 
     */
    provideDocumentRangeSemanticTokens(document: TextDocument, range: Range, token: CancellationToken): ProviderResult<SemanticTokens>
    {
        throw new Error("Method not implemented.");
    }

}