import { CancellationToken, Location, Position, ProviderResult, ReferenceContext, ReferenceProvider, TextDocument } from "vscode";
import { mxsBackend } from "./backend/Backend.js";

export class mxsReferenceProvider implements ReferenceProvider
{
    public constructor(private backend: mxsBackend) { }
    
    provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): ProviderResult<Location[]>
    {
        throw new Error("Method not implemented.");
        /*
        return new Promise((resolve) => {
            const info = this.backend.symbolInfoAtPosition(document.fileName, position.character, position.line + 1,
                false);

            const result: Location[] = [];
            if (info) {
                const occurrences = this.backend.getSymbolOccurrences(document.fileName, info.name);
                for (const symbol of occurrences) {
                    if (symbol.definition) {
                        const range = new Range(
                            symbol.definition.range.start.row - 1,
                            symbol.definition.range.start.column,
                            symbol.definition.range.end.row - 1,
                            symbol.definition.range.start.column + info.name.length,
                        );
                        const location = new Location(Uri.file(symbol.source), range);
                        result.push(location);
                    }
                }

                resolve(result);
            }
        });
        */
    }
}