import { CommonTokenStream, Token, TokenStream } from "antlr4ng";
import { mxsLexer } from "../parser/mxsLexer.js";
import { ISemanticToken } from "../types.js";
import { maxAPI } from "./schemas/mxsAPI.js";

/**
 * Fallback class to provide semantic tokens when the parser is not available
 */
export class mxsSimpleSemTokensProvider
{
    private tokenStream: CommonTokenStream;
    private tokens: Token[];
    constructor(stream: CommonTokenStream, tokens: Token[], private tokenStack: ISemanticToken[])
    {
        this.tokenStream = stream;
        this.tokens = tokens.length !== 0 ? tokens : this.getTokens();
    }
    private getTokens(): Token[]
    {
        const tokensToRetrieve = new Set<number>([
            mxsLexer.ID
        ])
        return this.tokenStream.getTokens(undefined, undefined, tokensToRetrieve)
    }
    private addToken(line: number, startCharacter: number, length: number, tokenType: string, tokenModifiers: string[]): void
    {
        this.tokenStack.push(
            {
                line,
                startCharacter,
                length,
                tokenType,
                tokenModifiers,
            }
        )
    }
    collectSemanticTokens():void
    {
        // const result: ISemanticToken[] = []

        if (this.tokens.length === 0) {
            this.tokens = this.getTokens()
        }

        for (let token of this.tokens) {

            const txt = token.text ?? '';

            if (maxAPI.class.has(txt)) {
                this.addToken(token.line, token.column, txt.length,
                    'class',
                    ['defaultLibrary', 'static']
                );
                return;
            }
            if (maxAPI.function.has(txt)) {
                this.addToken(token.line, token.column, txt.length,
                    'function',
                    ['defaultLibrary']
                );
                return;
            }
            if (maxAPI.interface.has(txt)) {
                this.addToken(token.line, token.column, txt.length,
                    'interface',
                    ['defaultLibrary']
                );
                return;
            }
            if (maxAPI.namespace.has(txt)) {
                this.addToken(token.line, token.column, txt.length,
                    'namespace',
                    ['defaultLibrary']
                );
                return;
            }
            if (maxAPI.struct.has(txt)) {
                this.addToken(token.line, token.column, txt.length,
                    'struct',
                    ['defaultLibrary']
                );
                return;
            }

            if (maxAPI.type.has(txt)) {
                this.addToken(token.line, token.column, txt.length,
                    'type',
                    ['defaultLibrary']
                );
                return;
            }
            if (maxAPI.variable.has(txt)) {
                this.addToken(token.line, token.column, txt.length,
                    'variable',
                    ['defaultLibrary']
                );
                return;
            }
            if (maxAPI.constant.has(txt)) {
                this.addToken(token.line, token.column, txt.length,
                    'variable',
                    ['defaultLibrary', 'readonly']
                );
                return;
            }
        }
    }
    provideSemanticTokens(): ISemanticToken[] {
        if (this.tokenStack.length === 0) {
            this.collectSemanticTokens()
        }
        return this.tokenStack
    }
}