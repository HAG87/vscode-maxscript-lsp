import { BaseSymbol, ISymbolTableOptions, SymbolTable, SymbolConstructor, ScopedSymbol } from "antlr4-c3";
import { ParserRuleContext, ParseTree } from "antlr4ng";
import { SourceContext } from "./SourceContext.js";
import { ISymbolInfo, SymbolKind } from "../types.js";

//Definitions
export class PluginDefinitionSymbol extends ScopedSymbol { }
export class MacroScriptDefinitionSymbol extends ScopedSymbol { }
export class toolDefinitionSymbol extends ScopedSymbol { }
export class UtilityDefinitionSymbol extends ScopedSymbol { }
export class RolloutDefinitionSymbol extends ScopedSymbol { }
export class RcMenuDefinitionSymbol extends ScopedSymbol { }

export class StructDefinitionSymbol extends ScopedSymbol { }
export class FnDefinitionSymbol extends ScopedSymbol { }

export class ControlDefinition extends BaseSymbol { }

export class VariableDeclSymbol extends ScopedSymbol { }
export class AssignmentExpressionSymbol extends ScopedSymbol {}

export class IdentifierSymbol extends BaseSymbol { }

/*
export class simpleExpressionSymbol extends ScopedSymbol {}

export class variableDeclarationSymbol extends ScopedSymbol {}



export class assignmentOpExpressionSymbol extends ScopedSymbol {}

export class whileLoopExpressionSymbol extends ScopedSymbol {}

export class doLoopExpressionSymbol extends ScopedSymbol {}

export class forLoopExpressionSymbol extends ScopedSymbol {}

export class loopExitStatementSymbol extends ScopedSymbol {}

export class caseExpressionSymbol extends ScopedSymbol {}

export class structDefinitionSymbol extends ScopedSymbol {}

export class tryExpressionSymbol extends ScopedSymbol {}

export class fnDefinitionSymbol extends ScopedSymbol {}

export class fnReturnStatementSymbol extends ScopedSymbol {}
export class contextExpressionSymbol extends ScopedSymbol {}

export class attributesDefinitionSymbol extends ScopedSymbol {}

export class whenStatementSymbol extends ScopedSymbol {}



rolloutControl

rolloutGroup

fnDefinition
structDefinition

eventHandlerClause

toolDefinition

rolloutDefinition

eventHandlerClause

rc_submenu

rcmenuControl

nDefinition

structDefinition

toolDefinition

rolloutDefinition

eventHandlerClause

paramsDefinition

eventHandlerClause

paramsDefinition

rolloutDefinition

TypecastExpr

ExprOperand

UnaryExpr

ExponentExpr

ProductExpr

AdditionExpr

ComparisonExpr

LogicNOTExpr

LogicExpr

FnCallExpr

deRef

OperandExpr

operand

accessor


bool

STRING

PATH

NAME

NUMBER

TIMEVAL

QUESTION

array

bitArray

point3

point2

box2

expr_seq

*/

export class SymbolSupport
{

    public static symbolToKindMap: Map<new () => BaseSymbol, SymbolKind> = new Map([
        [FnDefinitionSymbol, SymbolKind.Function],
        [StructDefinitionSymbol, SymbolKind.Struct],
        [VariableDeclSymbol, SymbolKind.Declaration],

        [IdentifierSymbol, SymbolKind.Identifier],
        //...
    ]);

    public static topLevelSymbolsType: Array<new () => BaseSymbol> = new Array(
        FnDefinitionSymbol,
        StructDefinitionSymbol,
        VariableDeclSymbol,
        //...
    )
}

export class ContextSymbolTable extends SymbolTable
{
    public tree?: ParserRuleContext;

    // Caches with reverse lookup for indexed symbols.
    //...

    public constructor(
        name: string,
        options: ISymbolTableOptions,
        public owner?: SourceContext
    )
    { super(name, options); }

    private static isType(symbol: any): symbol is BaseSymbol | ScopedSymbol
    {
        return SymbolSupport.topLevelSymbolsType.some(t => symbol instanceof t);
    }

    /**
     * Does a depth-first search in the table for a symbol which contains the given context.
     * The search is based on the token indices which the context covers and goes down as much as possible to find
     * the closes covering symbol.
     *
     * @param context The context to search for.
     *
     * @returns The symbol covering the given context or undefined if nothing was found.
     */
    public symbolContainingContext(context: ParseTree): BaseSymbol | undefined
    {
        const findRecursive = (parent: ScopedSymbol): BaseSymbol | undefined =>
        {
            for (const symbol of parent.children) {
                if (!symbol.context) {
                    continue;
                }

                if (symbol.context.getSourceInterval().properlyContains(context.getSourceInterval())) {
                    let child;
                    if (symbol instanceof ScopedSymbol) {
                        child = findRecursive(symbol);

                    }
                    /*
                    if (child) {
                        return child;
                    } else {
                        return symbol;
                    }
                    */
                    return child ? child : symbol;
                }
            }
        };

        return findRecursive(this);
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
                        .filter(ContextSymbolTable.isType) // I NEED TO FILTER THE TYPES!!!
                        // .filter(child => 'name' in child)
                        .map(child => dfs(<ScopedSymbol>child))
                    : undefined
            };
        }
        return dfs(symbol);
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
        for (const t of SymbolSupport.topLevelSymbolsType) {
            let symbols = this.scopedSymbolsOfType(t as typeof ScopedSymbol, localOnly);
            result.push(...symbols);
        }
        //  */
        /*
        let symbols = this.scopedSymbolsOfType(FnDefinitionSymbol, localOnly);
        result.push(...symbols);
        symbols = this.scopedSymbolsOfType(StructDefinitionSymbol, localOnly);
        result.push(...symbols);
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

        return result;
    }
    // TODO: ScopedSymbol???
    public getSymbolInfo(symbol: string | BaseSymbol): ISymbolInfo | undefined
    {
        if (!(symbol instanceof BaseSymbol)) {
            const temp = this.resolveSync(symbol, false);
            if (!temp) {
                return undefined;
            }
            symbol = temp;
        }



        // Special handling for certain symbols.
        /*
        let kind = SourceContext.getKindFromSymbol(symbol);
        const name = symbol.name;
        switch (kind) {
            case SymbolKind.TokenVocab:
            case SymbolKind.Import: {
                // Get the source id from a dependent module.
                this.dependencies.forEach((table: ContextSymbolTable) => {
                    if (table.owner && table.owner.sourceId.includes(name)) {
                        return { // TODO: implement a best match search.
                            kind,
                            name,
                            source: table.owner.fileName,
                            definition: SourceContext.definitionForContext(table.tree, true),
                        };
                    }
                });

                break;
            }

            case SymbolKind.Terminal: {
                // These are references to a depending grammar.
                this.dependencies.forEach((table: ContextSymbolTable) => {
                    const actualSymbol = table.resolveSync(name);
                    if (actualSymbol) {
                        symbol = actualSymbol;
                        kind = SourceContext.getKindFromSymbol(actualSymbol);
                    }
                });

                break;
            }

            default: {
                break;
            }
        }
        // */
        const symbolTable = symbol.symbolTable as ContextSymbolTable;

        return {
            kind: SourceContext.getKindFromSymbol(symbol),
            name: symbol.name,
            source: (symbol.context && symbolTable && symbolTable.owner) ? symbolTable.owner.sourceUri.toString() : "maxscript",
            definition: SourceContext.definitionForContext(symbol.context, true),
            // description: undefined,
        };

    }

    public getSymbolOccurrences(symbolName: string, localOnly: boolean): ISymbolInfo[]
    {
        const result: ISymbolInfo[] = [];
        // this will ignore scope...
        const symbols = this.getAllSymbolsSync(BaseSymbol, localOnly);
        for (const symbol of symbols) {
            // owner is the document URI
            const owner = (symbol.root as ContextSymbolTable).owner;
            if (owner) {
                // symbol has context and name matches the search...
                if (symbol.context && symbol.name === symbolName) {
                    // for high level symbols
                    // for values, like identifiers
                    // childrens
                    let context = symbol.context;
                    /*
                    
                    if (symbol instanceof FragmentTokenSymbol) {
                        context = (symbol.context as ParserRuleContext).children[1];
                    } else if (symbol instanceof TokenSymbol || symbol instanceof RuleSymbol) {
                        context = (symbol.context as ParserRuleContext).children[0];
                    }
                    */
                    result.push({
                        kind: SourceContext.getKindFromSymbol(symbol),
                        name: symbolName,
                        source: owner.sourceUri.toString(),
                        definition: SourceContext.definitionForContext(context, true),
                        // description: undefined,
                    });

                }
                // childrens
                /*
                if (symbol instanceof ScopedSymbol) {
                    const references = symbol.getAllNestedSymbolsSync(symbolName);
                    for (const reference of references) {
                        result.push({
                            kind: SourceContext.getKindFromSymbol(reference),
                            name: symbolName,
                            source: owner.sourceUri.toString(),
                            definition: SourceContext.definitionForContext(reference.context, true),
                            // description: undefined,
                        });
                    }
                }
                // */
            }
        }

        return result;
    }
}