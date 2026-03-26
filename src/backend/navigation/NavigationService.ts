import type { Position as AstPosition } from '@strumenta/tylasu';
import type { Node as AstNode } from '@strumenta/tylasu';
import type { IAstContext } from '@backend/IAstContext.js';
import type { ILexicalRange } from '@backend/types.js';
import { ASTQuery } from '@backend/ast/ASTQuery.js';
import {
    FunctionDefinition,
    MemberExpression,
    Program,
    StructDefinition,
    StructMemberField,
    VariableDeclaration,
} from '@backend/ast/ASTNodes.js';

export interface DefinitionTargetModel {
    targetUri: string;
    range: ILexicalRange;
}

export interface NavigationReferenceModel {
    uri: string;
    range: ILexicalRange;
}

export type NavigationHighlightKind = 'read' | 'write';

export interface NavigationHighlightModel {
    range: ILexicalRange;
    kind: NavigationHighlightKind;
}

export class NavigationService {
    private readonly memberReferenceIndex = new WeakMap<Program, Map<unknown, MemberExpression[]>>();

    private extractWordAtPosition(sourceText: string, row1Based: number, column0Based: number): string | undefined {
        const lines = sourceText.split(/\r?\n/);
        const line = lines[row1Based - 1];
        if (!line) {
            return undefined;
        }

        const column = Math.max(0, Math.min(column0Based, line.length));
        const isWordChar = (ch: string): boolean => /[A-Za-z0-9_]/.test(ch);

        let start = column;
        while (start > 0 && isWordChar(line[start - 1])) {
            start--;
        }

        let end = column;
        while (end < line.length && isWordChar(line[end])) {
            end++;
        }

        if (end <= start) {
            return undefined;
        }

        return line.slice(start, end);
    }

    private declarationMightHaveMemberUsages(ast: Program, declaration: VariableDeclaration): boolean {
        const semantic = ASTQuery.findSemanticNodeForDeclaration(ast, declaration);
        if (semantic instanceof StructMemberField) {
            return true;
        }
        if (semantic instanceof FunctionDefinition) {
            let current: AstNode | undefined = semantic.parent ?? undefined;
            while (current) {
                if (current instanceof StructDefinition) {
                    return true;
                }
                current = current.parent ?? undefined;
            }
        }
        return false;
    }

    private getMemberReferenceIndex(ast: Program): Map<unknown, MemberExpression[]> {
        const existing = this.memberReferenceIndex.get(ast);
        if (existing) {
            return existing;
        }

        const index = new Map<unknown, MemberExpression[]>();
        for (const node of ASTQuery.walkAllNodes(ast)) {
            if (!(node instanceof MemberExpression)) {
                continue;
            }
            const declaration = ASTQuery.resolveMemberExpressionDeclaration(ast, node);
            if (!declaration) {
                continue;
            }
            const bucket = index.get(declaration);
            if (bucket) {
                bucket.push(node);
            } else {
                index.set(declaration, [node]);
            }
        }

        this.memberReferenceIndex.set(ast, index);
        return index;
    }

    private astPositionToLexicalRange(position: AstPosition): ILexicalRange {
        return {
            start: {
                row: position.start.line,
                column: position.start.column,
            },
            end: {
                row: position.end.line,
                column: position.end.column,
            },
        };
    }

    private astNameRange(sourceText: string, position: AstPosition, name: string): ILexicalRange | undefined {
        const lines = sourceText.split(/\r?\n/);
        const startLineIndex = position.start.line - 1;
        const endLineIndex = position.end.line - 1;

        if (startLineIndex < 0 || endLineIndex >= lines.length || endLineIndex < startLineIndex) {
            return undefined;
        }

        const snippetLines: string[] = [];
        for (let i = startLineIndex; i <= endLineIndex; i++) {
            const line = lines[i] ?? '';
            if (i === startLineIndex && i === endLineIndex) {
                snippetLines.push(line.slice(position.start.column, position.end.column));
            } else if (i === startLineIndex) {
                snippetLines.push(line.slice(position.start.column));
            } else if (i === endLineIndex) {
                snippetLines.push(line.slice(0, position.end.column));
            } else {
                snippetLines.push(line);
            }
        }

        const snippet = snippetLines.join('\n');
        const offset = snippet.indexOf(name);
        if (offset < 0) {
            return undefined;
        }

        const prefix = snippet.slice(0, offset);
        const prefixLines = prefix.split(/\n/);
        const lineOffset = prefixLines.length - 1;
        const startRow = position.start.line + lineOffset;
        const startColumn = lineOffset === 0
            ? position.start.column + prefixLines[0].length
            : prefixLines[lineOffset].length;

        return {
            start: { row: startRow, column: startColumn },
            end: { row: startRow, column: startColumn + name.length },
        };
    }

    private astNameRangeWithCancellation(
        sourceText: string,
        position: AstPosition,
        name: string,
        isCancelled?: () => boolean,
    ): ILexicalRange | undefined {
        if (isCancelled?.()) {
            return undefined;
        }

        const lines = sourceText.split(/\r?\n/);
        const startLineIndex = position.start.line - 1;
        const endLineIndex = position.end.line - 1;

        if (startLineIndex < 0 || endLineIndex >= lines.length || endLineIndex < startLineIndex) {
            return undefined;
        }

        const snippetLines: string[] = [];
        for (let i = startLineIndex; i <= endLineIndex; i++) {
            if (isCancelled?.()) {
                return undefined;
            }

            const line = lines[i] ?? '';
            if (i === startLineIndex && i === endLineIndex) {
                snippetLines.push(line.slice(position.start.column, position.end.column));
            } else if (i === startLineIndex) {
                snippetLines.push(line.slice(position.start.column));
            } else if (i === endLineIndex) {
                snippetLines.push(line.slice(0, position.end.column));
            } else {
                snippetLines.push(line);
            }
        }

        if (isCancelled?.()) {
            return undefined;
        }

        const snippet = snippetLines.join('\n');
        const offset = snippet.indexOf(name);
        if (offset < 0) {
            return undefined;
        }

        const prefix = snippet.slice(0, offset);
        const prefixLines = prefix.split(/\n/);
        const lineOffset = prefixLines.length - 1;
        const startRow = position.start.line + lineOffset;
        const startColumn = lineOffset === 0
            ? position.start.column + prefixLines[0].length
            : prefixLines[lineOffset].length;

        return {
            start: { row: startRow, column: startColumn },
            end: { row: startRow, column: startColumn + name.length },
        };
    }

    public getDefinitionTarget(
        sourceContext: IAstContext,
        row1Based: number,
        column0Based: number,
        sourceText: string,
        isCancelled?: () => boolean,
    ): DefinitionTargetModel | undefined {
        if (isCancelled?.()) {
            return undefined;
        }

        const ast = sourceContext.getResolvedAST();
        const declaration = sourceContext.astDeclarationAtPosition(row1Based, column0Based)
            ?? (() => {
                if (!ast) {
                    return undefined;
                }
                const word = this.extractWordAtPosition(sourceText, row1Based, column0Based);
                return word ? ASTQuery.findDeclarationByName(ast, word) : undefined;
            })();
        if (!declaration?.name) {
            return undefined;
        }

        if (isCancelled?.()) {
            return undefined;
        }

        const declarationUri = sourceContext.getDeclarationSourceUri(declaration) ?? sourceContext.sourceUri;
        const isRemote = declarationUri !== sourceContext.sourceUri;
        const targetAst = isRemote
            ? sourceContext.getWorkspaceAstForUri(declarationUri)
            : sourceContext.getResolvedAST();

        if (!targetAst) {
            return undefined;
        }

        const semanticNode = ASTQuery.findSemanticNodeForDeclaration(targetAst, declaration);
        const targetPosition = semanticNode.position ?? declaration.position;
        if (!targetPosition) {
            return undefined;
        }

        if (isCancelled?.()) {
            return undefined;
        }

        const range = isRemote
            ? this.astPositionToLexicalRange(targetPosition)
            : (this.astNameRangeWithCancellation(sourceText, targetPosition, declaration.name, isCancelled)
                ?? this.astPositionToLexicalRange(targetPosition));

        return {
            targetUri: declarationUri,
            range,
        };
    }

    public getReferences(
        sourceContext: IAstContext,
        row1Based: number,
        column0Based: number,
        includeDeclaration: boolean,
        sourceText?: string,
    ): NavigationReferenceModel[] | undefined {
        const ast = sourceContext.getResolvedAST();
        const declaration = sourceContext.astDeclarationAtPosition(row1Based, column0Based)
            ?? (() => {
                if (!ast || !sourceText) {
                    return undefined;
                }
                const word = this.extractWordAtPosition(sourceText, row1Based, column0Based);
                return word ? ASTQuery.findDeclarationByName(ast, word) : undefined;
            })();
        if (!ast || !declaration) {
            return undefined;
        }

        const result: NavigationReferenceModel[] = [];
        if (includeDeclaration && declaration.position) {
            result.push({
                uri: sourceContext.sourceUri,
                range: this.astPositionToLexicalRange(declaration.position),
            });
        }

        for (const reference of declaration.references) {
            if (!reference.position) {
                continue;
            }
            result.push({
                uri: sourceContext.sourceUri,
                range: this.astPositionToLexicalRange(reference.position),
            });
        }

        if (this.declarationMightHaveMemberUsages(ast, declaration)) {
            const memberReferences = this.getMemberReferenceIndex(ast).get(declaration) ?? [];
            for (const memberReference of memberReferences) {
                if (!memberReference.position) {
                    continue;
                }
                result.push({
                    uri: sourceContext.sourceUri,
                    range: this.astPositionToLexicalRange(memberReference.position),
                });
            }
        }

        return result;
    }

    public getDocumentHighlights(
        sourceContext: IAstContext,
        row1Based: number,
        column0Based: number,
        sourceText: string,
    ): NavigationHighlightModel[] | undefined {
        const ast = sourceContext.getResolvedAST();
        const declaration = sourceContext.astDeclarationAtPosition(row1Based, column0Based);
        if (!ast || !declaration) {
            return undefined;
        }

        const result: NavigationHighlightModel[] = [];
        if (declaration.position && declaration.name) {
            const semanticNode = ASTQuery.findSemanticNodeForDeclaration(ast, declaration);
            const targetPosition = semanticNode.position ?? declaration.position;
            const nameRange = this.astNameRange(sourceText, targetPosition, declaration.name);
            if (nameRange) {
                result.push({ range: nameRange, kind: 'write' });
            }
        }

        for (const reference of declaration.references) {
            if (!reference.position) {
                continue;
            }
            result.push({
                range: this.astPositionToLexicalRange(reference.position),
                kind: 'read',
            });
        }

        return result.length > 0 ? result : undefined;
    }
}
