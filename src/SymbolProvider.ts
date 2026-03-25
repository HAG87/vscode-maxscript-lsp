import {
  CancellationToken, DocumentSymbol, DocumentSymbolProvider, ProviderResult,
  Range, SymbolInformation, TextDocument, workspace,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import { symbolDescriptionFromEnum, translateSymbolKind } from './SymbolTranslator.js';
import { ISymbolInfo } from '@backend/types.js';
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
            const config = workspace.getConfiguration('maxScript');
            const useAst = config.get<boolean>('providers.ast.symbolProvider', true);
            const fallbackToLegacy = config.get<boolean>('providers.fallbackToLegacy', true);
            const traceRouting = config.get<boolean>('providers.traceRouting', false);

            const sourceContext = this.backend.getContext(document.uri.toString());

            if (traceRouting && !sourceContext) {
                console.log(`[language-maxscript][SymbolProvider] sourceContext=undefined for ${document.uri.toString()}`);
            }

            let symbols: ISymbolInfo[] = [];

            if (useAst) {
                symbols = sourceContext?.buildSymbolTree(traceRouting) ?? [];
                if (traceRouting) {
                    console.log(`[language-maxscript][SymbolProvider] route=AST symbols=${symbols.length}`);
                }
            }

            if ((!symbols || symbols.length === 0) && fallbackToLegacy) {
                symbols = sourceContext?.listTopLevelSymbols(false) ?? [];
                if (traceRouting) {
                    console.log(`[language-maxscript][SymbolProvider] route=Legacy symbols=${symbols.length}`);
                }
            }

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