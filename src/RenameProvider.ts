import {
    CancellationToken, Position, ProviderResult, Range, RenameProvider,
    TextDocument, WorkspaceEdit,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import { Utilities } from './utils.js';

export class mxsRenameProvider implements RenameProvider
{
    public constructor(private backend: mxsBackend) { }

    public prepareRename(
        document: TextDocument,
        position: Position,
        token: CancellationToken): ProviderResult<Range | { range: Range; placeholder: string }>
    {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const ctx = this.backend.getContext(document.uri.toString());
        const symbol = ctx.symbolAtPosition(position.line + 1, position.character);

        if (!symbol || !symbol.definition) {
            // Reject positions that are not on a renameable symbol.
            throw new Error('No renameable symbol at this position.');
        }

        return({
            range: Utilities.symbolNameRange(symbol),
            placeholder: symbol.name,
        });
    }

    public provideRenameEdits(
        document: TextDocument,
        position: Position,
        newName: string,
        token: CancellationToken): ProviderResult<WorkspaceEdit>
    {
        if (token.isCancellationRequested) {
            return undefined;
        }

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
            return workspaceEdit;
        }
        return undefined;
    }
}