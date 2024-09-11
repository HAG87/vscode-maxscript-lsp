import { CancellationToken, Position, ProviderResult, RenameProvider, TextDocument, Uri, WorkspaceEdit } from "vscode";
import { mxsBackend } from "./backend/Backend.js";
import { Utilities } from "./utils.js";

export class mxsRenameProvider implements RenameProvider
{
    public constructor(private backend: mxsBackend) { }

    public provideRenameEdits(
        document: TextDocument,
        position: Position,
        newName: string,
        _token: CancellationToken): ProviderResult<WorkspaceEdit>
    {
        return new Promise((resolve) =>
        {
            const occurrences =
                this.backend.symbolInfoAtPositionCtxOccurrences(
                    document.uri.toString(),
                    position.line + 1,
                    position.character);

            if (occurrences) {
                const result = new WorkspaceEdit();
                for (const symbol of occurrences) {
                    if (symbol.definition) {
                        result.replace(
                            Uri.parse(symbol.source),
                            Utilities.symbolNameRange(symbol),
                            newName
                        );
                    }
                }
                resolve(result);
            } else {
                resolve(undefined);
            }
        });
    }
}