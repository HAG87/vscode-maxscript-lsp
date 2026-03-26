import type { Position as AstPosition } from '@strumenta/tylasu';
import type { IAstContext } from '@backend/IAstContext.js';
import type { ILexicalRange } from '@backend/types.js';
import { ASTQuery } from '@backend/ast/ASTQuery.js';
import {
    DefinitionBlock,
    FunctionDefinition,
    StructDefinition,
    Program,
    VariableDeclaration,
} from '@backend/ast/ASTNodes.js';

export interface CodeLensAnchorModel {
    range: ILexicalRange;
    declarationLine: number;
    declarationCharacter: number;
}

export interface CodeLensLocationModel {
    uri: string;
    range: ILexicalRange;
}

export interface CodeLensResolveModel {
    declarationLine: number;
    declarationCharacter: number;
    locations: CodeLensLocationModel[];
}

export class CodeLensService {
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

    private declarationFromSemanticNode(
        ast: Program,
        node: FunctionDefinition | StructDefinition | DefinitionBlock,
    ): VariableDeclaration | undefined {
        const name = node.name;
        if (!name || !node.parentScope) {
            return undefined;
        }
        const scoped = node.parentScope.resolveLocal(name);
        if (scoped) {
            return scoped;
        }
        if (!node.position) {
            return undefined;
        }
        return ASTQuery.findDeclarationAtPosition(ast, node.position.start.line, node.position.start.column);
    }

    private declarationLocations(sourceContext: IAstContext, ast: Program, declaration: VariableDeclaration): CodeLensLocationModel[] {
        const locations: CodeLensLocationModel[] = [];

        if (declaration.position) {
            locations.push({
                uri: sourceContext.sourceUri,
                range: this.astPositionToLexicalRange(declaration.position),
            });
        }

        for (const reference of declaration.references) {
            if (!reference.position) {
                continue;
            }
            locations.push({
                uri: sourceContext.sourceUri,
                range: this.astPositionToLexicalRange(reference.position),
            });
        }

        for (const memberReference of ASTQuery.findMemberReferencesForDeclaration(ast, declaration)) {
            if (!memberReference.position) {
                continue;
            }
            locations.push({
                uri: sourceContext.sourceUri,
                range: this.astPositionToLexicalRange(memberReference.position),
            });
        }

        const seen = new Set<string>();
        return locations.filter((loc) => {
            const key = `${loc.range.start.row}:${loc.range.start.column}:${loc.range.end.row}:${loc.range.end.column}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    public getCodeLensAnchors(sourceContext: IAstContext): CodeLensAnchorModel[] {
        const ast = sourceContext.getResolvedAST();
        if (!ast) {
            return [];
        }

        const lenses: CodeLensAnchorModel[] = [];
        const seenDeclarations = new Set<string>();

        for (const node of ASTQuery.walkAllNodes(ast)) {
            if (!(node instanceof FunctionDefinition || node instanceof StructDefinition || node instanceof DefinitionBlock)) {
                continue;
            }

            const declaration = this.declarationFromSemanticNode(ast, node);
            if (!declaration?.position) {
                continue;
            }

            const key = `${declaration.position.start.line}:${declaration.position.start.column}`;
            if (seenDeclarations.has(key)) {
                continue;
            }
            seenDeclarations.add(key);

            lenses.push({
                range: this.astPositionToLexicalRange(declaration.position),
                declarationLine: declaration.position.start.line,
                declarationCharacter: declaration.position.start.column,
            });
        }

        return lenses;
    }

    public resolveCodeLens(
        sourceContext: IAstContext,
        declarationLine: number,
        declarationCharacter: number,
    ): CodeLensResolveModel | undefined {
        const ast = sourceContext.getResolvedAST();
        if (!ast) {
            return undefined;
        }

        const declaration = sourceContext.astDeclarationAtPosition(declarationLine, declarationCharacter);
        if (!declaration) {
            return undefined;
        }

        const locations = this.declarationLocations(sourceContext, ast, declaration);
        return {
            declarationLine,
            declarationCharacter,
            locations,
        };
    }
}
