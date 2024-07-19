import { CancellationToken, Definition, DefinitionLink, DefinitionProvider, Position, ProviderResult, TextDocument } from "vscode";
import { mxsBackend } from "./backend/Backend.js";

export class mxsDefinitionProvider implements DefinitionProvider
{
    public constructor(private backend: mxsBackend) { }

    provideDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Definition | DefinitionLink[]>
    {
        throw new Error("Method not implemented.");
        /*
        return new Promise((resolve) => {
            const info = this.backend.symbolInfoAtPosition(document.fileName, position.character, position.line + 1,
                true);

            if (!info) {
                resolve(null);
            } else {
                // VS code shows the text for the range given here on holding ctrl/cmd, which is rather
                // useless given that we show this info already in the hover provider. So, in order
                // to limit the amount of text we only pass on the smallest range which is possible.
                // Yet we need the correct start position to not break the goto-definition feature.
                if (info.definition) {
                    const range = new Range(
                        info.definition.range.start.row - 1,
                        info.definition.range.start.column,
                        info.definition.range.end.row - 1,
                        info.definition.range.end.column,
                    );

                    resolve(new Location(Uri.file(info.source), range));
                } else {
                    // Empty for built-in entities.
                    resolve(new Location(Uri.parse(""), new Position(0, 0)));
                }
            }
        });
        */
    }
}