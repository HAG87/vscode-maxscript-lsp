import { BufferedTokenStream, TokenSource, Token } from "antlr4ng";
import { mxsParser } from "../mxsParser.js";

// export default class MultiChannelTokenStream extends CommonTokenStream
export default class MultiChannelTokenStream extends BufferedTokenStream
{
    private channels: number[] = [Token.DEFAULT_CHANNEL];

    constructor(tokenSource: TokenSource)
    {
        super(tokenSource);
    }

    private matches(channel: number, channels: number[]): boolean
    {
        return channels.includes(channel);
    }

    public enable(channel: number): void
    {
        if (this.channels.includes(channel)) {
            return;
        }
        this.channels = [...this.channels, channel];

        let i = this.p - 1;

        while (i >= 0) {
            // const token = this.tokens.get(i);
            const token = this.tokens[i];
            // console.log(token.channel);
            if (token.channel === channel || !this.matches(token.channel, this.channels)) {
                i--;
            } else {
                break;
            }
        }
        // this.p = i + 1;
        if (this.tokens[i + 1].channel === 0 && this.tokens[i + 1].type !== mxsParser.EOF) { this.p = i + 1; }

        // let tok = this.tokens[this.p];
        // console.log(`START token: ${JSON.stringify(tok.text)} ${tok.line}:${tok.column}`);
    }

    public startAhead(channel: number): void
    {
        if (this.channels.includes(channel)) {
            return;
        }
        this.channels = [...this.channels, channel];
    }

    public disable(channel: number): void
    {
        this.channels = this.channels.filter(c => c !== channel);

        // rewind so I can call this at the end of the rule
        // will not work if rule needs to end in NL
        /*
        let i = this.p - 1;

        while (i >= 0) {
            // console.log(JSON.stringify(this.tokens[i].text));
            // const token = this.tokens.get(i);
            const token = this.tokens[i];
            // console.log(JSON.stringify('End should be at: ' + this.tokens[i].text));
            // console.log(token.channel);
            if (token.channel === channel || !this.matches(token.channel, this.channels)) {
                i--;
            } else {
                break;
            }
        }
        // this.p = i;
        this.p = i + 1;
        // */

        // let tok = this.tokens[this.p];
        // console.log(`END token: ${JSON.stringify(tok.text)} ${tok.line}:${tok.column}`);
    }

    public override adjustSeekIndex(i: number): number
    {
        return this.nextTokenOnChannel(i, this.channels);
    }

    public override nextTokenOnChannel(i: number, channels: number | number[]): number
    {
        this.sync(i);
        if (i >= this.size) {
            return this.size - 1;
        }

        let token = this.tokens[i];
        while (!this.matches(token.channel, <number[]>channels)) {
            // console.log(`${i.toString()} : ${token.text} | ${token.channel.toString()}`);
            if (token.type === Token.EOF) {
                return i;
            }
            i++;
            this.sync(i);
            token = this.tokens[i];
        }
        return i;
    }

    public override previousTokenOnChannel(i: number, channels: number | number[]): number
    {
        this.sync(i);
        if (i >= this.size) {
            return this.size - 1;
        }

        while (i >= 0) {
            const token = this.tokens[i];
            if (token.type === Token.EOF || this.matches(token.channel, <number[]>channels)) {
                return i;
            }
            i--;
        }
        return i;
    }

    public override LB(k: number): Token | null
    {
        // /*
        if (k === 0 || this.index - k < 0) {
            return null;
        }
        let i = this.index;
        let n = 1;
        // find k good tokens looking backwards
        while (n <= k) {
            // skip off-channel tokens
            i = this.previousTokenOnChannel(i - 1, this.channels);
            n += 1;
        }
        // */
        /*
        if (k === 0 || (this.p - k) < 0) {
            return null;
        }
        let i = this.p;

        for (let n = 1; n <= k; n++) {
            i = this.previousTokenOnChannel(i - 1, this.channels);
        }
        // */
        return i < 0 ? null : this.tokens[i];
    }

    public override LT(k: number): Token | null
    {
        this.lazyInit();
        if (k === 0) {
            return null;
        }
        if (k < 0) {
            return this.LB(-k);
        }
        // /*
        let i = this.index;
        let n = 1; // we know tokens[pos] is a good one
        // find k good tokens
        while (n < k) {
            // skip off-channel tokens, but make sure to not look past EOF
            if (this.sync(i + 1)) {
                i = this.nextTokenOnChannel(i + 1, this.channels);
            }
            n += 1;
        }
        // */
        /*
        let i = this.p;
        for (let n = 1; n < k; n++) {
            if (this.sync(i + 1)) {
                i = this.nextTokenOnChannel(i + 1, this.channels);
            }
        }
        // console.log (JSON.stringify(this.tokens[i].text));
        // */
        return this.tokens[i];
    }

    // Count EOF just once.
    public getNumberOfOnChannelTokens(): number
    {
        let n = 0;
        this.fill();
        for (let i = 0; i < this.tokens.length; i++) {
            const t = this.tokens[i];

            if (this.channels.includes(t.channel)) {
                n++;
            }
            if (t.type === Token.EOF) {
                break;
            }
        }
        return n;
    }
}