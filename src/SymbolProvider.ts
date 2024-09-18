import {
  CancellationToken, DocumentSymbol, DocumentSymbolProvider, ProviderResult,
  SymbolInformation, TextDocument,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import { symbolDescriptionFromEnum, translateSymbolKind } from './Symbol.js';
import { ISymbolInfo } from './types.js';
import { Utilities } from './utils.js';

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

    provideDocumentSymbols(document: TextDocument, _token: CancellationToken):
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
                if (symbol.children?.length) {
                    // childrens
                    symbolsList.push(this.collectAllChildren(symbol));
                } else {
                    // range
                    const range = Utilities.lexicalRangeToRange(symbol.definition.range);
                    symbolsList.push(new DocumentSymbol(
                        symbol.name,
                        symbolDescriptionFromEnum(symbol.kind),
                        translateSymbolKind(symbol.kind),
                        range,
                        range // TODO: selectionRange
                    ));
                }
            }
            resolve(symbolsList);
        });
    }
}