import { BaseSymbol, ScopedSymbol } from "antlr4-c3";

export class PluginDefinitionSymbol extends ScopedSymbol { }
export class MacroScriptDefinitionSymbol extends ScopedSymbol { }
export class ToolDefinitionSymbol extends ScopedSymbol { }
export class UtilityDefinitionSymbol extends ScopedSymbol { }
export class RolloutDefinitionSymbol extends ScopedSymbol { }
export class rolloutGroupDefinitionSymbol extends ScopedSymbol { }
export class RcMenuDefinitionSymbol extends ScopedSymbol { }
export class RolloutControlSymbol extends ScopedSymbol
{
    type?: string;
    constructor(name?: string, type?: string)
    {
        super(name);
        this.type = type;
    }
}
export class RcControlSymbol extends ScopedSymbol
{
    type?: string;
    constructor(name?: string, type?: string)
    {
        super(name);
        this.type = type;
    }
}
export class AttributesDefSymbol extends ScopedSymbol { }
export class ParamsDefSymbol extends ScopedSymbol { }
export class StructDefinitionSymbol extends ScopedSymbol { }
export class StructMemberSymbol extends ScopedSymbol { }
export class EventHandlerStatementSymbol extends ScopedSymbol { }
export class FnDefinitionSymbol extends ScopedSymbol { }
export class fnArgsSymbol extends ScopedSymbol { }
export class fnParamsSymbol extends ScopedSymbol { }

export class VariableDeclSymbol extends ScopedSymbol
{
    declarationScope?: string;
    constructor(name?: string)
    {
        super(name);
    }
}

export class ForBodySymbol extends ScopedSymbol { }
export class ExpSeqSymbol extends ScopedSymbol { }

export class IdentifierSymbol extends BaseSymbol { }

export const topLevelSymbolsType: Array<new () => BaseSymbol> = [
    PluginDefinitionSymbol,
    MacroScriptDefinitionSymbol,
    AttributesDefSymbol,
    ToolDefinitionSymbol,
    UtilityDefinitionSymbol,
    RolloutDefinitionSymbol,
    RcMenuDefinitionSymbol,
    EventHandlerStatementSymbol,
    StructDefinitionSymbol,
    StructMemberSymbol,
    FnDefinitionSymbol,
    VariableDeclSymbol,
    ExpSeqSymbol,
];