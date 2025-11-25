import { BaseSymbol, ScopedSymbol } from "antlr4-c3";

export class ExprSymbol extends ScopedSymbol
{
    // pathIndex: number[];
    // scope?: BaseSymbol[];

    constructor(name?: string/* , pathIndex: number[] = [0] */)
    {
        super(name);
        // this.pathIndex = pathIndex;
    }
    /*
    public override addSymbol(symbol: BaseSymbol, pathIndex?: number[]): void
    {
        super.addSymbol(symbol);
        if (symbol instanceof ExprSymbol) {(symbol as ExprSymbol).pathIndex = [...this.pathIndex, this.children.length];}
    }
    */
    public getScope(): BaseSymbol[]
    {
        return this.symbolPath.filter(symbol =>
            symbol instanceof PluginDefinitionSymbol ||
            symbol instanceof AttributesDefSymbol ||
            symbol instanceof ParamsDefSymbol ||
            symbol instanceof MacroScriptDefinitionSymbol ||
            symbol instanceof ToolDefinitionSymbol ||
            symbol instanceof UtilityDefinitionSymbol ||
            symbol instanceof RolloutDefinitionSymbol ||
            symbol instanceof RcMenuDefinitionSymbol ||
            symbol instanceof StructDefinitionSymbol ||
            symbol instanceof StructMemberSymbol ||
            symbol instanceof FnDefinitionSymbol ||
            // symbol instanceof fnArgsSymbol ||
            // symbol instanceof fnParamsSymbol ||
            symbol instanceof VariableDeclSymbol ||
            symbol instanceof ForBodySymbol ||
            symbol instanceof ExpSeqSymbol
            //...
        ).reverse();
    }
    /*
    public override async getAllSymbols<T extends BaseSymbol, Args extends unknown[]>(t: SymbolConstructor<T, Args>,
        localOnly = false): Promise<T[]>
    {
        const result: T[] = [];

        for (const child of this.children) {
            if (child instanceof t) {
                result.push(child);
            }
        }

        if (!localOnly) {
            if (this.parent) {
                const childSymbols = await this.parent.getAllSymbols(t);
                // const childSymbols = await this.getAllSymbols(t, true);
                result.push(...childSymbols);
            }
        }

        return result;
    }
    // */
}

//TODO: Complete Symbol types
export class PluginDefinitionSymbol extends ExprSymbol { }
export class MacroScriptDefinitionSymbol extends ExprSymbol { }
export class ToolDefinitionSymbol extends ExprSymbol { }
export class UtilityDefinitionSymbol extends ExprSymbol { }
export class RolloutDefinitionSymbol extends ExprSymbol { }
export class rolloutGroupDefinitionSymbol extends ExprSymbol { }
export class RcMenuDefinitionSymbol extends ExprSymbol { }
export class RolloutControlSymbol extends ExprSymbol
{
    type?: string;
    constructor(name?: string, type?: string)
    {
        super(name);
        this.type = type;
    }
}
export class RcControlSymbol extends ExprSymbol
{
    type?: string;
    constructor(name?: string, type?: string)
    {
        super(name);
        this.type = type;
    }
}
export class AttributesDefSymbol extends ExprSymbol { }
export class ParamsDefSymbol extends ExprSymbol { }
export class ParamDefSymbol extends ExprSymbol { }
export class StructDefinitionSymbol extends ExprSymbol { }
export class StructMemberSymbol extends ExprSymbol { }
export class EventHandlerStatementSymbol extends ExprSymbol { }
export class FnDefinitionSymbol extends ExprSymbol { }
export class fnArgsSymbol extends ExprSymbol { }
export class fnParamsSymbol extends ExprSymbol { }

// export class fnReturnStatementSymbol extends ScopedSymbol { }

export class VariableDeclSymbol extends ExprSymbol
{
    declarationScope?: string;
    constructor(name?: string/* , public pathIndex: number[] = [0] */)
    {
        super(name);
    }
}

// export class whenStatementSymbol extends ExprSymbol { }
// export class contexStatementSymbol extends ExprSymbol { }

// export class caseStatementSymbol extends ScopedSymbol { }
// export class tryStatementSymbol extends ScopedSymbol { }
// export class whileLoopStatementSymbol extends ScopedSymbol { }
// export class doLoopStatementSymbol extends ScopedSymbol { }
// export class caseStatementSymbol extends ScopedSymbol { }
// export class tryStatementSymbol extends ScopedSymbol { }

// export class TypecastExprSymbol extends ExprSymbol { }
// export class UnaryExprSymbol extends ExprSymbol { }
// export class ExponentExprSymbol extends ExprSymbol { }
// export class ProductExprSymbol extends ExprSymbol { }
// export class AdditionExprSymbol extends ExprSymbol { }
// export class ComparisonExprSymbol extends ExprSymbol { }
// export class LogicNOTExprSymbol extends ExprSymbol { }
// export class LogicExprSymbol extends ExprSymbol { }

export class AssignmentExpressionSymbol extends ExprSymbol { }
// export class forLoopStatementSymbol extends ScopedSymbol { }
export class ForBodySymbol extends ExprSymbol { }
// export class loopExitStatementSymbol extends ScopedSymbol { }
// export class AssignmentSymbol extends ExprSymbol { }
export class FnCallSymbol extends ExprSymbol { }
export class ExpSeqSymbol extends ExprSymbol { }
export class ParamSymbol extends ExprSymbol { }

// export class AccessorSymbol extends ExprSymbol { }
// export class IndexAccessSymbol extends ExprSymbol { }
export class PropertyAccessSymbol extends ExprSymbol { }

// export class refSymbol extends ExprSymbol { }
export class IdentifierSymbol extends BaseSymbol { }

// export class ArraySymbol extends ExprSymbol { }
// export class bitArraySymbol extends ExprSymbol { }
// export class point3Symbol extends ExprSymbol { }
// export class point2Symbol extends ExprSymbol { }
// export class box2Symbol extends ExprSymbol { }
// export class PathSymbol extends BaseSymbol { }
// export class BooleanSymbol extends BaseSymbol { }
// export class StringSymbol extends BaseSymbol { }
// export class PathSymbol extends BaseSymbol { }
// export class NameSymbol extends BaseSymbol { }
// export class NumberSymbol extends BaseSymbol { }
// export class TimeSymbol extends BaseSymbol { }
// export class QuestionMarkSymbol extends BaseSymbol { }

export const topLevelSymbolsType: Array<new () => BaseSymbol> = [
    PluginDefinitionSymbol,
    MacroScriptDefinitionSymbol,
    AttributesDefSymbol,
    ToolDefinitionSymbol,
    UtilityDefinitionSymbol,
    RolloutDefinitionSymbol,
    RcMenuDefinitionSymbol,
    EventHandlerClauseSymbol,
    StructDefinitionSymbol,
    StructMemberSymbol,
    FnDefinitionSymbol,
    VariableDeclSymbol,
    ExpSeqSymbol,
];