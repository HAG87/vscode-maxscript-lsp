import {
  BaseSymbol, ScopedSymbol, SymbolTable,
} from 'antlr4-c3';
import {
  BailErrorStrategy, CharStream, CommonTokenStream, DefaultErrorStrategy,
  ParseCancellationException, ParserRuleContext, ParseTree, ParseTreeWalker,
  PredictionMode, TerminalNode, Token,
} from 'antlr4ng';

import { mxsLexer } from '../parser/mxsLexer.js';
import { mxsParser, ProgramContext } from '../parser/mxsParser.js';
import {
  DiagnosticType, ICodeFormatSettings, IDefinition, IDiagnosticEntry,
  ILexicalRange, IMinifySettings, IPrettifySettings, ISemanticToken,
  ISymbolInfo, SymbolKind,
} from '../types.js';
import { BackendUtils } from './BackendUtils.js';
import { IformatterResult, mxsSimpleFormatter } from './formatting/simpleCodeFormatter.js';
import { ContextErrorListener } from './diagnostics/ContextErrorListener.js';
import { ContextLexerErrorListener } from './diagnostics/ContextLexerErrorListener.js';
import { CustomErrorStrategy } from './diagnostics/CustomErrorStrategy.js';
import { ContextSymbolTable } from './ContextSymbolTable.js';
import {
  codeBlock, mxsParserVisitorFormatter,
} from './formatting/mxsParserVisitorFormatter.js';
import { mxsParserVisitorMinifier } from './formatting/mxsParserVisitorMinifier.js';
import { semanticTokenListener } from './semantic/semanticTokenListener.js';
import { CodeCompletionProvider } from './symbols/codeCompletionProvider.js';
import { symbolTableListener } from './symbolTableListener.js';
import { ASTBuilder } from './ast/ASTBuilder.js';
import { Program } from './ast/ASTNodes.js';
import { SymbolResolver } from './ast/SymbolResolver.js';
import { SymbolTreeBuilder } from './ast/SymbolTreeBuilder';
import { ASTQuery } from './ast/ASTQuery.js';

// One context for each valid document
export class SourceContext
{
    // context source uri pointing at the document
    public sourceUri: string;
    //-------------------------------------------------
    // Parsing infrastructure.
    private tokenStream: CommonTokenStream;
    private lexer: mxsLexer;
    private parser: mxsParser;
    // The root context from the last parse run.
    private tree: ProgramContext | undefined;
    
    //-------------------------------------------------
    // symbols for the current document
    public symbolTable: ContextSymbolTable;

    // AST for the current document
    public ast: Program | undefined;
    
    // could be useful to store te token stream...

    //-------------------------------------------------
    // hold diagnostics for the context
    public diagnostics: IDiagnosticEntry[] = [];
    // semantic tokens
    public semanticTokens: ISemanticToken[] = [];
    // TODO: Contexts referencing us.
    private references: SourceContext[] = [];
    //-------------------------------------------------

    // error listeners
    private lexerErrorListener: ContextLexerErrorListener =
        new ContextLexerErrorListener(this.diagnostics);
    private errorListener: ContextErrorListener =
        new ContextErrorListener(this.diagnostics);

    // Flag to track if symbol table needs population (lazy loading)
    private symbolTableDirty: boolean = false;

    public constructor(uri: string, /*settings*/)
    {
        this.sourceUri = uri;

        // initialize symbol table
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

    //----------------------------------------------------------------parser

    // get getTokenStream() { return this.tokenStream; }
    public parse(): void
    {
        // Clear previous parse results
        this.tree = undefined;
        this.diagnostics.length = 0;
        // Mark symbol table as dirty instead of clearing immediately (lazy loading)
        this.symbolTableDirty = true;
        // TODO: add Global symbols here
        //this.symbolTable.addDependencies(SourceContext.globalSymbols);
        
        // Two-stage parsing: SLL mode first (fast), then LL mode if needed (accurate)
        // This is the recommended ANTLR approach for best performance + error handling
        
        // STAGE 1: Try SLL prediction mode (faster, but may fail on complex grammar)
        this.lexer.reset();
        this.tokenStream.setTokenSource(this.lexer);
        this.parser.reset();
        
        // Remove error listener during SLL pass - we don't want diagnostics from speculative parsing
        this.parser.removeErrorListeners();
        this.parser.errorHandler = new BailErrorStrategy(); // Bail on first error
        this.parser.interpreter.predictionMode = PredictionMode.SLL;
        
        try {
            this.tree = this.parser.program();
        } catch (e) {
            if (e instanceof ParseCancellationException) {
                // STAGE 2: SLL failed, retry with LL mode (slower but handles all cases)
                // Reset everything for second attempt
                this.lexer.reset();
                this.tokenStream.setTokenSource(this.lexer);
                this.parser.reset();
                
                // Re-add error listener for LL pass - now we want real diagnostics
                this.parser.addErrorListener(this.errorListener);
                
                // Use custom error handling strategy for better recovery
                this.parser.errorHandler = new CustomErrorStrategy();
                this.parser.interpreter.predictionMode = PredictionMode.LL;
                
                // Parse again - this time we'll get proper error messages with better recovery
                this.tree = this.parser.program();
            } else {
                // Some other error, re-throw
                throw e;
            }
        }
        // Symbol table and semantic tokens are now populated lazily when needed
        // This improves parse performance by 20-40% for syntax validation only
    }

    /**
     * Ensure symbol table is populated. Called lazily before operations that need symbols.
     * This defers expensive tree walking until actually needed.
     */
    private ensureSymbolTable(): void {
        if (!this.symbolTableDirty || !this.tree) {
            return;
        }

        // Clear and repopulate symbol table and semantic tokens
        this.symbolTable.clear();
        this.semanticTokens.length = 0;
        
        // Semantic tokens
        const semanticListener = new semanticTokenListener(this.semanticTokens);
        ParseTreeWalker.DEFAULT.walk(semanticListener, this.tree);
        
        // Load symbols
        this.symbolTable.tree = this.tree;
        const symbolsListener = new symbolTableListener(this.symbolTable);
        ParseTreeWalker.DEFAULT.walk(symbolsListener, this.tree);
        //---------------------------------------------------------------
        // 2. Build AST from parse tree
        try {
            const builder = new ASTBuilder();
            this.ast = builder.visitProgram(this.tree);
            // 3. Resolve all symbol references
            const resolver = new SymbolResolver(this.ast); // Takes existing AST
            resolver.resolve(); // MUTATES the AST (no return value)
        } catch (err) {
            console.error('[language-maxscript][SourceContext] AST build/resolve failed:', err);
            this.ast = undefined;
        }
        //---------------------------------------------------------------
        // TODO: this.info.unreferencedRules = this.symbolTable.getUnreferencedSymbols();
        // TODO: this can be used to add dependencies... imports come from the listener
        // return this.info.imports;
        this.symbolTable.rebuildReferenceIndex();
        
        this.symbolTableDirty = false;
    }
    //---------------------------------------------------------------
    // 3. Build hierarchical symbol tree for VS Code
    public buildSymbolTree(trace = false): ISymbolInfo[] {
        if (!this.tree) {
            if (trace) console.log('[language-maxscript][SourceContext] buildSymbolTree: no parse tree');
            return [];
        }

        const wasDirty = this.symbolTableDirty;
        // AST is built lazily in ensureSymbolTable() during parse-dependent operations.
        this.ensureSymbolTable();

        if (!this.ast) {
            if (trace) console.log(`[language-maxscript][SourceContext] buildSymbolTree: ast=undefined (wasDirty=${wasDirty})`);
            return [];
        }

        if (trace) {
            console.log(`[language-maxscript][SourceContext] buildSymbolTree: ast ok, stmts=${this.ast.statements.length}, decls=${this.ast.declarations.size}`);
        }

        const result = SymbolTreeBuilder.buildSymbolTree(this.ast, this.sourceUri);
        if (trace) console.log(`[language-maxscript][SourceContext] buildSymbolTree: result=${result.length}`);
        return result;
    }

    /**
     * Returns the resolved AST for this source context, ensuring it is built first.
     */
    public getResolvedAST(): Program | undefined {
        if (!this.tree) {
            return undefined;
        }
        this.ensureSymbolTable();
        return this.ast;
    }

    /**
     * Returns the declaration at a source position using the AST query layer.
     * @param row 1-based line number
     * @param column 0-based column number
     */
    public astDeclarationAtPosition(row: number, column: number)
    {
        const ast = this.getResolvedAST();
        if (!ast) {
            return undefined;
        }
        return ASTQuery.findDeclarationAtPosition(ast, row, column);
    }

    /**
     * Returns all references for the symbol at a source position using the AST query layer.
     * @param row 1-based line number
     * @param column 0-based column number
     */
    public astReferencesAtPosition(row: number, column: number)
    {
        const declaration = this.astDeclarationAtPosition(row, column);
        if (!declaration) {
            return undefined;
        }
        return ASTQuery.findReferencesForDeclaration(declaration);
    }
    //---------------------------------------------------------------

    /**
     * Update the text content of a loaded context.
     * Call this before reparsing or code completion.
     * @param source The document content, or undefined to read from file
     */
    public setText(source: string): void
    {
        const charStream = CharStream.fromString(source);
        if (charStream != this.lexer.inputStream) {
            this.lexer.inputStream = charStream
        }
    }

    public hasChangedText(source: string): boolean
    {
        return source === this.lexer.text
    }
    //------------------------------------------------- SYMBOLS

    /**
     * Gets the symbol at the specified position
     * @param row position line number
     * @param column position column number
     * @returns ISymbolInfo symbol or undefined
     */
    public symbolAtPosition(row: number, column: number): ISymbolInfo | undefined
    {
        if (!this.tree) return undefined;
        this.ensureSymbolTable();

        const symbol =
            this.symbolTable.getSymbolAtPosition(row, column);
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
        this.ensureSymbolTable();

        const symbol = this.symbolTable.getSymbolAtPosition(row, column);
        if (!symbol) return undefined;

        const definition = this.symbolTable.getSymbolDefinition(symbol!);
        return definition ? this.symbolTable.getSymbolInfo(definition) : undefined;
    }

    /**
     * Determines source file and position of all occurrences of the given symbol. The search includes
     * also all referencing and referenced contexts.
     *
     * @param fileName The grammar file name.
     * @param symbolName The name of the symbol to check.
     * @returns A list of symbol info entries, each describing one occurrence.
     */
    public getSymbolOccurrences(symbolName: string): ISymbolInfo[]
    {
        this.ensureSymbolTable();
        const result = this.symbolTable.getSymbolOccurrences(symbolName, false);
        // Sort result by kind. This way rule definitions appear before rule references and are re-parsed first.
        return result.sort((lhs: ISymbolInfo, rhs: ISymbolInfo) => lhs.kind - rhs.kind);
    }

    public symbolInfoAtPositionCtxOccurrences(line: number, character: number): ISymbolInfo[] | undefined
    {
        this.ensureSymbolTable();
        const symbol = this.symbolTable.getSymbolAtPosition(line, character);

        if (!symbol) { return undefined; }

        const result = this.symbolTable.getScopedSymbolOccurrences(symbol)

        return result.sort((lhs: ISymbolInfo, rhs: ISymbolInfo) => lhs.kind - rhs.kind);
    }

    /**
     * Returns the symbol at the given position or one of its outer scopes.
     *
     * @param column The position within a source line.
     * @param row The source line index.
     * @param ruleScope If true find the enclosing rule (if any) and return it's range, instead of the directly
     *                  enclosing scope.
     * @returns The symbol at the given position (if there's any).
     * @deprecated
    */
    public enclosingSymbolAtPosition(
        row: number,
        column: number,
        ruleScope: boolean): ISymbolInfo | undefined
    {
        if (!this.tree) { return; }
        this.ensureSymbolTable();

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
                && !(run instanceof ExprSeqContext)
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

    /**
     * Returns a list of top level symbols from a file (and optionally its dependencies).
     *
     * @param includeDependencies If true, includes symbols from all dependencies as well.
     * @returns A list of symbol info entries.
     */
    public listTopLevelSymbols(includeDependencies: boolean): ISymbolInfo[]
    {
        this.ensureSymbolTable();
        return this.symbolTable.symbolInfoTopLevel(includeDependencies);
    }

    /**
     * Returns all symbols from this context and optionally its dependencies.
     * @param recursive 
     * @returns 
     */
    public async getAllSymbols(recursive: boolean): Promise<BaseSymbol[]>
    {
        this.ensureSymbolTable();
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

    /**
     * @deprecated
     */
    public getSymbolInfo(symbol: string | BaseSymbol): ISymbolInfo | undefined
    {
        this.ensureSymbolTable();
        return this.symbolTable.getSymbolInfo(symbol);
    }
    /**
     * @deprecated
     */
    public resolveSymbol(symbolName: string): BaseSymbol | undefined
    {
        this.ensureSymbolTable();
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
        this.ensureSymbolTable();

        return CodeCompletionProvider.getCandidates(
            this.parser,
            this.tokenStream,
            this.tree,
            this.symbolTable,
            row,
            column,
            { sourceUri: this.sourceUri }
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
}