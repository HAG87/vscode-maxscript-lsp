import { CharStream, CommonTokenStream, Token } from 'antlr4ng';

import { mxsLexer } from '../parser/mxsLexer.js';
import {
  IDefinition, ILexicalRange, ISymbolInfo, SymbolKind,
} from '../types.js';

const tokenTypeToSymbolKind: Map<number, SymbolKind> = new Map<number, SymbolKind>([
    [mxsLexer.FN, SymbolKind.Function],
    [mxsLexer.STRUCT, SymbolKind.Struct],
    [mxsLexer.Rollout, SymbolKind.Rollout],
    [mxsLexer.Utility, SymbolKind.Utility],
    [mxsLexer.MacroScript, SymbolKind.MacroScript],
    [mxsLexer.Attributes, SymbolKind.Attributes],
    [mxsLexer.Parameters, SymbolKind.Parameters],
    [mxsLexer.Tool, SymbolKind.Tool],
    [mxsLexer.Plugin, SymbolKind.Plugin],
    [mxsLexer.GLOBAL, SymbolKind.Declaration],
    [mxsLexer.GLOB, SymbolKind.Identifier],
]);
export class mxsSimpleSymbolProvider
{
    private lexer: mxsLexer;
    private tokenStream: CommonTokenStream;

    constructor()
    {
        // this.tokenStream = context.getTokenStream;
        this.lexer = new mxsLexer(CharStream.fromString(''));
        this.lexer.removeErrorListeners();
        this.tokenStream = new CommonTokenStream(this.lexer);
    }

    private reset(source: string)
    {
        this.lexer.inputStream = CharStream.fromString(source);
        this.lexer.reset();
        this.tokenStream.reset()
        this.tokenStream.setTokenSource(this.lexer);
    }
    private getMarkers(): Token[]
    {
        /*
        // this is not working as expected

        const tokensToRetrieve = new Set<number>([
            mxsLexer.MacroScript,
            mxsLexer.Rollout,
            mxsLexer.Tool,
            mxsLexer.Utility,
            mxsLexer.Parameters,
            mxsLexer.Plugin,
            mxsLexer.Attributes,
            mxsLexer.FN,
            mxsLexer.STRUCT,
            mxsLexer.GLOBAL,
            mxsLexer.GLOB,
        ])
        // return this.tokenStream.getTokens(undefined, undefined, tokensToRetrieve)
        // */
        this.tokenStream.fill()
        return this.tokenStream.getTokens().filter(token =>
        {
            switch (token.type) {
                // case mxsLexer.GLOB:
                case mxsLexer.Utility:
                case mxsLexer.MacroScript:
                case mxsLexer.Rollout:
                case mxsLexer.Attributes:
                case mxsLexer.Parameters:
                case mxsLexer.Tool:
                case mxsLexer.Plugin:
                case mxsLexer.GLOBAL:
                case mxsLexer.FN:
                case mxsLexer.STRUCT:
                    return true;
                default:
                    return false;
            }
        })
    }
    public getSymbols(uri: string, source: string): ISymbolInfo[]
    {
        const result: ISymbolInfo[] = [];
        // console.log(`${this.context.sourceUri} --> ${this.tokenStream.getTokens().length}`)
        this.reset(source)
        const tokens = this.getMarkers()
        // console.log(`-----> ${uri}`)
        for (const token of tokens) {
            let index = token.tokenIndex + 1
            let nextIndex = this.tokenStream.nextTokenOnChannel(index, 0)
            let next = this.tokenStream.getTokens(nextIndex, nextIndex)[0]

            while (next.type === mxsLexer.NL) {
                index++;
                nextIndex = this.tokenStream.nextTokenOnChannel(index, 0)
                next = this.tokenStream.getTokens(index++, index)[0]
            }
            if (next.type === mxsLexer.ID) {
                //collect
                result.push(<ISymbolInfo>{
                    name: next.text!,
                    kind: tokenTypeToSymbolKind.get(token.type),
                    source: uri,
                    definition: <IDefinition>{
                        range: <ILexicalRange>{
                            start: {
                                row: next.line,
                                column: next.column
                            },
                            end: {
                                row: next.line,
                                column: next.column + next.text!.length
                            }
                        }
                    }

                })
            }
        }
        return result;
    }
}