import { CancellationToken, Definition, DefinitionLink, DefinitionProvider, Location, Position, ProviderResult, TextDocument, Uri } from "vscode";
import { mxsBackend } from "./backend/Backend.js";
import { Utilities } from "./utils.js";

export class mxsDefinitionProvider implements DefinitionProvider
{
    public constructor(private backend: mxsBackend) { }

    provideDefinition(
        document: TextDocument,
        position: Position,
        token: CancellationToken): ProviderResult<Definition | DefinitionLink[]>
    {
        return new Promise((resolve) =>
        {
            const info = this.backend.symbolInfoDefinition(
                document.uri.toString(),
                position.line + 1,
                position.character);

            if (info) {
                // VS code shows the text for the range given here on holding ctrl/cmd, which is rather
                // useless given that we show this info already in the hover provider. So, in order
                // to limit the amount of text we only pass on the smallest range which is possible.
                // Yet we need the correct start position to not break the goto-definition feature.
                if (info.definition) {
                    resolve(new Location(Uri.parse(info.source), Utilities.lexicalRangeToRange(info.definition.range)));
                } else {
                    // Empty for built-in entities.
                    resolve(new Location(Uri.parse(""), new Position(0, 0)));
                }
            } else resolve(null);
        });
    }
}