import { BaseSymbol, ISymbolTableOptions, SymbolTable, SymbolConstructor, ScopedSymbol } from "antlr4-c3";
import { ParserRuleContext } from "antlr4ng";
import { SourceContext } from "./SourceContext.js";
import { ISymbolInfo, SymbolKind } from "../types.js";

//Definitions
export class pluginDefinitionSymbol extends ScopedSymbol {}
export class macroscriptDefinitionSymbol extends ScopedSymbol {}
export class toolDefinitionSymbol extends ScopedSymbol {}
export class utilityDefinitionSymbol extends ScopedSymbol {}
export class rolloutDefinitionSymbol extends ScopedSymbol {}
export class rcmenuDefinitionSymbol extends ScopedSymbol {}

export class StructDefinitionSymbol extends ScopedSymbol { }
export class FnDefinitionSymbol extends ScopedSymbol { }

export class controlDefinition extends BaseSymbol {}


export class VariableDeclSymbol extends ScopedSymbol { }

export class IdentifierSymbol extends BaseSymbol { }

export class SymbolSupport
{

    public static symbolToKindMap: Map<new () => BaseSymbol, SymbolKind> = new Map([
        [FnDefinitionSymbol, SymbolKind.Function],
        [StructDefinitionSymbol, SymbolKind.Struct],
        [IdentifierSymbol, SymbolKind.Identifier],
        //...
    ])
}

export class ContextSymbolTable extends SymbolTable
{

    public tree?: ParserRuleContext;
    // /*
    static topLevelSymbolsType: Array<new () => BaseSymbol> = new Array(
        FnDefinitionSymbol,
        StructDefinitionSymbol,
        VariableDeclSymbol,
        //...
    )
    // */

    // Caches with reverse lookup for indexed symbols.
    //...
    public constructor(
        name: string,
        options: ISymbolTableOptions,
        public owner?: SourceContext
    )
    { super(name, options); }

    private isType(symbol: any): symbol is BaseSymbol | ScopedSymbol
    {
        return ContextSymbolTable.topLevelSymbolsType.some(t => symbol instanceof t);
    }

    private symbolsOfType<T extends BaseSymbol, Args extends unknown[]>(t: SymbolConstructor<T, Args>,
        localOnly = false): ISymbolInfo[]
    {
        const result: ISymbolInfo[] = [];

        const symbols = this.getAllSymbolsSync(t, localOnly);
        const filtered = new Set(symbols); // Filter for duplicates.
        for (const symbol of filtered) {
            const root = symbol.root as ContextSymbolTable;

            result.push({
                kind: SourceContext.getKindFromSymbol(symbol),
                name: symbol.name,
                source: root.owner ? root.owner.sourceUri.toString() : "maxscript",
                definition: SourceContext.definitionForContext(symbol.context, true),
                description: undefined,
            });
        }

        return result;
    }

    private collectAllChildren(symbol: ScopedSymbol): ISymbolInfo
    {
        let root = symbol.root as ContextSymbolTable;

        function dfs(currentSymbol: ScopedSymbol): ISymbolInfo
        {
            const child_root = currentSymbol.root as ContextSymbolTable;
            root = child_root.owner ? child_root : root;

            // console.log(root.owner);

            return {
                name: currentSymbol.name,
                kind: SourceContext.getKindFromSymbol(currentSymbol),
                source: root.owner ? root.owner.sourceUri.toString() : "maxscript",
                definition: SourceContext.definitionForContext(currentSymbol.context, true),
                children: currentSymbol.children?.length
                    ? currentSymbol.children
                        // .filter(this.isType) // I NEED TO FILTER THE TYPES!!!
                        .filter(child => 'name' in child)
                        .map(child => dfs(<ScopedSymbol>child))
                    : undefined
            };
        }
        return dfs(symbol);
    }

    private scopedSymbolsOfType<T extends ScopedSymbol, Args extends unknown[]>(t: SymbolConstructor<T, Args>,
        localOnly = false): ISymbolInfo[]
    {
        const result: ISymbolInfo[] = [];

        const symbols = this.getAllSymbolsSync(t, localOnly);
        const filtered = new Set(symbols); // Filter for duplicates.
        for (const symbol of filtered) {

            if (symbol.children.length > 0) {
                let res = this.collectAllChildren(symbol);
                result.push(res);
            } else {
                const root = symbol.root as ContextSymbolTable;

                const symbolInfo: ISymbolInfo = {
                    kind: SourceContext.getKindFromSymbol(symbol),
                    name: symbol.name,
                    source: root.owner ? root.owner.sourceUri.toString() : "maxscript",
                    definition: SourceContext.definitionForContext(symbol.context, true),
                    description: undefined,
                };
                result.push(symbolInfo);
            }
        }
        return result;
    }

    public listTopLevelSymbols(localOnly: boolean): ISymbolInfo[]
    {
        const result: ISymbolInfo[] = [];
        /*
        const options = this.resolveSync("options", true);
        if (options) {
            const tokenVocab = options.resolveSync("tokenVocab", true);
            if (tokenVocab) {
                const value = this.getSymbolInfo(tokenVocab);
                if (value) {
                    result.push(value);
                }
            }
        }
        */
        // /*
        for (const t of ContextSymbolTable.topLevelSymbolsType) {
            let symbols = this.scopedSymbolsOfType(t as typeof ScopedSymbol, localOnly);
            result.push(...symbols);
        }
        //  */
        /*
        let symbols = this.scopedSymbolsOfType(FnDefinitionSymbol, localOnly);
        result.push(...symbols);
        symbols = this.scopedSymbolsOfType(StructDefinitionSymbol, localOnly);
        result.push(...symbols);
        // */
        /*
         symbols = this.symbolsOfType(VirtualTokenSymbol, localOnly);
         result.push(...symbols);
         symbols = this.symbolsOfType(FragmentTokenSymbol, localOnly);
         result.push(...symbols);
         symbols = this.symbolsOfType(TokenSymbol, localOnly);
         result.push(...symbols);
         symbols = this.symbolsOfType(BuiltInModeSymbol, localOnly);
         result.push(...symbols);
         symbols = this.symbolsOfType(LexerModeSymbol, localOnly);
         result.push(...symbols);
         symbols = this.symbolsOfType(BuiltInChannelSymbol, localOnly);
         result.push(...symbols);
         symbols = this.symbolsOfType(TokenChannelSymbol, localOnly);
         result.push(...symbols);
         symbols = this.symbolsOfType(RuleSymbol, localOnly);
         result.push(...symbols);
         */
        //...
        return result;
    }
}