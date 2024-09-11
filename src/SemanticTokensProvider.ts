import { CancellationToken, DocumentRangeSemanticTokensProvider, DocumentSemanticTokensProvider, Event, Position, ProviderResult, Range, SemanticTokens, SemanticTokensBuilder, SemanticTokensEdits, SemanticTokensLegend, TextDocument, Uri } from "vscode";
import { mxsBackend } from "./backend/Backend.js";
import { ISemanticToken, semTokenModifiers, semTokenTypes } from "./types.js";


export const mxsSemtoTokensLegend = new SemanticTokensLegend(semTokenTypes, semTokenModifiers);

/**
 * Always takes a full document as input.
 */
export class mxsSemanticTokensProvider implements DocumentSemanticTokensProvider 
{
    // private tokensBuilder: SemanticTokensBuilder;
    // private currentTokens: ISemanticToken[] = [];
    // private documentTokenBuilder: Map<string,SemanticTokensBuilder> = new Map<string,SemanticTokensBuilder>();

    constructor(private backend: mxsBackend) { }

    onDidChangeSemanticTokens?: Event<void> | undefined;

    provideDocumentSemanticTokens(document: TextDocument, _token: CancellationToken): ProviderResult<SemanticTokens>
    {
        /*
        // note: seems that SemanticTokensBuilder cant be reused...
        const uri = document.uri.toString();
        let tokensBuilder: SemanticTokensBuilder;
        if (this.documentTokenBuilder.has(uri)) {
            tokensBuilder = this.documentTokenBuilder.get(uri)!;
        } else {
            tokensBuilder = new SemanticTokensBuilder(mxsSemtoTokensLegend);
            this.documentTokenBuilder.set(uri, tokensBuilder);
        }
        */
       
       return new Promise((resolve) =>
        {
            // TODO: if no parse tree is available, fallback to simple method
            const tokens = this.backend.getDocumentSemanticTokens(document.uri.toString());

            // some optimizations to recompute the tokens only if they have changed...
            if (tokens && tokens.length > 0) {
                const tokensBuilder = new SemanticTokensBuilder(mxsSemtoTokensLegend);
                tokens.forEach(token => tokensBuilder.push(
                    new Range(token.line - 1, token.startCharacter, token.line - 1, token.startCharacter + token.length),
                    token.tokenType as string,
                    token.tokenModifiers as string[]));
                resolve(tokensBuilder.build());
            } else {
                resolve(undefined);
            }
        });
    }
    /*
    provideDocumentSemanticTokensEdits?(document: TextDocument, previousResultId: string, token: CancellationToken): ProviderResult<SemanticTokens | SemanticTokensEdits>
    {
        throw new Error("Method not implemented.");
    }
    */
}
/**
 * Works only on a range.
 */
export class mxsRangeSemanticTokensProvider implements DocumentRangeSemanticTokensProvider
{

    constructor(/* private backend: mxsBackend */) { }

    /**
     * Provides all tokens of a document range.
     * @param document 
     * @param range 
     * @param token 
     */
    provideDocumentRangeSemanticTokens(document: TextDocument, range: Range, token: CancellationToken): ProviderResult<SemanticTokens>
    {
        // console.log(range);
        throw new Error("Method not implemented.");
    }
}