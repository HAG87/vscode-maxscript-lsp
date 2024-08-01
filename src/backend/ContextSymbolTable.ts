import { VariableSymbol, LiteralSymbol, BaseSymbol, ISymbolTableOptions, SymbolTable, SymbolConstructor, ScopedSymbol, IScopedSymbol } from "antlr4-c3";
import { ParserRuleContext, ParseTree, TerminalNode } from "antlr4ng";
import { SourceContext } from "./SourceContext.js";
import { ISymbolInfo, SymbolKind } from "../types.js";
import { BackendUtils } from "./BackendUtils.js";
import { mxsParser } from "../parser/mxsParser.js";
import { BinaryLifting } from "./symbolSearch.js";
//Definitions
export class PluginDefinitionSymbol extends ScopedSymbol { }
export class MacroScriptDefinitionSymbol extends ScopedSymbol { }
export class toolDefinitionSymbol extends ScopedSymbol { }
export class UtilityDefinitionSymbol extends ScopedSymbol { }
export class RolloutDefinitionSymbol extends ScopedSymbol { }
export class RcMenuDefinitionSymbol extends ScopedSymbol { }

export class StructDefinitionSymbol extends ScopedSymbol { }
export class FnDefinitionSymbol extends ScopedSymbol { }
export class fnArgsSymbol extends ScopedSymbol { }

export class ControlDefinition extends BaseSymbol { }

export class VariableDeclSymbol extends ScopedSymbol { }
export class AssignmentExpressionSymbol extends ScopedSymbol { }

export class AssignmentSymbol extends ScopedSymbol { }

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
    public symbolContainingContext(context: ParseTree): BaseSymbol | ScopedSymbol | undefined
    {
        const findRecursive = (parent: ScopedSymbol): BaseSymbol | ScopedSymbol | undefined =>
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
        /*
          function resolveSync(name, localOnly = false) {
            for (const child of this.#children) {
            if (child.name === name) {
                return child;
            }
            }
            if (!localOnly) {
            if (this.parent) {
                return this.parent.resolveSync(name, false);
            }
            }
            return void 0;
        }
    // */
        // all the symbols
        // let symbols = this.getAllSymbolsSync(BaseSymbol,false);
        // recursively look for the symbol

        // console.log(symbols);


        if (!(symbol instanceof BaseSymbol)) {
            const temp = this.resolveSync(symbol);
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
            description: undefined,
        };

    }

    private findRoot(symbol: BaseSymbol): ContextSymbolTable
    {
        if (symbol.parent) {
            let root = symbol.parent;
            while (root) {
                if (root.parent) {
                    root = root.parent;
                } else {
                    return root as ContextSymbolTable;
                }
            }
        }
        return symbol as ContextSymbolTable;
    }

    public getTopMostParent(symbol: BaseSymbol): ContextSymbolTable | IScopedSymbol
    {
        // not topmost symbol
        if (!symbol.parent?.parent?.context) {
            return this;
        }
        // console.log(symbol.parent instanceof ContextSymbolTable);
        let symbolTopMostParent = symbol.parent;
        while (symbolTopMostParent.parent) {
            if (symbolTopMostParent?.parent.parent !== undefined) {
                // console.log(symbolTopMostParent);
                symbolTopMostParent = symbolTopMostParent?.parent;
            } else break;
        }
        return symbolTopMostParent;
    }

    public getSymbolAtPosition(
        row: number,
        column: number): BaseSymbol | undefined
    {
        if (!this.tree) {
            return undefined;
        }

        // this will return the token at the position
        const terminal = BackendUtils.parseTreeFromPosition(this.tree, column, row);
        if (!terminal || !(terminal instanceof TerminalNode)) {
            return undefined;
        }

        let parent = (terminal.parent as ParserRuleContext);
        // filter!
        if (parent.ruleIndex !== mxsParser.RULE_ids) {
            return undefined;
        }
        return this.symbolContainingContext(terminal);
    }

    public getSymbolDefinition(symbol: BaseSymbol): BaseSymbol
    {
        // let ancestor = this.getTopMostParent(symbol) as ContextSymbolTable;
        let ancestor = symbol.root as ContextSymbolTable;

        // check if the symbol is the id of a Definition
        // do not get symbol definition in these rules
        let parentRule = symbol.parent?.context as ParserRuleContext;
        if (
            parentRule.ruleIndex === mxsParser.RULE_variableDeclaration ||
            parentRule.ruleIndex === mxsParser.RULE_fn_args
            //...
        ) {
            return symbol;
        }

        // in symbol scope
        let prospects: BaseSymbol[] = ancestor.getAllNestedSymbolsSync(symbol.name);

        let prospect: BaseSymbol = prospects[0];

        // handle some special cases
        parentRule = symbol.root?.context as ParserRuleContext;

        if (
            parentRule.ruleIndex === mxsParser.RULE_fnDefinition
            //...
        ) {
            let prospectRule = prospect.parent?.context as ParserRuleContext;
            if (
                prospectRule.ruleIndex === mxsParser.RULE_fn_args
                //..
            ) {
                return prospect;
            }
        }

        // seach in top-level symbols as last chance
        if (ancestor.parent) {
            let topScope = ancestor.parent;
            while (topScope) {
                // let siblings = topScope.getAllSymbolsSync(BaseSymbol, true);
                let sibling = topScope.resolveSync(symbol.name, true);
                if (sibling) {
                    prospect = sibling;
                    break;
                }
                if (topScope.parent) {
                    topScope = topScope.parent;
                } else break;
            }
        }

        /*
        // option: seach for a common ancestor
        let ancestor = this.symbolTable;
        const table = ancestor.getAllNestedSymbolsSync(symbol.name);
        const searcher = new BinaryLifting(ancestor as ScopedSymbol);
        
        for (const prospect of table) {
            // const lca = searcher.lca(symbol as ScopedSymbol, prospect);
            // console.log(lca);
            if (searcher.lca(symbol as ScopedSymbol, prospect)) {
                symbol = prospect;
                break;
            }
        }
        //*/
        return prospect;
    }

    public getScopedSymbolOccurrences(symbol: BaseSymbol)
    {
        // search on the same scope or in parent scope, NOT on childs of siblings

        //search on the root
        let root = symbol.root as ScopedSymbol
        const table = root.getAllNestedSymbolsSync(symbol.name);
        // search siblings of the root, need to do this all the way up
        // iterate over parents

        /*
        let ancestor = this.getTopMostParent(symbol) as ContextSymbolTable;
        // let ancestor = root.parent;
        if (ancestor) {
            let siblings = ancestor.getAllSymbolsSync(BaseSymbol, true);
            table.push(...siblings);
        }
        */

        // seach all the way up, do not return childs
        if (root.parent) {
            let test = root.parent;
            // console.log(test);
            while (test) {
                console.log(test);
                let siblings = test.getAllSymbolsSync(BaseSymbol, true);
                table.push(...siblings);
                if (test.parent) {
                    test = test.parent;
                } else break;
            }
        }

        // console.log(table);
        // console.log(ancestor.resolveSync(symbol.name, false));

        return this.getSymbolOccurrencesInternal(symbol.name, table);
    }

    public getSymbolOccurrences(symbolName: string, localOnly: boolean): ISymbolInfo[]
    {
        const symbols = this.getAllSymbolsSync(BaseSymbol, localOnly);

        return this.getSymbolOccurrencesInternalNested(symbolName, symbols);
    }

    private getSymbolOccurrencesInternal(symbolName: string, symbols: BaseSymbol[]): ISymbolInfo[]
    {
        const result: ISymbolInfo[] = [];
        for (const symbol of symbols) {
            const owner = this.findRoot(symbol).owner;

            if (owner) {
                // symbol has context and name matches the search...
                if (symbol.context && symbol.name === symbolName) {

                    let context = symbol.context;

                    result.push({
                        kind: SourceContext.getKindFromSymbol(symbol),
                        name: symbolName,
                        source: owner.sourceUri.toString(),
                        definition: SourceContext.definitionForContext(context, true),
                        // description: undefined,
                    });

                }
            }
        }

        return result;
    }

    private getSymbolOccurrencesInternalNested(symbolName: string, symbols: BaseSymbol[], localOnly = true): ISymbolInfo[]
    {
        const result: ISymbolInfo[] = [];
        // this will ignore scope...
        for (const symbol of symbols) {
            // owner is the document URI
            // const owner = (symbol.root as ContextSymbolTable).owner;
            const owner = this.findRoot(symbol).owner;

            if (owner) {
                // childrens
                if (symbol instanceof ScopedSymbol) {
                    // const references = symbol.getAllNestedSymbolsSync();
                    const references = symbol.getAllNestedSymbolsSync(symbolName);

                    for (const reference of references) {
                        if (reference.context && reference.name === symbolName) {
                            // console.log(reference);
                            result.push({
                                kind: SourceContext.getKindFromSymbol(reference),
                                name: symbolName,
                                source: owner.sourceUri.toString(),
                                definition: SourceContext.definitionForContext(reference.context, true),
                                // description: undefined,
                            });
                        }
                    }
                } else {
                    // symbol has context and name matches the search...
                    if (symbol.context && symbol.name === symbolName) {
                        let context = symbol.context;

                        result.push({
                            kind: SourceContext.getKindFromSymbol(symbol),
                            name: symbolName,
                            source: owner.sourceUri.toString(),
                            definition: SourceContext.definitionForContext(context, true),
                            // description: undefined,
                        });

                    }
                }
            }
        }

        return result;
    }
}