/* THIS IS BROKEN! */
import {
        CancellationToken, Position, ProviderResult, RenameProvider,
        TextDocument, WorkspaceEdit,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import { Utilities } from './utils.js';

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
                this.backend.getContext(document.uri.toString()).symbolInfoAtPositionCtxOccurrences(
                    position.line + 1,
                    position.character);

            if (occurrences) {
                const workspaceEdit = new WorkspaceEdit();
                const targets = Utilities.symbolTargetsWithWordAtPosition(occurrences, document, position);
                for (const target of targets) {
                    workspaceEdit.replace(target.uri, target.range, newName);
                }
                resolve(workspaceEdit);
            } else {
                resolve(undefined);
            }
        });
    }
}