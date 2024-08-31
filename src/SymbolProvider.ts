import { CancellationToken, DocumentSymbol, DocumentSymbolProvider, ProviderResult, SymbolInformation, TextDocument } from "vscode";
import { mxsBackend } from "./backend/Backend.js";
import { Utilities } from "./utils.js";
import { ISymbolInfo } from "./types.js";
import { symbolDescriptionFromEnum, translateSymbolKind } from "./Symbol.js";

export class mxsSymbolProvider implements DocumentSymbolProvider
{
    public constructor(private backend: mxsBackend) { }

    private collectAllChildren(symbol: ISymbolInfo): DocumentSymbol
    {
        function dfs(currentSymbol: ISymbolInfo): DocumentSymbol    
        {
            // if (!currentSymbol.definition) { return; }

            const range = Utilities.lexicalRangeToRange(currentSymbol.definition!.range);

            const info = new DocumentSymbol(
                currentSymbol.name,
                symbolDescriptionFromEnum(currentSymbol.kind),
                translateSymbolKind(currentSymbol.kind),
                range,
                range // TODO: SelectionRange
            );

            if (currentSymbol.children?.length) {
                info.children = currentSymbol.children

                    .filter(child => 'name' in child && 'definition' in child)
                    .map(child => dfs(child))
            }
            return info;
        }
        return dfs(symbol);
    }

    provideDocumentSymbols(document: TextDocument, token: CancellationToken):
        ProviderResult<SymbolInformation[] | DocumentSymbol[]>
    {
        return new Promise((resolve) =>
        {
            const symbols = this.backend.listTopLevelSymbols(document.uri.toString(), false);
            const symbolsList: DocumentSymbol[] = [];

            for (const symbol of symbols) {
                if (!symbol.definition || !symbol.name) {
                    continue;
                }
                let result: DocumentSymbol;

                if (symbol.children?.length) {
                    // childrens
                    result = this.collectAllChildren(symbol);
                } else {
                    // range
                    const range = Utilities.lexicalRangeToRange(symbol.definition.range);
                    // const location = new Location( document.uri, range );
                    result = new DocumentSymbol(
                        symbol.name,
                        symbolDescriptionFromEnum(symbol.kind),
                        translateSymbolKind(symbol.kind),
                        range,
                        range // TODO: selectionRange
                    );
                }
                symbolsList.push(result);
                /*
                const totalTextLength = symbol.name.length + description.length + 1;
                if (symbol.kind === SymbolKind.LexerMode && totalTextLength < 80) {
                    // Add a marker to show parts which belong to a particular lexer mode.
                    // Not 100% perfect (i.e. right aligned, as symbol and description use different fonts),
                    // but good enough.
                    const markerWidth = 80 - totalTextLength;
                    description += " " + "-".repeat(markerWidth);
                }
                */
            }
            resolve(symbolsList);
        });
    }
}