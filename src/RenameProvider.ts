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
        token: CancellationToken): ProviderResult<Range | { range: Range; placeholder: string }>
    {
        if (token.isCancellationRequested) {
            return undefined;
        }

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
                return {
                    range: Utilities.lexicalRangeToRange(renameTarget.range),
                    placeholder: renameTarget.placeholder,
                };
            }
            if (traceRouting) {
                console.log('[language-maxscript][RenameProvider] route=AST-miss prepare');
            }
        }

        if (!fallbackToLegacy) {
            throw new Error('No renameable symbol at this position.');
        }

        const symbol = sourceContext.symbolAtPosition(position.line + 1, position.character);

        if (!symbol || !symbol.definition) {
            throw new Error('No renameable symbol at this position.');
        }

        if (traceRouting) {
            console.log('[language-maxscript][RenameProvider] route=Legacy prepare');
        }

        return {
            range: Utilities.symbolNameRange(symbol),
            placeholder: symbol.name,
        };
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
                return workspaceEdit;
            }
            if (traceRouting) {
                console.log('[language-maxscript][RenameProvider] route=AST-miss edits');
            }
        }

        if (!fallbackToLegacy) {
            return undefined;
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
            return workspaceEdit;
        }

        return undefined;
    }
}