import type { Node } from '@strumenta/tylasu';
import type { IAstContext } from '@backend/IAstContext.js';
import type { ILexicalRange } from '@backend/types.js';
import {
    BlockExpression,
    CaseStatement,
    DefinitionBlock,
    DoWhileStatement,
    EventHandlerStatement,
    ForStatement,
    FunctionDefinition,
    IfStatement,
    StructDefinition,
    TryStatement,
    WhileStatement,
} from '@backend/ast/ASTNodes.js';

export class FoldingRangeService {
    public getFoldingRanges(sourceContext: IAstContext, sourceText: string): ILexicalRange[] {
        const lines = sourceText.split(/\r?\n/);

        const ast = sourceContext.getResolvedAST();
        if (ast) {
            const astRanges = this.collectAstFoldingRanges(ast, lines);
            if (astRanges.length > 0) {
                return astRanges;
            }
        }

        return this.collectTextFallbackRanges(lines);
    }

    private collectAstFoldingRanges(root: Node, lines: string[]): ILexicalRange[] {
        const ranges: ILexicalRange[] = [];
        const seen = new Set<string>();

        for (const node of root.walk()) {
            const range = this.extractFoldingRange(node, lines);
            if (!range) {
                continue;
            }

            const key = `${range.start.row}:${range.end.row}`;
            if (seen.has(key)) {
                continue;
            }

            seen.add(key);
            ranges.push(range);
        }

        return ranges;
    }

    private extractFoldingRange(node: Node, lines: string[]): ILexicalRange | undefined {
        if (node instanceof FunctionDefinition) {
            return this.nodePositionToFoldingRange(node, lines);
        }

        if (node instanceof StructDefinition) {
            return this.nodePositionToFoldingRange(node, lines);
        }

        if (node instanceof DefinitionBlock) {
            return this.nodePositionToFoldingRange(node, lines);
        }

        if (node instanceof BlockExpression && node.expressions.length > 1) {
            return this.nodePositionToFoldingRange(node, lines);
        }

        if (node instanceof IfStatement) {
            return this.nodePositionToFoldingRange(node, lines);
        }

        if (node instanceof WhileStatement) {
            return this.nodePositionToFoldingRange(node, lines);
        }

        if (node instanceof DoWhileStatement) {
            return this.nodePositionToFoldingRange(node, lines);
        }

        if (node instanceof TryStatement) {
            return this.nodePositionToFoldingRange(node, lines);
        }

        if (node instanceof ForStatement) {
            return this.nodePositionToFoldingRange(node, lines);
        }

        if (node instanceof CaseStatement) {
            return this.nodePositionToFoldingRange(node, lines);
        }

        if (node instanceof EventHandlerStatement) {
            return this.nodePositionToFoldingRange(node, lines);
        }

        return undefined;
    }

    private nodePositionToFoldingRange(node: Node, lines: string[]): ILexicalRange | undefined {
        if (!node.position) {
            return undefined;
        }

        const startLine0 = node.position.start.line - 1;
        const endLine0 = this.adjustFoldEndLine(lines, startLine0, node.position.end.line - 1);

        if (endLine0 <= startLine0) {
            return undefined;
        }

        return this.zeroBasedLinesToLexicalRange(startLine0, endLine0, lines);
    }

    private adjustFoldEndLine(lines: string[], startLine: number, endLine: number): number {
        if (endLine <= startLine || endLine >= lines.length) {
            return endLine;
        }

        const text = lines[endLine] ?? '';
        const uncommented = text.replace(/--.*$/, '').trim();
        if (uncommented.length === 0) {
            return endLine;
        }

        if (/^[)\]}]+[;,]?$/.test(uncommented) && endLine - 1 > startLine) {
            return endLine - 1;
        }

        return endLine;
    }

    private collectTextFallbackRanges(lines: string[]): ILexicalRange[] {
        const ranges: ILexicalRange[] = [];
        const seen = new Set<string>();
        const stack: Array<{ char: string; line: number }> = [];
        let blockCommentStart: number | undefined;

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const rawLine = lines[lineIndex] ?? '';
            for (let i = 0; i < rawLine.length; i++) {
                const ch = rawLine[i];
                const next = i + 1 < rawLine.length ? rawLine[i + 1] : '';

                if (blockCommentStart !== undefined) {
                    if (ch === '*' && next === '/') {
                        const endLine = this.adjustFoldEndLine(lines, blockCommentStart, lineIndex);
                        if (endLine > blockCommentStart) {
                            const key = `${blockCommentStart}:${endLine}`;
                            if (!seen.has(key)) {
                                seen.add(key);
                                ranges.push(this.zeroBasedLinesToLexicalRange(blockCommentStart, endLine, lines));
                            }
                        }
                        blockCommentStart = undefined;
                        i++;
                    }
                    continue;
                }

                if (ch === '-' && next === '-') {
                    break;
                }

                if (ch === '/' && next === '*') {
                    blockCommentStart = lineIndex;
                    i++;
                    continue;
                }

                if (ch === '(' || ch === '[' || ch === '{') {
                    stack.push({ char: ch, line: lineIndex });
                    continue;
                }

                if (ch === ')' || ch === ']' || ch === '}') {
                    const opener = stack.pop();
                    if (!opener) {
                        continue;
                    }

                    const endLine = this.adjustFoldEndLine(lines, opener.line, lineIndex);
                    if (endLine > opener.line) {
                        const key = `${opener.line}:${endLine}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            ranges.push(this.zeroBasedLinesToLexicalRange(opener.line, endLine, lines));
                        }
                    }
                }
            }
        }

        return ranges;
    }

    private zeroBasedLinesToLexicalRange(startLine0: number, endLine0: number, lines: string[]): ILexicalRange {
        const endColumn = (lines[endLine0] ?? '').length;
        return {
            start: {
                row: startLine0 + 1,
                column: 0,
            },
            end: {
                row: endLine0 + 1,
                column: endColumn,
            },
        };
    }
}
