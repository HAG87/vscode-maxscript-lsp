import { CancellationToken, Position, ProviderResult, RenameProvider, TextDocument, WorkspaceEdit } from "vscode";
import { mxsBackend } from "./backend/Backend.js";

export class mxsRenameProvider implements RenameProvider
{
    public constructor(private backend: mxsBackend) { }

    public provideRenameEdits(document: TextDocument, position: Position,
        newName: string, token: CancellationToken): ProviderResult<WorkspaceEdit>
    {
        return new Promise((resolve) =>
        {
            // document.uri
            // get symbol at position
            const result = new WorkspaceEdit();
            // get symbol occurrences
            // const range = new Range();
            // result.replace(uri, range, newName),
            //...
            resolve(result);
            // resolve(undefined):
            // reject()
        });
        /*
        return new Promise((resolve) => {
            const info = this.backend.symbolInfoAtPosition(document.fileName, position.character, position.line + 1,
                false);

            if (info) {
                const result = new WorkspaceEdit();
                const occurrences = this.backend.getSymbolOccurrences(document.fileName, info.name);
                for (const symbol of occurrences) {
                    if (symbol.definition) {
                        const range = new Range(
                            symbol.definition.range.start.row - 1,
                            symbol.definition.range.start.column,
                            symbol.definition.range.end.row - 1,
                            symbol.definition.range.start.column + info.name.length,
                        );
                        result.replace(Uri.file(symbol.source), range, newName);
                    }
                }
                resolve(result);
            } else {
                resolve(undefined);
            }

        });
        */
    }
}