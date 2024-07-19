import { CancellationToken, DocumentSymbol, DocumentSymbolProvider, ProviderResult, SymbolInformation, TextDocument } from "vscode";
import { mxsBackend } from "./backend/Backend.js";

export class mxsSymbolProvider implements DocumentSymbolProvider
{
    public constructor(private backend: mxsBackend) { }
    provideDocumentSymbols(document: TextDocument, token: CancellationToken): 
        ProviderResult<SymbolInformation[] | DocumentSymbol[]>
    {
        throw new Error("Method not implemented.");
        /*
        return new Promise((resolve) => {
            const symbols = this.backend.listTopLevelSymbols(document.fileName, false);
            
            const symbolsList = [];
            
            for (const symbol of symbols) {
                if (!symbol.definition) {
                    continue;
                }

                const startRow = symbol.definition.range.start.row > 0 ? symbol.definition.range.start.row - 1 : 0;
                const endRow = symbol.definition.range.end.row > 0 ? symbol.definition.range.end.row - 1 : 0;
                const range = new Range(startRow, symbol.definition.range.start.column, endRow,
                    symbol.definition.range.end.column);
                const location = new Location(Uri.file(symbol.source), range);

                let description = symbolDescriptionFromEnum(symbol.kind);
                const kind = translateSymbolKind(symbol.kind);
                const totalTextLength = symbol.name.length + description.length + 1;
                if (symbol.kind === SymbolKind.LexerMode && totalTextLength < 80) {
                    // Add a marker to show parts which belong to a particular lexer mode.
                    // Not 100% perfect (i.e. right aligned, as symbol and description use different fonts),
                    // but good enough.
                    const markerWidth = 80 - totalTextLength;
                    description += " " + "-".repeat(markerWidth);
                }
                const info = new SymbolInformation(symbol.name, kind, description, location);
                symbolsList.push(info);
            }

            resolve(symbolsList);
        });
        */
    }

}