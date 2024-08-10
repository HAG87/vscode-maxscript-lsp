import { DocumentSymbol, Uri, workspace } from "vscode";
import { mxsLexer } from "../parser/mxsLexer.js";
import { BailErrorStrategy, CharStream, CommonTokenStream, DefaultErrorStrategy, ParseCancellationException, ParserRuleContext, ParseTree, ParseTreeWalker, PredictionMode, TerminalNode } from "antlr4ng";
import { mxsParser, ProgramContext } from "../parser/mxsParser.js";
import { ContextLexerErrorListener } from "./ContextLexerErrorListener.js";
import { ContextErrorListener } from "./ContextErrorListener.js";
import * as fs from "fs";
import { DiagnosticType, IDefinition, IDiagnosticEntry, ISymbolInfo, SymbolKind } from "../types.js";
import { ContextSymbolTable, SymbolSupport } from "./ContextSymbolTable.js";
import { BaseSymbol, IScopedSymbol, ScopedSymbol, SymbolTable, } from "antlr4-c3";
import { symbolTableListener } from "./symbolTableListener.js";
import { BackendUtils } from "./BackendUtils.js";

// One context for each valid document
export class SourceContext
{
    // context source uri pointing at the document
    public sourceUri: Uri;

    // symbols for the current document
    public symbolTable: ContextSymbolTable;
    // document uri?
    // symbolTable: string;
    // semantic tokens... so on
    // could be useful to store te token stream...

    // hold diagnostics for the context
    public diagnostics: IDiagnosticEntry[] = [];
    // Contexts referencing us.
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
    private tree: ProgramContext | undefined;

    public constructor(uri: Uri, /*settings*/)
    {
        this.sourceUri = uri;
        // initialize simbol table
        this.symbolTable = new ContextSymbolTable(
            this.sourceUri.toString(),
            { allowDuplicateSymbols: true },
            this);

        // initialize static global symbol table
        //...

        // initialize lexer instance with empty string
        this.lexer = new mxsLexer(CharStream.fromString(''));
        this.lexer.removeErrorListeners();
        this.lexer.addErrorListener(this.lexerErrorListener);

        // initialize token stream
        // this.tokenStream = new multiChannelTokenStream(this.lexer);
        this.tokenStream = new CommonTokenStream(this.lexer);

        // initialize parer instance
        this.parser = new mxsParser(this.tokenStream);
        this.parser.buildParseTrees = true;
        this.parser.removeErrorListeners();
        this.parser.addErrorListener(this.errorListener);
    }

    public getDocumentText(): string
    {
        return fs.readFileSync(this.sourceUri.fsPath, "utf8");
    }

    public setText(source?: string): void
    {
        if (source) {
            // console.log(source);
            this.lexer.inputStream = CharStream.fromString(source);
            // console.log(this.lexer.text)
            //...
        } else {
            // console.log(this.getDocumentText());
            this.lexer.inputStream = CharStream.fromString(this.getDocumentText());
        }
    }

    public parse(): void
    {
        // console.log(this.lexer.text);

        this.tree = undefined;
        // /*
        // Rewind the input stream for a new parse run.
        this.lexer.reset();

        this.tokenStream.setTokenSource(this.lexer);

        this.parser.reset();
        this.parser.errorHandler = new BailErrorStrategy();
        this.parser.interpreter.predictionMode = PredictionMode.SLL;

        // this.info.imports.length = 0;

        // this.semanticAnalysisDone = false;
        this.diagnostics.length = 0;

        this.symbolTable.clear();
        // this.symbolTable.addDependencies(SourceContext.globalSymbols);

        try {
            this.tree = this.parser.program();
        } catch (e) {
            if (e instanceof ParseCancellationException) {
                // console.log(e);
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
        // console.log(this.tree);

        // load symbols!
        this.symbolTable.tree = this.tree;

        // carefully copy this!
        const listener = new symbolTableListener(this.symbolTable);
        // const listener = new DetailsListener(this.symbolTable, this.info.imports);
        ParseTreeWalker.DEFAULT.walk(listener, this.tree);

        // this.info.unreferencedRules = this.symbolTable.getUnreferencedSymbols();

        // return this.info.imports;
        // */
    }
    // ------------------------------------------------- semantic analysis
    // integrate here the methods for semantic tokens...
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
        */
        return 0;
    }
    // ------------------------------------------------- SYMBOLS

    public static getKindFromSymbol(symbol: BaseSymbol): SymbolKind
    {
        return SymbolSupport.symbolToKindMap.get(symbol.constructor as typeof BaseSymbol) || SymbolKind.Null;
    }

    /**
     * @param ctx The context to get info for.
     * @param keepQuotes A flag indicating if quotes should be kept if there are any around the context's text.
     *
     * @returns The definition info for the given rule context.
    */
    public static definitionForContext(ctx: ParseTree | undefined, keepQuotes: boolean): IDefinition | undefined
    {
        if (!ctx) {
            return undefined;
        }

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

        if (ctx instanceof ParserRuleContext) {
            let start = ctx.start!.start;
            let stop = ctx.stop!.stop;
            /*
            result.range.start.row = ctx.start!.line;
            result.range.start.column = ctx.start!.column;
            result.range.end.row = ctx.stop!.line;
            result.range.end.column = ctx.stop!.column;
            */
            result.range = {
                start: {
                    row: ctx.start!.line,
                    column: ctx.start!.column
                },
                end: {
                    row: ctx.stop!.line,
                    column: ctx.stop!.column
                }
            }
            /*
            // For mode definitions we only need the init line, not all the lexer rules following it.
            if (ctx.ruleIndex === ANTLRv4Parser.RULE_modeSpec) {
                const modeSpec = ctx as ModeSpecContext;
                stop = modeSpec.SEMI().symbol.stop;
                result.range.end.column = modeSpec.SEMI().symbol.column;
                result.range.end.row = modeSpec.SEMI().symbol.line;
            } else if (ctx.ruleIndex === ANTLRv4Parser.RULE_grammarSpec) {
                // Similar for entire grammars. We only need the introducer line here.
                const grammarDecl = (ctx as GrammarSpecContext).grammarDecl();
                stop = grammarDecl.SEMI().symbol.stop;
                result.range.end.column = grammarDecl.SEMI().symbol.column;
                result.range.end.row = grammarDecl.SEMI().symbol.line;
        
                start = grammarDecl.grammarType().start!.start;
                result.range.start.column = grammarDecl.grammarType().start!.column;
                result.range.start.row = grammarDecl.grammarType().start!.line;
            }
            */
            const inputStream = ctx.start?.tokenSource?.inputStream;
            if (inputStream) {
                try {
                    result.text = inputStream.getTextFromRange(start, stop);
                } catch (e) {
                    // The method getText uses an unreliable JS String API which can throw on larger texts.
                    // In this case we cannot return the text of the given context.
                    // A context with such a large size is probably an error case anyway (unfinished multi line comment
                    // or unfinished action).
                }
            }
        } else if (ctx instanceof TerminalNode) {
            result.text = ctx.getText();
            /*
             result.range.start.row = ctx.symbol.line;
             result.range.start.column = ctx.symbol.column;
             result.range.end.row = ctx.symbol.line;
             result.range.end.column = ctx.symbol.column + result.text.length;
            */
            result.range = {
                start: {
                    row: ctx.symbol!.line,
                    column: ctx.symbol!.column
                },
                end: {
                    row: ctx.symbol!.line,
                    column: ctx.symbol!.column
                }
            }
        }

        if (keepQuotes || result.text.length < 2) {
            return result;
        }

        const quoteChar = result.text[0];
        if ((quoteChar === '"' || quoteChar === "`" || quoteChar === "'")
            && quoteChar === result.text[result.text.length - 1]) {
            result.text = result.text.substring(1, result.text.length - 1);
        }

        return result;
    }

    public getTopMostParent(symbol: BaseSymbol): ContextSymbolTable | IScopedSymbol
    {
        // not topmost symbol
        if (!symbol.parent?.parent?.context) {
            return this.symbolTable;
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

    public symbolAtPosition(row: number, column: number): ISymbolInfo | undefined
    {
        if (!this.tree) return undefined;

        const symbol =
            this.symbolTable.getSymbolAtPosition(row, column);
        return symbol ? this.symbolTable.getSymbolInfo(symbol) : undefined;
    }

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
     *
     * @returns The symbol at the given position (if there's any).
    */
    public enclosingSymbolAtPosition(
        row: number,
        column: number,
        ruleScope: boolean): ISymbolInfo | undefined
    {

        if (!this.tree) {
            return undefined;
        }

        let context = BackendUtils.parseTreeFromPosition(this.tree, column, row);

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
                && !(run instanceof ParserRuleSpecContext)
                && !(run instanceof OptionsSpecContext)
                && !(run instanceof LexerRuleSpecContext)) {
                run = run.parent;
            }
            if (run) {
                context = run;
            }
        }
        */
        if (context) {
            const symbol = this.symbolTable.symbolWithContextSync(context);
            if (symbol) {
                return this.symbolTable.getSymbolInfo(symbol);
            }
        }

        return undefined;
    }

    public listTopLevelSymbols(includeDependencies: boolean): ISymbolInfo[]
    {
        return this.symbolTable.symbolInfoTopLevel(includeDependencies);
    }

    public async getAllSymbols(recursive: boolean): Promise<BaseSymbol[]>
    {
        // The symbol table returns symbols of itself and those it depends on (if recursive is true).
        const result = await this.symbolTable.getAllSymbols(BaseSymbol, !recursive);

        /*
        // Add also symbols from contexts referencing us, this time not recursive
        // as we have added our content already.
        for (const reference of this.references) {
            const symbols = await reference.symbolTable.getAllSymbols(BaseSymbol, true);
            symbols.forEach((value) => {
                result.push(value);
            });
        }
        */

        return result;
    }
    public getSymbolInfo(symbol: string | BaseSymbol): ISymbolInfo | undefined
    {
        return this.symbolTable.getSymbolInfo(symbol);
    }

    public resolveSymbol(symbolName: string): BaseSymbol | undefined
    {
        return this.symbolTable.resolveSync(symbolName, false);
    }

    // code completions
    /*
        public async getCodeCompletionCandidates(column: number, row: number): Promise<ISymbolInfo[]> {
        if (!this.parser) {
            return [];
        }

        const core = new CodeCompletionCore(this.parser);
        core.showResult = false;
        core.ignoredTokens = new Set([
            ANTLRv4Lexer.TOKEN_REF,
            ANTLRv4Lexer.RULE_REF,
            ANTLRv4Lexer.LEXER_CHAR_SET,
            ANTLRv4Lexer.DOC_COMMENT,
            ANTLRv4Lexer.BLOCK_COMMENT,
            ANTLRv4Lexer.LINE_COMMENT,
            ANTLRv4Lexer.INT,
            ANTLRv4Lexer.STRING_LITERAL,
            ANTLRv4Lexer.UNTERMINATED_STRING_LITERAL,
            ANTLRv4Lexer.MODE,
            ANTLRv4Lexer.COLON,
            ANTLRv4Lexer.COLONCOLON,
            ANTLRv4Lexer.COMMA,
            ANTLRv4Lexer.SEMI,
            ANTLRv4Lexer.LPAREN,
            ANTLRv4Lexer.RPAREN,
            ANTLRv4Lexer.LBRACE,
            ANTLRv4Lexer.RBRACE,
            ANTLRv4Lexer.GT,
            ANTLRv4Lexer.DOLLAR,
            ANTLRv4Lexer.RANGE,
            ANTLRv4Lexer.DOT,
            ANTLRv4Lexer.AT,
            ANTLRv4Lexer.POUND,
            ANTLRv4Lexer.NOT,
            ANTLRv4Lexer.ID,
            ANTLRv4Lexer.WS,
            ANTLRv4Lexer.END_ARGUMENT,
            ANTLRv4Lexer.UNTERMINATED_ARGUMENT,
            ANTLRv4Lexer.ARGUMENT_CONTENT,
            ANTLRv4Lexer.END_ACTION,
            ANTLRv4Lexer.UNTERMINATED_ACTION,
            ANTLRv4Lexer.ACTION_CONTENT,
            ANTLRv4Lexer.UNTERMINATED_CHAR_SET,
            Token.EOF,
        ]);

        core.preferredRules = new Set([
            ANTLRv4Parser.RULE_argActionBlock,
            ANTLRv4Parser.RULE_actionBlock,
            ANTLRv4Parser.RULE_terminalDef,
            ANTLRv4Parser.RULE_lexerCommandName,
            ANTLRv4Parser.RULE_identifier,
            ANTLRv4Parser.RULE_ruleref,
        ]);

        // Search the token index which covers our caret position.
        let index: number;
        this.tokenStream.fill();
        for (index = 0; ; ++index) {
            const token = this.tokenStream.get(index);
            //console.log(token.toString());
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

        candidates.tokens.forEach((following: number[], type: number) => {
            switch (type) {
                case ANTLRv4Lexer.RARROW: {
                    result.push({
                        kind: SymbolKind.Operator,
                        name: "->",
                        description: "Lexer action introducer",
                        source: this.fileName,
                    });

                    break;
                }
                case ANTLRv4Lexer.LT: {
                    result.push({
                        kind: SymbolKind.Operator,
                        name: "< key = value >",
                        description: "Rule element option",
                        source: this.fileName,
                    });

                    break;
                }
                case ANTLRv4Lexer.ASSIGN: {
                    result.push({
                        kind: SymbolKind.Operator,
                        name: "=",
                        description: "Variable assignment",
                        source: this.fileName,
                    });

                    break;
                }

                case ANTLRv4Lexer.QUESTION: {
                    result.push({
                        kind: SymbolKind.Operator,
                        name: "?",
                        description: "Zero or one repetition operator",
                        source: this.fileName,
                    });
                    break;
                }

                case ANTLRv4Lexer.STAR: {
                    result.push({
                        kind: SymbolKind.Operator,
                        name: "*",
                        description: "Zero or more repetition operator",
                        source: this.fileName,
                    });

                    break;
                }

                case ANTLRv4Lexer.PLUS_ASSIGN: {
                    result.push({
                        kind: SymbolKind.Operator,
                        name: "+=",
                        description: "Variable list addition",
                        source: this.fileName,
                    });

                    break;
                }

                case ANTLRv4Lexer.PLUS: {
                    result.push({
                        kind: SymbolKind.Operator,
                        name: "+",
                        description: "One or more repetition operator",
                        source: this.fileName,
                    });

                    break;
                }

                case ANTLRv4Lexer.OR: {
                    result.push({
                        kind: SymbolKind.Operator,
                        name: "|",
                        description: "Rule alt separator",
                        source: this.fileName,
                    });
                    break;
                }

                default: {
                    const value = this.parser?.vocabulary.getDisplayName(type) ?? "";
                    result.push({
                        kind: SymbolKind.Keyword,
                        name: value[0] === "'" ? value.substring(1, value.length - 1) : value, // Remove quotes.
                        source: this.fileName,
                    });

                    break;
                }
            }
        });

        const promises: Array<Promise<BaseSymbol[] | undefined>> = [];
        candidates.rules.forEach((candidateRule, key) => {
            switch (key) {
                case ANTLRv4Parser.RULE_argActionBlock: {
                    result.push({
                        kind: SymbolKind.Arguments,
                        name: "[ argument action code ]",
                        source: this.fileName,
                        definition: undefined,
                        description: undefined,
                    });
                    break;
                }

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

                case ANTLRv4Parser.RULE_lexerCommandName: {
                    ["channel", "skip", "more", "mode", "push", "pop"].forEach((symbol) => {
                        result.push({
                            kind: SymbolKind.Keyword,
                            name: symbol,
                            source: this.fileName,
                            definition: undefined,
                            description: undefined,
                        });
                    });
                    break;
                }

                case ANTLRv4Parser.RULE_ruleref: {
                    promises.push(this.symbolTable.getAllSymbols(RuleSymbol));

                    break;
                }

                case ANTLRv4Parser.RULE_identifier: {
                    // Identifiers can be a lot of things. We only handle special cases here.
                    // More concrete identifiers should be captured by rules further up in the call chain.
                    const list = candidateRule.ruleList;
                    switch (list[list.length - 1]) {
                        case ANTLRv4Parser.RULE_option: {
                            ["superClass", "language", "tokenVocab", "TokenLabelType", "contextSuperClass",
                                "caseInsensitive", "exportMacro"]
                                .forEach((symbol) => {
                                    result.push({
                                        kind: SymbolKind.Option,
                                        name: symbol,
                                        source: this.fileName,
                                        definition: undefined,
                                        description: undefined,
                                    });
                                });
                            break;
                        }

                        // eslint-disable-next-line no-underscore-dangle
                        case ANTLRv4Parser.RULE_action_: {
                            ["header", "members", "preinclude", "postinclude", "context", "declarations", "definitions",
                                "listenerpreinclude", "listenerpostinclude", "listenerdeclarations", "listenermembers",
                                "listenerdefinitions", "baselistenerpreinclude", "baselistenerpostinclude",
                                "baselistenerdeclarations", "baselistenermembers", "baselistenerdefinitions",
                                "visitorpreinclude", "visitorpostinclude", "visitordeclarations", "visitormembers",
                                "visitordefinitions", "basevisitorpreinclude", "basevisitorpostinclude",
                                "basevisitordeclarations", "basevisitormembers", "basevisitordefinitions"]
                                .forEach((symbol) => {
                                    result.push({
                                        kind: SymbolKind.Keyword,
                                        name: symbol,
                                        source: this.fileName,
                                        definition: undefined,
                                        description: undefined,
                                    });
                                });

                            break;
                        }

                        default: {
                            break;
                        }
                    }

                    break;
                }

                default: {
                    break;
                }
            }

        });

        const symbolLists = await Promise.all(promises);
        symbolLists.forEach((symbols) => {
            if (symbols) {
                symbols.forEach((symbol) => {
                    if (symbol.name !== "EOF") {
                        result.push({
                            kind: SourceContext.getKindFromSymbol(symbol),
                            name: symbol.name,
                            source: this.fileName,
                            definition: undefined,
                            description: undefined,
                        });
                    }
                });
            }
        });

        return result;
    }
    */

    // diagnostics
    public getDiagnostics(): IDiagnosticEntry[]
    {
        this.runSemanticAnalysisIfNeeded();
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

    // references

    // dependencies

    // format
    public formatCode() { }
    public formatCodeRange() { }
    // prettify
    // minify
    public minifyCode() { }
    //...
}