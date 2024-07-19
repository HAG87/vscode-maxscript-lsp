import { CancellationToken, Hover, HoverProvider, Position, ProviderResult, TextDocument } from "vscode";
import { mxsBackend } from "./backend/Backend.js";

export class mxsHoverProvider implements HoverProvider
{
    public constructor(private backend: mxsBackend) { }

    provideHover(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover>
    {
        throw new Error("Method not implemented.");
        /*
        return new Promise((resolve) => {
            const info = this.backend.symbolInfoAtPosition(document.fileName, position.character, position.line + 1,
                true);
            if (!info) {
                resolve(undefined);
            } else {
                const description = symbolDescriptionFromEnum(info.kind);

                resolve(new Hover([
                    "**" + description + "**\ndefined in: " + path.basename(info.source),
                    { language: "antlr", value: (info.definition ? info.definition.text : "") },
                ]));
            }
        });
        */
    }
}