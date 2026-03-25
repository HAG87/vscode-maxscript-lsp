import {
    CancellationToken, Position, ProviderResult, Range, RenameProvider,
    TextDocument, WorkspaceEdit, workspace,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import { Utilities } from './utils.js';

export class mxsRenameProvider implements RenameProvider
{
    public constructor(private backend: mxsBackend) { }

    public prepareRename(
        document: TextDocument,
        position: Position,
        _token: CancellationToken): ProviderResult<Range | { range: Range; placeholder: string }>
    {
        return new Promise((resolve, reject) =>
        {
            const config = workspace.getConfiguration('maxScript');
            const useAst = config.get<boolean>('providers.ast.renameProvider', true);
            const fallbackToLegacy = config.get<boolean>('providers.fallbackToLegacy', true);
            const traceRouting = config.get<boolean>('providers.traceRouting', false);
            const sourceContext = this.backend.getContext(document.uri.toString());

            if (useAst) {
                const renameTarget = sourceContext.prepareAstRename(
                    position.line + 1,
                    position.character,
                    document.getText(),
                );
                if (renameTarget) {
                    if (traceRouting) {
                        console.log('[language-maxscript][RenameProvider] route=AST prepare');
                    }
                    resolve({
                        range: Utilities.lexicalRangeToRange(renameTarget.range),
                        placeholder: renameTarget.placeholder,
                    });
                    return;
                }
                if (traceRouting) {
                    console.log('[language-maxscript][RenameProvider] route=AST-miss prepare');
                }
            }

            if (!fallbackToLegacy) {
                reject(new Error('No renameable symbol at this position.'));
                return;
            }

            const symbol = sourceContext.symbolAtPosition(position.line + 1, position.character);

            if (!symbol || !symbol.definition) {
                // Reject positions that are not on a renameable symbol.
                reject(new Error('No renameable symbol at this position.'));
                return;
            }

            if (traceRouting) {
                console.log('[language-maxscript][RenameProvider] route=Legacy prepare');
            }

            resolve({
                range: Utilities.symbolNameRange(symbol),
                placeholder: symbol.name,
            });
        });
    }

    public provideRenameEdits(
        document: TextDocument,
        position: Position,
        newName: string,
        _token: CancellationToken): ProviderResult<WorkspaceEdit>
    {
        return new Promise((resolve) =>
        {
            const config = workspace.getConfiguration('maxScript');
            const useAst = config.get<boolean>('providers.ast.renameProvider', true);
            const fallbackToLegacy = config.get<boolean>('providers.fallbackToLegacy', true);
            const traceRouting = config.get<boolean>('providers.traceRouting', false);
            const sourceContext = this.backend.getContext(document.uri.toString());

            if (useAst) {
                const astEdits = sourceContext.buildAstRenameEdits(
                    position.line + 1,
                    position.character,
                    newName,
                    document.getText(),
                );
                if (astEdits) {
                    const workspaceEdit = new WorkspaceEdit();
                    for (const edit of astEdits) {
                        workspaceEdit.replace(document.uri, Utilities.lexicalRangeToRange(edit.range), edit.newText);
                    }
                    if (traceRouting) {
                        console.log('[language-maxscript][RenameProvider] route=AST edits');
                    }
                    resolve(workspaceEdit);
                    return;
                }
                if (traceRouting) {
                    console.log('[language-maxscript][RenameProvider] route=AST-miss edits');
                }
            }

            if (!fallbackToLegacy) {
                resolve(undefined);
                return;
            }

            const occurrences =
                sourceContext.symbolInfoAtPositionCtxOccurrences(
                    position.line + 1,
                    position.character);

            if (occurrences) {
                const workspaceEdit = new WorkspaceEdit();
                const targets = Utilities.symbolTargetsWithWordAtPosition(occurrences, document, position);
                for (const target of targets) {
                    workspaceEdit.replace(target.uri, target.range, newName);
                }
                if (traceRouting) {
                    console.log('[language-maxscript][RenameProvider] route=Legacy edits');
                }
                resolve(workspaceEdit);
            } else {
                resolve(undefined);
            }
        });
    }
}