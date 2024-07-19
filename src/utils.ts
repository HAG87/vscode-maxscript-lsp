import { Position, Range, TextDocument } from "vscode";
import { ExtensionHost } from "./ExtensionHost.js";
import { ILexicalRange } from "./types.js";

export class Utilities {
    public static isLanguageFile(document?: TextDocument | undefined): boolean {
        return document ? document.languageId === ExtensionHost.langSelector.language &&
                document.uri.scheme === ExtensionHost.langSelector.scheme : false;
    }
    
    public static lexicalRangeToRange(range: ILexicalRange): Range {
        const start = new Position(
            range.start.row === 0 ? 0 : range.start.row - 1,
            range.start.column
        );
        const end = new Position (
            range.end.row === 0 ? 0 : range.end.row - 1,
            range.end.column
        );
        return new Range(start, end);
    }
}