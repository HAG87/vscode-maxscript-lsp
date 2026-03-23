import {
    CancellationToken, Position, ProviderResult, Range, RenameProvider,
    TextDocument, WorkspaceEdit, workspace,
} from 'vscode';

import type { Position as AstPosition } from '@strumenta/tylasu';
import { mxsBackend } from './backend/Backend.js';
import { ASTQuery } from './backend/ast/ASTQuery.js';
import { Utilities } from './utils.js';

export class mxsRenameProvider implements RenameProvider
{
    public constructor(private backend: mxsBackend) { }

    private astPositionToRange(position: AstPosition): Range {
        return new Range(
            position.start.line - 1,
            position.start.column,
            position.end.line - 1,
            position.end.column,
        );
    }

    private astNameRange(document: TextDocument, position: AstPosition, name: string): Range | undefined {
        const enclosingRange = this.astPositionToRange(position);
        const snippet = document.getText(enclosingRange);
        const offset = snippet.indexOf(name);

        if (offset < 0) {
            return undefined;
        }

        const prefix = snippet.slice(0, offset);
        const lines = prefix.split(/\r?\n/);
        const lineOffset = lines.length - 1;
        const startLine = enclosingRange.start.line + lineOffset;
        const startCharacter = lineOffset === 0
            ? enclosingRange.start.character + lines[0].length
            : lines[lineOffset].length;

        return new Range(
            startLine,
            startCharacter,
            startLine,
            startCharacter + name.length,
        );
    }

    private astPrepareRename(document: TextDocument, position: Position): Range | { range: Range; placeholder: string } | undefined {
        const sourceContext = this.backend.getContext(document.uri.toString());
        const ast = sourceContext?.getResolvedAST();
        const declaration = sourceContext?.astDeclarationAtPosition(position.line + 1, position.character);

        if (!ast || !declaration?.name) {
            return undefined;
        }

        const semanticNode = ASTQuery.findSemanticNodeForDeclaration(ast, declaration);
        const targetPosition = semanticNode.position ?? declaration.position;
        if (!targetPosition) {
            return undefined;
        }

        const range = this.astNameRange(document, targetPosition, declaration.name);
        if (!range) {
            return undefined;
        }

        return {
            range,
            placeholder: declaration.name,
        };
    }

    private astRenameEdits(document: TextDocument, position: Position, newName: string): WorkspaceEdit | undefined {
        const sourceContext = this.backend.getContext(document.uri.toString());
        const ast = sourceContext?.getResolvedAST();
        const declaration = sourceContext?.astDeclarationAtPosition(position.line + 1, position.character);

        if (!ast || !declaration?.name) {
            return undefined;
        }

        const workspaceEdit = new WorkspaceEdit();
        const semanticNode = ASTQuery.findSemanticNodeForDeclaration(ast, declaration);
        const declarationPosition = semanticNode.position ?? declaration.position;
        if (declarationPosition) {
            const declarationRange = this.astNameRange(document, declarationPosition, declaration.name);
            if (declarationRange) {
                workspaceEdit.replace(document.uri, declarationRange, newName);
            }
        }

        for (const reference of declaration.references) {
            if (!reference.position || !reference.name) {
                continue;
            }

            const referenceRange = this.astNameRange(document, reference.position, reference.name)
                ?? this.astPositionToRange(reference.position);
            workspaceEdit.replace(document.uri, referenceRange, newName);
        }

        return workspaceEdit.size > 0 ? workspaceEdit : undefined;
    }

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

            if (useAst) {
                const renameTarget = this.astPrepareRename(document, position);
                if (renameTarget) {
                    if (traceRouting) {
                        console.log('[language-maxscript][RenameProvider] route=AST prepare');
                    }
                    resolve(renameTarget);
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

            const ctx = this.backend.getContext(document.uri.toString());
            const symbol = ctx.symbolAtPosition(position.line + 1, position.character);

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

            if (useAst) {
                const workspaceEdit = this.astRenameEdits(document, position, newName);
                if (workspaceEdit) {
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
                this.backend.getContext(document.uri.toString()).symbolInfoAtPositionCtxOccurrences(
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