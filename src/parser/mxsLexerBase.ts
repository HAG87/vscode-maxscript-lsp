import { CharStream, Lexer, Token } from 'antlr4ng';

import { mxsLexer } from './mxsLexer.js';

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

    protected noAlphanumBefore(): boolean
    {
        if (this.inputStream.LA(-1) == 126) return true;
        if (this.inputStream.LA(-1) == 255) return true;

        if (this.inputStream.LA(-1) <= 33) return true;
        if (this.inputStream.LA(-1) >= 35 && this.inputStream.LA(-1) <= 40) return true;
        if (this.inputStream.LA(-1) >= 42 && this.inputStream.LA(-1) <= 47) return true;
        if (this.inputStream.LA(-1) >= 58 && this.inputStream.LA(-1) <= 63) return true;
        if (this.inputStream.LA(-1) >= 91 && this.inputStream.LA(-1) <= 92) return true;
        if (this.inputStream.LA(-1) >= 94 && this.inputStream.LA(-1) <= 96) return true;
        if (this.inputStream.LA(-1) >= 123 && this.inputStream.LA(-1) <= 124) return true;
        
        return false;
    }
}