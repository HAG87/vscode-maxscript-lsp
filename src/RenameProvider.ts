import {
    CancellationToken, Position, ProviderResult, Range, RenameProvider,
    TextDocument, WorkspaceEdit,
} from 'vscode';

import { mxsBackend } from '@backend/Backend';
import { Utilities } from './utils';
import { IMaxScriptSettings } from './types';

export class mxsRenameProvider implements RenameProvider
{
    public constructor(private backend: mxsBackend, private options?: IMaxScriptSettings) { }

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

        const traceRouting = this.options?.debug?.traceRouting || false;
        const tracePerformance = this.options?.debug?.tracePerformance || false;
        
        const providerStart = tracePerformance ? this.nowMs() : 0;
        const logPerformance = (route: 'AST' | 'None', reason?: string): void => {
            if (!tracePerformance) {
                return;
            }
            const reasonPart = reason ? ` reason=${reason}` : '';
            console.log(`[language-maxscript][Performance] renameProvider.prepare uri=${document.uri.toString()} duration=${(this.nowMs() - providerStart).toFixed(2)}ms route=${route}${reasonPart}`);
        };
        const sourceContext = this.backend.borrowContext(document.uri.toString());

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

        logPerformance('None', 'ast-miss');
        throw new Error('No renameable symbol at this position.');
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

        const traceRouting = this.options?.debug?.traceRouting || false;
        const tracePerformance = this.options?.debug?.tracePerformance || false;
        const providerStart = tracePerformance ? this.nowMs() : 0;
        const logPerformance = (route: 'AST' | 'None', edits: number, reason?: string): void => {
            if (!tracePerformance) {
                return;
            }
            const reasonPart = reason ? ` reason=${reason}` : '';
            console.log(`[language-maxscript][Performance] renameProvider.edits uri=${document.uri.toString()} duration=${(this.nowMs() - providerStart).toFixed(2)}ms route=${route} edits=${edits}${reasonPart}`);
        };
        const sourceContext = this.backend.borrowContext(document.uri.toString());

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

        logPerformance('None', 0, 'ast-miss');
        return undefined;
    }
}