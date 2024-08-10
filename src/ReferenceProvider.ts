import { CancellationToken, Location, Position, ProviderResult, ReferenceContext, ReferenceProvider, TextDocument, Uri } from "vscode";
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
            const occurrences =
                this.backend.symbolInfoAtPositionCtxOccurrences(
                    document.uri,
                    position.line + 1,
                    position.character);

            if (occurrences) {
                const result: Location[] = [];
                for (const symbol of occurrences) {
                    if (symbol.definition) {
                        const location =
                            new Location(
                                Uri.parse(symbol.source),
                                Utilities.symbolNameRange(symbol)
                            );
                        result.push(location);
                    }
                }
                resolve(result);
            } else resolve(undefined);
        });
    }
}