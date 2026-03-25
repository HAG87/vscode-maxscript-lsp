import type { IAstContext } from '@backend/IAstContext.js';
import { ILexicalRange, SymbolKind } from '@backend/types.js';
import { ASTQuery } from '@backend/ast/ASTQuery.js';
import {
    DefinitionBlock,
    FunctionArgument,
    FunctionDefinition,
    FunctionParameter,
    ParameterDefinition,
    RcMenuItem,
    RolloutControl,
    StructDefinition,
    StructMemberField,
    VariableDeclaration,
} from '@backend/ast/ASTNodes.js';

export interface HoverModel {
    symbolKind: SymbolKind;
    codeSnippet: string;
    range?: ILexicalRange;
}

export class HoverService {
    private positionRangeToLexicalRange(positionRange: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    }): ILexicalRange {
        return {
            start: {
                row: positionRange.start.line + 1,
                column: positionRange.start.character,
            },
            end: {
                row: positionRange.end.line + 1,
                column: positionRange.end.character,
            },
        };
    }

    private sourceTextInRange(sourceText: string, range: ILexicalRange): string {
        const lines = sourceText.split(/\r?\n/);
        const startLineIndex = range.start.row - 1;
        const endLineIndex = range.end.row - 1;

        if (startLineIndex < 0 || endLineIndex >= lines.length || endLineIndex < startLineIndex) {
            return '';
        }

        const snippetLines: string[] = [];
        for (let i = startLineIndex; i <= endLineIndex; i++) {
            const line = lines[i] ?? '';
            if (i === startLineIndex && i === endLineIndex) {
                snippetLines.push(line.slice(range.start.column, range.end.column));
            } else if (i === startLineIndex) {
                snippetLines.push(line.slice(range.start.column));
            } else if (i === endLineIndex) {
                snippetLines.push(line.slice(0, range.end.column));
            } else {
                snippetLines.push(line);
            }
        }

        return snippetLines.join('\n');
    }

    private symbolKindForAstNode(node: unknown): SymbolKind {
        if (node instanceof FunctionDefinition) {
            return SymbolKind.Function;
        }
        if (node instanceof StructDefinition) {
            return SymbolKind.Struct;
        }
        if (node instanceof DefinitionBlock) {
            switch (node.kind) {
                case 'macroscript': return SymbolKind.MacroScript;
                case 'utility': return SymbolKind.Utility;
                case 'rollout': return SymbolKind.Rollout;
                case 'tool': return SymbolKind.Tool;
                case 'rcmenu': return SymbolKind.RcMenu;
                case 'plugin': return SymbolKind.Plugin;
                case 'parameters': return SymbolKind.Parameters;
                case 'attributes': return SymbolKind.Attributes;
                default: return SymbolKind.Object;
            }
        }
        if (node instanceof FunctionArgument || node instanceof FunctionParameter || node instanceof ParameterDefinition) {
            return SymbolKind.Parameter;
        }
        if (node instanceof RolloutControl) {
            return SymbolKind.Control;
        }
        if (node instanceof RcMenuItem) {
            return SymbolKind.RcMenuControl;
        }
        if (node instanceof StructMemberField) {
            return SymbolKind.Field;
        }
        if (node instanceof VariableDeclaration) {
            switch (node.scope) {
                case 'global':
                case 'persistent':
                    return SymbolKind.GlobalVar;
                case 'local':
                    return SymbolKind.LocalVar;
                default:
                    return SymbolKind.Variable;
            }
        }

        return SymbolKind.Variable;
    }

    public getAstHoverModel(
        sourceContext: IAstContext,
        row1Based: number,
        column0Based: number,
        sourceText: string,
    ): HoverModel | undefined {
        const ast = sourceContext.getResolvedAST();
        if (!ast) {
            return undefined;
        }

        const declaration = sourceContext.astDeclarationAtPosition(row1Based, column0Based);
        if (!declaration) {
            return undefined;
        }

        const semanticNode = ASTQuery.findSemanticNodeForDeclaration(ast, declaration);
        const semanticPosition = semanticNode.position ?? declaration.position;
        const symbolKind = this.symbolKindForAstNode(semanticNode);

        if (!semanticPosition) {
            return {
                symbolKind,
                codeSnippet: declaration.name ?? '',
            };
        }

        const range = this.positionRangeToLexicalRange(ASTQuery.positionToRange(semanticPosition));
        return {
            symbolKind,
            codeSnippet: this.sourceTextInRange(sourceText, range),
            range,
        };
    }

    public getLegacyHoverModel(
        sourceContext: IAstContext,
        row1Based: number,
        column0Based: number,
    ): HoverModel | undefined {
        const definition = sourceContext.symbolDefinition(row1Based, column0Based);
        if (!definition?.definition) {
            return undefined;
        }

        return {
            symbolKind: definition.kind,
            codeSnippet: definition.definition.text,
        };
    }
}
