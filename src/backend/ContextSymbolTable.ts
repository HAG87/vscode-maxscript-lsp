import {
    BaseSymbol, ISymbolTableOptions, ScopedSymbol, SymbolConstructor,
    SymbolTable,
} from 'antlr4-c3';
import { ParserRuleContext, ParseTree, TerminalNode } from 'antlr4ng';

import { mxsParser } from '@parser/mxsParser.js';
import { ISymbolInfo } from '@backend/types.js';
import { TreeQuery } from '@backend/TreeQuery.js';
import { SymbolUtils } from '@backend/symbols/symbolUtils.js';
import { SourceContext } from '@backend/SourceContext.js';
import {
    ExpSeqSymbol, topLevelSymbolsType,
} from '@backend/symbols/symbolTypes.js';


export class ContextSymbolTable extends SymbolTable {
    public tree?: ParserRuleContext;

    public constructor(
        name: string,
        options: ISymbolTableOptions,
        public owner?: SourceContext,
    ) {
        super(name, options);
    }

    public override clear(): void {
        super.clear();
    }

    //--------------------------------------------------------------------------
    private static isType(symbol: unknown): symbol is BaseSymbol {
        return topLevelSymbolsType.some(t => symbol instanceof t);
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
        const terminal = TreeQuery.parseTreeFromPosition(this.tree, row, column);
        if (!terminal || !(terminal instanceof TerminalNode)) {
            return undefined;
        }
        const parent = terminal.parent as ParserRuleContext;
        
        // filter: accept identifier and kw_reserved (keywords usable as identifiers)
        if (parent.ruleIndex !== mxsParser.RULE_identifier &&
            parent.ruleIndex !== mxsParser.RULE_kwReserved) {
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
            const iter = await this.getAllSymbolsOfType(parent as ScopedSymbol, type);
            symbols.push(...iter);
        }
        return symbols;
    }

    /**
     * Returns top-level symbols info
     * @param localOnly 
     */
    public symbolInfoTopLevel(localOnly: boolean): ISymbolInfo[] {
        return (topLevelSymbolsType.map(t =>
            this.symbolInfoOfType(t as SymbolConstructor<ScopedSymbol, []>, localOnly)).flat()
        );
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

}