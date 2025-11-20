import {
  CancellationToken, DocumentSymbol, DocumentSymbolProvider, ProviderResult,
  Range, SymbolInformation, TextDocument,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import { symbolDescriptionFromEnum, translateSymbolKind } from './Symbol.js';
import { ISymbolInfo } from './types.js';
import { Utilities } from './utils.js';

export class mxsSymbolProvider implements DocumentSymbolProvider
{
    public constructor(private backend: mxsBackend) { }

    /**
     * Convert ISymbolInfo to VS Code DocumentSymbol
     */
    private symbolInfoToDocumentSymbol(symbol: ISymbolInfo): DocumentSymbol
    {
        // Use definition range if available, otherwise create a default range
        const range = symbol.definition 
            ? Utilities.lexicalRangeToRange(symbol.definition.range)
            : new Range(0, 0, 0, 0);

        const documentSymbol = new DocumentSymbol(
            symbol.name,
            symbolDescriptionFromEnum(symbol.kind),
            translateSymbolKind(symbol.kind),
            range,
            range // TODO: SelectionRange - should be the identifier range only
        );

        if (symbol.children?.length) {
            documentSymbol.children = symbol.children
                .filter(child => child.name && child.definition)
                .map(child => this.symbolInfoToDocumentSymbol(child));
        }

        return documentSymbol;
    }

    provideDocumentSymbols(document: TextDocument, _token: CancellationToken):
        ProviderResult<SymbolInformation[] | DocumentSymbol[]>
    {
        return new Promise((resolve) =>
        {
            const symbols = this.backend.getContext(document.uri.toString())?.buildSymbolTree();
            
            if (!symbols || symbols.length === 0) {
                resolve([]);
                return;
            }

            const symbolsList: DocumentSymbol[] = [];

            for (const symbol of symbols) {
                if (!symbol.definition || !symbol.name) {
                    continue;
                }
                // Use symbolInfoToDocumentSymbol for all symbols (handles both with and without children)
                symbolsList.push(this.symbolInfoToDocumentSymbol(symbol));
            }
            
            resolve(symbolsList);
        });
    }
}