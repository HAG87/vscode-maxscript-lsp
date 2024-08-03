import { VariableSymbol, LiteralSymbol, BaseSymbol, ISymbolTableOptions, SymbolTable, SymbolConstructor, ScopedSymbol, IScopedSymbol } from "antlr4-c3";
import { ParserRuleContext, ParseTree, TerminalNode } from "antlr4ng";
import { SourceContext } from "./SourceContext.js";
import { ISymbolInfo, SymbolKind } from "../types.js";
import { BackendUtils } from "./BackendUtils.js";
import { mxsParser } from "../parser/mxsParser.js";
import { BinaryLifting } from "./symbolSearch.js";
import assert from "assert";
import path from "path";
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

    private seachSymbolDefinition(root: BaseSymbol, entry: BaseSymbol): BaseSymbol | undefined
    {
        let found = false;
        let stop = false;
        const entryIndex = (entry.context as ParserRuleContext).start?.tokenIndex;

        function _dfs(node: BaseSymbol): BaseSymbol | undefined
        {
            if (stop) { return; }

            //posorder
            if (node instanceof ScopedSymbol) {
                // for (let child of node.children) { _dfs(child); }
                for (let i = node.children.length - 1; i >= 0; i--) {
                    // if (!stop) _dfs(node.children[i]);
                    const result = _dfs(node.children[i]);
                    if (result) return result;
                }

            }

            // seach for the symbol
            const nodeIndex = (node.context as ParserRuleContext).start?.tokenIndex;

            // console.log(`${nodeIndex} --- ${entryIndex}`);
            if (node.name === entry.name && nodeIndex === entryIndex) {
                // console.log(`found: ${nodeIndex} --- ${entryIndex}`);
                found = true;
                // return node;
                return;
            }

            if (found && node.name === entry.name) {
                // console.log(`${nodeIndex} --- ${entryIndex}`);
                if (node.parent) {
                    const rule = node.parent.context as ParserRuleContext;
                    switch (rule.ruleIndex) {
                        case mxsParser.RULE_variableDeclaration:
                        case mxsParser.RULE_fn_args:
                        case mxsParser.RULE_fn_params:
                            //...
                            console.log(`stopped at: ${nodeIndex}`);
                            stop = true;
                            return node.parent;
                        case mxsParser.RULE_fnDefinition:
                            //...
                            if (node.parent.name === node.name) {
                                console.log(`stopped at: ${nodeIndex}`);
                                stop = true;
                                return node.parent;
                            }
                            break;
                        default:
                            // this will end with the first appearance of the symbol.
                            // maybe will work for loose typed vars?
                            // return node;
                            break;
                    }
                }

            }
            //inorder
            return;
        }
        return _dfs(root);
    }

    public getSymbolDefinition(symbol: BaseSymbol): BaseSymbol
    {
        // check if the symbol is the id of a Definition
        // do not get symbol definition in these rules
        let parentRule = symbol.parent?.context as ParserRuleContext;
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

        // let ancestor = this.getTopMostParent(symbol) as ContextSymbolTable;
        // topmost parent that its not _ContextSymbolTable
        // const ancestor = symbol.symbolPath[symbol.symbolPath.length - 2] as ContextSymbolTable;
        let ancestor = symbol.root as ContextSymbolTable;
        // in symbol scope
        const prospects: BaseSymbol[] = ancestor.getAllNestedSymbolsSync(symbol.name);

        // handle some special cases
        let prospect: BaseSymbol = prospects[0];
        parentRule = ancestor.context as ParserRuleContext;
        // /*
        switch (parentRule.ruleIndex) {
            case mxsParser.RULE_fnDefinition:
                //...
                const prospectRule = prospect.parent?.context as ParserRuleContext;
                switch (prospectRule.ruleIndex) {
                    case mxsParser.RULE_fn_args:
                        //...
                        // console.log('first appearance in paren is definition!');
                        return prospect;
                }
                break;
        }
        // */
        //check if the symbol is the only one!
        // if (prospects.length === 1) return prospects[0];

        //walk the tree, starting from the symbol, going up parents...
        // the problem is with undeclared variables, I dont know how to define the scope start... or where to stop
        // let searchDefinition = this.seachSymbolDefinition(this, symbol);
        // if (searchDefinition) return searchDefinition;

        // /*
        // seach in top-level symbols as last chance, unreilable
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
        // */
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
        let result: BaseSymbol[] | undefined;
        //search on the root
        const root = symbol.root as ScopedSymbol

        let table = root.getAllNestedSymbolsSync(symbol.name);
        /*
                // for fn definition, look in the fn arguments
                let rootContext = root?.context as ParserRuleContext;
        
                const rule = (<ParserRuleContext>table[0].parent?.context);
        
                switch (rootContext.ruleIndex) {
                    case mxsParser.RULE_fnDefinition:
                        switch (rule.ruleIndex) {
                            case mxsParser.RULE_fn_args:
                            case mxsParser.RULE_fn_params:
                                //stop here
                                return this.getSymbolOccurrencesInternal(symbol.name, table);
                        }
                        break;
                    case mxsParser.RULE_variableDeclaration:
                        return this.getSymbolOccurrencesInternal(symbol.name, table);
                    default:
                        switch (rule.ruleIndex) {
                            case mxsParser.RULE_variableDeclaration:
                                //...
                                return this.getSymbolOccurrencesInternal(symbol.name, table);
                        }
                        break;
                    // ...
                }
          */
        //seach from top to botton, stop the brach whenever the symbol is redefined
        //BSF Seach
        function dfsCollectNodes(root: BaseSymbol | ScopedSymbol, symbol: BaseSymbol | ScopedSymbol, targetName: string): (BaseSymbol | ScopedSymbol)[]
        {
            if (!root) {
                return [];
            }

            function isSameBranch(path1: number[], path2: number[]): number
            {
                if (path1 === path2) return 0;
                
                const root: number[] = [];
                let count = 0;
                while (path1[count] === path2[count]) {
                    root.push(path1[count]);
                    count++;
                }

                if (root.length < 1) return -1;
                /*
                const test1 = path1.slice(0, root.length);
                const test2 = path2.slice(0, root.length);

                return test1.every((el, i) => test2[i] <= el) ? 1 : -1;
                */
                // /*
                if (path1.length > path2.length) {
                    return path1.every((el, i) => path2[i] === el) ? 1 : -1;
                } else {
                    return path2.every((el, i) => path1[i] === el) ? 1 : -1;
                }
                    // */
            }
            function isUnderPath(path1: number[], path2: number[]): boolean
            {
                // common root
                const root: number[] = [];
                let count = 0;
                while (path1[count] === path2[count]) {
                    root.push(path1[count]);
                    count++;
                }

                if (root.length < 1) return false;

                const test1 = path1.slice(0, root.length);
                const test2 = path2.slice(0, root.length);

                return test1.every((el, i) => test2[i] <= el)
            }
            const symbolPos = (symbol.context as ParserRuleContext).start?.tokenIndex;
            let found = false;
            let foundMeIndex: number = 0;
            let foundPath: number[] = [];
            const result: (BaseSymbol | ScopedSymbol)[] = [];

            let shouldStop = false;
            let declFound = false;

            const paths: number[][] = [];
            let stopPaths: number[][] = [];

            function dfs(node: BaseSymbol | ScopedSymbol, path: number[])
            {

                // if (!node) return;
                // console.log(JSON.stringify(paths));
                if (shouldStop) { console.log('stoped!'); return; }

                // Recursively visit each child if the node is a ScopedSymbol   
                //inorder   
                //*          
                if (node instanceof ScopedSymbol) {
                    // for (const child of node.children) {
                    // dfs(child);
                    // for (let i = 0; i < node.children.length; i++) {
                    for (let i = node.children.length - 1; i >= 0; i--) {
                        // dfs(node.children[i]);
                        dfs(node.children[i], [...path, i]);
                    }
                }
                //*/

                // console.log(node.symbolPath);

                if (node.name === targetName && node instanceof IdentifierSymbol) {

                    console.log(node);
                    // result.push(node);
                    // paths.push(path);
                    // console.log(path);

                    const nodePos = (node.context as ParserRuleContext).start?.tokenIndex;

                    console.log(`${nodePos} : ${path}`);
                    if (symbolPos === nodePos) {
                        foundMeIndex = result.length - 1;
                        foundPath = path;
                        console.log(`found ${nodePos} : ${path}`);
                        found = true;
                    }


                    // console.log(`${nodePos} -- ${symbolPos} | ${found} | ${result.length - 1}`);


                    // let rule = node.context as ParserRuleContext;
                    // console.log(rule.start?.line);


                    // /*
                    let parent = node.parent;

                    // if (parent && parent.context && found) {
                    if (parent && parent.context) {
                        // console.log(parent);
                        let parentRule = parent.context as ParserRuleContext;
                        // console.log(parentRule.start?.line);

                        switch (parentRule.ruleIndex) {
                            case mxsParser.RULE_fn_args:
                            case mxsParser.RULE_fn_params:
                            case mxsParser.RULE_variableDeclaration:
                                //...
                                // shouldStop = true;
                                // prune results
                                console.log(`declaration! =>  ${path}`);
                                if (!declFound) {
                                    declFound = true;
                                }
                                if (found) {
                                    //already found, new declaration overrides it, not a reference, stop
                                    // compare branches
                                    // console.log(`isInBranch: ${isSameBranch(foundPath, path)}`)
                                    shouldStop = true;
                                    // switch (isSameBranch(path, foundPath)) {
                                    switch (isSameBranch(foundPath, path)) {
                                        case -1: // not same branch
                                            console.log('=> found but not declaration child, test branch, what to do?')
                                            if (isUnderPath(foundPath, path)) {
                                                for (let i = paths.length - 1; i >= 0; i--) {
                                                    console.log(`${path} -- ${paths[i]} || ${isUnderPath(path, paths[i])}`);
                                                    if (!isUnderPath(path, paths[i])) {
                                                        result.splice(i, 1);
                                                        result.splice(i, 1);
                                                    }
                                                }
                                                //test 
                                                console.log('isunder: '+isUnderPath(foundPath, path));
                                                // yes go on..
                                                result.push(node);
                                                paths.push(path)
                                            }
                                            return;
                                        case 1: // same branch and found, reached declaration, so stop looking
                                            console.log('easy, same branch')
                                            result.push(node);
                                            paths.push(path);
                                            return;
                                        case 0: // found at declaration, if the seach is top->down, we can finish here
                                            console.log('mmmm');
                                            for (let i = paths.length - 1; i >= 0; i--) {
                                                if (!isUnderPath(path, paths[i])) {
                                                    result.splice(i, 1);
                                                    paths.splice(i, 1);
                                                }
                                            }
                                            // result.length = 0;
                                            result.push(node);
                                            paths.push(path);
                                            return;
                                    }
                                    
                                } else {
                                    // drop all results until here
                                    console.log('-> declaration and not found! clear results')
                                    paths.length = 0;
                                    result.length = 0;
                                    return;
                                }
                                // console.log(node);

                                // if (found){
                                //     shouldStop = true;
                                //     return;
                                // }

                                stopPaths.push(path);
                                // result.splice(0, foundMeIndex);
                                // if (found) return; else break;
                                break;
                            // break;
                            default:
                                break;
                        }
                    }
                    result.push(node);
                    paths.push(path);
                    // console.log(`add: ${path}`);
                    // */

                }
                // preorder
                /*
                if (node instanceof ScopedSymbol) {

                    // for (const child of node.children) {
                    // dfs(child);
                    for (let i = 0; i < node.children.length; i++) {
                    // for (let i = node.children.length - 1; i >= 0; i--) {
                        // dfs(node.children[i]);
                        dfs(node.children[i], [...path, i]);
                    }
                }
                    //*/


            }

            dfs(root, []);
            /*
            // console.log(JSON.stringify(paths));
            if (stopPaths.length > 0) {
                const filteredNodes: (BaseSymbol | ScopedSymbol)[] = [];
                // remove the index of the symbol that stopped the search, we are only interested in the branc


                for (let i = 0; i < paths.length; i++) {
                    for (let stopPath of stopPaths) {
                        console.log(`${stopPath} == ${paths[i]} > ${isSameBranch(stopPath, paths[i])}`);
                        // console.log(result[i]);
                        // stopPath.pop();
                        if (!isSameBranch(stopPath, paths[i])) {
                            filteredNodes.push(result[i]);
                        }
                    }
                    console.log('--');
                }
                // return filteredNodes;
            }
                */
            /*
                        function isSameBranch(path1: number[], path2: number[]): boolean {
                            const minLength = Math.min(path1.length, path2.length);
                            for (let i = 0; i < minLength; i++) {
                                if (path1[i] !== path2[i]) return false;
                            }
                            return true;
                        }
            
                        dfs(root, []);
            
                        if (stopPath) {
                            const filteredNodes: (BaseSymbol | ScopedSymbol)[] = [];
            
                            const filteredPaths: number[][] = [];
                            for (let i = 0; i < paths.length; i++) {
                                if (isSameBranch(stopPath, paths[i])) {
                                    filteredNodes.push(result[i]);
                                    filteredPaths.push(paths[i]);
                                }
                            }
                            console.log(filteredNodes)
                            return filteredNodes;
                            // return { nodes: filteredNodes, paths: filteredPaths };
                        }
            */
            // console.log(result);
            // console.log(paths);
            return result;
        }

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
        //    this.symbolWithContextSync


        console.log('---dfs search---');

        // let sym = this.resolveSync(symbol.name);

        let searchStart = root.parent ? root.parent : root;
        // seach all the way up, do not return childs

        const test = dfsCollectNodes(searchStart, symbol, symbol.name);

        // console.log(test);
        for (const sym of test) {
            // console.log(sym);
        }
        table = test;
        /*
            let lookUp = root.parent;
            // console.log(test);
            while (lookUp) {
                // console.log(test);
                let siblings = lookUp.getAllSymbolsSync(BaseSymbol, true);
                table.push(...siblings);
                if (lookUp.parent) {
                    lookUp = lookUp.parent;
                } else break;
            }
            */


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