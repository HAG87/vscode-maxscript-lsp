import
{
    CharStream,
    Lexer,
    Token,
} from "antlr4ng";
import { mxsLexer } from "./mxsLexer.js";

export abstract class mxsLexerBase extends Lexer
{
    public constructor(input: CharStream)
    {
        super(input);
    }

    /*
    private lastToken: Token;

    public override nextToken(): Token
    {
        // Get the next token.
        const next: Token = super.nextToken();
        // console.log(`${next.line} : ${next.channel} ${JSON.stringify(next.text)}`);
        if (next.channel == Token.DEFAULT_CHANNEL) {
            // Keep track of the last token on the default channel.
            this.lastToken = next;
        }
        return next;
    }
    */

    public override emit(): Token
    {
        //  sanitize NL tokens
        if (this.type === mxsLexer.NL) {
            this.text = this.text.includes(';') ? ';' : '\r\n';
        }
        return super.emit();
    }

    protected noWsOrEqualNext(): boolean
    {
        return (
            this.inputStream.LA(1) > 32 &&
            this.inputStream.LA(1) !== this.text.charCodeAt(0)
        );
    }

    protected noWsOrEqualBefore(): boolean
    {
        return (
            this.inputStream.LA(-1) > 32 &&
            this.inputStream.LA(-1) !== this.text.charCodeAt(0)
        );
    }
}