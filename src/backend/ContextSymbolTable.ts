import {
  BaseSymbol, ISymbolTableOptions, ScopedSymbol, SymbolConstructor,
  SymbolTable,
} from 'antlr4-c3';
import { ParserRuleContext, ParseTree, TerminalNode } from 'antlr4ng';

import { mxsParser } from '../parser/mxsParser.js';
import { ISymbolInfo } from '../types.js';
import { BackendUtils } from './BackendUtils.js';
import { SourceContext } from './SourceContext.js';

interface IScopeComparer
{
    commonPath: BaseSymbol[];
    subPathA: BaseSymbol[];
    subPathB: BaseSymbol[];
}

interface IDefinitionResult
{
    definition: BaseSymbol | undefined;
    results: BaseSymbol[];
    candidates: BaseSymbol[];
}

export class ExprSymbol extends ScopedSymbol
{
    // pathIndex: number[];
    scope?: BaseSymbol[];

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
            symbol instanceof StructDefinitionSymbol ||
            symbol instanceof StructMemberSymbol ||
            symbol instanceof FnDefinitionSymbol ||
            // symbol instanceof fnArgsSymbol ||
            // symbol instanceof fnParamsSymbol ||
            symbol instanceof VariableDeclSymbol ||
            symbol instanceof forBodySymbol ||
            symbol instanceof ExpSeqSymbol
            //...
        ).reverse();
    }

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
                // const childSymbols = await this.parent.getAllSymbols(t, true);
                result.push(...childSymbols);
            }
        }

        return result;
    }
}

//TODO: Definitions
export class PluginDefinitionSymbol extends ExprSymbol { }
export class MacroScriptDefinitionSymbol extends ExprSymbol { }
export class ToolDefinitionSymbol extends ExprSymbol { }
export class UtilityDefinitionSymbol extends ExprSymbol { }
export class RolloutDefinitionSymbol extends ExprSymbol { }
export class rolloutGroupSymbol extends ExprSymbol { }
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
export class EventHandlerClauseSymbol extends ExprSymbol { }
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
// export class contextExpressionSymbol extends ExprSymbol { }

// export class caseExpressionSymbol extends ScopedSymbol { }
// export class tryExpressionSymbol extends ScopedSymbol { }
// export class whileLoopExpressionSymbol extends ScopedSymbol { }
// export class doLoopExpressionSymbol extends ScopedSymbol { }
// export class caseExpressionSymbol extends ScopedSymbol { }
// export class tryExpressionSymbol extends ScopedSymbol { }

// export class TypecastExprSymbol extends ExprSymbol { }
// export class UnaryExprSymbol extends ExprSymbol { }
// export class ExponentExprSymbol extends ExprSymbol { }
// export class ProductExprSymbol extends ExprSymbol { }
// export class AdditionExprSymbol extends ExprSymbol { }
// export class ComparisonExprSymbol extends ExprSymbol { }
// export class LogicNOTExprSymbol extends ExprSymbol { }
// export class LogicExprSymbol extends ExprSymbol { }

export class AssignmentExpressionSymbol extends ExprSymbol { }
// export class forLoopExpressionSymbol extends ScopedSymbol { }
export class forBodySymbol extends ExprSymbol { }
// export class loopExitStatementSymbol extends ScopedSymbol { }
// export class AssignmentSymbol extends ExprSymbol { }
export class FnCallSymbol extends ExprSymbol { }
export class ExpSeqSymbol extends ExprSymbol { }
export class ParamSymbol extends ExprSymbol { }
// export class IndexAccessSymbol extends ExprSymbol { }
// export class propertyAccessSymbol extends BaseSymbol { }
// export class refSymbol extends ExprSymbol { }
export class IdentifierSymbol extends BaseSymbol { }

// export class arraySymbol extends ExprSymbol { }
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
    EventHandlerClauseSymbol,
    StructDefinitionSymbol,
    StructMemberSymbol,
    FnDefinitionSymbol,
    VariableDeclSymbol,
    ExpSeqSymbol,
];

export const declRules: Set<number> = new Set([
    mxsParser.RULE_pluginDefinition,
    mxsParser.RULE_attributesDefinition,
    mxsParser.RULE_macroscriptDefinition,
    mxsParser.RULE_utilityDefinition,
    mxsParser.RULE_rolloutDefinition,
    //...
    mxsParser.RULE_structDefinition,
    mxsParser.RULE_fnDefinition,
    mxsParser.RULE_variableDeclaration,
]);

export class ContextSymbolTable extends SymbolTable
{
    public tree?: ParserRuleContext;
    private symbolReferences = new Map<string, number>();

    public constructor(
        name: string,
        options: ISymbolTableOptions,
        public owner?: SourceContext,
    )
    {
        super(name, options);
    }

    public override clear(): void {
        // Before clearing the dependencies make sure the owners are updated.
        /*
        if (this.owner) {
            for (const dep of this.dependencies) {
                if (dep instanceof ContextSymbolTable && dep.owner) {
                    this.owner.removeDependency(dep.owner);
                }
            }
        }
        */
        this.symbolReferences.clear();

        super.clear();
    }
    /*
    public override addNewSymbolOfType<T extends BaseSymbol, Args extends unknown[]>
        (t: SymbolConstructor<T, Args>, parent: ScopedSymbol | undefined, ...args: Args): T
    {
        const result = new t(...args);

        if (!parent || parent === this) {
            this.addSymbol(result);
        } else {
            (parent as ExprSymbol).addSymbol(result, (parent as ExprSymbol).pathIndex);
        }
        return result;
    }
    */
    //--------------------------------------------------------------------------
    private static isType(symbol: unknown): symbol is BaseSymbol | ExprSymbol
    {
        return topLevelSymbolsType.some(t => symbol instanceof t);
    }

    /**
     * Does a depth-first search in the table for a symbol which contains the given context.
     * The search is based on the token indices which the context covers and goes down as much as possible to find
     * the closest covering symbol.
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
                    return child ? child : symbol;
                }
            }
        };

        return findRecursive(this);
    }
    /**
     * Does a bfs search for the given node, looking for searchSymbol on his children
     * @param root 
     * @param searchSymbol 
     * @param targetName 
     * @returns 
     */
    private deepFind( root: BaseSymbol, searchSymbol: BaseSymbol): BaseSymbol | undefined
    {
        // Queue for BFS
        const queue: BaseSymbol[] = [root];

        const symbolPos = (searchSymbol.context as ParserRuleContext)?.start?.tokenIndex ?? 0;
        while (queue.length > 0) {
            const symbol = queue.shift()!; // Dequeue the front element

            const nodePos = (symbol.context as ParserRuleContext)?.start?.tokenIndex ?? 0;

            if (symbol.name === searchSymbol.name &&
                typeof symbol === typeof searchSymbol &&
                nodePos === symbolPos
            ) {
                return symbol;
            }
            // Enqueue all unvisited children
            if (symbol instanceof ScopedSymbol || symbol instanceof ExprSymbol) {
                for (const [childIndex, child] of symbol.children.entries()) {
                    queue.push(child);
                }
            }
        }
        // If the target node was not found, return null
        return;
    }

    public getSymbolAtPosition(row: number, column: number): BaseSymbol | undefined
    {
        if (!this.tree) {
            return undefined;
        }

        // this will return the token at the position
        const terminal = BackendUtils.parseTreeFromPosition(this.tree, row, column);
        if (!terminal || !(terminal instanceof TerminalNode)) {
            return undefined;
        }
        const parent = terminal.parent as ParserRuleContext;
        // filter!
        if (parent.ruleIndex !== mxsParser.RULE_ids) {
            return undefined;
        }

        return this.symbolContainingContext(terminal);
    }

    public async getAllSymbolsOfType<T extends BaseSymbol, Args extends unknown[]>
        (scope: ScopedSymbol, type: SymbolConstructor<T, Args>): Promise<T[]>
    {
        const symbols = await scope.getAllSymbols(type, true);

        let parent = scope.parent;
        while (parent && !(parent instanceof ScopedSymbol)) {
            parent = parent.parent;
        }

        if (parent) {
            // console.log(parent);
            // const iter = await parent.getAllSymbols(type);
            const iter = await this.getAllSymbolsOfType(parent as ScopedSymbol, type);
            symbols.push(...iter);
        }
        return symbols;
    }
    // ----------------------------------------------------------------
    /*
    private symbolInfoOfType<T extends BaseSymbol, Args extends unknown[]>
        (t: SymbolConstructor<T, Args>, localOnly = false): ISymbolInfo[]
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
    */
    private symbolInfoTree(symbol: BaseSymbol): ISymbolInfo[]
    {
        const symbolTable = symbol.symbolTable as ContextSymbolTable;

        function dfs(currentSymbol: BaseSymbol | ScopedSymbol): ISymbolInfo[]
        {
            // symbols that define a block, collect in parent symbol           
            if (currentSymbol instanceof ExpSeqSymbol) {
                return currentSymbol.children?.filter(ContextSymbolTable.isType)
                    .map(child => dfs(child)).flat() || [];
            }

            const SymbolInfo: ISymbolInfo = {
                name: currentSymbol.name,
                kind: SourceContext.getKindFromSymbol(currentSymbol),
                source: (symbolTable && symbolTable.owner) ? symbolTable.owner.sourceUri.toString() : "maxscript",
                definition: SourceContext.definitionForContext(currentSymbol.context, true),
                children: []
            };

            if (SymbolInfo.children && currentSymbol instanceof ScopedSymbol) {
                for (const child of currentSymbol.children) {
                    if (ContextSymbolTable.isType(child)) {
                        SymbolInfo.children.push(...dfs(<ScopedSymbol>child));
                    }
                }
            }
            return [SymbolInfo];
        }
        return dfs(symbol);
    }

    private symbolInfoOfType<T extends ScopedSymbol, Args extends unknown[]>
        (t: SymbolConstructor<T, Args>, localOnly = false): ISymbolInfo[]
    {
        const result: ISymbolInfo[] = [];
        const symbols = this.getAllSymbolsSync(t, localOnly);
        const filtered = new Set(symbols); // Filter for duplicates.

        for (const symbol of filtered) {
            if (symbol.children.length > 0) {
                const res = this.symbolInfoTree(symbol);

                if (res.length === 0) {
                    result.push(this.getSymbolInfo(symbol)!);
                } else {
                    result.push(...res);
                }
            }
        }
        return result;
    }

    public symbolInfoTopLevel(localOnly: boolean): ISymbolInfo[]
    {
        return (topLevelSymbolsType.map(t =>
            this.symbolInfoOfType(t as typeof ExprSymbol, localOnly)).flat());
    }

    public getSymbolInfo(symbol: string | BaseSymbol): ISymbolInfo | undefined
    {
        if (!(symbol instanceof BaseSymbol)) {
            const temp = this.resolveSync(symbol);
            if (!temp) { return; }
            symbol = temp;
        }
        const symbolTable = symbol.symbolTable as ContextSymbolTable;

        return {
            kind: SourceContext.getKindFromSymbol(symbol),
            name: symbol.name,
            source: (symbolTable && symbolTable.owner) ? symbolTable.owner.sourceUri.toString() : "maxscript",
            definition: SourceContext.definitionForContext(symbol.context, true),
            description: undefined,
        };
    }
    /**
     * Find the symbol that can be considered the definition of the entry symbol
     * @param root 
     * @param entry 
     * @param identifiersOnly 
     * @returns The symbol that represents the definition referenced by entry symbol
     */
    private findSymbolInstances(root: BaseSymbol, entry: BaseSymbol, identifiersOnly = false): IDefinitionResult
    {
        const entryIndex = (entry.context as ParserRuleContext).start?.tokenIndex;

        function assertSymbols(symbolA: BaseSymbol, symbolB: BaseSymbol): boolean
        {
            const contextA = symbolA.context as ParserRuleContext;
            const contextB = symbolB.context as ParserRuleContext;

            const rangeA = { line: contextA.start?.line || 0, column: contextA.start?.column || 0 };
            const rangeB = { line: contextB.start?.line || 0, column: contextB.start?.column || 0 };

            return symbolA.name === symbolB.name &&
                contextA.ruleIndex === contextB.ruleIndex &&
                JSON.stringify(rangeA) === JSON.stringify(rangeB);
        }

        function compareScopes(scopeA: BaseSymbol[], scopeB: BaseSymbol[]): IScopeComparer
        {
            const commonPath: BaseSymbol[] = [];
            if (scopeA && scopeB) {
                //common path
                for (let i = 0; i < Math.min(scopeA.length, scopeB.length); i++) {
                    if (assertSymbols(scopeA[i], scopeB[i])) {
                        commonPath.push(scopeA[i]);
                    }
                }
                // check the remaining paths
                if (commonPath.length > 0) {
                    const subPathA = scopeA.slice(commonPath.length);
                    const subPathB = scopeB.slice(commonPath.length);
                    return { commonPath, subPathA, subPathB };

                }
            }
            return { commonPath, subPathA: scopeA, subPathB: scopeB };
        }

        function isScopeSame(scopeA: BaseSymbol[], scopeB: BaseSymbol[]): boolean
        {
            const scopeAdepth = scopeA.length;
            const scopeBdepth = scopeB.length;
            if (scopeAdepth === scopeBdepth) {
                return scopeA.every((symbol, index) => assertSymbols(symbol, scopeB[index]))
            }
            return false;
        }

        function isScopeSibling(scopeA: BaseSymbol[], scopeB: BaseSymbol[]): boolean
        {
            const scopeAdepth = scopeA.length;
            const scopeBdepth = scopeB.length;

            // Check if both files have a common root
            if (scopeAdepth > 1 && scopeBdepth > 1) {

                const resolveScopes = compareScopes(scopeA, scopeB);
                return resolveScopes.subPathB.length <= 1;
            }

            return false;
        }

        function isScopeChild(scopeA: BaseSymbol[], scopeB: BaseSymbol[]): boolean
        {
            const scopeAdepth = scopeA.length;
            const scopeBdepth = scopeB.length;

            if (scopeBdepth > scopeAdepth) {
                return scopeB.slice(0, scopeAdepth).every((symbol, index) => assertSymbols(symbol, scopeA[index]));
            }
            /*
            const resolveScopes = compareScopes(symbolA, symbolB);
            if (resolveScopes.commonPath.length > 0) {
                return resolveScopes.subPathB.length === 0; // symbol should be fully contained in the scope
            }
            */
            return false;
        }

        function checkDefinition(foundSymbol: BaseSymbol, symbol: BaseSymbol, result: BaseSymbol[], candidates: BaseSymbol[]): BaseSymbol | undefined
        {
            if (!(symbol.parent)) {
                // console.log('[x] node with no parent!');
                return;
            }

            if (!symbol.parent.context) {
                // this will probably be a single Identifier, add it to candidates...
                // console.log('[x] node with no parent context!');
                candidates.push(symbol);
                return;
            }

            const parentRule = symbol.parent.context as ParserRuleContext;
            const scopeA = (foundSymbol.parent as ExprSymbol).getScope();
            const scopeB = (symbol.parent as ExprSymbol).getScope();
            const returnValue = () => identifiersOnly ? symbol : symbol.parent!;

            switch (parentRule.ruleIndex) {
                //...
                // case mxsParser.RULE_struct_members:
                case mxsParser.RULE_structDefinition:
                case mxsParser.RULE_fnDefinition:
                    // console.log('   + is fn_Definition?')
                    if (isScopeSibling(scopeA, scopeB) || isScopeChild(scopeA, scopeB)) {
                        result.push(returnValue());
                        return returnValue();
                    }
                    break;
                case mxsParser.RULE_for_body:
                case mxsParser.RULE_fn_args:
                case mxsParser.RULE_fn_params:
                    // console.log('   + is fn_arg?');
                    if (isScopeChild(scopeA, scopeB)) {
                        result.push(symbol);
                        return symbol;
                    }
                    break;
                case mxsParser.RULE_variableDeclaration:
                    // console.log('   + Is variable declaration?');
                    // console.log(scopeA);
                    // console.log(scopeB);
                    //TODO: global variable
                    // console.log(`siblings?: ${isScopeSibling(scopeA, scopeB)}`);
                    if (isScopeSibling(scopeA, scopeB)) {
                        result.push(returnValue());
                        return returnValue();
                    }
                    break;
                // properties!! look for the identifier
                // for loop
                // controls
                // other blocks
                // implicit declarations
                // if symbol stand alone, ...
                case mxsParser.RULE_expr_seq:
                    // console.log('   + implicit declaration? - exp_seq scope');
                    // check scope
                    // console.log(symbol);
                    // if (testScopePertenence(foundSymbol, symbol)) {
                    if (isScopeSibling(scopeA, scopeB)) {
                        // console.log('symbol added');
                        // stop = true;
                        // return node.parent;
                        candidates.push(symbol);
                        // return symbol;
                    }
                    /*
                    const resolveScopes = compareScopes(foundSymbol, symbol);
                    const nodeIndex1 = (foundSymbol.context as ParserRuleContext).start?.tokenIndex || 0;
                    const nodeIndex2 = (symbol.context as ParserRuleContext).start?.tokenIndex || 0;
                    console.log(`${nodeIndex1} --- ${nodeIndex2}`);
                    console.log(resolveScopes);
                    */
                    // candidates.push(symbol);
                    // return;
                    break;
                //...
                default:
                    // console.log('   + implicit declaration? - everything else - unknown scope');
                    // console.log(symbol);
                    /*
                    const resolveScopes = compareScopes(foundSymbol, symbol);
                    const nodeIndex1 = (foundSymbol.context as ParserRuleContext).start?.tokenIndex || 0;
                    const nodeIndex2 = (symbol.context as ParserRuleContext).start?.tokenIndex || 0;

                    console.log(`${nodeIndex1} --- ${nodeIndex2}`);
                    console.log(resolveScopes);
                    // */
                    // check scope
                    if (isScopeChild(scopeA, scopeB) || isScopeSibling(scopeA, scopeB)) {
                        // stop = true;
                        // return node.parent;
                        candidates.push(symbol);
                        // return symbol;
                    }
                    // return node;
                    // return;
                    break;
            }
            return;
        }

        function filterByScope(refScope: BaseSymbol[], collection: BaseSymbol[]): void
        {
            let from = 0, to = 0;
            while (from < collection.length) {
                const scope = (collection[from].parent as ExprSymbol).getScope();
                if (isScopeSame(refScope, scope) || isScopeSibling(refScope, scope) || isScopeChild(refScope, scope)) {
                    collection[to] = collection[from];
                    to++;
                }
                from++;
            }
            collection.length = to;
        }

        let found: BaseSymbol | undefined = undefined;

        function _dfs(node: BaseSymbol, /* found: BaseSymbol | undefined = undefined, */ result: BaseSymbol[] = [], candidates: BaseSymbol[] = []): BaseSymbol | undefined
        {
            // if (!node) return;
            //posorder            
            // if (node instanceof ScopedSymbol) {
            if ('children' in node && node instanceof ScopedSymbol || node instanceof SymbolTable) {
                // for (let i = 0; i <= node.children.length - 1; i++) {
                for (let i = node.children.length - 1; i >= 0; i--) {
                    const res =
                        _dfs(node.children[i], /* found, */ result, candidates);
                    // problem here when we reach the top with undefined
                    if (res) {
                        // resultSymbol = res;
                        return res;
                    }
                }
            }

            if (node.context) {
                const nodeIndex = (node.context as ParserRuleContext).start?.tokenIndex || 0;
                // IN THE SEARCH FOR THE SYMBOL: since the symbol we are looking for is an instance of IdentifierSymbol,
                // we can filter the search for the symbol
                if (node.name === entry.name && node instanceof IdentifierSymbol) {
                    if (!found && (nodeIndex === entryIndex)) {
                        // check scope inclusion of the previously collected symbols
                        if (candidates.length > 0) {
                            const foundScope = ((node.parent as ExprSymbol).getScope());
                            filterByScope(foundScope, candidates);
                        }
                        // test first if we are at the definition, works when we have a parent context
                        if (node.parent && node.parent.context) {
                            const parentRule = node.parent.context as ParserRuleContext;

                            if (declRules.has(parentRule.ruleIndex)) {
                                result.push(node);
                                return node.parent;
                            }
                        }
                        found = node;
                    }

                    // moving this above find routine will skip checking the found symbol.
                    if (found) {
                        return checkDefinition(found, node, result, candidates);
                    } else {
                        candidates.push(node);
                    }
                }
            }
            return;
        }

        const
            results: BaseSymbol[] = [],
            candidates: BaseSymbol[] = [],
            definition = _dfs(root, results, candidates);

        const definitionResult: IDefinitionResult = {
            definition,
            results,
            candidates
        };

        return definitionResult;
    }

    public getSymbolDefinition(symbol: BaseSymbol): BaseSymbol
    {
        // check if the symbol is the id of a Definition
        // do not get symbol definition in these rules
        let parentRule = symbol.parent?.context as ParserRuleContext || undefined;
        if (parentRule) {
            switch (parentRule.ruleIndex) {
                case mxsParser.RULE_variableDeclaration:
                case mxsParser.RULE_fn_args:
                case mxsParser.RULE_fn_params:
                    //...
                    // console.log('symbol is in definition!');
                    return symbol;
                default:
                    break;
            }
        } else {
            //accelerator. no parent rule, so return the first symbol
            return this.resolveSync(symbol.name) || symbol;
        }
        // accelerator: handle some known cases
        // topmost parent that its not _ContextSymbolTable
        // const ancestor = symbol.symbolPath[symbol.symbolPath.length - 2] as ContextSymbolTable;

        // eslint-disable-next-line prefer-const
        let ancestor = symbol.root as ContextSymbolTable;
        // in symbol scope
        const prospects: BaseSymbol[] = ancestor.getAllNestedSymbolsSync(symbol.name);
        let prospect: BaseSymbol = prospects[0];

        if (ancestor.context && prospect.parent && prospect.parent.context) {
            parentRule = ancestor.context as ParserRuleContext;
            const prospectRule = prospect.parent.context as ParserRuleContext;
            switch (parentRule.ruleIndex) {
                case mxsParser.RULE_fnDefinition:
                    switch (prospectRule.ruleIndex) {
                        case mxsParser.RULE_fn_args:
                        case mxsParser.RULE_fn_params:
                            // console.log('first appearance in paren is definition!');
                            return prospect;
                    }
                    break;
                //...
            }
        }
        // check if the symbol is the only one!
        if (prospects.length === 1) return prospects[0];

        // walk the tree, starting from the symbol, going up parents...
        // console.log('---DFS---');
        const searchDefinition = this.findSymbolInstances(this, symbol);
        if (searchDefinition.definition) return searchDefinition.definition;
        // candidates for implicit declaration
        if (searchDefinition.candidates.length > 0) {
            return searchDefinition.candidates[searchDefinition.candidates.length - 1];
        }

        // seach in top-level symbols as last chance, unreilable
        if (ancestor.parent) {
            let topScope = ancestor.parent;
            while (topScope) {
                // let siblings = topScope.getAllSymbolsSync(BaseSymbol, true);
                const sibling = topScope.resolveSync(symbol.name, true);
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
        let table = [symbol];
        // dfs search        
        const searchDefinition =
            this.findSymbolInstances(this, symbol, true);
        if (searchDefinition.candidates.length > 0) {
            if (searchDefinition.definition) {
                table = [searchDefinition.definition];
                table.push(...searchDefinition.candidates);
            } else {
                table = searchDefinition.candidates;
            }
        }

        return this.getSymbolOccurrencesInternal(symbol.name, table);
    }

    private getSymbolOccurrencesInternal(symbolName: string, symbols: BaseSymbol[]): ISymbolInfo[]
    {
        const result: ISymbolInfo[] = [];

        const getOwner = (symbol: BaseSymbol): SourceContext | undefined =>
        {
            if (symbol.root) {
                const topParent = symbol.root.parent;
                if (topParent) {
                    return (topParent as ContextSymbolTable).owner;
                }
            }
            return;
        }

        for (const symbol of symbols) {
            const owner = getOwner(symbol) || this.owner;

            if (owner) {
                // symbol has context and name matches the search...
                if (symbol.context && symbol.name === symbolName) {
                    result.push({
                        kind: SourceContext.getKindFromSymbol(symbol),
                        name: symbolName,
                        source: owner.sourceUri.toString(),
                        definition: SourceContext.definitionForContext(symbol.context, true),
                        // description: undefined,
                    });
                }
            }
        }

        return result;
    }

    public getSymbolOccurrences(symbolName: string, localOnly: boolean): ISymbolInfo[]
    {
        const symbols = this.getAllSymbolsSync(BaseSymbol, localOnly);
        const result: ISymbolInfo[] = [];
        // this will ignore scope...
        for (const symbol of symbols) {
            // owner is the document URI
            // const owner = this.findRoot(symbol).owner;
            const owner = (symbol.root?.parent as ContextSymbolTable).owner! ?? this.owner;

            if (owner) {
                // childrens
                if (symbol instanceof ExprSymbol) {
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
                        result.push({
                            kind: SourceContext.getKindFromSymbol(symbol),
                            name: symbolName,
                            source: owner.sourceUri.toString(),
                            definition: SourceContext.definitionForContext(symbol.context, true),
                            // description: undefined,
                        });

                    }
                }
            }
        }

        return result;
    }
    //---------------------------------------------------------------
    public getReferenceCount(symbolName: string): number {
        const reference = this.symbolReferences.get(symbolName);
        if (reference) {
            return reference;
        } else {
            return 0;
        }
    }

    public getUnreferencedSymbols(): string[] {
        const result: string[] = [];
        for (const entry of this.symbolReferences) {
            if (entry[1] === 0) {
                result.push(entry[0]);
            }
        }

        return result;
    }

    public incrementSymbolRefCount(symbolName: string): void {
        const reference = this.symbolReferences.get(symbolName);
        if (reference) {
            this.symbolReferences.set(symbolName, reference + 1);
        } else {
            this.symbolReferences.set(symbolName, 1);
        }
    }
}