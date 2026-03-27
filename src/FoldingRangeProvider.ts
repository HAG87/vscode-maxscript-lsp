import {
    CancellationToken, FoldingRange, FoldingRangeProvider,
    ProviderResult, TextDocument,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import {
    FunctionDefinition, StructDefinition, DefinitionBlock, BlockExpression,
    IfStatement, WhileStatement, DoWhileStatement, TryStatement, ForStatement,
    CaseStatement, EventHandlerStatement,
} from '@backend/ast/ASTNodes.js';
import { Node } from '@strumenta/tylasu';

export class mxsFoldingRangeProvider implements FoldingRangeProvider
{
    public constructor(private backend: mxsBackend) { }

    provideFoldingRanges(
        document: TextDocument,
        _context: unknown,
        token: CancellationToken): ProviderResult<FoldingRange[]>
    {
        if (token.isCancellationRequested) {
            return undefined;
        }

        try {
            const sourceContext = this.backend.getContext(document.uri.toString());
            const ast = sourceContext.getResolvedAST();

            if (ast) {
                const ranges = this.collectAstFoldingRanges(ast, document);
                if (ranges.length > 0) {
                    return ranges;
                }
            }
        } catch (error) {
            // Fall through to text-based folding when AST retrieval fails.
        }

        return this.collectTextFallbackRanges(document);
    }

    private collectAstFoldingRanges(root: Node, document: TextDocument): FoldingRange[]
    {
        const ranges: FoldingRange[] = [];
        const seen = new Set<string>();

        for (const node of root.walk()) {
            const range = this.extractFoldingRange(node, document);
            if (!range) {
                continue;
            }

            const key = `${range.start}:${range.end}`;
            if (seen.has(key)) {
                continue;
            }

            seen.add(key);
            ranges.push(range);
        }

        return ranges;
    }

    private extractFoldingRange(node: Node, document: TextDocument): FoldingRange | undefined
    {
        if (node instanceof FunctionDefinition) {
            return this.nodePositionToFoldingRange(node, document);
        }

        if (node instanceof StructDefinition) {
            return this.nodePositionToFoldingRange(node, document);
        }

        if (node instanceof DefinitionBlock) {
            return this.nodePositionToFoldingRange(node, document);
        }

        if (node instanceof BlockExpression && node.expressions.length > 1) {
            return this.nodePositionToFoldingRange(node, document);
        }

        if (node instanceof IfStatement) {
            return this.nodePositionToFoldingRange(node, document);
        }

        if (node instanceof WhileStatement) {
            return this.nodePositionToFoldingRange(node, document);
        }

        if (node instanceof DoWhileStatement) {
            return this.nodePositionToFoldingRange(node, document);
        }

        if (node instanceof TryStatement) {
            return this.nodePositionToFoldingRange(node, document);
        }

        if (node instanceof ForStatement) {
            return this.nodePositionToFoldingRange(node, document);
        }

        if (node instanceof CaseStatement) {
            return this.nodePositionToFoldingRange(node, document);
        }

        if (node instanceof EventHandlerStatement) {
            return this.nodePositionToFoldingRange(node, document);
        }

        return undefined;
    }

    private nodePositionToFoldingRange(node: Node, document: TextDocument): FoldingRange | undefined
    {
        if (!node.position) {
            return undefined;
        }

        const startLine = node.position.start.line - 1;
        const endLine = this.adjustFoldEndLine(document, startLine, node.position.end.line - 1);

        if (endLine <= startLine) {
            return undefined;
        }

        return new FoldingRange(startLine, endLine);
    }

    private adjustFoldEndLine(document: TextDocument, startLine: number, endLine: number): number
    {
        if (endLine <= startLine || endLine >= document.lineCount) {
            return endLine;
        }

        const text = document.lineAt(endLine).text;
        const uncommented = text.replace(/--.*$/, '').trim();
        if (uncommented.length === 0) {
            return endLine;
        }

        if (/^[\)\]\}]+[;,]?$/.test(uncommented) && endLine - 1 > startLine) {
            return endLine - 1;
        }

        return endLine;
    }

    private collectTextFallbackRanges(document: TextDocument): FoldingRange[]
    {
        const ranges: FoldingRange[] = [];
        const seen = new Set<string>();
        const stack: Array<{ char: string; line: number }> = [];
        let blockCommentStart: number | undefined;

        for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
            const rawLine = document.lineAt(lineIndex).text;
            for (let i = 0; i < rawLine.length; i++) {
                const ch = rawLine[i];
                const next = i + 1 < rawLine.length ? rawLine[i + 1] : '';

                if (blockCommentStart !== undefined) {
                    if (ch === '*' && next === '/') {
                        const endLine = this.adjustFoldEndLine(document, blockCommentStart, lineIndex);
                        if (endLine > blockCommentStart) {
                            const key = `${blockCommentStart}:${endLine}`;
                            if (!seen.has(key)) {
                                seen.add(key);
                                ranges.push(new FoldingRange(blockCommentStart, endLine));
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

                    const endLine = this.adjustFoldEndLine(document, opener.line, lineIndex);
                    if (endLine > opener.line) {
                        const key = `${opener.line}:${endLine}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            ranges.push(new FoldingRange(opener.line, endLine));
                        }
                    }
                }
            }
        }

        return ranges;
    }
}
