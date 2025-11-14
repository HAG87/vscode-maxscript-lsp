import { CommonTokenStream, Token } from 'antlr4ng';

import { mxsLexer } from '../../parser/mxsLexer.js';
import { ISemanticToken } from '../../types.js';
import { maxAPI } from '../schemas/mxsAPI.js';

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
            // Functions are most common in MaxScript code
            if (maxAPI.function.has(txt)) {
                this.tokenStack.push({
                    line,
                    startCharacter: column,
                    length,
                    tokenType: 'function',
                    tokenModifiers: MODIFIERS_DEFAULT_LIBRARY,
                });
                continue;
            }
            
            // Variables and constants
            if (maxAPI.variable.has(txt)) {
                this.tokenStack.push({
                    line,
                    startCharacter: column,
                    length,
                    tokenType: 'variable',
                    tokenModifiers: MODIFIERS_DEFAULT_LIBRARY,
                });
                continue;
            }
            
            if (maxAPI.constant.has(txt)) {
                this.tokenStack.push({
                    line,
                    startCharacter: column,
                    length,
                    tokenType: 'variable',
                    tokenModifiers: MODIFIERS_DEFAULT_LIBRARY_READONLY,
                });
                continue;
            }
            
            // Classes and types
            if (maxAPI.class.has(txt)) {
                this.tokenStack.push({
                    line,
                    startCharacter: column,
                    length,
                    tokenType: 'class',
                    tokenModifiers: MODIFIERS_DEFAULT_LIBRARY_STATIC,
                });
                continue;
            }
            
            if (maxAPI.type.has(txt)) {
                this.tokenStack.push({
                    line,
                    startCharacter: column,
                    length,
                    tokenType: 'type',
                    tokenModifiers: MODIFIERS_DEFAULT_LIBRARY,
                });
                continue;
            }
            
            // Structs and interfaces (less common)
            if (maxAPI.struct.has(txt)) {
                this.tokenStack.push({
                    line,
                    startCharacter: column,
                    length,
                    tokenType: 'struct',
                    tokenModifiers: MODIFIERS_DEFAULT_LIBRARY,
                });
                continue;
            }
            
            if (maxAPI.interface.has(txt)) {
                this.tokenStack.push({
                    line,
                    startCharacter: column,
                    length,
                    tokenType: 'interface',
                    tokenModifiers: MODIFIERS_DEFAULT_LIBRARY,
                });
                continue;
            }
            
            // Namespaces (least common)
            if (maxAPI.namespace.has(txt)) {
                this.tokenStack.push({
                    line,
                    startCharacter: column,
                    length,
                    tokenType: 'namespace',
                    tokenModifiers: MODIFIERS_DEFAULT_LIBRARY,
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
