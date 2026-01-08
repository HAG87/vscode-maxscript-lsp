import { ParserRuleContext, ParseTree, TerminalNode } from "antlr4ng";
import { BaseSymbol } from "antlr4-c3";
import { IDefinition, SymbolKind } from "../../types.js";
import {
    AssignmentExpressionSymbol, AttributesDefSymbol, EventHandlerClauseSymbol,
    fnArgsSymbol, FnDefinitionSymbol, fnParamsSymbol,
    IdentifierSymbol, MacroScriptDefinitionSymbol, PluginDefinitionSymbol,
    RcMenuDefinitionSymbol,
    RolloutDefinitionSymbol, StructDefinitionSymbol, StructMemberSymbol,
    ToolDefinitionSymbol, UtilityDefinitionSymbol, VariableDeclSymbol
} from "./symbolTypes.js";

const symbolToKindMap: Map<new () => BaseSymbol, SymbolKind> = new Map([
    [PluginDefinitionSymbol, SymbolKind.Plugin],
    [MacroScriptDefinitionSymbol, SymbolKind.MacroScript],
    [AttributesDefSymbol, SymbolKind.Attributes],
    [ToolDefinitionSymbol, SymbolKind.Tool],
    [UtilityDefinitionSymbol, SymbolKind.Rollout],
    [RolloutDefinitionSymbol, SymbolKind.Rollout],
    [RcMenuDefinitionSymbol, SymbolKind.RcMenu],
    [StructDefinitionSymbol, SymbolKind.Struct],
    [StructMemberSymbol, SymbolKind.Identifier],
    [EventHandlerClauseSymbol, SymbolKind.Event],
    //...
    [FnDefinitionSymbol, SymbolKind.Function],
    [fnArgsSymbol, SymbolKind.Argument],
    [fnParamsSymbol, SymbolKind.Parameter],
    [VariableDeclSymbol, SymbolKind.Declaration],
    [AssignmentExpressionSymbol, SymbolKind.Identifier],
    [IdentifierSymbol, SymbolKind.Identifier],
]);

export class SymbolUtils {
    public static getKindFromSymbol(symbol: BaseSymbol): SymbolKind {
        return symbolToKindMap.get(symbol.constructor as typeof BaseSymbol) || SymbolKind.Null;
    }

    /**
     * @param ctx The context to get info for.
     * @param keepQuotes A flag indicating if quotes should be kept if there are any around the context's text.
     *
     * @returns The definition info for the given rule context.
    */
    public static definitionForContext(ctx: ParseTree | undefined, keepQuotes: boolean): IDefinition | undefined {
        if (!ctx) { return undefined; }

        const result: IDefinition = {
            text: "",
            range: {
                start: {
                    row: 0,
                    column: 0
                },
                end: {
                    row: 0,
                    column: 0
                },
            },
        };

        if (ctx instanceof ParserRuleContext && ctx.start && ctx.stop) {
            const start = ctx.start;
            const stop = ctx.stop;

            result.range = {
                start: {
                    row: start.line,
                    column: start.column
                },
                end: {
                    row: stop.line,
                    column: stop.column
                }
            };
            // console.log(result.range);  
            const inputStream = ctx.start?.tokenSource?.inputStream;

            if (inputStream) {
                try {
                    result.text = inputStream.getTextFromRange(start.start, stop.stop);
                    // console.log(result.text);
                } catch (e) {
                    // The method getText uses an unreliable JS String API which can throw on larger texts.
                    // In this case we cannot return the text of the given context.
                    // A context with such a large size is probably an error case anyway (unfinished multi line comment
                    // or unfinished action).
                }
            }
        } else if (ctx instanceof TerminalNode) {
            result.text = ctx.getText();
            result.range = {
                start: {
                    row: ctx.symbol!.line,
                    column: ctx.symbol!.column
                },
                end: {
                    row: ctx.symbol!.line,
                    column: ctx.symbol!.column + result.text.length
                }
            };
        }

        if (keepQuotes || result.text.length < 2) {
            return result;
        }

        const quoteChar = result.text[0];
        if ((quoteChar === '"' || quoteChar === "'")
            && quoteChar === result.text[result.text.length - 1]) {
            result.text = result.text.substring(1, result.text.length - 1);
        }

        return result;
    }
}