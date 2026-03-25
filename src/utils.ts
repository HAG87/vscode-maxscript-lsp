import * as Path from 'path';
import { Position, Range, TextDocument, Uri } from 'vscode';

import { ExtensionHost } from './ExtensionHost.js';
import { ILexicalRange, ISymbolInfo } from '@backend/types.js';

export class Utilities
{
    /**
     * Deduplicates edit targets by URI and start position, keeping the widest range.
     */
    private static mergeUniqueUriRanges(
        targets: { uri: Uri; range: Range }[]): { uri: Uri; range: Range }[]
    {
        const targetsByUri = new Map<string, Map<string, { uri: Uri; range: Range }>>();

        for (const target of targets) {
            const uriKey = target.uri.toString();
            let ranges = targetsByUri.get(uriKey);
            if (!ranges) {
                ranges = new Map();
                targetsByUri.set(uriKey, ranges);
            }

            const key = `${target.range.start.line}:${target.range.start.character}`;
            const existing = ranges.get(key);
            if (!existing) {
                ranges.set(key, target);
                continue;
            }

            const isWider =
                target.range.end.line > existing.range.end.line ||
                (target.range.end.line === existing.range.end.line &&
                    target.range.end.character > existing.range.end.character);

            if (isWider) {
                ranges.set(key, target);
            }
        }

        const result: { uri: Uri; range: Range }[] = [];
        for (const ranges of targetsByUri.values()) {
            for (const target of ranges.values()) {
                result.push(target);
            }
        }

        return result;
    }

    /**
     * Returns true when the document belongs to this extension language selector.
     */
    public static isLanguageFile(document?: TextDocument | undefined): boolean
    {
        return document ? document.languageId === ExtensionHost.langSelector.language &&
            document.uri.scheme === ExtensionHost.langSelector.scheme : false;
    }

    /**
     * Converts a 1-based lexical range into a VS Code range.
     */
    public static lexicalRangeToRange(range: ILexicalRange): Range
    {
        // ILexicalRange uses ANTLR's 1-based line numbers
        // Convert to VS Code's 0-based Position
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

    /**
     * Converts a VS Code range into a 1-based lexical range.
     */
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

    /**
     * Computes the identifier-only range for a symbol definition.
     */
    public static symbolNameRange(symbol: ISymbolInfo): Range
    {
        const definition = symbol.definition!;
        const rangeStart = definition.range.start;

        // Use the definition text to align to the identifier itself when wrappers/prefixes exist.
        let startOffset = 0;
        const definitionText = definition.text ?? '';
        if (definitionText.length > 0) {
            const exactIndex = definitionText.indexOf(symbol.name);
            if (exactIndex >= 0) {
                startOffset = exactIndex;
            } else {
                const ciIndex = definitionText.toLowerCase().indexOf(symbol.name.toLowerCase());
                if (ciIndex >= 0) {
                    startOffset = ciIndex;
                }
            }
        }

        const startColumn = rangeStart.column + startOffset;
        const fallbackEndColumn = startColumn + symbol.name.length;

        return new Range(
            rangeStart.row - 1,
            startColumn,
            rangeStart.row - 1,
            fallbackEndColumn,
        );
    }

    /**
     * Builds deduplicated symbol targets (URI + range) for bulk operations.
     */
    public static symbolTargets(symbols: ISymbolInfo[]): { uri: Uri; range: Range }[]
    {
        const targets: { uri: Uri; range: Range }[] = [];

        for (const symbol of symbols) {
            if (!symbol.definition) {
                continue;
            }

            targets.push({
                uri: Uri.parse(symbol.source),
                range: Utilities.symbolNameRange(symbol)
            });
        }

        return Utilities.mergeUniqueUriRanges(targets);
    }

    /**
     * Returns symbol targets and ensures the cursor word is included as a fallback target.
     */
    public static symbolTargetsWithWordAtPosition(
        symbols: ISymbolInfo[],
        document: TextDocument,
        position: Position): { uri: Uri; range: Range }[]
    {
        const targets = Utilities.symbolTargets(symbols);
        const wordRange = document.getWordRangeAtPosition(position);

        if (!wordRange) {
            return targets;
        }

        return Utilities.mergeUniqueUriRanges([
            ...targets,
            {
                uri: document.uri,
                range: wordRange
            }
        ]);
    }

    /**
     * Creates a sibling file path by applying a prefix to the file name.
     */
    public static prefixFile = (path: string, prefix: string): string => Path.join(path, '..', prefix + Path.basename(path));
}