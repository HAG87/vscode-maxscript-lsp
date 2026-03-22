import {
    BaseSymbol, ISymbolTableOptions, ScopedSymbol, SymbolConstructor,
    SymbolTable,
} from 'antlr4-c3';
import { ParserRuleContext, ParseTree, TerminalNode } from 'antlr4ng';

import { mxsParser } from '../parser/mxsParser.js';
import { IDefinition, ISymbolInfo, SymbolKind } from '../types.js';
import { BackendUtils } from './BackendUtils.js';
import { SymbolUtils } from './symbols/symbolUtils.js';
import { SourceContext } from './SourceContext.js';
import {
    ExprSymbol, ExpSeqSymbol, fnArgsSymbol,
    fnParamsSymbol, IdentifierSymbol, topLevelSymbolsType,
    VariableDeclSymbol
} from './symbols/symbolTypes.js';

interface IScopeComparer {
    commonPath: BaseSymbol[];
    subPathA: BaseSymbol[];
    subPathB: BaseSymbol[];
}

interface IDefinitionResult {
    definition: BaseSymbol | undefined;
    results: BaseSymbol[];
    candidates: BaseSymbol[];
}

const declRules: Set<number> = new Set([
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


export class ContextSymbolTable extends SymbolTable {
    public tree?: ParserRuleContext;
    private symbolReferences = new Map<string, number>();

    public constructor(
        name: string,
        options: ISymbolTableOptions,
        public owner?: SourceContext,
    ) {
        super(name, options);
    }

    public override clear(): void {
        // Before clearing the dependencies make sure the owners are updated.
        // THIS IS PART OF THE WORK IN PROGRESS FOR THE WORKSPACE SYMBOL PROVIDER
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
    private static isType(symbol: unknown): symbol is BaseSymbol | ExprSymbol {
        return topLevelSymbolsType.some(t => symbol instanceof t);
    }

    /**
     * Does a bfs search for the given node, looking for searchSymbol on his children
     * @param root 
     * @param searchSymbol 
     * @param targetName 
     */
    private deepFind(root: BaseSymbol, searchSymbol: BaseSymbol): BaseSymbol | undefined {
        // Queue for BFS
        const queue: BaseSymbol[] = [root];

        const symbolPos = (searchSymbol.context as unknown as ParserRuleContext)?.start?.tokenIndex ?? 0;
        while (queue.length > 0) {
            const symbol = queue.shift()!; // Dequeue the front element

            const nodePos = (symbol.context as unknown as ParserRuleContext)?.start?.tokenIndex ?? 0;

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

    /**
     * Collect all references to a symbol with the given name
     * @param root 
     * @param searchName 
     */
    private collectReferences(root: BaseSymbol, searchName: string): BaseSymbol[] {
        // Queue for BFS
        // const queue: BaseSymbol[] = [root];
        const queue: BaseSymbol[] = [root.parent ?? root];
        const result: BaseSymbol[] = []
        // const symbolPos = (searchSymbol.context as ParserRuleContext)?.start?.tokenIndex ?? 0;
        while (queue.length > 0) {
            const symbol = queue.shift()!; // Dequeue the front element

            if (symbol.name === searchName && symbol instanceof IdentifierSymbol) {
                // skip declaration sites — they are handled separately as the definition
                if (
                    symbol.parent instanceof VariableDeclSymbol ||
                    symbol.parent instanceof fnArgsSymbol ||
                    symbol.parent instanceof fnParamsSymbol
                ) {
                    // break;
                    continue;
                } else if (!(symbol.parent && ContextSymbolTable.assertSymbols(root, symbol.parent))) {
                    result.push(symbol);
                }
            }
            // Enqueue all unvisited children
            if (symbol instanceof ScopedSymbol || symbol instanceof ExprSymbol) {
                for (const [childIndex, child] of symbol.children.entries()) {
                    queue.push(child);
                }
            }
        }

        return result;
    }

    /**
     * Does a depth-first search in the table for a symbol which contains the given context.
     * The search is based on the token indices which the context covers and goes down as much as possible to find
     * the closest covering symbol.
     * @param context The context to search for.
     * @returns The symbol covering the given context or undefined if nothing was found.
     */
    public symbolContainingContext(context: ParseTree): BaseSymbol | undefined {
        const findRecursive = (parent: ScopedSymbol): BaseSymbol | undefined => {
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
     * Gets the symbol at the given position
     * @param row 
     * @param column 
     */
    public getSymbolAtPosition(row: number, column: number): BaseSymbol | undefined {
        if (!this.tree) {
            return undefined;
        }

        // this will return the token at the position
        const terminal = BackendUtils.parseTreeFromPosition(this.tree, row, column);
        if (!terminal || !(terminal instanceof TerminalNode)) {
            return undefined;
        }
        const parent = terminal.parent as ParserRuleContext;
        
        // filter: accept identifier and kw_reserved (keywords usable as identifiers)
        if (parent.ruleIndex !== mxsParser.RULE_identifier &&
            parent.ruleIndex !== mxsParser.RULE_kw_reserved) {
            return undefined;
        }

        return this.symbolContainingContext(terminal);
    }

    /**
     * Gets all symbols of the given type in the given scope
     * @param scope 
     * @param type 
     */
    public async getAllSymbolsOfType<T extends BaseSymbol, Args extends unknown[]>
        (scope: ScopedSymbol, type: SymbolConstructor<T, Args>): Promise<T[]> {
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

    /**
     * Returns top-level symbols info
     * @param localOnly 
     */
    public symbolInfoTopLevel(localOnly: boolean): ISymbolInfo[] {
        return (topLevelSymbolsType.map(t =>
            this.symbolInfoOfType(t as typeof ExprSymbol, localOnly)).flat());
    }

    private symbolInfoOfType<T extends ScopedSymbol, Args extends unknown[]>
        (t: SymbolConstructor<T, Args>, localOnly = false): ISymbolInfo[] {
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

    private symbolInfoTree(symbol: BaseSymbol): ISymbolInfo[] {
        const symbolTable = symbol.symbolTable as ContextSymbolTable;

        function dfs(currentSymbol: BaseSymbol | ScopedSymbol): ISymbolInfo[] {
            // symbols that define a block, collect in parent symbol           
            if (currentSymbol instanceof ExpSeqSymbol) {
                return currentSymbol.children?.filter(ContextSymbolTable.isType)
                    .map(child => dfs(child)).flat() || [];
            }

            const SymbolInfo: ISymbolInfo = {
                name: currentSymbol.name,
                kind: SymbolUtils.getKindFromSymbol(currentSymbol),
                source: (symbolTable && symbolTable.owner) ? symbolTable.owner.sourceUri.toString() : "maxscript",
                definition: SymbolUtils.definitionForContext(currentSymbol.context, true),
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

    /**
     * Gets info for the given symbol
     * @param symbol 
     */
    public getSymbolInfo(symbol: string | BaseSymbol): ISymbolInfo | undefined {
        if (!(symbol instanceof BaseSymbol)) {
            const temp = this.resolveSync(symbol);
            if (!temp) { return; }
            symbol = temp;
        }
        const symbolTable = symbol.symbolTable as ContextSymbolTable;

        return {
            kind: SymbolUtils.getKindFromSymbol(symbol),
            name: symbol.name,
            source: (symbolTable && symbolTable.owner) ? symbolTable.owner.sourceUri.toString() : "maxscript",
            definition: SymbolUtils.definitionForContext(symbol.context, true),
            description: undefined,
        };
    }


    /**
     * Gets the reference of the symbol that defines the given symbol
     * @param symbol 
     */
    public getSymbolDefinition(symbol: BaseSymbol): BaseSymbol {
        // check if the symbol is the id of a Definition
        // do not get symbol definition in these rules
        let parentRule = symbol.parent?.context as unknown as ParserRuleContext || undefined;
        if (parentRule) {
            switch (parentRule.ruleIndex) {
                case mxsParser.RULE_variableDeclaration:
                case mxsParser.RULE_fn_args:
                case mxsParser.RULE_fn_params:
                    // Only bail out if this symbol IS the declared name, not a RHS reference
                    if (symbol.parent && symbol.name === (symbol.parent as ExprSymbol).name) {
                        return symbol;
                    }
                    break;  // otherwise continue searching for cam's actual definition
                default:
                    // continue the search
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

        if (ancestor.context && prospect && prospect.parent && prospect.parent.context) {
            parentRule = ancestor.context as unknown as ParserRuleContext;
            const prospectRule = prospect.parent.context as unknown as ParserRuleContext;
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
        const searchDefinition = this.findSymbolInstances(this, symbol, false);
        
        // TODO: This is unreliable, returns the parent?
        if (searchDefinition.definition) return searchDefinition.definition;

        // candidates for implicit declaration
        if (searchDefinition.candidates.length > 0) {
            return searchDefinition.candidates[searchDefinition.candidates.length - 1];
        }

        // seach in top-level symbols as last chance, unreliable
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

    /**
     * Gets all occurrences of the given symbol in the same scope
     * @param symbol 
     */
    public getScopedSymbolOccurrences(symbol: BaseSymbol) {
        // search on the same scope or in parent scope, NOT on childs of siblings
        //search on the root
        let table = [symbol];
        // dfs search        
        const searchDefinition = this.findSymbolInstances(this, symbol, true);

        // definition found. I need to search the references candidates and filter out of scope ones
        if (searchDefinition.definition) {
            table = [searchDefinition.definition];
        }

        if (searchDefinition.candidates.length > 0) {
            // searchDefinition produced candidates
            table.push(...searchDefinition.candidates);
        } else {
            // no candidates fallback, collect all references regardless of symbol scope.
            if (searchDefinition.definition) {
                table.push(...this.collectReferences(
                    searchDefinition.definition,
                    searchDefinition.definition.name)
                )
            }
        }
        // filter by scope
        return this.getSymbolOccurrencesInternal(symbol.name, table, symbol);
    }

    private getSymbolOccurrencesInternal(
        symbolName: string,
        symbols: BaseSymbol[],
        scopeRef?: BaseSymbol   // entry symbol — used to scope-filter unconfirmed candidates
    ): ISymbolInfo[]
    {
        const result: ISymbolInfo[] = [];

        const refScope = scopeRef
            ? (scopeRef.parent as ExprSymbol).getScope()
            : undefined;

        const getOwner = (symbol: BaseSymbol): SourceContext | undefined => {
            if (symbol.root) {
                const topParent = symbol.root.parent;
                if (topParent) return (topParent as ContextSymbolTable).owner;
            }
            return;
        }

        for (const symbol of symbols) {
            if (!symbol.context || symbol.name !== symbolName) continue;

            // When a scope reference is available, prune candidates whose scope
            // is unrelated to the entry — same/sibling/parent/child scopes are kept.
            if (refScope) {
                const scope = (symbol.parent as ExprSymbol).getScope();
                // filter by scope
                if (
                    !ContextSymbolTable.isScopeSame(refScope, scope) &&
                    !ContextSymbolTable.isScopeSibling(refScope, scope) &&
                    !ContextSymbolTable.isScopeChild(refScope, scope) &&   // candidate inside entry scope
                    !ContextSymbolTable.isScopeChild(scope, refScope) &&   // entry inside candidate scope
                    refScope.length !== 0 &&
                    scope.length !== 0
                ) continue;
            }

            const owner = getOwner(symbol) || this.owner;

            if (owner) {
                // symbol has context and name matches the search...
                result.push({
                    kind: SymbolUtils.getKindFromSymbol(symbol),
                    name: symbolName,
                    source: owner.sourceUri.toString(),
                    definition: SymbolUtils.definitionForContext(symbol.context, true),
                    // description: undefined,
                });
            }
        }

        return result;
    }

    /**
     * Gets all occurrences of the given symbol in the context (file)
     * @param symbolName 
     * @param localOnly 
     */
    public getSymbolOccurrences(symbolName: string, localOnly: boolean): ISymbolInfo[] {
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
                                kind: SymbolUtils.getKindFromSymbol(reference),
                                name: symbolName,
                                source: owner.sourceUri.toString(),
                                definition: SymbolUtils.definitionForContext(reference.context, true),
                                // description: undefined,
                            });
                        }
                    }
                } else {
                    // symbol has context and name matches the search...
                    if (symbol.context && symbol.name === symbolName) {
                        result.push({
                            kind: SymbolUtils.getKindFromSymbol(symbol),
                            name: symbolName,
                            source: owner.sourceUri.toString(),
                            definition: SymbolUtils.definitionForContext(symbol.context, true),
                            // description: undefined,
                        });

                    }
                }
            }
        }

        return result;
    }
    //-------------------------------------------------------------------------//
    /**
     * Compares two symbols for equality
     * @param symbolA 
     * @param symbolB 
     */
    public static assertSymbols(symbolA: BaseSymbol, symbolB: BaseSymbol): boolean
    {
        const contextA = symbolA.context as unknown as ParserRuleContext;
        const contextB = symbolB.context as unknown as ParserRuleContext;

        const rangeA = { line: contextA.start?.line || 0, column: contextA.start?.column || 0 };
        const rangeB = { line: contextB.start?.line || 0, column: contextB.start?.column || 0 };

        return symbolA.name === symbolB.name &&
            contextA.ruleIndex === contextB.ruleIndex &&
            JSON.stringify(rangeA) === JSON.stringify(rangeB);
    }

    private static compareScopes(scopeA: BaseSymbol[], scopeB: BaseSymbol[]): IScopeComparer
    {
        const commonPath: BaseSymbol[] = [];
        if (scopeA && scopeB) {
            //common path
            for (let i = 0; i < Math.min(scopeA.length, scopeB.length); i++) {
                if (ContextSymbolTable.assertSymbols(scopeA[i], scopeB[i])) {
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

    private static isScopeSame(scopeA: BaseSymbol[], scopeB: BaseSymbol[]): boolean
    {
        const scopeAdepth = scopeA.length;
        const scopeBdepth = scopeB.length;
        if (scopeAdepth === scopeBdepth) {
            return scopeA.every((symbol, index) => ContextSymbolTable.assertSymbols(symbol, scopeB[index]));
        }
        return false;
    }

    private static isScopeSibling(scopeA: BaseSymbol[], scopeB: BaseSymbol[]): boolean
    {
        const { subPathA, subPathB } = ContextSymbolTable.compareScopes(scopeA, scopeB);
        return subPathA.length <= 1 && subPathB.length <= 1;
    }

    private static isScopeChild(scopeA: BaseSymbol[], scopeB: BaseSymbol[]): boolean
    {
        const scopeAdepth = scopeA.length;
        const scopeBdepth = scopeB.length;
        // is scopeB child of scopeA? 
        if (scopeBdepth > scopeAdepth) {
            return scopeB.slice(0, scopeAdepth).every((symbol, index) => ContextSymbolTable.assertSymbols(symbol, scopeA[index]));
        }
        /*
        const resolveScopes = compareScopes(symbolA, symbolB);
        if (resolveScopes.commonPath.length > 0) {
            return resolveScopes.subPathB.length === 0; // symbol should be fully contained in the scope
        }
        */
        return false;
    }
    
    // TODO: disable for spacial cases, like calls to struct methods.... etc
    private static filterByScope(refScope: BaseSymbol[], collection: BaseSymbol[]): void {
        let from = 0, to = 0;
        while (from < collection.length) {
            const scope = (collection[from].parent as ExprSymbol).getScope();
            /*
            console.log('   -- refScope')
            console.log(refScope)
            console.log('   -- scope')
            console.log(scope)
            console.log(`same scope: ${ContextSymbolTable.isScopeSame(refScope, scope)}`)
            console.log(`child scope: ${ContextSymbolTable.isScopeChild(refScope, scope)}`)
            console.log(`sibling scope: ${ContextSymbolTable.isScopeSibling(refScope, scope)}`)
            */
            //TODO: these checks are too generic!.
            if (
                ContextSymbolTable.isScopeSame(refScope, scope)
                || ContextSymbolTable.isScopeSibling(refScope, scope)
                || ContextSymbolTable.isScopeChild(refScope, scope) // B inside A
                || ContextSymbolTable.isScopeChild(scope, refScope) // A inside B 
                || refScope.length === 0 // root/top-level scope
                || scope.length === 0
            ) {
                collection[to] = collection[from];
                to++;
            }
            from++;
        }
        collection.length = to;
    }
    
    private checkDefinitionCandidate(
        foundSymbol: BaseSymbol, symbol: BaseSymbol,
        result: BaseSymbol[], candidates: BaseSymbol[],
        identifiersOnly: boolean
    ): BaseSymbol | undefined {
        if (!symbol.parent) return;
        if (!symbol.parent.context) { candidates.push(symbol); return; }

        const parentRule = symbol.parent.context as unknown as ParserRuleContext;
        const scopeFound = (foundSymbol.parent as ExprSymbol).getScope();
        const scopeSymbol = (symbol.parent as ExprSymbol).getScope();
        const ret = (): BaseSymbol => identifiersOnly ? symbol : symbol.parent!;

        switch (parentRule.ruleIndex) {
            case mxsParser.RULE_structDefinition:
            case mxsParser.RULE_fnDefinition:
                if (symbol.name !== symbol.parent!.name) {
                    // e.g. "cam" inside "fn setObjID" body — reference, not the function name
                    candidates.push(symbol);
                    break;
                }
                if (ContextSymbolTable.isScopeSibling(scopeFound, scopeSymbol) ||
                    ContextSymbolTable.isScopeChild(scopeFound, scopeSymbol)) {
                    result.push(ret()); return ret();
                }
                break;
            case mxsParser.RULE_for_body:
            case mxsParser.RULE_fn_args:
            case mxsParser.RULE_fn_params:
                if (symbol.name !== symbol.parent!.name) {
                    candidates.push(symbol);
                    break;
                }
                if (ContextSymbolTable.isScopeChild(scopeFound, scopeSymbol)) {
                    result.push(ret()); return ret();
                }
                break;
            case mxsParser.RULE_variableDeclaration:
                if (symbol.name !== symbol.parent!.name) {
                    // cam inside "local campos = cam.pos" — it's a reference, not a declaration
                    candidates.push(symbol);
                    break;
                }
                if (ContextSymbolTable.isScopeSibling(scopeFound, scopeSymbol) ||
                    ContextSymbolTable.isScopeChild(scopeSymbol, scopeFound)) {
                    result.push(ret()); return ret();
                }
                break;
            case mxsParser.RULE_expr_seq:
                if (ContextSymbolTable.isScopeSibling(scopeFound, scopeSymbol)) candidates.push(symbol);
                break;
            case mxsParser.RULE_functionCall:
            case mxsParser.RULE_assignment:
            case mxsParser.RULE_property:
                candidates.push(symbol);
                break;
            default:
                if (ContextSymbolTable.isScopeChild(scopeFound, scopeSymbol) ||
                    ContextSymbolTable.isScopeSibling(scopeFound, scopeSymbol)) {
                    candidates.push(symbol);
                }
                break;
        }
        return;
    }
    //-------------------------------------------------------------------------//
    /**
     * Find the symbol that can be considered the definition of the entry symbol
     * @param root 
     * @param entry 
     * @param identifiersOnly 
     * @returns The symbol that represents the definition referenced by entry symbol
     */
    private findSymbolInstances(root: BaseSymbol, entry: BaseSymbol, identifiersOnly = false): IDefinitionResult {
        
        const entryIndex = (entry.context as unknown as ParserRuleContext).start?.tokenIndex ?? -1;

        let found: BaseSymbol | undefined = undefined;

        const _dfs = (node: BaseSymbol, /* found: BaseSymbol | undefined = undefined, */ result: BaseSymbol[] = [], candidates: BaseSymbol[] = []): BaseSymbol | undefined =>
        {
            // if ('children' in node && node instanceof ScopedSymbol || node instanceof SymbolTable) {
            if (node instanceof ScopedSymbol) {
                for (let i = node.children.length - 1; i >= 0; i--) {
                    const res = _dfs(node.children[i], result, candidates);
                    if (res) return res;
                }
            }

            //TODO: this is unreilable!!!
            // would need to wirte a pre-processor that buildes definition and references. add this properties to the symbol, I dont know if I can make this generic or would need complex heuristics
            if (node.context) {
                const nodeIndex = (node.context as unknown as ParserRuleContext).start?.tokenIndex || 0;
                // IN THE SEARCH FOR THE SYMBOL: since the symbol we are looking for is an instance of IdentifierSymbol, we can filter the search for the symbol
                if (node.name === entry.name && node instanceof IdentifierSymbol) {
                    // console.log('--> inspected symbol: ')
                    // console.log(node)
                    if (!found && (nodeIndex === entryIndex)) {
                        if (node !== entry) {
                            // Same position as entry but different symbol (duplicate from exitReference/exitIdentifier)
                            return undefined;
                        }
                        // console.log('--- found symbol ---')
                       
                       /*
                        // check scope inclusion of the previously collected symbols THIS IS DELEGATED TO getSYmbolOcurrencesInternal
                        if (candidates.length > 0) {
                            console.log('---------------filter candidates')                            
                            const foundScope = ((node.parent as ExprSymbol).getScope());
                            filterByScope(foundScope, candidates);
                        }
                        // */

                        // test first if we are at the definition, works when we have a parent context
                        // /*
                        if (node.parent && node.parent.context) {
                            const parentRule = node.parent.context as unknown as ParserRuleContext;
                            // if (declRules.has(parentRule.ruleIndex)) {
                            // The declaring identifier is always the one whose name matches the parent scope symbol's name
                            if (declRules.has(parentRule.ruleIndex) && node.name === node.parent!.name) {
                                // console.log('found symbol is definition')
                                result.push(node);
                                return identifiersOnly ? node : node.parent;  // was always node.parent
                            }
                        }
                        // */
                        found = node;
                        return undefined;
                    }

                    // moving this above find routine will skip checking the found symbol.
                    if (found) {
                       const definition = this.checkDefinitionCandidate(found, node, result, candidates, identifiersOnly);
                      
                        // check scope inclusion of the previously collected symbols
                        if (definition) {
                            // console.log('filter candidates')
                            // const definitionScope = definition instanceof IdentifierSymbol ? ((definition.parent as ExprSymbol).getScope()) : ((definition as ExprSymbol).getScope());
                            // filterByScope(definitionScope, candidates);
                            return definition
                        }
                        // console.log(candidates);
                        // console.log('it isn't definition!');
                        // return checkDefinition(found, node, result, candidates);
                    } else {
                        // symbol not found, add candidate
                        //TODO: candidates should include calls...
                        candidates.push(node);
                    }
                }
            }
            // console.log('symbol not found, return null')
            return;
        }

        const results: BaseSymbol[] = [];
        const candidates: BaseSymbol[] = [];
        const definition = _dfs(root, results, candidates);

        console.log('--- search result ---');
        console.log('definition:');
        console.log(definition);
        console.log('candidates:');
        console.log(candidates);

        return { definition, results, candidates };
    }
    //---------------------------------------------------------------

    public getReferenceCount(symbolName: string): number {
        const reference = this.symbolReferences.get(symbolName);
        return reference !== undefined ? reference : 0;
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