import
{
    BailErrorStrategy, CharStream, CommonTokenStream, DefaultErrorStrategy, ParseCancellationException,
    ParserRuleContext, ParseTree, ParseTreeWalker, PredictionMode, TerminalNode, Token
} from "antlr4ng";
import { BaseSymbol, CodeCompletionCore, SymbolTable } from "antlr4-c3";
import { mxsLexer } from "../parser/mxsLexer.js";
import { mxsParser } from "../parser/mxsParser.js";
import { ContextLexerErrorListener } from "./ContextLexerErrorListener.js";
import { ContextErrorListener } from "./ContextErrorListener.js";
import { DiagnosticType, IDefinition, IDiagnosticEntry, ILexicalRange, ISemanticToken, ISymbolInfo, SymbolKind } from "../types.js";
import
{
    AssignmentExpressionSymbol,
    AttributesDefSymbol,
    ContextSymbolTable,
    RolloutControlSymbol,
    EventHandlerClauseSymbol,
    ExprSymbol,
    fnArgsSymbol,
    FnDefinitionSymbol,
    fnParamsSymbol,
    IdentifierSymbol,
    MacroScriptDefinitionSymbol,
    PluginDefinitionSymbol,
    RolloutDefinitionSymbol,
    StructDefinitionSymbol,
    StructMemberSymbol,
    ToolDefinitionSymbol,
    UtilityDefinitionSymbol,
    VariableDeclSymbol,

} from "./ContextSymbolTable.js";
import { symbolTableListener } from "./symbolTableListener.js";
import { semanticTokenListener } from "./semanticTokenListener.js";
import { BackendUtils } from "./BackendUtils.js";
import { IformatterResult, mxsSimpleFormatter } from "./CodeFormatter.js";
import { ICodeFormatSettings, IMinifierSettings } from "../settings.js";
import { mxsParserVisitorFormatter } from "./mxsParserVisitorFormatter.js";

export const symbolToKindMap: Map<new () => BaseSymbol, SymbolKind> = new Map([
    [PluginDefinitionSymbol, SymbolKind.Plugin],
    [MacroScriptDefinitionSymbol, SymbolKind.MacroScript],
    [AttributesDefSymbol, SymbolKind.Attributes],
    [ToolDefinitionSymbol, SymbolKind.Tool],
    [UtilityDefinitionSymbol, SymbolKind.Rollout],
    [RolloutDefinitionSymbol, SymbolKind.Rollout],
    [StructDefinitionSymbol, SymbolKind.Struct],
    [StructMemberSymbol, SymbolKind.Identifier],
    [EventHandlerClauseSymbol, SymbolKind.Event],
    //...
    [FnDefinitionSymbol, SymbolKind.Function],
    [VariableDeclSymbol, SymbolKind.Declaration],
    [AssignmentExpressionSymbol, SymbolKind.Identifier],
    [IdentifierSymbol, SymbolKind.Identifier],
]);

export interface ICompletionsResult
{
    completions: ISymbolInfo[];
    provideLanguageCompletions: boolean;
}
// One context for each valid document
export class SourceContext
{
    // context source uri pointing at the document
    public sourceUri: string;

    // symbols for the current document
    public symbolTable: ContextSymbolTable;
    // document uri?
    // symbolTable: string;

    // could be useful to store te token stream...

    // hold diagnostics for the context
    public diagnostics: IDiagnosticEntry[] = [];
    // semantic tokens
    public semanticTokens: ISemanticToken[] = [];
    // TODO: Contexts referencing us.
    private references: SourceContext[] = [];

    // Parsing infrastructure.
    private tokenStream: CommonTokenStream;
    private lexer: mxsLexer;
    private parser: mxsParser;
    // error listeners
    private lexerErrorListener: ContextLexerErrorListener =
        new ContextLexerErrorListener(this.diagnostics);
    private errorListener: ContextErrorListener =
        new ContextErrorListener(this.diagnostics);

    // The root context from the last parse run.
    private tree: ParserRuleContext | undefined;

    public constructor(uri: string, /*settings*/)
    {
        this.sourceUri = uri;
        // initialize simbol table
        this.symbolTable = new ContextSymbolTable(
            this.sourceUri,
            { allowDuplicateSymbols: true },
            this);

        // initialize static global symbol table
        //...

        // initialize lexer instance with empty string
        this.lexer = new mxsLexer(CharStream.fromString(''));
        this.lexer.removeErrorListeners();
        this.lexer.addErrorListener(this.lexerErrorListener);

        // initialize token stream
        // TODO: this.tokenStream = new multiChannelTokenStream(this.lexer);
        this.tokenStream = new CommonTokenStream(this.lexer);

        // initialize parer instance
        this.parser = new mxsParser(this.tokenStream);
        this.parser.buildParseTrees = true;
        this.parser.removeErrorListeners();
        this.parser.addErrorListener(this.errorListener);
    }

    public setText(source: string): void
    {
        this.lexer.inputStream = CharStream.fromString(source);
    }
    //----------------------------------------------------------------parser
    public parse(): void
    {
        this.tree = undefined;
        // Rewind the input stream for a new parse run.
        this.lexer.reset();
        this.tokenStream.setTokenSource(this.lexer);
        this.parser.reset();
        this.parser.errorHandler = new BailErrorStrategy();
        this.parser.interpreter.predictionMode = PredictionMode.SLL;
        //---------------------------------------------------------------
        //TODO: semantic tokens while parsing...
        // this.parser.addParseListener();
        // this.info.imports.length = 0;
        // this.semanticAnalysisDone = false;
        //---------------------------------------------------------------
        this.diagnostics.length = 0;
        this.symbolTable.clear();
        // TODO: this.symbolTable.addDependencies(SourceContext.globalSymbols);
        //---------------------------------------------------------------
        try {
            this.tree = this.parser.program();
        } catch (e) {
            if (e instanceof ParseCancellationException) {
                // TODO: hack: clear diagnostics to avoid duplicates
                this.diagnostics.length = 0;

                this.lexer.reset();
                this.tokenStream.setTokenSource(this.lexer);
                this.parser.reset();

                this.parser.errorHandler = new DefaultErrorStrategy();
                this.parser.interpreter.predictionMode = PredictionMode.LL;
                this.tree = this.parser.program();
            } else {
                throw e;
            }
        }
        //---------------------------------------------------------------
        // semantic tokens!
        const semanticListener = new semanticTokenListener(this.semanticTokens);
        ParseTreeWalker.DEFAULT.walk(semanticListener, this.tree);
        //---------------------------------------------------------------
        // load symbols!
        this.symbolTable.tree = this.tree;
        const symbolsListener = new symbolTableListener(this.symbolTable);
        // const listener = new DetailsListener(this.symbolTable, this.info.imports);
        ParseTreeWalker.DEFAULT.walk(symbolsListener, this.tree);
        //---------------------------------------------------------------
        // TODO: this.info.unreferencedRules = this.symbolTable.getUnreferencedSymbols();
        // return this.info.imports;
    }

    // TODO: semantic analysis
    private runSemanticAnalysisIfNeeded()
    {
        /*
        if (!this.semanticAnalysisDone && this.tree) {
            this.semanticAnalysisDone = true;
            //this.diagnostics.length = 0; Don't, we would lose our syntax errors from last parse run.

            const semanticListener = new SemanticListener(this.diagnostics, this.symbolTable);
            ParseTreeWalker.DEFAULT.walk(semanticListener, this.tree);
        }
        */
    }

    // TODO: references
    public addAsReferenceTo(context: SourceContext): void
    {
        /*
        // Check for mutual inclusion. References are organized like a mesh.
        const pipeline: SourceContext[] = [context];
        while (pipeline.length > 0) {
            const current = pipeline.shift();
            if (!current) {
                continue;
            }

            if (current.references.indexOf(this) > -1) {
                return; // Already in the list.
            }

            pipeline.push(...current.references);
        }
        context.references.push(this);
        this.symbolTable.addDependencies(context.symbolTable);
        */
    }
    public getReferenceCount(symbol: string): number
    {
        /*
        this.runSemanticAnalysisIfNeeded();

        let result = this.symbolTable.getReferenceCount(symbol);

        for (const reference of this.references) {
            result += reference.getReferenceCount(symbol);
        }
        return result;
        // */
        return 0;
    }
    //------------------------------------------------- SYMBOLS
    public static getKindFromSymbol(symbol: BaseSymbol): SymbolKind
    {
        return symbolToKindMap.get(symbol.constructor as typeof BaseSymbol) || SymbolKind.Null;
    }

    /**
     * @param ctx The context to get info for.
     * @param keepQuotes A flag indicating if quotes should be kept if there are any around the context's text.
     *
     * @returns The definition info for the given rule context.
    */
    public static definitionForContext(ctx: ParseTree | undefined, keepQuotes: boolean): IDefinition | undefined
    {
        if (!ctx) { return undefined; }

        const result: IDefinition = {
            text: "",
            range: {
                start: {
                    row: 0,
                    column: 0
                },
                end: {
                    row: 0,
                    column: 0
                },
            },
        };

        if (ctx instanceof ParserRuleContext && ctx.start && ctx.stop) {
            const start = ctx.start;
            const stop = ctx.stop;

            result.range = {
                start: {
                    row: start.line,
                    column: start.column
                },
                end: {
                    row: stop.line,
                    column: stop.column
                }
            };
            // console.log(result.range);  
            const inputStream = ctx.start?.tokenSource?.inputStream;

            if (inputStream) {
                try {
                    result.text = inputStream.getTextFromRange(start.start, stop.stop);
                    // console.log(result.text);
                } catch (e) {
                    // The method getText uses an unreliable JS String API which can throw on larger texts.
                    // In this case we cannot return the text of the given context.
                    // A context with such a large size is probably an error case anyway (unfinished multi line comment
                    // or unfinished action).
                }
            }
        } else if (ctx instanceof TerminalNode) {
            result.text = ctx.getText();
            result.range = {
                start: {
                    row: ctx.symbol!.line,
                    column: ctx.symbol!.column
                },
                end: {
                    row: ctx.symbol!.line,
                    column: ctx.symbol!.column + result.text.length
                }
            };
        }

        if (keepQuotes || result.text.length < 2) {
            return result;
        }

        const quoteChar = result.text[0];
        if ((quoteChar === '"' || quoteChar === "'")
            && quoteChar === result.text[result.text.length - 1]) {
            result.text = result.text.substring(1, result.text.length - 1);
        }

        return result;
    }
    /**
     * Gets the symbol at the specified position
     * @param row position line number
     * @param column position column number
     * @returns ISymbolInfo symbol or undefined
     */
    public symbolAtPosition(row: number, column: number): ISymbolInfo | undefined
    {
        if (!this.tree) return undefined;

        const symbol = this.symbolTable.getSymbolAtPosition(row, column);
        return symbol ? this.symbolTable.getSymbolInfo(symbol) : undefined;
    }
    /**
     * Returns the symbol definition
     * TODO: Add references in the symbol table to speed up things!
     * @param row position line number
     * @param column column position column number
     * @returns ISymbolInfo located at the definition of the current symbol.
     */
    public symbolDefinition(row: number, column: number): ISymbolInfo | undefined
    {
        if (!this.tree) return undefined;

        const symbol =
            this.symbolTable.getSymbolAtPosition(row, column);
        const definition =
            this.symbolTable.getSymbolDefinition(symbol!);
        return definition ? this.symbolTable.getSymbolInfo(definition) : undefined;
    }
    /**
     * Returns the symbol at the given position or one of its outer scopes.
     *
     * @param column The position within a source line.
     * @param row The source line index.
     * @param ruleScope If true find the enclosing rule (if any) and return it's range, instead of the directly
     *                  enclosing scope.
     * @returns The symbol at the given position (if there's any).
    */
    public enclosingSymbolAtPosition(
        row: number,
        column: number,
        ruleScope: boolean): ISymbolInfo | undefined
    {
        if (!this.tree) { return; }

        let context = BackendUtils.parseTreeFromPosition(this.tree, row, column);

        if (context instanceof TerminalNode) {
            context = context!.parent;
        }

        if (ruleScope) {
            context = context!.parent;
        }
        /*
        if (ruleScope) {
            let run = context;
            while (run
                && !(run instanceof Expr_seqContext)
                && !(run instanceof FnDefinitionContext)
                && !(run instanceof StructDefinitionContext)
                //...
            ) {
                run = run.parent;
            }
            if (run) {
                context = run;
            }
        }
        // */
        if (context) {
            const symbol = this.symbolTable.symbolWithContextSync(context);
            if (symbol) {
                return this.symbolTable.getSymbolInfo(symbol);
            }
        }

        return;
    }

    public listTopLevelSymbols(includeDependencies: boolean): ISymbolInfo[]
    {
        return this.symbolTable.symbolInfoTopLevel(includeDependencies);
    }

    public async getAllSymbols(recursive: boolean): Promise<BaseSymbol[]>
    {
        /*
        // The symbol table returns symbols of itself and those it depends on (if recursive is true).
        const result = await this.symbolTable.getAllSymbols(BaseSymbol, !recursive);
        // Add also symbols from contexts referencing us, this time not recursive
        // as we have added our content already.
        for (const reference of this.references) {
            const symbols = await reference.symbolTable.getAllSymbols(BaseSymbol, true);
            symbols.forEach((value) => {
                result.push(value);
            });
        }
        return result;
        */
       return await this.symbolTable.getAllSymbols(BaseSymbol, !recursive);
    }
    public getSymbolInfo(symbol: string | BaseSymbol): ISymbolInfo | undefined
    {
        return this.symbolTable.getSymbolInfo(symbol);
    }

    public resolveSymbol(symbolName: string): BaseSymbol | undefined
    {
        return this.symbolTable.resolveSync(symbolName, false);
    }

    //------------------------------------------------- code completion
    private async getScope(context: ParseTree | null, symbolTable: SymbolTable): Promise<BaseSymbol | undefined>
    {
        async function dfs(context: ParseTree | null): Promise<BaseSymbol | undefined>
        {
            if (!context) {
                return undefined;
            }
            const scope = await symbolTable.symbolWithContext(context);
            if (scope) {
                return scope;
            } else {
                return await dfs(context.parent);
            }
        }
        return await dfs(context);
    }

    public async getCodeCompletionCandidates(
        row: number, column: number,
        languageCompletions: boolean = false): Promise<ICompletionsResult>
    {
        if (!this.parser) {
            return { completions: [], provideLanguageCompletions: true };
        }

        const prettyValue = (id: string): string =>
        {
            return id.split('').reduce((acc: string, c: string, i: number) =>
            {
                if (i < id.length - 1) {
                    const next = id[i + 1];
                    // is current uppercase?
                    const currentCase = (c === c.toUpperCase() && c !== c.toLowerCase());
                    // is next uppercase?
                    const nextCase = (next === next.toUpperCase() && next !== next.toLowerCase());
                    // curent is upercase, and next also.
                    return currentCase && nextCase ? acc + c.toLowerCase() : acc + c;
                }
                return acc + c.toLowerCase();
            }, '');
        };

        const core = new CodeCompletionCore(this.parser);
        core.showResult = false;
        // core.showResult = true;
        // core.showDebugOutput = true;

        core.ignoredTokens = new Set([
            mxsParser.BLOCK_COMMENT,
            mxsParser.LINE_COMMENT,
            mxsParser.STRING,
            mxsParser.NUMBER,
            mxsParser.TIMEVAL,
            mxsParser.RESOURCE,
            mxsParser.TRUE,
            mxsParser.FALSE,
            mxsParser.OFF,

            // mxsParser.PATH,
            // mxsParser.NAME,
            mxsParser.ID,
            mxsParser.QUOTED_ID,

            mxsParser.NL,
            mxsParser.WS,

            mxsParser.COMPARE,
            mxsParser.ASSIGN,
            mxsParser.UNARY_MINUS,
            mxsParser.MINUS,
            mxsParser.PLUS,
            mxsParser.PROD,
            mxsParser.DIV,
            mxsParser.POW,
            // mxsParser.EQ,
            mxsParser.SHARP,
            mxsParser.COMMA,
            mxsParser.COLON,
            mxsParser.GLOB,
            // mxsParser.DOT,
            // mxsParser.DOTDOT,
            mxsParser.AMP,
            mxsParser.QUESTION,

            mxsParser.LPAREN,
            mxsParser.RPAREN,
            mxsParser.LBRACE,
            mxsParser.RBRACE,
            mxsParser.LBRACK,
            mxsParser.RBRACK,

            Token.EOF,
        ]);

        core.preferredRules = new Set([
            mxsParser.RULE_identifier,
            mxsParser.RULE_path,
            mxsParser.RULE_name,
            mxsParser.RULE_property,
            mxsParser.RULE_rolloutControl,
            mxsParser.RULE_rcmenuControl,
            mxsParser.RULE_struct_member,
            //...
        ]);

        // Search the token index which covers our caret position.
        let index: number;
        this.tokenStream.fill();
        for (index = 0; ; ++index) {
            const token = this.tokenStream.get(index);
            // console.log(token.toString());
            if (token.type === Token.EOF || token.line > row) {
                break;
            }
            if (token.line < row) {
                continue;
            }
            const length = token.text ? token.text.length : 0;

            if ((token.column + length) >= column) {
                break;
            }
        }

        const candidates = core.collectCandidates(index);
        const result: ISymbolInfo[] = [];

        candidates.tokens.forEach((following: number[], type: number) =>
        {
            switch (type) {
                //...
                case mxsLexer.EQ: {
                    result.push({
                        kind: SymbolKind.Operator,
                        name: "=",
                        description: "Variable assignment",
                        source: this.sourceUri,
                    });
                    break;
                }
                default: {
                    const value = this.parser?.vocabulary.getDisplayName(type) ?? "";
                    result.push({
                        kind: SymbolKind.Keyword,
                        name: prettyValue(value),   //value[0] === "'" ? value.substring(1, value.length - 1) : value, // Remove quotes.
                        //description: "Rule alt separator",
                        source: this.sourceUri,
                    });
                    break;
                }
            }
        });

        const promises: Array<Promise<BaseSymbol[] | undefined>> = [];
        candidates.rules.forEach((candidateRule, key) =>
        {
            switch (key) {
                case mxsParser.RULE_identifier: {
                    languageCompletions = true;
                    const context = BackendUtils.parseTreeFromPosition(<ParseTree>this.tree, row, column);

                    if (!context) { return; }

                    const currentSymbol = this.symbolTable.symbolContainingContext(context);

                    if (currentSymbol && currentSymbol.parent) {
                        const entrySymbol =
                            currentSymbol instanceof IdentifierSymbol && currentSymbol.parent
                                ? currentSymbol.parent as ExprSymbol
                                : currentSymbol as ExprSymbol;

                        // entrySymbol.getAllSymbols(IdentifierSymbol, true).then((symbols) => symbols.forEach(symbol => console.log(symbol.name)));
                        // promises.push(entrySymbol.getAllSymbols(BaseSymbol));
                        // promises.push(entrySymbol.getAllSymbols(ScopedSymbol));

                        promises.push(
                            entrySymbol.getAllSymbols(IdentifierSymbol),
                            entrySymbol.getAllSymbols(VariableDeclSymbol),
                            entrySymbol.getAllSymbols(FnDefinitionSymbol),
                            entrySymbol.getAllSymbols(fnArgsSymbol),
                            entrySymbol.getAllSymbols(fnParamsSymbol),
                            entrySymbol.getAllSymbols(StructDefinitionSymbol),
                            entrySymbol.getAllSymbols(StructMemberSymbol),
                            entrySymbol.getAllSymbols(RolloutControlSymbol),
                        );

                        // promises.push(this.symbolTable.getAllSymbolsOfType(entrySymbol, IdentifierSymbol));
                        // promises.push(this.symbolTable.getAllSymbolsOfType(entrySymbol, VariableDeclSymbol));
                        // promises.push(this.symbolTable.getAllSymbolsOfType(entrySymbol, FnDefinitionSymbol));
                        // promises.push(this.symbolTable.getAllSymbolsOfType(entrySymbol, fnArgsSymbol));
                        // promises.push(this.symbolTable.getAllSymbolsOfType(entrySymbol, fnParamsSymbol));
                        // promises.push(this.symbolTable.getAllSymbolsOfType(entrySymbol, StructDefinitionSymbol));
                        // promises.push(this.symbolTable.getAllSymbolsOfType(entrySymbol, StructMemberSymbol));                
                    }
                    break;
                }
                case mxsParser.RULE_struct_member: {
                    result.push(
                        {
                            kind: SymbolKind.Keyword,
                            name: 'Public',
                            source: this.sourceUri,
                            definition: undefined,
                            description: undefined,
                        },
                        {
                            kind: SymbolKind.Keyword,
                            name: 'Private',
                            source: this.sourceUri,
                            definition: undefined,
                            description: undefined,
                        }
                    );
                    break;
                }
                /*    
                case ANTLRv4Parser.RULE_actionBlock: {
                    result.push({
                        kind: SymbolKind.ParserAction,
                        name: "{ action code }",
                        source: this.fileName,
                        definition: undefined,
                        description: undefined,
                    });
    
                    // Include predicates only when we are in a lexer or parser element.
                    const list = candidateRule.ruleList;
                    if (list[list.length - 1] === ANTLRv4Parser.RULE_lexerElement) {
                        result.push({
                            kind: SymbolKind.LexerPredicate,
                            name: "{ predicate }?",
                            source: this.fileName,
                            definition: undefined,
                            description: undefined,
                        });
                    } else if (list[list.length - 1] === ANTLRv4Parser.RULE_element) {
                        result.push({
                            kind: SymbolKind.ParserPredicate,
                            name: "{ predicate }?",
                            source: this.fileName,
                            definition: undefined,
                            description: undefined,
                        });
                    }
                    break;
                }
    
                case ANTLRv4Parser.RULE_terminalDef: { // Lexer rules.
                    promises.push(this.symbolTable.getAllSymbols(BuiltInTokenSymbol));
                    promises.push(this.symbolTable.getAllSymbols(VirtualTokenSymbol));
                    promises.push(this.symbolTable.getAllSymbols(TokenSymbol));
    
                    // Include fragment rules only when referenced from a lexer rule.
                    const list = candidateRule.ruleList;
                    if (list[list.length - 1] === ANTLRv4Parser.RULE_lexerAtom) {
                        promises.push(this.symbolTable.getAllSymbols(FragmentTokenSymbol));
                    }
    
                    break;
                } 
                // */
            }
        });

        const symbolLists = await Promise.all(promises);
        const collectedNames: Set<string> = new Set([]);

        symbolLists.forEach((symbols) =>
        {
            if (symbols) {
                symbols.forEach((symbol) =>
                {
                    if (symbol.name && symbol.name !== "EOF" && !(collectedNames.has(symbol.name))) {
                        // filter out symbols downwards the current position
                        let collectThis = true;
                        if (symbol.context) {
                            const symline = (symbol.context as ParserRuleContext).start?.line ?? 0;
                            collectThis = symline <= row;
                        }
                        if (collectThis) {
                            result.push({
                                kind: SourceContext.getKindFromSymbol(symbol),
                                name: symbol.name,
                                source: this.sourceUri,
                                definition: undefined,
                                description: undefined,
                            });
                            collectedNames.add(symbol.name);
                        }
                    }
                });
            }
        });

        return {
            completions: result,
            provideLanguageCompletions: languageCompletions
        };
    }

    //-------------------------------------------------diagnostics
    /*  public getDiagnostics(): IDiagnosticEntry[]
    {
        this.runSemanticAnalysisIfNeeded();
        return this.diagnostics;
    } */
    public get getDiagnostics(): IDiagnosticEntry[]
    {
        return this.diagnostics;
    }

    public get hasErrors(): boolean
    {
        for (const diagnostic of this.diagnostics) {
            if (diagnostic.type === DiagnosticType.Error) {
                return true;
            }
        }
        return false;
    }

    //-------------------------------------------------semantic tokens
    public get getSemanticTokens(): ISemanticToken[]
    {
        return this.semanticTokens;
    }

    // TODO: references
    // TODO: dependencies
    /*
    private runSemanticAnalysisIfNeeded() {
        if (!this.semanticAnalysisDone && this.tree) {
            this.semanticAnalysisDone = true;
            //this.diagnostics.length = 0; Don't, we would lose our syntax errors from last parse run.

            const semanticListener = new SemanticListener(this.diagnostics, this.symbolTable);
            ParseTreeWalker.DEFAULT.walk(semanticListener, this.tree);
        }
    }
    */

    /**
     * Add this context to the list of referencing contexts in the given context.
     *
     * @param context The context to add.
     */
    /*  public addAsReferenceTo(context: SourceContext): void
    {
        // Check for mutual inclusion. References are organized like a mesh.
        const pipeline: SourceContext[] = [context];
        while (pipeline.length > 0) {
            const current = pipeline.shift();
            if (!current) {
                continue;
            }

            if (current.references.indexOf(this) > -1) {
                return; // Already in the list.
            }

            pipeline.push(...current.references);
        }
        context.references.push(this);
        this.symbolTable.addDependencies(context.symbolTable);
    }
    */

    /**
     * Remove the given context from our list of dependencies.
     *
     * @param context The context to remove.
     */
    /*
    public removeDependency(context: SourceContext): void {
        const index = context.references.indexOf(this);
        if (index > -1) {
            context.references.splice(index, 1);
        }
        this.symbolTable.removeDependency(context.symbolTable);
    }
    */
    /*
    public getReferenceCount(symbol: string): number {
        this.runSemanticAnalysisIfNeeded();

        let result = this.symbolTable.getReferenceCount(symbol);

        for (const reference of this.references) {
            result += reference.getReferenceCount(symbol);
        }

        return result;
    }
    */

    // -------------------------------------------------format code
    // TODO: formatter that uses the parse tree and a visitor
    public formatCode(range: ILexicalRange, options?: ICodeFormatSettings): IformatterResult;
    public formatCode(range: { start: number, stop: number }, options?: ICodeFormatSettings): IformatterResult;

    public formatCode(range: ILexicalRange | { start: number, stop: number }, options?: ICodeFormatSettings): IformatterResult
    {
        // execute lexer
        this.lexer.reset();
        this.tokenStream.setTokenSource(this.lexer);
        this.tokenStream.fill();
        // initialize the formatter
        const formatter = new mxsSimpleFormatter(this.tokenStream, options);
        // format code
        if ('stop' in range) {
            return formatter.formatRange(range.start, range.stop);
        } else {
            let contextToFormat = BackendUtils.parseTreeContainingRange(<ParseTree>this.tree, range);
            return formatter.formatTokenRange(
                contextToFormat.start?.tokenIndex,
                contextToFormat.stop?.tokenIndex
            );
        }
    }
    // minify
    public minifyCode(options?: IMinifierSettings): string | null
    {
        const visitor = new mxsParserVisitorFormatter(options);
        return visitor.visit(this.tree as ParseTree);
    }
    // prettify
    public prettyfiCode() { }
    //...
}