import { VariableSymbol, LiteralSymbol, /* BlockSymbol ,*/ BaseSymbol, ISymbolTableOptions, SymbolTable, SymbolConstructor, IScopedSymbol, ScopedSymbol } from "antlr4-c3";
import { ParserRuleContext, ParseTree, TerminalNode } from "antlr4ng";
import { SourceContext } from "./SourceContext.js";
import { ISymbolInfo, SymbolKind } from "../types.js";
import { BackendUtils } from "./BackendUtils.js";
import { mxsParser } from "../parser/mxsParser.js";
import { BinaryLifting } from "./symbolSearch.js";
import assert from "assert";
import path from "path";

export interface IExprSymbol extends IScopedSymbol
{
    pathIndex?: number[];
}
export class ExprSymbol extends ScopedSymbol implements IExprSymbol
{
    pathIndex?: number[];
    scope?: BaseSymbol[];

    constructor(name?: string, pathIndex: number[] = [0])
    {
        super(name);
        this.pathIndex = pathIndex;
    }
    public override addSymbol(symbol: BaseSymbol, pathIndex?: number[]): void
    {

        // console.log(`${this.name} : ${this.pathIndex}`);
        // if (symbol.parent) {
        //     console.log(`${(symbol.parent as BlockSymbol).pathIndex}`);
        // }
        super.addSymbol(symbol);
        // console.log(`${this.pathIndex} --> ${symbol.name}`);
        // console.log(symbol.symbolPath);
        if (this.pathIndex) {
            (symbol as ExprSymbol).pathIndex = [...this.pathIndex, this.children.length];
        }

    }

    public getScope(): BaseSymbol[]
    {
        return this.symbolPath.filter(symbol =>
            symbol instanceof StructDefinitionSymbol ||
            symbol instanceof FnDefinitionSymbol ||
            symbol instanceof VariableDeclSymbol ||
            symbol instanceof ExpSeqSymbol
            //...
        ).reverse();
    }

}

export class DeclarationSymbol extends ExprSymbol implements IExprSymbol
{
    declarationScope?: string;
    constructor(name?: string, /* scope?:string, */  pathIndex: number[] = [0])
    {
        super(name);
        this.pathIndex = pathIndex;
        // this.declarationScope = scope;
    }
}
/*
export class ExtBaseSymbol extends BaseSymbol
{
    scope?: ExtBaseSymbol[];
    constructor(name?: string)
    {
        super(name)
    };

}
//*/

//Definitions
export class PluginDefinitionSymbol extends ExprSymbol { }
export class MacroScriptDefinitionSymbol extends ExprSymbol { }
export class toolDefinitionSymbol extends ExprSymbol { }
export class UtilityDefinitionSymbol extends ExprSymbol { }
export class RolloutDefinitionSymbol extends ExprSymbol { }
export class RcMenuDefinitionSymbol extends ExprSymbol { }

export class StructDefinitionSymbol extends ExprSymbol { }

export class FnDefinitionSymbol extends ExprSymbol { }
export class fnArgsSymbol extends ExprSymbol { }
export class fnParamsSymbol extends ExprSymbol { }
// export class fnBodySymbol extends ExprSymbol {}

export class ControlDefinition extends BaseSymbol { }

export class VariableDeclSymbol extends DeclarationSymbol { }
export class AssignmentExpressionSymbol extends ExprSymbol { }

export class AssignmentSymbol extends ExprSymbol { }

export class ExpSeqSymbol extends ExprSymbol { }

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
interface PathNode
{
    symbol: BaseSymbol | ExprSymbol; // Updated to use ScopedSymbol
    path: number[];
    index: number; // Index of the node in the path
}

interface BFSResult
{
    path: number[];
    indices: number[];
    targetSymbol: BaseSymbol | ExprSymbol; // Include the target symbol in the result
}

interface IScopeComparer
{
    commonPath: BaseSymbol[];
    subPathA: BaseSymbol[];
    subPathB: BaseSymbol[];
}

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
        ExpSeqSymbol,
        //...
    )
}

export class ContextSymbolTable extends SymbolTable
{
    public tree?: ParserRuleContext;
    public pathIndex: number[];
    // Caches with reverse lookup for indexed symbols.
    //...

    public constructor(
        name: string,
        // TODO: OPTIONS!
        options: ISymbolTableOptions,
        public owner?: SourceContext,
        pathIndex: number[] = [0]
    )
    {
        super(name, options);
        this.pathIndex = pathIndex;
    }

    public override addSymbol(symbol: BaseSymbol): void
    {

        super.addSymbol(symbol);

        // console.log(symbol);
        // console.log(this.children.length);
        if (this.pathIndex) {
            (symbol as ExprSymbol).pathIndex = [...this.pathIndex, this.children.length];
        }
    }

    public override addNewSymbolOfType<T extends BaseSymbol, Args extends unknown[]>
        (t: SymbolConstructor<T, Args>, parent: ScopedSymbol | undefined, ...args: Args): T
    {
        const result = new t(...args);

        if (!parent || parent === this) {
            // console.log(this.pathIndex);

            this.addSymbol(result);

            // if ( 'pathIndex' in result) console.log(result.pathIndex);
        } else {
            (parent as ExprSymbol).addSymbol(result, (parent as ExprSymbol).pathIndex);
        }

        if (result instanceof FnDefinitionSymbol) {
            // console.log(result.pathIndex);
        }
        if (result instanceof ExprSymbol) {
            // console.log(result.pathIndex);
        }

        // return super.addNewSymbolOfType(t, parent, ...args);
        return result;
    }
    //--------------------------------------------------------------------------
    private static isType(symbol: any): symbol is BaseSymbol | ExprSymbol
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
                    return child ? child : symbol;
                }
            }
        };

        return findRecursive(this);
    }

    private symbolsOfType<T extends BaseSymbol, Args extends unknown[]>
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

    private collectAllChildren(symbol: BaseSymbol): /* ISymbolInfo |  */ISymbolInfo[]
    {
        const root = symbol.root as ContextSymbolTable;
        function dfs(currentSymbol: BaseSymbol | ScopedSymbol/* , parent: ISymbolInfo | undefined = undefined */): /* ISymbolInfo |  */ISymbolInfo[]
        {
            if (currentSymbol instanceof ExpSeqSymbol) {
                return currentSymbol.children?.filter(ContextSymbolTable.isType)
                    .map(child => dfs(child)).flat() || [];
            }

            const child_root = currentSymbol.root as ContextSymbolTable;
            const currentRoot = child_root.owner ? child_root : root;

            const SymbolInfo: ISymbolInfo = {
                name: currentSymbol.name,
                kind: SourceContext.getKindFromSymbol(currentSymbol),
                source: currentRoot.owner ? currentRoot.owner.sourceUri.toString() : "maxscript",
                definition: SourceContext.definitionForContext(currentSymbol.context, true),
                children: []
            };

            if (SymbolInfo.children && currentSymbol instanceof ScopedSymbol) {
                for (const child of currentSymbol.children) {
                    if (ContextSymbolTable.isType(child)) {
                        SymbolInfo.children.push(...dfs(<ScopedSymbol>child));
                        /*const res = dfs(<ScopedSymbol>child);
                        if (Array.isArray(res)) {
                            SymbolInfo.children.push(...res);
                        } else {
                            SymbolInfo.children.push(res);
                        }*/

                    }
                }
            }
            return [SymbolInfo];
        }
        return dfs(symbol);
    }

    private scopedSymbolsOfType<T extends ScopedSymbol, Args extends unknown[]>
        (t: SymbolConstructor<T, Args>, localOnly = false): ISymbolInfo[]
    {
        const result: ISymbolInfo[] = [];
        const symbols = this.getAllSymbolsSync(t, localOnly);
        const filtered = new Set(symbols); // Filter for duplicates.

        for (const symbol of filtered) {
            if (symbol.children.length > 0) {
                let res = this.collectAllChildren(symbol);
                // console.log(res);
                if (res.length === 0) {
                    const root = symbol.root as ContextSymbolTable;

                    result.push({
                        kind: SourceContext.getKindFromSymbol(symbol),
                        name: symbol.name,
                        source: root.owner ? root.owner.sourceUri.toString() : "maxscript",
                        definition: SourceContext.definitionForContext(symbol.context, true),
                        description: undefined,
                    });
                } else {
                    result.push(...res);
                    /*if (Array.isArray(res)) {
                        result.push(...res);
                    } else {
                        result.push(res);
                    }*/
                }
            }
        }
        return result;
    }

    public listTopLevelSymbols(localOnly: boolean): ISymbolInfo[]
    {
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
        /*
        const result: ISymbolInfo[] = [];
        for (const t of SymbolSupport.topLevelSymbolsType) {
            let symbols = this.scopedSymbolsOfType(t as typeof ExprSymbol, localOnly);
            result.push(...symbols);
        }
        return result;
        //*/
        return (SymbolSupport.topLevelSymbolsType.map(t =>
            this.scopedSymbolsOfType(t as typeof ExprSymbol, localOnly)).flat());
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

    public getSymbolAtPosition(row: number, column: number): BaseSymbol | undefined
    {
        if (!this.tree) {
            return undefined;
        }

        // this will return the token at the position
        const terminal = BackendUtils.parseTreeFromPosition(this.tree, column, row);
        if (!terminal || !(terminal instanceof TerminalNode)) {
            return undefined;
        }

        let parent = terminal.parent as ParserRuleContext;
        // filter!
        if (parent.ruleIndex !== mxsParser.RULE_ids) {
            return undefined;
        }
        return this.symbolContainingContext(terminal);
    }

    private compareSymbols(symbolA: BaseSymbol, symbolB: BaseSymbol): boolean
    {
        const contextA = symbolA.context as ParserRuleContext;
        const contextB = symbolB.context as ParserRuleContext;

        const rangeA = { line: contextA.start?.line || 0, column: contextA.start?.column || 0 };
        const rangeB = { line: contextB.start?.line || 0, column: contextB.start?.column || 0 };

        return symbolA.name === symbolB.name &&
            contextA.ruleIndex === contextB.ruleIndex &&
            JSON.stringify(rangeA) === JSON.stringify(rangeB);
    }


    private seachSymbolDefinition(root: BaseSymbol, entry: BaseSymbol): BaseSymbol | undefined
    {
        const commonPath = (A: number[], B: number[]): number[] =>
        {
            // Initialize an array to hold the common segments
            let commonRoot: number[] = [];

            // Compare segments from both paths
            for (let i = 0; i < Math.min(A.length, B.length); i++) {
                if (A[i] === B[i]) {
                    commonRoot.push(A[i]);
                } else {
                    break; // Stop if the segments diverge
                }
            }

            // Join the common segments to form the lowest common root
            return commonRoot;
        };
        const divergentPath = (root: number[], path: number[]): number[] =>
        {
            return path.filter((n, i) => n !== root[i]);
        };

        const isLowerPath = (found: number[], propspect: number[], isParent: boolean = false): boolean =>
        {
            // const isNotLoweScope = () => {};
            // console.log(`paths = ${found} --- ${propspect}`);
            const limit = isParent ? 1 : 2;


            for (let i = 0; i < Math.min(found.length, propspect.length); i++) {
                if (found[i] === propspect[i]) {
                    // console.log(`common root: ${found[i]}`)
                    continue;
                } else if (found[i] > propspect[i]) { // paths diverge here, needs some checking to make a decision

                    // const remain1 = found.slice(i + 1);
                    const remain2 = propspect.slice(i + 1);
                    // the first child is part of the declaration, so it must not be deeper
                    // console.log(`diverge = ${remain1} --- ${remain2}`);

                    return remain2.length <= limit; // if using the parent path change to 1
                    // return true;
                } else return false;
            }

            return false;
            // its inmediate child of parent

        }

        function assertSymbols(symbolA: BaseSymbol, symbolB: BaseSymbol): boolean
        {
            // console.log(`names: ${symbolA.name} <--> ${symbolB.name}`);
            // console.log(`ruleIndex: ${(symbolA.context as ParserRuleContext).ruleIndex} <--> ${(symbolB.context as ParserRuleContext).ruleIndex}`);

            const contextA = symbolA.context as ParserRuleContext;
            const contextB = symbolB.context as ParserRuleContext;

            const rangeA = { line: contextA.start?.line || 0, column: contextA.start?.column || 0 };
            const rangeB = { line: contextB.start?.line || 0, column: contextB.start?.column || 0 };

            // console.log(rangeA);
            // console.log(rangeB);
            // console.log(JSON.stringify(rangeA) === JSON.stringify(rangeB));
            // console.log(`start: ${JSON.stringify((symbolA.context as ParserRuleContext).start)} <--> ${JSON.stringify((symbolB.context as ParserRuleContext).start)}`);

            return symbolA.name === symbolB.name &&
                contextA.ruleIndex === contextB.ruleIndex &&
                JSON.stringify(rangeA) === JSON.stringify(rangeB);
        }

        function compareScopes(symbolA: BaseSymbol, symbolB: BaseSymbol): IScopeComparer
        {
            const scopeA = (symbolA.parent as ExprSymbol).getScope();
            const scopeB = (symbolB.parent as ExprSymbol).getScope();
            const commonPath: BaseSymbol[] = [];
            // console.log(scopeA);
            // console.log(scopeB);
            if (scopeA && scopeB) {
                //common path
                for (let i = 0; i < Math.min(scopeA.length, scopeB.length); i++) {
                    if (assertSymbols(scopeA[i], scopeB[i])) {
                        commonPath.push(scopeA[i]);
                    }
                }
                // check the remaining paths
                // console.log(commonPath);
                if (commonPath.length > 0) {
                    const subPathA = scopeA.slice(commonPath.length);
                    const subPathB = scopeB.slice(commonPath.length);
                    console.log(subPathA);
                    console.log(subPathB);
                    return { commonPath, subPathA, subPathB };

                }
            }
            return { commonPath, subPathA: scopeA, subPathB: scopeB };
        }

        function testScopePrecedence(symbolA: BaseSymbol, symbolB: BaseSymbol): boolean
        {
            const resolveScopes = compareScopes(symbolA, symbolB);
            if (resolveScopes.commonPath.length > 0) {
                // the two scopes here are siblings. for the node to be the definition, it must not be nested... sibling of the outermost common scope
                if (resolveScopes.subPathB.length <= 1) {
                    return true;
                } else {
                    return false;
                }
            }
            return false;
        }

        function testScopePertenence(symbolA: BaseSymbol, symbolB: BaseSymbol): boolean
        {

            const resolveScopes = compareScopes(symbolA, symbolB);
            return resolveScopes.subPathB.length === 0; // symbol should be fully contained in the scope
        }
        // let found = false;
        let foundSymbol: BaseSymbol | undefined;
        let stop = false;
        // let currentpath: string[] = [];

        const entryIndex = (entry.context as ParserRuleContext).start?.tokenIndex;

        function _dfs(node: BaseSymbol/* , foundSymbol: BaseSymbol | undefined = undefined */): BaseSymbol | undefined
        {
            // do not do anything anymore
            if (stop) {
                return;
            }

            //posorder
            if (node instanceof ScopedSymbol) {
                for (let i = node.children.length - 1; i >= 0; i--) {
                    const res = _dfs(node.children[i]);
                    if (res) return res;
                }
            }

            // IN THE SEARCH FOR THE SYMBOL: since the symbol we are looking for is an instance of IdentifierSymbol,
            // we can filter the seach for the symbol
            const nodeIndex = (node.context as ParserRuleContext).start?.tokenIndex || 0;

            if (node.name === entry.name &&
                nodeIndex === entryIndex &&
                node instanceof IdentifierSymbol) {
                console.log('found it!');
                // found = true;
                foundSymbol = node;
                if ('scope' in foundSymbol.parent!) {
                    console.log(foundSymbol.parent.scope)
                }
                console.log('--------------------');
                // return, we already discarded that the found symbols is the definition.
                return;
            }

            // Once we found the symbol, look for the definition. this seach starts at the bottom,
            // because the symbol definition should be upstream
            // from now on, if found, the current symbol is up the tree or in another branch.
            // note: if the definition is a global variable, we will need to return all the references in the ReferencesProvider
            if (foundSymbol && node.name === entry.name && node instanceof IdentifierSymbol && node.parent) {
                if ('pathIndex' in node) {
                    console.log(`   - prospect: ${node.pathIndex} --> ${nodeIndex} | ${node.name}`);
                }
                // console.log(node.symbolPath); // <-- maps all the parents. look for scope start
                // console.log(node.parent); // <-- maps all the parents. look for scope start

                //check if there is a parent that definetly starts the scope
                // also, keep track of ExprSeq, if we reach the top, and no definition is found,
                // return the first appearance in the ExprSeq that contains the found node

                // use the parser context to compare types
                const parentRule = node.parent.context as ParserRuleContext;

                // const foundPath = (<ExprSymbol>foundSymbol).pathIndex;
                // const prospectPath = (<ExprSymbol>node).pathIndex;
                // if (!foundPath || !prospectPath) { return; }

                switch (parentRule.ruleIndex) {
                    // properties!! look for the identifier
                    case mxsParser.RULE_variableDeclaration:
                        console.log('Is variable declaration?');

                        //TODO: empty scope, aka, direct children of SymbolTable
                        if (testScopePrecedence(foundSymbol, node)) {
                            stop = true;
                            return node.parent;
                        }
                        /*
                        const foundPath = (<ExprSymbol>foundSymbol).pathIndex;
                        const prospectPath = (<ExprSymbol>node).pathIndex;

                        if (!foundPath || !prospectPath) { return; }
                        // this is not sufficient. I need to check if it is in a higher level scope
                        if (isLowerPath(foundPath, prospectPath)) {
                            // we reached the definition, stop looking.
                            stop = true;
                            // return the parent, since we are looking the Identifiers,
                            // the parent contains the correct context of the definition.
                            return node.parent;
                        }
                        // */
                        return;
                    case mxsParser.RULE_fnDefinition:
                        if (testScopePrecedence(foundSymbol, node)) {
                            stop = true;
                            return node.parent;
                        }
                        /*
                        {
                            // I need to produce symbols for fn call it seems
                            console.log('is this the fn defintion?');
                            //fn definittion needs to be in the same or an higer scope!

                            // let test = compareScopes(foundSymbol, node);
                            // console.log(node.parent);

                            const foundPath = (<ExprSymbol>foundSymbol).pathIndex;
                            const prospectPath = (<ExprSymbol>node).pathIndex;
                            if (!foundPath || !prospectPath) { return; }
                            // console.log(`       found: ${foundPath} <> prospect: ${prospectPath} || ${(<ExprSymbol>node.parent).pathIndex}`);

                            if (isLowerPath(foundPath, prospectPath)) {
                                // case 2 check common root and where paths diverge to see is declared first
                                // const test = isLowerPath(prospectPath, foundPath);
                                stop = true;
                                return node.parent;
                            }
                        }
                            */
                        return;
                    // console.log(`fnDefinition: ${(<ExprSymbol>node).pathIndex}`);
                    // console.log(node.symbolPath);
                    // case mxsParser.RULE_expr_seq:
                    //...
                    case mxsParser.RULE_fn_args:
                    case mxsParser.RULE_fn_params:
                        console.log('is fn_arg?');
                        if (testScopePertenence(foundSymbol, node)) {
                            stop = true;
                            // return node.parent;
                            return node;
                        }
                        // for loop
                        // controls
                        //...
                        /*
                        const foundPath = (<ExprSymbol>foundSymbol).pathIndex;
                        const prospectPath = (<ExprSymbol>node).pathIndex;

                        if (!foundPath || !prospectPath) { return; }

                        // if we stop here we can be out of scope if we are in another branch. check the scope against foundSymbol.
                        console.log(`       found: ${foundPath} <> prospect: ${prospectPath}`);
                        // console.log(node.symbolPath);
                        // let trace = node.symbolPath.map(symbol => ((<ExprSymbol>symbol).pathIndex));
                        // console.log(trace);

                        if (isLowerPath(foundPath, prospectPath)) {
                            console.log('it is!');
                            // case 2 check common root and where paths diverge to see is declared first
                            // const test = isLowerPath(prospectPath, foundPath);
                            stop = true;
                            return node.parent;
                        }
                            */
                        return;
                    default:
                        // break;
                        return;
                }
            }
            //inorder
            return;
        }
        let result = _dfs(root);
        console.log('returned!');
        console.log(result);
        // return _dfs(root);
        return result;
    }

    public getSymbolDefinition(symbol: BaseSymbol): BaseSymbol
    {
        // check if the symbol is the id of a Definition
        // do not get symbol definition in these rules
        let parentRule = symbol.parent?.context as ParserRuleContext;
        // console.log(parentRule);
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
        }
        // topmost parent that its not _ContextSymbolTable
        // const ancestor = symbol.symbolPath[symbol.symbolPath.length - 2] as ContextSymbolTable;
        let ancestor = symbol.root as ContextSymbolTable;
        // in symbol scope
        const prospects: BaseSymbol[] = ancestor.getAllNestedSymbolsSync(symbol.name);

        // handle some special cases
        let prospect: BaseSymbol = prospects[0];
        parentRule = ancestor.context as ParserRuleContext;

        /*
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
        // check if the symbol is the only one!
        // if (prospects.length === 1) return prospects[0];

        //walk the tree, starting from the symbol, going up parents...
        // the problem is with undeclared variables, I dont know how to define the scope start... or where to stop
        console.log('---DFS---');
        let searchDefinition = this.seachSymbolDefinition(this, symbol);
        if (searchDefinition) return searchDefinition;

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

    public dfsCollectNodes(root: BaseSymbol | ExprSymbol, symbol: BaseSymbol | ExprSymbol, targetName: string): (BaseSymbol | ExprSymbol)[]
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
        let foundPath: number[] = [];
        const result: (BaseSymbol | ExprSymbol)[] = [];

        let shouldStop = false;
        let declFound = false;

        const paths: number[][] = [];
        let stopPaths: number[][] = [];

        function dfs(node: BaseSymbol | ExprSymbol, path: number[])
        {
            // if (!node) return;
            if (shouldStop) { console.log('stoped!'); return; }

            // Recursively visit each child if the node is a ScopedSymbol   
            //inorder   
            //*          
            if (node instanceof ExprSymbol) {
                // for (const child of node.children) {
                // dfs(child);
                // for (let i = 0; i < node.children.length; i++) {
                for (let i = node.children.length - 1; i >= 0; i--) {
                    // dfs(node.children[i]);
                    dfs(node.children[i], [...path, i]);
                }
            }
            //*/
            if (node.name === targetName && node instanceof IdentifierSymbol) {
                const nodePos = (node.context as ParserRuleContext).start?.tokenIndex;

                // console.log(`${nodePos} : ${path}`);
                if (symbolPos === nodePos) {
                    // foundMeIndex = result.length - 1;
                    foundPath = path;
                    // console.log(`found ${nodePos} : ${path}`);
                    found = true;
                }

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
                                            console.log('isunder: ' + isUnderPath(foundPath, path));
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
                            stopPaths.push(path);
                            break;
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

        return result;
    }

    private bfsShortestPathWithIndex(
        root: BaseSymbol | ExprSymbol,
        searchSymbol: BaseSymbol | ExprSymbol,
        targetName: string): BFSResult | null
    {
        // Queue for BFS
        const queue: PathNode[] = [{ symbol: <ExprSymbol>root, path: [0], index: 0 }];
        const visited = new Set<string>();
        // const indices: number[] = []; // To store indices of the path

        const symbolPos = (searchSymbol.context as ParserRuleContext)?.start?.tokenIndex ?? 0;
        while (queue.length > 0) {
            // console.log(queue[0]);
            const { symbol, path, index } = queue.shift()!; // Dequeue the front element

            // Create a unique key for the visited set using name and range
            // if (symbol.context){

            const nodePos = (symbol.context as ParserRuleContext)?.start?.tokenIndex ?? 0;
            const visitedKey = `${symbol.name}:${nodePos}:${symbol instanceof IdentifierSymbol}`;
            // console.log(`${visitedKey} --- ${symbolPos} --- ${symbol instanceof IdentifierSymbol}`);
            // Check if we have reached the target node
            if (symbol.name === targetName && symbol instanceof IdentifierSymbol
                && nodePos === symbolPos
            ) {
                // console.log(symbol);
                // indices.push(index); // Store the index of the target node
                console.log({ path, indices: [index], targetSymbol: symbol });
                return { path, indices: [index], targetSymbol: symbol }; // Return the path, indices, and the target symbol
            }

            // Mark the current node as visited
            visited.add(visitedKey);

            // console.log(symbol instanceof ScopedSymbol);
            // Enqueue all unvisited children
            if (symbol instanceof ExprSymbol) {
                for (const [childIndex, child] of symbol.children.entries()) {
                    const childPos = (child.context as ParserRuleContext)?.start?.tokenIndex ?? 0;
                    const childKey = `${child.name}:${childPos}:${child instanceof IdentifierSymbol}`;
                    // console.log(childKey);
                    if (!visited.has(childKey)/*  && child instanceof IdentifierSymbol */) {
                        queue.push({
                            symbol: child,
                            path: [...path, childIndex], // Update path with the child index
                            index: path.length // Update index
                        });
                    }
                }
            }
        }

        // If the target node was not found, return null
        return null;
    }

    public getScopedSymbolOccurrences(symbol: BaseSymbol)
    {
        // search on the same scope or in parent scope, NOT on childs of siblings
        let result: BaseSymbol[] | undefined;
        //search on the root
        const root = symbol.root as ExprSymbol

        // optimize the search. if the parent of the node is a variable declaration, arguments or parameters, then is the start of the scope.

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

        function iterativeDeepeningDfsCollectBranch(
            root: BaseSymbol | ExprSymbol,
            symbol: BaseSymbol | ExprSymbol,
            targetName: string
            // targetType: string
        ): { nodes: (BaseSymbol | ExprSymbol)[], paths: number[][] }
        {
            let targetNode: BaseSymbol | ExprSymbol | null = null;
            let targetFoundInBranch = false;
            let identifierPaths: number[][] = [];
            let allIdentifierPaths: number[][] = [];
            // let allIdentifierNodes: (BaseSymbol | ScopedSymbol)[] = [];
            let foundDepth = 0;

            const symbolPos = (symbol.context as ParserRuleContext).start?.tokenIndex;

            // Depth-Limited Search (DLS)
            function dls(
                node: BaseSymbol | ExprSymbol,
                path: number[],
                depth: number,
                limit: number
            ): boolean
            {
                if (depth > limit) return false;
                let foundInSubtree = false;

                if (node.name === targetName && node instanceof IdentifierSymbol) {
                    identifierPaths.push([...path]);

                    const nodePos = (node.context as ParserRuleContext).start?.tokenIndex;
                    if (symbolPos === nodePos) {
                        // console.log(`${nodePos} : ${symbolPos} === ${depth}`);
                        targetNode = node;
                        targetFoundInBranch = true;
                        foundDepth = depth;
                        foundInSubtree = true;
                        // return true;
                    }
                }

                if (node instanceof ExprSymbol) {
                    for (let i = 0; i < node.children.length; i++) {
                        if (dls(node.children[i], [...path, i], depth + 1, limit)) {
                            foundInSubtree = true;
                        }
                    }
                }
                console.log(identifierPaths);
                return foundInSubtree;
            }

            // Iterative Deepening
            let limit = 0;
            while (true) {
                identifierPaths = [];
                targetFoundInBranch = false;

                if (dls(root, [], 0, limit)) {
                    if (targetFoundInBranch) {
                        allIdentifierPaths = [...identifierPaths];
                        break;
                    }
                } else {
                    identifierPaths = []; // Reset identifierPaths if targetNode is not found in the current branch
                }

                limit++;
            }
            // console.log(targetNode);
            // console.log(identifierPaths);
            // console.log(allIdentifierPaths);

            // If target node is not found, return empty result
            if (!targetNode) {
                return { nodes: [], paths: [] };
            }

            // Collect all nodes based on collected paths
            const nodes: (BaseSymbol | ExprSymbol)[] = [];
            const paths: number[][] = [];

            function collectNodesAndPathsByIdentifierPaths()
            {
                allIdentifierPaths.forEach((path) =>
                {
                    let currentNode: BaseSymbol | ExprSymbol | null = root;
                    for (let i = 0; i < path.length; i++) {
                        if (currentNode instanceof ExprSymbol && currentNode.children.length > path[i]) {
                            currentNode = currentNode.children[path[i]];
                        } else {
                            currentNode = null;
                            break;
                        }
                    }

                    if (currentNode && currentNode instanceof IdentifierSymbol) {
                        nodes.push(currentNode);
                        paths.push(path);
                    }
                });
            }

            collectNodesAndPathsByIdentifierPaths();
            // console.log(nodes);
            return { nodes, paths };
        }

        //seach from top to botton, stop the brach whenever the symbol is redefined
        //BSF Seach


        // search siblings of the root, need to do this all the way up
        // iterate over parents

        //    this.symbolWithContextSync


        // if I already have the node, it has a path, so maybe I can walk the tree using that path, collection all the references to the symbol.


        console.log(symbol.symbolPath);
        console.log('---dfs search---');

        // let sym = this.resolveSync(symbol.name);

        let searchStart = root.parent ? root.parent : root;
        // seach all the way up, do not return childs

        // const test = this.dfsCollectNodes(searchStart, symbol, symbol.name);
        // const test = iterativeDeepeningDfsCollectBranch(searchStart, symbol, symbol.name);
        const test = this.bfsShortestPathWithIndex(searchStart, symbol, symbol.name);
        // console.log(test);
        // for (const sym of test) {
        // console.log(sym);
        // }
        table = [test?.targetSymbol!];
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
            // const owner = this.findRoot(symbol).owner;
            const owner = (symbol.root?.parent as ContextSymbolTable).owner! ?? this.owner;

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