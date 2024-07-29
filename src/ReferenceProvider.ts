import { CancellationToken, Location, Position, ProviderResult, Range, ReferenceContext, ReferenceProvider, TextDocument, Uri } from "vscode";
import { mxsBackend } from "./backend/Backend.js";
import { Utilities } from "./utils.js";

export class mxsReferenceProvider implements ReferenceProvider
{
    public constructor(private backend: mxsBackend) { }

    provideReferences(
        document: TextDocument,
        position: Position,
        context: ReferenceContext,
        token: CancellationToken): ProviderResult<Location[]>
    {
        return new Promise((resolve) =>
        {
            //TODO: fix info retrieval!
            // maybe related on how im resolving the listener, and scopes
            const info = this.backend.symbolInfoAtPosition(
                document.uri,
                position.line + 1,
                position.character,
                true);

            const result: Location[] = [];

            if (info) {
                const occurrences = this.backend.getSymbolOccurrences(document.uri, info.name);
                for (const symbol of occurrences) {
                    if (symbol.definition) {

                        const range = new Range(
                            symbol.definition.range.start.row - 1,
                            symbol.definition.range.start.column,
                            symbol.definition.range.end.row - 1,
                            symbol.definition.range.start.column + info.name.length,
                        );

                        const location = new Location(Uri.parse(symbol.source), range);
                        result.push(location);
                    }
                }
                resolve(result);
            } else resolve(null);
        });
    }
}