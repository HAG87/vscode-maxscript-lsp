import
    {
        CharStream,
        Lexer,
        Token,
        // Token
    } from "antlr4ng";
import { mxsLexer } from "./mxsLexer.js";
// import { mxsLexer } from "./mxsLexer";

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
    // */

    public override emit(): Token {
        /*
        switch (this.type) {
            case mxsLexer.BLOCK_COMMENT:
                // console.log(`cmmB | ${this.line} > ${JSON.stringify(this.text)}`);
                break;
            case mxsLexer.LINE_COMMENT:
                // console.log(`cmmL | ${this.line} > ${JSON.stringify(this.text)}`);
                break;
            case mxsLexer.WS:
                // console.log("\x1b[32m%s\x1b[0m", `ws | ${this.line} > ${JSON.stringify(this.text)}`);
                break;
            case mxsLexer.NL:
                console.log("\x1b[35m%s\x1b[0m", `nl | ${this.line} > ${JSON.stringify(this.text)}`);
                break;
            default:
                console.log('\x1b[36m%s\x1b[0m', `${this.line} > ${JSON.stringify(this.text)}`);
                break;
        } // */
        //  sanitize tokens
        if (this.type === mxsLexer.NL) this.text = '\r\n';
        return super.emit();
    }

    protected followed(charcode: number = 32): boolean
    {
        //  console.log(super.nextToken().channel);
        //  console.log(this.text.charCodeAt(0));
        //  console.log(`followed: ${(this.inputStream.LA(1) > 32) && (this.inputStream.LA(1) !== 45)} -> ${JSON.stringify(String.fromCharCode(this.inputStream.LA(1)))}`);
        return (
            this.inputStream.LA(1) > charcode &&
            this.inputStream.LA(1) !== this.text.charCodeAt(0)
        );
    }

    protected preceeded(charcode: number = 32): boolean
    {
        return (
            this.inputStream.LA(-1) > charcode &&
            this.inputStream.LA(-1) !== this.text.charCodeAt(0)
        );
    }
}