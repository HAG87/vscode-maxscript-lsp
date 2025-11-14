import { Parser, Token, TokenStream } from 'antlr4ng';

import { mxsLexer } from './mxsLexer.js';
// import MultiChannelTokenStream from './multiChannelTokenStream.js';
import { mxsParser } from './mxsParser.js';

export abstract class mxsParserBase extends Parser
{
    // OPTIMIZATION: Use numeric keys instead of string concatenation
    // Format: (type << 24) | (tokenIndex << 8) | offset
    // This avoids string allocation and is faster to compute
    private predicateCache = new Map<number, boolean>();
    private static readonly CACHE_MAX_SIZE = 1000; // Prevent unbounded growth

    constructor(input: TokenStream)
    {
        super(input);
    }
    /*
    public enable(channel: number): void
    {
        // console.log('ENABLE CHANNEL: ' + channel);
        if (this.inputStream instanceof MultiChannelTokenStream) {
            (this.inputStream as MultiChannelTokenStream).enable(channel);
        }
    }

    public disable(channel: number): void
    {
        // console.log('DISABLE CHANNEL: ' + channel);
        if (this.inputStream instanceof MultiChannelTokenStream) {
            (this.inputStream as MultiChannelTokenStream).disable(channel);
        }
    }
    */
    // OPTIMIZATION: Inline helper to generate numeric cache keys
    // Uses bit packing: (predicateType << 24) | (tokenIndex << 8) | offset
    private makeCacheKey(predicateType: number, tokenIndex: number, offset: number): number
    {
        return (predicateType << 24) | ((tokenIndex & 0xFFFF) << 8) | (offset & 0xFF);
    }

    private nextTokenType(type: number, offset: number = 1)
    {
        const currentToken = this.getCurrentToken();
        const idx = currentToken.tokenIndex + offset;
        const token = this.inputStream.get(idx);
        return token ? token.type === type : true;
    }

    private prevTokenType(type: number, offset: number = 1)
    {
        const currentToken = this.getCurrentToken();
        const idx = currentToken.tokenIndex - offset;
        const token = this.inputStream.get(idx);
        return token ? token.type === type : true;
    }

    private nextTokenChannel(offset: number = 1)
    {
        const currentToken = this.getCurrentToken();
        const idx = currentToken.tokenIndex + offset;
        const token = this.inputStream.get(idx);
        // OPTIMIZATION: Remove optional chaining - token is checked first
        return token ? token.channel === mxsLexer.DEFAULT_TOKEN_CHANNEL : true;
    }

    private prevTokenChannel(offset: number = 1)
    {
        const currentToken = this.getCurrentToken();
        const idx = currentToken.tokenIndex - offset;
        const token = this.inputStream.get(idx);
        // OPTIMIZATION: Remove optional chaining
        return token ? token.channel === mxsLexer.DEFAULT_TOKEN_CHANNEL : true;
    }

    protected itsNot(token: number): boolean
    {
        return this.inputStream.LA(1) !== token;
    }

    // OPTIMIZATION: Use numeric cache keys (predicate type IDs)
    private static readonly PRED_COLON = 1;
    private static readonly PRED_PARENS = 2;
    private static readonly PRED_NOWS = 3;

    // used for param:name
    protected colonBeNext(offset: number = 1): boolean
    {
        const currentToken = this.getCurrentToken();
        if (!currentToken) return false;
        
        const key = this.makeCacheKey(mxsParserBase.PRED_COLON, currentToken.tokenIndex, offset);
        
        let result = this.predicateCache.get(key);
        if (result !== undefined) {
            return result;
        }
        
        result = this.nextTokenType(mxsLexer.COLON, offset);
        this.predicateCache.set(key, result);
        return result;
    }

    protected closedParens(offset: number = 1): boolean
    {
        const currentToken = this.getCurrentToken();
        if (!currentToken) return false;
        
        const key = this.makeCacheKey(mxsParserBase.PRED_PARENS, currentToken.tokenIndex, offset);
        
        let result = this.predicateCache.get(key);
        if (result !== undefined) {
            return result;
        }
        
        result = this.nextTokenType(mxsLexer.RPAREN, offset);
        this.predicateCache.set(key, result);
        return result;
    }

    protected noWSBeNext(offset: number = 1): boolean
    {
        const currentToken = this.getCurrentToken();
        if (!currentToken) return true;
        
        const key = this.makeCacheKey(mxsParserBase.PRED_NOWS, currentToken.tokenIndex, offset);
        
        let result = this.predicateCache.get(key);
        if (result !== undefined) {
            return result;
        }
        
        result = this.nextTokenChannel(offset);
        this.predicateCache.set(key, result);
        return result;
    }

    protected noNewLines(): boolean
    {
        return !this.lineTerminatorAhead();
    }

    protected noSpaces(offset: number = 1): boolean
    {
        return this.prevTokenChannel(offset);
    }

    // OPTIMIZATION: Clear cache periodically to prevent unbounded growth
    public override consume(): Token
    {
        // Clear cache when it gets too large to prevent memory issues
        if (this.predicateCache.size > mxsParserBase.CACHE_MAX_SIZE) {
            this.predicateCache.clear();
        }
        return super.consume();
    }

    /**
     * Returns {true} if on the current index of the parser's
     * token stream a token exists on the {HIDDEN} channel which
     * either is a line terminator, or is a multi line comment that
     * contains a line terminator.
     *
     * @return {@code true} iff on the current index of the parser's
     * token stream a token exists on the {@code HIDDEN} channel which
     * either is a line terminator, or is a multi line comment that
     * contains a line terminator.
     */
    protected lineTerminatorAhead(/* channel: number = mxsLexer.NEWLINE_CHANNEL */): boolean
    {
        // OPTIMIZATION: Cache current token
        const currentToken = this.getCurrentToken();
        if (!currentToken) return false;
        
        // Get the token ahead of the current index.
        let idx: number = currentToken.tokenIndex - 1;
        if (idx < 0) return false;
        let ahead: Token = this.inputStream.get(idx);

        if (ahead.type === mxsParser.NL || ahead.type === mxsParser.BLOCK_COMMENT) {
            // There is definitely a line terminator ahead.
            return true;
        }
        /*
        if (ahead.channel === channel) {
            // There is definitely a line terminator ahead.
            return true;
        }
        */
        // look one token back
        idx = currentToken.tokenIndex - 2;
        if (idx < 0) return false;
        ahead = this.inputStream.get(idx);

        // OPTIMIZATION: Single-pass line terminator check
        // Check for NL token first (most common case)
        if (ahead.type === mxsParser.NL) {
            return true;
        }
        
        // OPTIMIZATION: Only check text if it's a block comment
        if (ahead.type === mxsParser.BLOCK_COMMENT) {
            const text = ahead.text;
            // Single pass check - indexOf returns early on match
            return text ? (text.indexOf("\r") !== -1 || text.indexOf("\n") !== -1) : false;
        }

        return false;
    }
}