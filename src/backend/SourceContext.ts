import {
  BaseSymbol, CodeCompletionCore, ScopedSymbol, SymbolTable,
} from 'antlr4-c3';
import {
  BailErrorStrategy, CharStream, CommonTokenStream, DefaultErrorStrategy,
  ParseCancellationException, ParserRuleContext, ParseTree, ParseTreeWalker,
  PredictionMode, TerminalNode, Token,
} from 'antlr4ng';

import { mxsLexer } from '../parser/mxsLexer.js';
import { mxsParser } from '../parser/mxsParser.js';
import {
  DiagnosticType, ICodeFormatSettings, IDefinition, IDiagnosticEntry,
  ILexicalRange, IMinifySettings, IPrettifySettings, ISemanticToken,
  ISymbolInfo, SymbolKind,
} from '../types.js';
import { BackendUtils } from './BackendUtils.js';
import { IformatterResult, mxsSimpleFormatter } from './formatting/simpleCodeFormatter.js';
import { ContextErrorListener } from './diagnostics/ContextErrorListener.js';
import { ContextLexerErrorListener } from './diagnostics/ContextLexerErrorListener.js';
import {
  AssignmentExpressionSymbol, AttributesDefSymbol, ContextSymbolTable,
  EventHandlerClauseSymbol, ExprSymbol, fnArgsSymbol, FnDefinitionSymbol,
  fnParamsSymbol, IdentifierSymbol, MacroScriptDefinitionSymbol,
  PluginDefinitionSymbol, RolloutControlSymbol, RolloutDefinitionSymbol,
  StructDefinitionSymbol, StructMemberSymbol, ToolDefinitionSymbol,
  UtilityDefinitionSymbol, VariableDeclSymbol,
} from './ContextSymbolTable.js';
import {
  codeBlock, mxsParserVisitorFormatter,
} from './formatting/mxsParserVisitorFormatter.js';
import { mxsParserVisitorMinifier } from './formatting/mxsParserVisitorMinifier.js';
import { semanticTokenListener } from './semantic/semanticTokenListener.js';
import { CodeCompletionProvider } from './symbols/codeCompletionProvider.js';
import { symbolTableListener } from './symbolTableListener.js';

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
    [fnArgsSymbol, SymbolKind.Argument],
    [fnParamsSymbol, SymbolKind.Parameter],
    [VariableDeclSymbol, SymbolKind.Declaration],
    [AssignmentExpressionSymbol, SymbolKind.Identifier],
    [IdentifierSymbol, SymbolKind.Identifier],
]);

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
    public changedText(source: string): boolean
    {
        return source === this.lexer.text
    }
    //----------------------------------------------------------------parser
    // get getTokenStream() { return this.tokenStream; }
    public parse(): void
    {
        // Rewind the input stream for a new parse run.
        this.lexer.reset();
        this.tokenStream.setTokenSource(this.lexer);
        this.parser.reset();
        this.parser.errorHandler = new BailErrorStrategy();
        this.parser.interpreter.predictionMode = PredictionMode.SLL;
        this.tree = undefined;
        //---------------------------------------------------------------
        //TODO: semantic tokens while parsing...
        // this.parser.addParseListener();
        //---------------------------------------------------------------
        // this.semanticAnalysisDone = false;
        this.diagnostics.length = 0;
        this.symbolTable.clear();
        // TODO: add Global symbols here
        //this.symbolTable.addDependencies(SourceContext.globalSymbols);
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
        const symbolsListener = new symbolTableListener(this.symbolTable/*, this.info.imports*/);
        ParseTreeWalker.DEFAULT.walk(symbolsListener, this.tree);
        //---------------------------------------------------------------
        // TODO: this.info.unreferencedRules = this.symbolTable.getUnreferencedSymbols();
        // TODO: this can be used to add dependencies... imports come from the listener
        // return this.info.imports;
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
        // /*
        // The symbol table returns symbols of itself and those it depends on (if recursive is true).
        const result = await this.symbolTable.getAllSymbols(BaseSymbol, !recursive);
        // Add also symbols from contexts referencing us, this time not recursive
        // as we have added our content already.
        for (const reference of this.references) {
            const symbols = await reference.symbolTable.getAllSymbols(BaseSymbol, true);
            symbols.forEach((value) =>
            {
                result.push(value);
            });
        }
        return result;
        // */
        // return await this.symbolTable.getAllSymbols(BaseSymbol, !recursive);
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
    /**
     * Get code completion candidates at the specified position.
     * Delegates to CodeCompletionProvider for the heavy lifting.
     * 
     * @param row Line number (1-based)
     * @param column Column number (0-based)
     * @returns Array of completion candidates
     */
    public async getCodeCompletionCandidates(row: number, column: number): Promise<ISymbolInfo[]>
    {
        if (!this.parser || !this.tree) {
            return [];
        }

        return CodeCompletionProvider.getCandidates(
            this.parser,
            this.tokenStream,
            this.tree,
            this.symbolTable,
            row,
            column,
            { sourceUri: this.sourceUri },
            SourceContext.getKindFromSymbol
        );
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
            const contextToFormat = BackendUtils.parseTreeContainingRange(<ParseTree>this.tree, range);
            return formatter.formatTokenRange(
                contextToFormat.start?.tokenIndex,
                contextToFormat.stop?.tokenIndex
            );
        }
    }
    // minify
    public minifyCode(options: ICodeFormatSettings & IMinifySettings & IPrettifySettings, enhanced: boolean = false): string | null
    {
        let result: string | null = null;
        if (!enhanced) {
            const visitor = new mxsParserVisitorMinifier(options);
            result = visitor.visit(this.tree as ParseTree);
        } else {
            //...
            const visitor = new mxsParserVisitorFormatter(options);
            const derive = visitor.visit(this.tree as ParseTree);
            if (!Array.isArray(derive) && derive instanceof codeBlock) {
                result = derive.toString(options)
            }
        }
        return result
    }
    // prettify
    public prettifyCode(options: ICodeFormatSettings & IMinifySettings & IPrettifySettings)
    {
        let result: string | null = null;
        const visitor = new mxsParserVisitorFormatter(options);
        const derive = visitor.visit(this.tree as ParseTree);
        if (!Array.isArray(derive) && derive instanceof codeBlock) {
            result = derive.toString(options)
        }
        return result
    }
    //-------------------------------------------------references

    // TODO: semantic analysis
    // TODO: references
    // TODO: dependencies
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
    /**
     * Add this context to the list of referencing contexts in the given context.
     *
     * @param context The context to add.
     */
    public addAsReferenceTo(context: SourceContext): void
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
    
    /**
     * Remove the given context from our list of dependencies.
     * THIS IS PART OF THE WORK IN PROGRESS FOR THE WORKSPACE SYMBOL PROVIDER
     * @param context The context to remove.
     */
    public removeDependency(context: SourceContext): void
    {
        const index = context.references.indexOf(this);
        if (index > -1) {
            context.references.splice(index, 1);
        }
        this.symbolTable.removeDependency(context.symbolTable);
    }
    /**
     * Get the reference count for the given symbol across this context and all referencing contexts.
     * THIS IS PART OF THE WORK IN PROGRESS FOR THE WORKSPACE SYMBOL PROVIDER
     * @param symbol The symbol to get the reference count for.
     * @return The reference count.
     */
    public getReferenceCount(symbol: string): number
    {
        this.runSemanticAnalysisIfNeeded();

        let result = this.symbolTable.getReferenceCount(symbol);

        for (const reference of this.references) {
            result += reference.getReferenceCount(symbol);
        }

        return result;
    }
    //...
}