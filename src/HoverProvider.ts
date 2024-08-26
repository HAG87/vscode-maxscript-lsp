import { CancellationToken, Hover, HoverProvider, Position, ProviderResult, TextDocument } from "vscode";
import { mxsBackend } from "./backend/Backend.js";
import { mxsLanguageCompletions } from "./backend/schemas/mxsCompletions-base.js";

export class mxsHoverProvider implements HoverProvider
{
    public constructor(private backend: mxsBackend) { }

    provideHover(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover>
    {
        // throw new Error("Method not implemented.");
        return new Promise((resolve) =>
        {
            const info = this.backend.symbolInfoAtPosition(
                document.uri.toString(),
                position.line + 1,
                position.character
            );
            // console.log(info);
            if (info) {
                const mxsReference = mxsLanguageCompletions.has(info.name);

                if (mxsReference) {
                    resolve(new Hover([
                        `**${mxsReference.label.toString()}**`,
                        `3ds MaxAPI | ${mxsReference.detail}`,
                    ]));
                } else {
                    resolve(undefined);
                }
                /*
                const description = symbolDescriptionFromEnum(info.kind);                    
                resolve(new Hover([
                    "**" + description + "**\ndefined in: " + path.basename(info.source),
                    { language: "antlr", value: (info.definition ? info.definition.text : "") },
                    ]));                        
                */
            } else {
                resolve(undefined);
            }
        });
    }
}