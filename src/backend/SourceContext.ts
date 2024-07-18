import { DocumentSymbol, Uri, workspace } from "vscode";

// One context for each valid document
export class SourceContext {
    sourceUri: Uri;
    // symbols for the current document
    // document uri?
    // symbolTable: string;
    // semantic tokens... so on
    // could be useful to store te token stream...

    private tree: undefined;

    public constructor(uri: Uri, /*settings*/) {
        this.sourceUri = uri;
        // initialize lexer instance with empty string
        // initialize parer instance
    }

    public getDocumentText(): Promise<string> {
        return new Promise((resolve) =>{
            workspace.openTextDocument(this.sourceUri).then((document) => {
                resolve(document.getText());
            })
        });
    }

    public setText(source?: string): void {
        if (source) {
            // this.lexer.inputStream = CharStream.fromString(source);
            //...
            return;
        }
        this.getDocumentText().then((source) =>
        {
             // this.lexer.inputStream = CharStream.fromString(source);
             //...
        });
    }

    public parse(): void {
        this.tree = undefined;
        /*
        // Rewind the input stream for a new parse run.
        this.lexer.reset();
        this.tokenStream.setTokenSource(this.lexer);

        this.parser.reset();
        this.parser.errorHandler = new BailErrorStrategy();
        this.parser.interpreter.predictionMode = PredictionMode.SLL;

        this.tree = undefined;

       
        this.info.imports.length = 0;

        this.grammarLexerData = undefined;
        this.grammarLexerRuleMap.clear();
        this.grammarParserData = undefined;
        this.grammarLexerRuleMap.clear();

        this.semanticAnalysisDone = false;
        this.diagnostics.length = 0;

        this.symbolTable.clear();
        this.symbolTable.addDependencies(SourceContext.globalSymbols);

        try {
            this.tree = this.parser.grammarSpec();
        } catch (e) {
            if (e instanceof ParseCancellationException) {
                this.lexer.reset();
                this.tokenStream.setTokenSource(this.lexer);
                this.parser.reset();
                this.parser.errorHandler = new DefaultErrorStrategy();
                this.parser.interpreter.predictionMode = PredictionMode.LL;
                this.tree = this.parser.grammarSpec();
            } else {
                throw e;
            }
        }



        this.symbolTable.tree = this.tree;
        const listener = new DetailsListener(this.symbolTable, this.info.imports);
        ParseTreeWalker.DEFAULT.walk(listener, this.tree);

        this.info.unreferencedRules = this.symbolTable.getUnreferencedSymbols();

        return this.info.imports;
        */

    }
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

    public getReferenceCount() {
        /*
        this.runSemanticAnalysisIfNeeded();

        let result = this.symbolTable.getReferenceCount(symbol);

        for (const reference of this.references) {
            result += reference.getReferenceCount(symbol);
        }

        return result;
        */
    }
    /*
    public addAsReferenceTo(context: SourceContext): void {
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
    public removeDependency(context: SourceContext): void {
        /*
        const index = context.references.indexOf(this);
        if (index > -1) {
            context.references.splice(index, 1);
        }
        this.symbolTable.removeDependency(context.symbolTable);
        */
    }

    // SYMBOLS
    public async getAllSymbols() {
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
    }
    public getSymbolInfo() {}
    public resolveSymbol() {}

    public listTopLevelSymbols(): DocumentSymbol[] | undefined
    {
        return undefined;
    }

    public symbolInfoAtPosition(line:number, character: number, limitToChildren = true): DocumentSymbol[] | undefined
    {
        /*
        if (!this.tree) {
            return undefined;
        }

        const terminal = BackendUtils.parseTreeFromPosition(this.tree, column, row);
        if (!terminal || !(terminal instanceof TerminalNode)) {
            return undefined;
        }

        // If limitToChildren is set we only want to show info for symbols in specific contexts.
        // These are contexts which are used as subrules in rule definitions.
        if (!limitToChildren) {
            return this.getSymbolInfo(terminal.getText());
        }

        let parent = (terminal.parent as ParserRuleContext);
        if (parent.ruleIndex === ANTLRv4Parser.RULE_identifier) {
            parent = (parent.parent as ParserRuleContext);
        }

        switch (parent.ruleIndex) {
            case ANTLRv4Parser.RULE_ruleref:
            case ANTLRv4Parser.RULE_terminalDef: {
                let symbol = this.symbolTable.symbolContainingContext(terminal);
                if (symbol) {
                    // This is only the reference to a symbol. See if that symbol exists actually.
                    symbol = this.resolveSymbol(symbol.name);
                    if (symbol) {
                        return this.getSymbolInfo(symbol);
                    }
                }

                break;
            }

            case ANTLRv4Parser.RULE_actionBlock:
            case ANTLRv4Parser.RULE_ruleAction:
            case ANTLRv4Parser.RULE_lexerCommandExpr:
            case ANTLRv4Parser.RULE_optionValue:
            case ANTLRv4Parser.RULE_delegateGrammar:
            case ANTLRv4Parser.RULE_modeSpec:
            case ANTLRv4Parser.RULE_setElement: {
                const symbol = this.symbolTable.symbolContainingContext(terminal);
                if (symbol) {
                    return this.getSymbolInfo(symbol);
                }

                break;
            }

            case ANTLRv4Parser.RULE_lexerCommand:
            case ANTLRv4Parser.RULE_lexerCommandName: {
                const symbol = this.symbolTable.symbolContainingContext(terminal);
                if (symbol) {
                    return this.getSymbolInfo(symbol);
                }

                break;
            }

            default: {
                break;
            }
        }

        return undefined;
        */
        //...
        return undefined;
    }
    /*
    public enclosingSymbolAtPosition(column: number, row: number, ruleScope: boolean): ISymbolInfo | undefined {
        if (!this.tree) {
            return undefined;
        }

        let context = BackendUtils.parseTreeFromPosition(this.tree, column, row);
        if (!context) {
            return undefined;
        }

        if (context instanceof TerminalNode) {
            context = context.parent;
        }

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

        if (context) {
            const symbol = this.symbolTable.symbolWithContextSync(context);
            if (symbol) {
                return this.symbolTable.getSymbolInfo(symbol);
            }
        }

        return undefined;
    }
    */
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
    public getDiagnostics() {
        /*
        : IDiagnosticEntry[] {
        this.runSemanticAnalysisIfNeeded();
        return this.diagnostics;
        */
    }
    // semantic analysis
    // references
    // dependencies
    // format
    public formatCode() {}
    public formatCodeRange() {}    
    // minify
    public minifyCode() {}
    //...
}