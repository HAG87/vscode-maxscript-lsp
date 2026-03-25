import type { Position as AstPosition } from '@strumenta/tylasu';
import type { IAstContext } from '@backend/IAstContext.js';
import { ILexicalRange } from '@backend/types.js';
import { ASTQuery } from '@backend/ast/ASTQuery.js';

export interface RenamePrepareModel {
    range: ILexicalRange;
    placeholder: string;
}

export interface RenameEditModel {
    range: ILexicalRange;
    newText: string;
}

export class RenameService {
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

    public prepareAstRename(
        sourceContext: IAstContext,
        row1Based: number,
        column0Based: number,
        sourceText: string,
    ): RenamePrepareModel | undefined {
        const ast = sourceContext.getResolvedAST();
        const declaration = sourceContext.astDeclarationAtPosition(row1Based, column0Based);

        if (!ast || !declaration?.name) {
            return undefined;
        }

        const semanticNode = ASTQuery.findSemanticNodeForDeclaration(ast, declaration);
        const targetPosition = semanticNode.position ?? declaration.position;
        if (!targetPosition) {
            return undefined;
        }

        const range = this.astNameRange(sourceText, targetPosition, declaration.name);
        if (!range) {
            return undefined;
        }

        return {
            range,
            placeholder: declaration.name,
        };
    }

    public buildAstRenameEdits(
        sourceContext: IAstContext,
        row1Based: number,
        column0Based: number,
        newName: string,
        sourceText: string,
    ): RenameEditModel[] | undefined {
        const ast = sourceContext.getResolvedAST();
        const declaration = sourceContext.astDeclarationAtPosition(row1Based, column0Based);

        if (!ast || !declaration?.name) {
            return undefined;
        }

        const edits: RenameEditModel[] = [];
        const semanticNode = ASTQuery.findSemanticNodeForDeclaration(ast, declaration);
        const declarationPosition = semanticNode.position ?? declaration.position;
        if (declarationPosition) {
            const declarationRange = this.astNameRange(sourceText, declarationPosition, declaration.name)
                ?? this.astPositionToLexicalRange(declarationPosition);
            edits.push({ range: declarationRange, newText: newName });
        }

        for (const reference of declaration.references) {
            if (!reference.position || !reference.name) {
                continue;
            }

            const referenceRange = this.astNameRange(sourceText, reference.position, reference.name)
                ?? this.astPositionToLexicalRange(reference.position);
            edits.push({ range: referenceRange, newText: newName });
        }

        return edits.length > 0 ? edits : undefined;
    }
}
