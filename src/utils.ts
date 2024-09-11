import { Position, Range, TextDocument } from "vscode";
import { ExtensionHost } from "./ExtensionHost.js";
import { ILexicalRange, ISymbolInfo } from "./types.js";
import * as Path from 'path';

export class Utilities
{
    public static isLanguageFile(document?: TextDocument | undefined): boolean
    {
        return document ? document.languageId === ExtensionHost.langSelector.language &&
            document.uri.scheme === ExtensionHost.langSelector.scheme : false;
    }

    public static lexicalRangeToRange(range: ILexicalRange): Range
    {
        const start = new Position(
            range.start.row === 0 ? 0 : range.start.row - 1,
            range.start.column
        );
        const end = new Position(
            range.end.row === 0 ? 0 : range.end.row - 1,
            range.end.column
        );
        return new Range(start, end);
    }

    public static rangeToLexicalRange(range: Range): ILexicalRange
    {
        return {
            start: {
                row: range.start.line + 1,
                column: range.start.character
            },
            end: {
                row: range.end.line + 1,
                column: range.end.character
            }
        };
    }

    public static symbolNameRange(symbol: ISymbolInfo): Range
    {
        return new Range(
            symbol.definition!.range.start.row - 1,
            symbol.definition!.range.start.column,
            symbol.definition!.range.end.row - 1,
            symbol.definition!.range.start.column + symbol.name.length,
        );
    }

    public static prefixFile = (path: string, prefix: string): string => Path.join(path, '..', prefix + Path.basename(path));

}