/*
 * Copyright (c) Mike Lischke. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */
import { ParserRuleContext, ParseTree, TerminalNode } from 'antlr4ng';

import { mxsParser } from '../parser/mxsParser.js';
import { ILexicalRange } from './types.js';

export class TreeQuery
{
    /**
     * Get the lowest level parse tree, which covers the given position.
     *
     * @param root The start point to search from.
     * @param column The position in the given row.
     * @param row The row position to search for.
     *
     * @returns The parse tree which covers the given position or undefined if none could be found.
     */
    public static parseTreeFromPosition(root: ParseTree, row: number, column: number): ParseTree | null
    {
        // Does the root node actually contain the position? If not we don't need to look further.
        if (root instanceof TerminalNode) {
            const terminal = root;
            const token = terminal.symbol;

            if (token.line !== row) {
                return null;
            }

            const tokenStop = token.column + (token.stop - token.start + 1);
            if (token.column <= column && tokenStop >= column) {
                return terminal;
            }

            return null;
        } else {
            const context = (root as ParserRuleContext);
            if (!context.start || !context.stop) { // Invalid tree?
                return null;
            }

            if (context.start.line > row || (context.start.line === row && column < context.start.column)) {
                return null;
            }

            const tokenStop = context.stop.column + (context.stop.stop - context.stop.start + 1);
            if (context.stop.line < row || (context.stop.line === row && tokenStop < column)) {
                return null;
            }

            if (context.children) {
                for (const child of context.children) {
                    const result = TreeQuery.parseTreeFromPosition(child, row, column);
                    if (result) {
                        return result;
                    }
                }
            }

            return context;
        }
    }

    public static findParentExpr(ctx: ParserRuleContext): ParserRuleContext
    {
        while (ctx && (ctx.ruleIndex !== mxsParser.RULE_expr)) {
            if (ctx.parent) {
                ctx = ctx.parent;
            } else break;
        }
        return ctx;
    }

    public static parseTreeContainingRange(root: ParseTree, range: ILexicalRange)
    {
        let ctx: ParserRuleContext = root as ParserRuleContext;
        let ctxStart =
            TreeQuery.parseTreeFromPosition(root, range.start.row, range.start.column) as ParserRuleContext;

        if (ctxStart) {
            if (ctxStart instanceof TerminalNode) {
                ctxStart = TreeQuery.findParentExpr(ctxStart);
            }
            ctx = ctxStart;
        }

        let ctxStop =
            (TreeQuery.parseTreeFromPosition(root, range.end.row, range.end.column) ?? root) as ParserRuleContext;

        if (ctxStop) {
            if (ctxStop instanceof TerminalNode) {
                ctxStop = TreeQuery.findParentExpr(ctxStop);
            }
            const startEnd = ctx.stop?.tokenIndex ?? 0;
            const stopEnd = ctxStop.stop?.tokenIndex ?? 0;
            // check if ctxStop is contained in ctxStart
            if (stopEnd > startEnd) {
                // find common parent
                let run = true;
                let parent = ctx.parent;
                while (parent && run) {
                    if (parent.stop) {
                        run = !(stopEnd <= parent.stop.tokenIndex);
                        if (run) {
                            // console.log(`${parent.start?.tokenIndex} - ${parent.stop.tokenIndex} :: ${stopEnd} :: ${stopEnd <= parent.stop.tokenIndex}}`);
                            parent = parent.parent;
                        }
                    }
                }
                return parent ?? ctxStop;
            }
        }
        return ctx;
    }
}
