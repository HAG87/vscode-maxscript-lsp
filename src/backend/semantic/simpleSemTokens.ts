import { CommonTokenStream, Token } from 'antlr4ng';

import { mxsLexer } from '../../parser/mxsLexer.js';
import { ISemanticToken } from '../../types.js';
import { maxAPI, maxAPILookup } from '../schemas/mxsAPI.js';

// Pre-allocated modifier arrays to avoid repeated allocations
const MODIFIERS_DEFAULT_LIBRARY = ['defaultLibrary'];
const MODIFIERS_DEFAULT_LIBRARY_STATIC = ['defaultLibrary', 'static'];
const MODIFIERS_DEFAULT_LIBRARY_READONLY = ['defaultLibrary', 'readonly'];

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
        // Direct array filtering is faster than Set for single token type
        return this.tokenStream.getTokens(undefined, undefined, new Set([mxsLexer.ID]));
    }
    
    collectSemanticTokens(): void
    {
        // Early exit if no tokens
        if (this.tokens.length === 0) {
            this.tokens = this.getTokens();
            if (this.tokens.length === 0) {
                return;
            }
        }

        // Process all tokens
        for (let i = 0; i < this.tokens.length; i++) {
            const token = this.tokens[i];
            const txt = token.text;
            
            // Skip empty tokens
            if (!txt) {
                continue;
            }
            
            const line = token.line;
            const column = token.column;
            const length = txt.length;

            // Check in order of likelihood (most common first)
            // Single Map lookup for classification
            const info = maxAPILookup.get(txt);
            if (info) {
                this.tokenStack.push({
                    line,
                    startCharacter: column,
                    length,
                    tokenType: info.tokenType as any,
                    tokenModifiers: info.tokenModifiers,
                });
                continue;
            }
        }
    }
    
    provideSemanticTokens(): ISemanticToken[]
    {
        if (this.tokenStack.length === 0) {
            this.collectSemanticTokens();
        }
        return this.tokenStack;
    }
}
