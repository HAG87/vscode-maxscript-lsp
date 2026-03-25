import type { Position as AstPosition } from '@strumenta/tylasu';
import type { IAstContext } from '@backend/IAstContext.js';
import type { ILexicalRange } from '@backend/types.js';
import { ASTQuery } from '@backend/ast/ASTQuery.js';

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

    public getDefinitionTarget(
        sourceContext: IAstContext,
        row1Based: number,
        column0Based: number,
        sourceText: string,
    ): DefinitionTargetModel | undefined {
        const declaration = sourceContext.astDeclarationAtPosition(row1Based, column0Based);
        if (!declaration?.name) {
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

        const range = isRemote
            ? this.astPositionToLexicalRange(targetPosition)
            : (this.astNameRange(sourceText, targetPosition, declaration.name)
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
    ): NavigationReferenceModel[] | undefined {
        const ast = sourceContext.getResolvedAST();
        const declaration = sourceContext.astDeclarationAtPosition(row1Based, column0Based);
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

        for (const memberReference of ASTQuery.findMemberReferencesForDeclaration(ast, declaration)) {
            if (!memberReference.position) {
                continue;
            }
            result.push({
                uri: sourceContext.sourceUri,
                range: this.astPositionToLexicalRange(memberReference.position),
            });
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
