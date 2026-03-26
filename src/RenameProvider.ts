import {
    CancellationToken, Position, ProviderResult, Range, RenameProvider,
    TextDocument, WorkspaceEdit, workspace,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import { Utilities } from './utils.js';

export class mxsRenameProvider implements RenameProvider
{
    public constructor(private backend: mxsBackend) { }

    private nowMs(): number {
        return typeof performance !== 'undefined' ? performance.now() : Date.now();
    }

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
        const tracePerformance = config.get<boolean>('providers.tracePerformance', false);
        const providerStart = tracePerformance ? this.nowMs() : 0;
        const logPerformance = (route: 'AST' | 'Legacy' | 'None', reason?: string): void => {
            if (!tracePerformance) {
                return;
            }
            const reasonPart = reason ? ` reason=${reason}` : '';
            console.log(`[language-maxscript][Performance] renameProvider.prepare uri=${document.uri.toString()} duration=${(this.nowMs() - providerStart).toFixed(2)}ms route=${route}${reasonPart}`);
        };
        const sourceContext = this.backend.getContext(document.uri.toString());

        if (useAst) {
            const renameTarget = sourceContext.prepareAstRename(
                position.line + 1,
                position.character,
                document.getText(),
            );
            if (renameTarget) {
                if (traceRouting) {
                    console.log('[language-maxscript][RenameProvider] route=AST phase=prepare');
                }
                logPerformance('AST');
                return {
                    range: Utilities.lexicalRangeToRange(renameTarget.range),
                    placeholder: renameTarget.placeholder,
                };
            }
            if (traceRouting) {
                console.log('[language-maxscript][RenameProvider] route=None reason=ast-miss phase=prepare');
            }
        }

        if (!fallbackToLegacy) {
            logPerformance('None', useAst ? 'ast-miss' : 'ast-disabled');
            throw new Error('No renameable symbol at this position.');
        }

        const symbol = sourceContext.symbolAtPosition(position.line + 1, position.character);

        if (!symbol || !symbol.definition) {
            logPerformance('None', 'no-symbol');
            throw new Error('No renameable symbol at this position.');
        }

        if (traceRouting) {
            console.log('[language-maxscript][RenameProvider] route=Legacy phase=prepare');
        }
        logPerformance('Legacy');

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
        const tracePerformance = config.get<boolean>('providers.tracePerformance', false);
        const providerStart = tracePerformance ? this.nowMs() : 0;
        const logPerformance = (route: 'AST' | 'Legacy' | 'None', edits: number, reason?: string): void => {
            if (!tracePerformance) {
                return;
            }
            const reasonPart = reason ? ` reason=${reason}` : '';
            console.log(`[language-maxscript][Performance] renameProvider.edits uri=${document.uri.toString()} duration=${(this.nowMs() - providerStart).toFixed(2)}ms route=${route} edits=${edits}${reasonPart}`);
        };
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
                    console.log('[language-maxscript][RenameProvider] route=AST phase=edits');
                }
                logPerformance('AST', astEdits.length);
                return workspaceEdit;
            }
            if (traceRouting) {
                console.log('[language-maxscript][RenameProvider] route=None reason=ast-miss phase=edits');
            }
        }

        if (!fallbackToLegacy) {
            logPerformance('None', 0, useAst ? 'ast-miss' : 'ast-disabled');
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
                console.log('[language-maxscript][RenameProvider] route=Legacy phase=edits');
            }
            logPerformance('Legacy', targets.length);
            return workspaceEdit;
        }

        logPerformance('None', 0, 'no-symbol');
        return undefined;
    }
}