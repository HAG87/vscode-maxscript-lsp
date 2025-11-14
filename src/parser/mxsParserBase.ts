import { Parser, Token, TokenStream } from 'antlr4ng';

import { mxsLexer } from './mxsLexer.js';
// import MultiChannelTokenStream from './multiChannelTokenStream.js';
import { mxsParser } from './mxsParser.js';

export abstract class mxsParserBase extends Parser
{
    // Cache for predicate results to avoid repeated token lookups
    private predicateCache = new Map<string, boolean>();

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
    private nextTokenType(type: number, offset: number = 1)
    {
        const idx = this.getCurrentToken().tokenIndex + offset;
        const token = this.inputStream.get(idx);
        return token ? token.type === type : true;
    }

    private prevTokenType(type: number, offset: number = 1)
    {
        const idx = this.getCurrentToken().tokenIndex - offset;
        const token = this.inputStream.get(idx);
        return token ? token.type === type : true;
    }

    private nextTokenChannel(offset: number = 1)
    {
        const idx = this.getCurrentToken().tokenIndex + offset;
        const token = this.inputStream.get(idx);
        if (token) {
            return (token?.channel === mxsLexer.DEFAULT_TOKEN_CHANNEL);
        }
        return true;
    }

    private prevTokenChannel(offset: number = 1)
    {
        const idx = this.getCurrentToken().tokenIndex - offset;
        const token = this.inputStream.get(idx);
        if (token) {
            return (token?.channel === mxsLexer.DEFAULT_TOKEN_CHANNEL);
        }
        return true;
    }

    protected itsNot(token: number): boolean
    {
        return this.inputStream.LA(1) !== token;
    }

    // used for param:name
    protected colonBeNext(offset: number = 1): boolean
    {
        const key = `colon_${this.getCurrentToken().tokenIndex}_${offset}`;
        if (this.predicateCache.has(key)) {
            return this.predicateCache.get(key)!;
        }
        const result = this.nextTokenType(mxsLexer.COLON, offset);
        this.predicateCache.set(key, result);
        return result;
    }

    protected closedParens(offset: number = 1): boolean
    {
        const key = `parens_${this.getCurrentToken().tokenIndex}_${offset}`;
        if (this.predicateCache.has(key)) {
            return this.predicateCache.get(key)!;
        }
        const result = this.nextTokenType(mxsLexer.RPAREN, offset);
        this.predicateCache.set(key, result);
        return result;
    }

    protected noWSBeNext(offset: number = 1): boolean
    {
        const key = `noWS_${this.getCurrentToken().tokenIndex}_${offset}`;
        if (this.predicateCache.has(key)) {
            return this.predicateCache.get(key)!;
        }
        const result = this.nextTokenChannel(offset);
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

    // Override consume to clear predicate cache when advancing
    public override consume(): Token
    {
        this.predicateCache.clear();
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
        // Get the token ahead of the current index.
        let idx: number = this.getCurrentToken().tokenIndex - 1;
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
        idx = this.getCurrentToken().tokenIndex - 2;
        if (idx < 0) return false;
        ahead = this.inputStream.get(idx);

        // Get the token's text and type.
        const text = ahead.text;
        const type = ahead.type;

        return (type === mxsParser.BLOCK_COMMENT && (text?.includes("\r") || text?.includes("\n"))) ||
            (type === mxsParser.NL);
        // return false;
    }
}