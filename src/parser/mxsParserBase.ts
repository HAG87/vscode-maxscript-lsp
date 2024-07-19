import
{
    Parser,
    Token,
    TokenStream,
    // Lexer,
    // BufferedTokenStream,
    // CommonTokenStream,
} from 'antlr4ng';
import { mxsParser } from './mxsParser.js';
import MultiChannelTokenStream from './multiChannelTokenStream.js';
import { mxsLexer } from './mxsLexer.js';

export abstract class mxsParserBase extends Parser
{
    constructor(input: TokenStream)
    {
        super(input);
    }

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

    private nextTokenType(type: number, offset: number = 1)
    {
        let idx = this.getCurrentToken().tokenIndex + offset;
        let token = this.inputStream.get(idx);
        if (token) {
            return (token?.type === type);
        }
        return true;
    }

    private prevTokenType(type: number, offset: number = 1)
    {
        let idx = this.getCurrentToken().tokenIndex - offset;
        let token = this.inputStream.get(idx);
        if (token) {
            return (token?.type === type);
        }
        return true;
    }

    private nextTokenChannel(offset: number = 1)
    {
        let idx = this.getCurrentToken().tokenIndex + offset;
        let token = this.inputStream.get(idx);
        if (token) {
            return (token?.channel === mxsLexer.DEFAULT_TOKEN_CHANNEL);
        }
        return true;
    }

    private prevTokenChannel(offset: number = 1)
    {
        let idx = this.getCurrentToken().tokenIndex - offset;
        let token = this.inputStream.get(idx);
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
        return this.nextTokenType(mxsLexer.COLON, offset);
    }

    protected closedParens(offset: number = 1): boolean
    {
        return this.nextTokenType(mxsLexer.RPAREN, offset);
    }

    protected noWSBeNext(offset: number = 1): boolean
    {
        return this.nextTokenChannel(offset);
    }

    protected noNewLines(): boolean
    {
        return !this.lineTerminatorAhead();
    }

    protected noSpaces(offset: number = 1): boolean
    {
        return this.prevTokenChannel(offset);
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