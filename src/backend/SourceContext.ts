import {
  BaseSymbol,
} from 'antlr4-c3';
import {
  BailErrorStrategy, CharStream, CommonTokenStream, 
  ParseCancellationException, ParseTree, ParseTreeWalker,
  PredictionMode, TerminalNode,
} from 'antlr4ng';
import { workspace } from 'vscode';

import { mxsLexer } from '../parser/mxsLexer.js';
import { mxsParser, ProgramContext } from '../parser/mxsParser.js';
import {
  DiagnosticType, ICodeFormatSettings, IDiagnosticEntry,
  ILexicalRange, IMinifySettings, IPrettifySettings, ISemanticToken,
  ISymbolInfo, SignatureHelpModel, CompletionSuggestion
} from './types.js';
import { TreeQuery } from './TreeQuery.js';
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
import {
    Program,
    VariableDeclaration,
} from './ast/ASTNodes.js';
import { SymbolResolver } from './ast/SymbolResolver.js';
import { SymbolTreeBuilder } from './ast/SymbolTreeBuilder';
import { ASTQuery } from './ast/ASTQuery.js';
import appendAstSemanticTokens from './semantic/astSemanticTokens.js';
import { IAstContext } from './IAstContext.js';
import { AstQueryService } from './query/AstQueryService.js';
import { SignatureHelpService } from './signature/SignatureHelpService.js';
import { RenameEditModel, RenamePrepareModel, RenameService } from './rename/RenameService.js';
import { CompletionService } from './completion/CompletionService.js';
import {
    DefinitionTargetModel,
    NavigationHighlightModel,
    NavigationReferenceModel,
    NavigationService,
} from './navigation/NavigationService.js';
import { HoverModel, HoverService } from './hover/HoverService.js';
import {
    CodeLensAnchorModel,
    CodeLensResolveModel,
    CodeLensService,
} from './codelens/CodeLensService.js';

// One context for each valid document
export class SourceContext implements IAstContext
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
    // Lower-cased identifier text -> candidate token positions from parse-tree listener
    private identifierCandidates: Map<string, ISemanticToken[]> = new Map();
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
    // Flag to track if AST + semantic tokens need population (lazy loading)
    private astModelDirty: boolean = false;

    private workspaceGlobalResolver?: (name: string, requesterUri: string) => VariableDeclaration | undefined;
    private workspaceGlobalVersionProvider?: () => number;
    private workspaceDeclarationAstProvider?: (decl: VariableDeclaration) => Program | undefined;
    private workspaceFileInAstProvider?: (sourceUri: string, fileInTarget: string) => Program | undefined;
    private workspaceGlobalCompletionsProvider?: (requesterUri: string) => VariableDeclaration[];
    private declarationSourceUriProvider?: (decl: VariableDeclaration) => string | undefined;
    private workspaceAstByUriProvider?: (uri: string) => Program | undefined;

    private readonly astQueryService: AstQueryService;
    private readonly signatureHelpService: SignatureHelpService;
    private readonly renameService: RenameService;
    private readonly completionService: CompletionService;
    private readonly navigationService: NavigationService;
    private readonly hoverService: HoverService;
    private readonly codeLensService: CodeLensService;
    private parseInvocationCount: number = 0;
    private sllFallbackCount: number = 0;
    private sourceCharCount: number = 0;
    private sourceLineCount: number = 0;
    private static readonly LARGE_FILE_CHAR_THRESHOLD = 100000;
    private static readonly LARGE_FILE_LINE_THRESHOLD = 3000;

    private nowMs(): number {
        return typeof performance !== 'undefined' ? performance.now() : Date.now();
    }

    private isPerformanceTraceEnabled(): boolean {
        return workspace.getConfiguration('maxScript').get<boolean>('providers.tracePerformance', false);
    }

    private logPerformanceTrace(message: string): void {
        if (this.isPerformanceTraceEnabled()) {
            console.log(`[language-maxscript][Performance] ${message}`);
        }
    }

    private logParserDecisionProfile(): void {
        const parseInfo = this.parser.getParseInfo();
        if (!parseInfo) {
            this.logPerformanceTrace(`parse.profile uri=${this.sourceUri} unavailable`);
            return;
        }

        const decisionInfo = parseInfo.getDecisionInfo();
        const parserAny = this.parser as unknown as {
            ruleNames?: string[];
            atn?: { decisionToState?: Array<{ ruleIndex?: number }> };
        };
        const ruleNames = parserAny.ruleNames ?? [];
        const decisionToState = parserAny.atn?.decisionToState ?? [];

        const active = decisionInfo
            .filter((d) => d.invocations > 0)
            .map((d) => {
                const state = decisionToState[d.decision];
                const ruleIndex = state?.ruleIndex ?? -1;
                const ruleName = ruleIndex >= 0 && ruleIndex < ruleNames.length
                    ? ruleNames[ruleIndex]
                    : `rule#${ruleIndex}`;
                return { d, ruleName };
            });

        const topByTime = [...active]
            .sort((lhs, rhs) => rhs.d.timeInPrediction - lhs.d.timeInPrediction)
            .slice(0, 8);

        const topByFallback = [...active]
            .filter((item) => item.d.llFallback > 0)
            .sort((lhs, rhs) => rhs.d.llFallback - lhs.d.llFallback)
            .slice(0, 8);

        this.logPerformanceTrace(
            `parse.profile.summary uri=${this.sourceUri} activeDecisions=${active.length} totalPredictNs=${parseInfo.getTotalTimeInPrediction()} totalSLLLook=${parseInfo.getTotalSLLLookaheadOps()} totalLLLook=${parseInfo.getTotalLLLookaheadOps()} llDecisions=${parseInfo.getLLDecisions().length}`,
        );

        for (const { d, ruleName } of topByTime) {
            this.logPerformanceTrace(
                `parse.profile.time uri=${this.sourceUri} decision=${d.decision} rule=${ruleName} timeNs=${d.timeInPrediction} invocations=${d.invocations} llFallback=${d.llFallback} sllLook=${d.sllTotalLook} llLook=${d.llTotalLook} sllMax=${d.sllMaxLook} llMax=${d.llMaxLook}`,
            );
        }

        for (const { d, ruleName } of topByFallback) {
            this.logPerformanceTrace(
                `parse.profile.fallback uri=${this.sourceUri} decision=${d.decision} rule=${ruleName} llFallback=${d.llFallback} invocations=${d.invocations} sllLook=${d.sllTotalLook} llLook=${d.llTotalLook}`,
            );
        }
    }

    private getSourceMetrics(): { chars: number; lines: number } {
        return {
            chars: this.sourceCharCount,
            lines: this.sourceLineCount,
        };
    }

    private getTokenMetrics(): { total: number; onChannel: number } {
        this.tokenStream.fill();
        const tokens = this.tokenStream.getTokens();
        let onChannel = 0;
        for (const token of tokens) {
            if (token.channel === 0) {
                onChannel++;
            }
        }
        return {
            total: tokens.length,
            onChannel,
        };
    }

    private describeTokenForTrace(token: { text?: string | null; line?: number; column?: number; type?: number } | undefined): string {
        if (!token) {
            return 'unknown';
        }
        const rawText = token.text ?? '<no-text>';
        const compactText = rawText.replace(/\s+/g, ' ').slice(0, 40);
        return `line=${token.line ?? -1} col=${token.column ?? -1} type=${token.type ?? -1} text=${JSON.stringify(compactText)}`;
    }

    private getSllFailureDetails(error: unknown): string {
        const cancellation = error as {
            cause?: { offendingToken?: { text?: string | null; line?: number; column?: number; type?: number }; startToken?: { text?: string | null; line?: number; column?: number; type?: number }; message?: string };
            message?: string;
        };
        const cause = cancellation?.cause;
        const token = cause?.offendingToken ?? cause?.startToken;
        const parserToken = this.parser.getCurrentToken();
        const tokenDescription = this.describeTokenForTrace(token ?? parserToken);
        const message = cause?.message ?? cancellation?.message ?? 'ParseCancellationException';
        return `${message}; token=${tokenDescription}`;
    }


    public configureWorkspaceGlobalLookup(
        resolver: (name: string, requesterUri: string) => VariableDeclaration | undefined,
        versionProvider: () => number,
        astProvider?: (decl: VariableDeclaration) => Program | undefined,
        fileInAstProvider?: (sourceUri: string, fileInTarget: string) => Program | undefined,
        completionsProvider?: (requesterUri: string) => VariableDeclaration[],
        declarationUriProvider?: (decl: VariableDeclaration) => string | undefined,
        workspaceAstByUriProvider?: (uri: string) => Program | undefined,
    ): void {
        this.workspaceGlobalResolver = resolver;
        this.workspaceGlobalVersionProvider = versionProvider;
        this.workspaceDeclarationAstProvider = astProvider;
        this.workspaceFileInAstProvider = fileInAstProvider;
        this.workspaceGlobalCompletionsProvider = completionsProvider;
        this.declarationSourceUriProvider = declarationUriProvider;
        this.workspaceAstByUriProvider = workspaceAstByUriProvider;
        this.astQueryService.configure(resolver, versionProvider, astProvider, fileInAstProvider);
    }

    public constructor(uri: string)
    {
        this.sourceUri = uri;
        this.astQueryService = new AstQueryService();
        this.signatureHelpService = new SignatureHelpService();
        this.renameService = new RenameService();
        this.completionService = new CompletionService();
        this.navigationService = new NavigationService();
        this.hoverService = new HoverService();
        this.codeLensService = new CodeLensService();

        // initialize lexer instance with empty string
        this.lexer = new mxsLexer(CharStream.fromString(''));
        this.lexer.removeErrorListeners();
        this.lexer.addErrorListener(this.lexerErrorListener);

        // initialize token stream
        // TODO: this.tokenStream = new multiChannelTokenStream(this.lexer);
        this.tokenStream = new CommonTokenStream(this.lexer);

        // initialize parser instance
        this.parser = new mxsParser(this.tokenStream);
        this.parser.buildParseTrees = true;
        this.parser.removeErrorListeners();
        this.parser.addErrorListener(this.errorListener);

                // initialize symbol table
        this.symbolTable = new ContextSymbolTable(
            this.sourceUri,
            { allowDuplicateSymbols: true },
            this);

        // initialize static global symbol table
        //...
    }

    public getSignatureHelpModel(
        row1Based: number,
        lineBeforeCursor: string,
    ): SignatureHelpModel | undefined {
        return this.signatureHelpService.getSignatureHelpModel(this, row1Based, lineBeforeCursor);
    }

    public prepareAstRename(
        row1Based: number,
        column0Based: number,
        sourceText: string,
    ): RenamePrepareModel | undefined {
        return this.renameService.prepareAstRename(this, row1Based, column0Based, sourceText);
    }

    public buildAstRenameEdits(
        row1Based: number,
        column0Based: number,
        newName: string,
        sourceText: string,
    ): RenameEditModel[] | undefined {
        return this.renameService.buildAstRenameEdits(this, row1Based, column0Based, newName, sourceText);
    }

    public getAstMemberCompletionSuggestions(
        row1Based: number,
        column0Based: number,
        sourceText: string,
    ): CompletionSuggestion[] {
        return this.completionService.getAstMemberSuggestions(this, row1Based, column0Based, sourceText);
    }

    public async getNonMemberCompletionSuggestions(
        requesterUri: string,
        row1Based: number,
        column0Based: number,
        useAst: boolean,
    ): Promise<CompletionSuggestion[]> {
        return this.completionService.getNonMemberSuggestions(
            this,
            requesterUri,
            row1Based,
            column0Based,
            useAst,
        );
    }

    public getWorkspaceGlobalCompletions(requesterUri: string): VariableDeclaration[] {
        return this.workspaceGlobalCompletionsProvider?.(requesterUri) ?? [];
    }

    public getDeclarationSourceUri(declaration: VariableDeclaration): string | undefined {
        return this.declarationSourceUriProvider?.(declaration);
    }

    public getWorkspaceAstForUri(uri: string): Program | undefined {
        return this.workspaceAstByUriProvider?.(uri);
    }

    public getAstDefinitionTarget(
        row1Based: number,
        column0Based: number,
        sourceText: string,
        isCancelled?: () => boolean,
    ): DefinitionTargetModel | undefined {
        return this.navigationService.getDefinitionTarget(this, row1Based, column0Based, sourceText, isCancelled);
    }

    public getAstReferenceLocations(
        row1Based: number,
        column0Based: number,
        includeDeclaration: boolean,
        sourceLineText?: string,
    ): NavigationReferenceModel[] | undefined {
        return this.navigationService.getReferences(this, row1Based, column0Based, includeDeclaration, sourceLineText);
    }

    public getAstDocumentHighlights(
        row1Based: number,
        column0Based: number,
        sourceText: string,
    ): NavigationHighlightModel[] | undefined {
        return this.navigationService.getDocumentHighlights(this, row1Based, column0Based, sourceText);
    }

    public getAstHoverModel(
        row1Based: number,
        column0Based: number,
        sourceText: string,
    ): HoverModel | undefined {
        return this.hoverService.getAstHoverModel(this, row1Based, column0Based, sourceText);
    }

    public getLegacyHoverModel(
        row1Based: number,
        column0Based: number,
    ): HoverModel | undefined {
        return this.hoverService.getLegacyHoverModel(this, row1Based, column0Based);
    }

    public getAstCodeLensAnchors(): CodeLensAnchorModel[] {
        return this.codeLensService.getCodeLensAnchors(this);
    }

    public resolveAstCodeLens(
        declarationLine: number,
        declarationCharacter: number,
    ): CodeLensResolveModel | undefined {
        return this.codeLensService.resolveCodeLens(this, declarationLine, declarationCharacter);
    }

    //----------------------------------------------------------------parser

    // get getTokenStream() { return this.tokenStream; }
    public parse(): void
    {
        const config = workspace.getConfiguration('maxScript');
        const tracePerformance = config.get<boolean>('providers.tracePerformance', false);
        const traceParserDecisions = config.get<boolean>('providers.traceParserDecisions', false);
        const parseStart = tracePerformance ? this.nowMs() : 0;
        const sllStart = tracePerformance ? this.nowMs() : 0;
        const sourceMetrics = this.getSourceMetrics();
        const historicalFallbackRate = this.parseInvocationCount > 0
            ? (this.sllFallbackCount / this.parseInvocationCount)
            : 0;
        const isVeryLargeFile = sourceMetrics.chars >= SourceContext.LARGE_FILE_CHAR_THRESHOLD
            || sourceMetrics.lines >= SourceContext.LARGE_FILE_LINE_THRESHOLD;
        const useLlDirect = isVeryLargeFile && (
            historicalFallbackRate >= 0.8
            || this.parseInvocationCount === 0
        );
        let sllDuration = 0;
        let llDuration = 0;
        let usedLlFallback = false;

        // Clear previous parse results
        this.parseInvocationCount++;
        this.tree = undefined;
        this.ast = undefined;

        this.semanticTokens.length = 0;
        this.diagnostics.length = 0;

        // Mark derived models as dirty instead of rebuilding immediately (lazy loading)
        this.symbolTableDirty = true;
        this.astModelDirty = true;

        // TODO: add Global symbols here
        //this.symbolTable.addDependencies(SourceContext.globalSymbols);
        
        // Two-stage parsing: SLL mode first (fast), then LL mode if needed (accurate)
        // This is the recommended ANTLR approach for best performance + error handling
        
        // STAGE 1: Try SLL prediction mode (faster, but may fail on complex grammar)
        this.lexer.reset();
        this.tokenStream.setTokenSource(this.lexer);
        this.parser.reset();
        this.parser.setProfile(traceParserDecisions);

        if (useLlDirect) {
            this.parser.removeErrorListeners();
            this.parser.addErrorListener(this.errorListener);
            this.parser.errorHandler = new CustomErrorStrategy();
            this.parser.interpreter.predictionMode = PredictionMode.LL;
            const llStart = tracePerformance ? this.nowMs() : 0;
            this.tree = this.parser.program();
            if (tracePerformance) {
                llDuration = this.nowMs() - llStart;
            }
        } else {
            // Remove error listener during SLL pass - we don't want diagnostics from speculative parsing
            this.parser.removeErrorListeners();
            this.parser.errorHandler = new BailErrorStrategy(); // Bail on first error
            this.parser.interpreter.predictionMode = PredictionMode.SLL;

            try {
                this.tree = this.parser.program();
                if (tracePerformance) {
                    sllDuration = this.nowMs() - sllStart;
                }
            } catch (e) {
                if (tracePerformance) {
                    sllDuration = this.nowMs() - sllStart;
                }
                if (e instanceof ParseCancellationException) {
                    usedLlFallback = true;
                    this.sllFallbackCount++;
                    if (tracePerformance) {
                        this.logPerformanceTrace(`parse.sllFallback uri=${this.sourceUri} ${this.getSllFailureDetails(e)}`);
                    }
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
                    const llStart = tracePerformance ? this.nowMs() : 0;
                    this.tree = this.parser.program();
                    if (tracePerformance) {
                        llDuration = this.nowMs() - llStart;
                    }
                } else {
                    // Some other error, re-throw
                    throw e;
                }
            }
        }
        // Symbol table and semantic tokens are now populated lazily when needed
        // This improves parse performance by 20-40% for syntax validation only

        // Invalidate position-query caches now that a new parse snapshot exists.
        this.astQueryService.invalidate();

        if (tracePerformance) {
            const totalDuration = this.nowMs() - parseStart;
            const tokenMetrics = this.getTokenMetrics();
            const fallbackRate = this.parseInvocationCount > 0
                ? ((this.sllFallbackCount / this.parseInvocationCount) * 100)
                : 0;
            this.logPerformanceTrace(
                `parse uri=${this.sourceUri} total=${totalDuration.toFixed(2)}ms sll=${sllDuration.toFixed(2)}ms ll=${llDuration.toFixed(2)}ms fallback=${usedLlFallback} diagnostics=${this.diagnostics.length}`,
            );
            this.logPerformanceTrace(
                `parse.strategy uri=${this.sourceUri} mode=${useLlDirect ? 'LL-direct' : (usedLlFallback ? 'SLL->LL' : 'SLL-only')} historicalFallbackRate=${(historicalFallbackRate * 100).toFixed(1)}%`,
            );
            this.logPerformanceTrace(
                `parse.benchmark uri=${this.sourceUri} chars=${sourceMetrics.chars} lines=${sourceMetrics.lines} tokens=${tokenMetrics.total} onChannelTokens=${tokenMetrics.onChannel} parses=${this.parseInvocationCount} sllFallbacks=${this.sllFallbackCount} fallbackRate=${fallbackRate.toFixed(1)}% diagnostics=${this.diagnostics.length}`,
            );
        }

        if (traceParserDecisions) {
            this.logParserDecisionProfile();
        }
    }

    /**
     * Ensure symbol table is populated. Called lazily before operations that need symbols.
     * @deprecated This is part of the old symbol table pipeline and should be removed in favor of direct AST queries.
     * This defers expensive tree walking until actually needed.
     */
    private ensureSymbolTable(): void {
        if (!this.symbolTableDirty || !this.tree) {
            return;
        }

        // Clear and repopulate symbol table only.
        this.symbolTable.clear();
        
        // Load symbols
        this.symbolTable.tree = this.tree;
        const symbolsListener = new symbolTableListener(this.symbolTable);
        ParseTreeWalker.DEFAULT.walk(symbolsListener, this.tree);

        // TODO: this.info.unreferencedRules = this.symbolTable.getUnreferencedSymbols();
        // TODO: this can be used to add dependencies... imports come from the listener
        // return this.info.imports;
        this.symbolTable.rebuildReferenceIndex();
        
        this.symbolTableDirty = false;
    }

    /**
     * Ensure AST and semantic tokens are populated.
     * This path is independent from the deprecated symbol table pipeline.
     */
    private ensureAstModel(): void
    {
        // return if AST is already built and up-to-date
        if (!this.astModelDirty || !this.tree) {
            return;
        }

        const tracePerformance = this.isPerformanceTraceEnabled();
        const totalStart = tracePerformance ? this.nowMs() : 0;
        let semanticWalkDuration = 0;
        let astBuildDuration = 0;
        let resolveDuration = 0;
        let prewarmDuration = 0;
        let appendSemanticDuration = 0;

        this.semanticTokens.length = 0;
        this.identifierCandidates.clear();

        // Keep existing parse-tree API tokenization (MaxAPI defaults).
        const semanticWalkStart = tracePerformance ? this.nowMs() : 0;
        const semanticListener = new semanticTokenListener(this.semanticTokens, this.identifierCandidates);
        ParseTreeWalker.DEFAULT.walk(semanticListener, this.tree);
        if (tracePerformance) {
            semanticWalkDuration = this.nowMs() - semanticWalkStart;
        }

        // Build AST and resolve references, then append user-code semantic tokens.
        try {
            const astBuildStart = tracePerformance ? this.nowMs() : 0;
            const builder = new ASTBuilder();
            this.ast = builder.visitProgram(this.tree);
            if (tracePerformance) {
                astBuildDuration = this.nowMs() - astBuildStart;
            }

            // 3. Resolve all symbol references
            const resolveStart = tracePerformance ? this.nowMs() : 0;
            const resolver = new SymbolResolver(this.ast); // Takes existing AST
            resolver.resolve(); // MUTATES the AST (no return value)
            if (tracePerformance) {
                resolveDuration = this.nowMs() - resolveStart;
            }

            const prewarmStart = tracePerformance ? this.nowMs() : 0;
            this.navigationService.prewarmIndexes(this.ast);
            if (tracePerformance) {
                prewarmDuration = this.nowMs() - prewarmStart;
            }
            
            // 4. Append semantic tokens for user-defined identifiers based on resolved AST
            const appendSemanticStart = tracePerformance ? this.nowMs() : 0;
            appendAstSemanticTokens(this.ast, this.semanticTokens, this.identifierCandidates);
            if (tracePerformance) {
                appendSemanticDuration = this.nowMs() - appendSemanticStart;
            }
            
        } catch (err) {
            console.error('[language-maxscript][SourceContext] AST build/resolve failed:', err);
            this.ast = undefined;
        }
        this.astModelDirty = false;

        if (tracePerformance) {
            const totalDuration = this.nowMs() - totalStart;
            this.logPerformanceTrace(
                `astModel uri=${this.sourceUri} total=${totalDuration.toFixed(2)}ms semanticWalk=${semanticWalkDuration.toFixed(2)}ms astBuild=${astBuildDuration.toFixed(2)}ms resolve=${resolveDuration.toFixed(2)}ms prewarm=${prewarmDuration.toFixed(2)}ms appendSemantic=${appendSemanticDuration.toFixed(2)}ms`,
            );
        }
    }
    //---------------------------------------------------------------
    // 3. Build hierarchical symbol tree for VS Code
    public buildSymbolTree(trace = false): ISymbolInfo[] {
        const tracePerformance = this.isPerformanceTraceEnabled();
        const totalStart = tracePerformance ? this.nowMs() : 0;
        if (!this.tree) {
            if (trace) console.log('[language-maxscript][SourceContext] buildSymbolTree: no parse tree');
            return [];
        }

        const wasDirty = this.astModelDirty;
        // AST is built lazily in ensureAstModel() during parse-dependent operations.
        this.ensureAstModel();

        if (!this.ast) {
            if (trace) console.log(`[language-maxscript][SourceContext] buildSymbolTree: ast=undefined (wasDirty=${wasDirty})`);
            return [];
        }

        if (trace) {
            console.log(`[language-maxscript][SourceContext] buildSymbolTree: ast ok, stmts=${this.ast.statements.length}, decls=${this.ast.declarations.size}`);
        }

        const symbolTreeStart = tracePerformance ? this.nowMs() : 0;
        const result = SymbolTreeBuilder.buildSymbolTree(this.ast, this.sourceUri);
        if (trace) console.log(`[language-maxscript][SourceContext] buildSymbolTree: result=${result.length}`);
        if (tracePerformance) {
            const symbolTreeDuration = this.nowMs() - symbolTreeStart;
            const totalDuration = this.nowMs() - totalStart;
            this.logPerformanceTrace(
                `symbolTree uri=${this.sourceUri} total=${totalDuration.toFixed(2)}ms query=${symbolTreeDuration.toFixed(2)}ms symbols=${result.length} astWasDirty=${wasDirty}`,
            );
        }
        return result;
    }

    /**
     * Returns the resolved AST for this source context, ensuring it is built first.
     */
    public getResolvedAST(): Program | undefined {
        if (!this.tree) {
            return undefined;
        }
        this.ensureAstModel();
        return this.ast;
    }

    /**
     * Returns the declaration at a source position using the AST query layer.
     * @param row 1-based line number
     * @param column 0-based column number
     */
    public astDeclarationAtPosition(row: number, column: number): VariableDeclaration | undefined
    {
        const ast = this.getResolvedAST();
        if (!ast) {
            return undefined;
        }
        return this.astQueryService.astDeclarationAtPosition(ast, this.sourceUri, row, column);
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


    /**
     * Returns the resolved AST and the visible VariableDeclarations at a cursor position,
     * ordered from innermost scope outward (nearest-first, shadowing respected).
     * Used by CompletionItemProvider to offer locally-scoped symbol completions.
     * @param row 1-based line number
     * @param column 0-based column number
     */
    public astCompletionsAtPosition(
        row: number,
        column: number,
    ): { ast: Program; declarations: VariableDeclaration[] } | undefined {
        const ast = this.getResolvedAST();
        if (!ast) {
            return undefined;
        }
        return this.astQueryService.astCompletionsAtPosition(ast, row, column);
    }

    /**
     * Returns member completions if the cursor is after a dot (member access).
     * For example: `foo.b|` returns members of the struct/definition that foo resolves to.
     * @param row 1-based line number
     * @param column 0-based column number
     * @param source Optional source text (uses last-lexed text if not provided)
     */
    public astMemberCompletionsAtPosition(
        row: number,
        column: number,
        source?: string,
    ): { ast: Program; members: VariableDeclaration[] } | undefined {
        const ast = this.getResolvedAST();
        if (!ast) {
            return undefined;
        }
        const text = source ?? this.lexer.text;
        if (!text) {
            return undefined;
        }
        return this.astQueryService.astMemberCompletionsAtPosition(ast, this.sourceUri, row, column, text);
    }

    //---------------------------------------------------------------

    /**
     * Update the text content of a loaded context.
     * Call this before reparsing or code completion.
     * @param source The document content, or undefined to read from file
     */
    public setText(source: string): void
    {
        this.sourceCharCount = source.length;
        this.sourceLineCount = source.length === 0 ? 0 : source.split(/\r?\n/).length;
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

        let context = TreeQuery.parseTreeFromPosition(this.tree, row, column);

        if (context instanceof TerminalNode) {
            context = context!.parent;
        }

        if (ruleScope) {
            context = context!.parent;
        }

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
    public get getDiagnostics(): IDiagnosticEntry[]
    {
        // this.runSemanticAnalysisIfNeeded();
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
        this.ensureAstModel();
        return this.semanticTokens;
    }
    // -------------------------------------------------format code
    //#region format code
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
            const contextToFormat = TreeQuery.parseTreeContainingRange(<ParseTree>this.tree, range);
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
    //#endregion
    //-------------------------------------------------references

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
}