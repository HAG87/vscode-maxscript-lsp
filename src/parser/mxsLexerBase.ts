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
        // Sanitize NL tokens
        if (this.type === mxsLexer.NL) {
            // Single pass: check for semicolon once
            const txt = this.text;
            this.text = txt.indexOf(';') !== -1 ? ';' : '\r\n';
        }
        return super.emit();
    }

protected noWsOrEqualNext(): boolean
    {
        const la = this.inputStream.LA(1);
        // Single comparison instead of two separate ones
        return la > 32 && la !== this.text.charCodeAt(0);
    }

    protected noWsOrEqualBefore(): boolean
    {
        const la = this.inputStream.LA(-1);
        return la > 32 && la !== this.text.charCodeAt(0);
    }

    /*
    private static readonly IS_NON_ALPHANUM = (() => {
        const arr = new Array(256).fill(false);
        // Mark non-alphanumeric positions
        for (let i = 0; i <= 33; i++) arr[i] = true;
        // ... mark other ranges
        return arr;
    })();

    protected noAlphanumBefore(): boolean
    {
        const la = this.inputStream.LA(-1);
        return la >= 0 && la < 256 ? mxsLexerBase.IS_NON_ALPHANUM[la] : false;
    }
    */
   
    private static readonly NON_ALPHANUM_CHARS = new Set([
        // Control & whitespace (0-33)
        ...Array.from({ length: 34 }, (_, i) => i),
        // Special chars: # $ % & ' ( ) (35-40)
        35, 36, 37, 38, 39, 40,
        // Operators: * + , - . / (42-47)
        42, 43, 44, 45, 46, 47,
        // Punctuation: : ; < = > ? @ (58-63, 64)
        58, 59, 60, 61, 62, 63, 64,
        // Brackets: [ \ ] (91-93)
        91, 92, 93,
        // More special: ^ _ ` (94-96)
        94, 95, 96,
        // Braces: { | } (123-125)
        123, 124, 125,
        // Tilde and DEL (126, 127, 255)
        126, 127, 255
    ]);

    protected noAlphanumBefore(): boolean
    {
        const la = this.inputStream.LA(-1);
        // Single Set lookup instead of 8 range comparisons
        return mxsLexerBase.NON_ALPHANUM_CHARS.has(la);
    }
}