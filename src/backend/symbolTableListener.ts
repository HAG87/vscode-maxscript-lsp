import
{
    SymbolConstructor,
    BaseSymbol,
    // ScopedSymbol,
    // LiteralSymbol,
    // BlockSymbol,
    // VariableSymbol,
} from "antlr4-c3";
import { ParseTree, TerminalNode } from "antlr4ng";
import { mxsParserListener } from "../parser/mxsParserListener.js";
import
{
    AttributesDefinitionContext,
    DeclarationExpressionContext,
    EventHandlerClauseContext,
    Expr_seqContext,
    Fn_argsContext,
    Fn_paramsContext,
    FnDefinitionContext,
    For_bodyContext,
    FunctionCallContext,
    IdentifierContext,
    Kw_overrideContext,
    MacroscriptDefinitionContext,
    mxsParser,
    ParamContext,
    ParamDefinitionContext,
    ParamsDefinitionContext,
    PathContext,
    PluginDefinitionContext,
    Rc_submenuContext,
    RcmenuControlContext,
    RcmenuDefinitionContext,
    RolloutControlContext,
    RolloutDefinitionContext,
    RolloutGroupContext,
    Struct_memberContext,
    StructDefinitionContext,
    ToolDefinitionContext,
    UtilityDefinitionContext,
    VariableDeclarationContext,
} from "../parser/mxsParser.js";
import
{
    AttributesDefSymbol,
    ContextSymbolTable,
    RolloutControlSymbol,
    EventHandlerClauseSymbol,
    ExprSymbol,
    ExpSeqSymbol,
    fnArgsSymbol,
    FnCallSymbol,
    FnDefinitionSymbol,
    fnParamsSymbol,
    forBodySymbol,
    IdentifierSymbol,
    MacroScriptDefinitionSymbol,
    ParamsDefSymbol,
    ParamSymbol,
    PluginDefinitionSymbol,
    rolloutGroupSymbol,
    StructDefinitionSymbol,
    StructMemberSymbol,
    ToolDefinitionSymbol,
    VariableDeclSymbol,
    RcControlSymbol,
    UtilityDefinitionSymbol,
    RcMenuDefinitionSymbol,
    RolloutDefinitionSymbol,
} from "./ContextSymbolTable.js";

export class symbolTableListener extends mxsParserListener
{
    private symbolStack: BaseSymbol[] = [];
    private scopeStack: BaseSymbol[] = [];

    public constructor(private symbolTable: ContextSymbolTable)
    {
        super();
    }
    //-------------------------------------------------------------------------
    private currentSymbol<T extends BaseSymbol>(): T | undefined
    {
        if (this.symbolStack.length === 0) {
            return undefined;
        }

        return this.symbolStack[this.symbolStack.length - 1] as T;
    }

    /**
     * Adds a new symbol to the current symbol TOS.
     *
     * @param type The type of the symbol to add.
     * @param context The symbol's parse tree, to allow locating it.
     * @param args The actual arguments for the new symbol.
     *
     * @returns The new symbol.
     */
    private addNewSymbol<T extends BaseSymbol>(type: new (...args: any[]) => T, context: ParseTree,
        ...args: any[]): T
    {
        const symbol = this.symbolTable.addNewSymbolOfType(type, this.currentSymbol(), ...args);
        symbol.context = context;
        if (this.scopeStack.length > 0 && symbol instanceof ExprSymbol) {
            (symbol as ExprSymbol).scope = [...this.scopeStack];
        }
        return symbol;
    }

    /**
    * Creates a new symbol and starts a new scope with it on the symbol stack.
    *
    * @param type The type of the symbol to add.
    * @param context The symbol's parse tree, to allow locating it.
    * @param args The actual arguments for the new symbol.
    *
    * @returns The new scoped symbol.
    */
    private pushNewSymbol<T extends BaseSymbol, Args extends unknown[]>(type: SymbolConstructor<T, Args>,
        context: ParseTree, ...args: Args): BaseSymbol
    {
        const symbol = this.symbolTable.addNewSymbolOfType<T, Args>(type, this.currentSymbol(), ...args);
        symbol.context = context;
        if (this.scopeStack.length > 0 && symbol instanceof ExprSymbol) {
            (symbol as ExprSymbol).scope = [...this.scopeStack];
        }
        this.symbolStack.push(symbol);
        return symbol;
    }

    private popSymbol(): BaseSymbol | undefined
    {
        return this.symbolStack.pop();
    }

    private pushScope(symbol: BaseSymbol): void
    {
        this.scopeStack.push(symbol);
        if (symbol instanceof ExprSymbol) {
            (symbol as ExprSymbol).scope = [...this.scopeStack];
        }
    }

    private popScope(): void
    {
        this.scopeStack.pop();
    }

    /**
     * The symbol stack usually contains entries beginning with a rule context, followed by a number of blocks and alts
     * as well as additional parts like actions or predicates.
     * This function returns the name of the first symbol, which represents the rule (parser/lexer) which we are
     * currently walking over.
     *
     * @returns The rule name from the start symbol.
     */
    private get ruleName(): string
    {
        return this.symbolStack.length === 0 ? "" : this.symbolStack[0].name;
    }

    //====================================LISTENERS=======================================//
    /*
    public override enterExpr = (ctx: ExprContext): void => {
        this.pushNewSymbol(ExpSeqSymbol, ctx, ctx.ruleIndex.toString());
    }
    public override exitExpr = (ctx: ExprContext): void => {
        this.popSymbol();
    }
    // */
    // Plugin
    // /*
    public override enterPluginDefinition = (ctx: PluginDefinitionContext): void =>
    {
        this.pushScope(
            this.pushNewSymbol(PluginDefinitionSymbol, ctx, ctx._plugin_name?.getText())
        );
    }
    public override exitPluginDefinition = (ctx: PluginDefinitionContext): void =>
    {
        this.popScope();
        this.popSymbol();
    }
    // MacroScript
    public override enterMacroscriptDefinition = (ctx: MacroscriptDefinitionContext): void =>
    {
        this.pushScope(
            this.pushNewSymbol(MacroScriptDefinitionSymbol, ctx, ctx._macro_name?.getText())
        );
    }
    public override exitMacroscriptDefinition = (ctx: MacroscriptDefinitionContext): void =>
    {
        this.popScope();
        this.popSymbol();
    }
    // Tool
    public override enterToolDefinition = (ctx: ToolDefinitionContext): void =>
    {
        this.pushScope(
            this.pushNewSymbol(ToolDefinitionSymbol, ctx, ctx._tool_name?.getText())
        );
    }
    public override exitToolDefinition = (ctx: ToolDefinitionContext): void =>
    {
        this.popScope();
        this.popSymbol();
    }
    // Rollout
    public override enterRolloutDefinition = (ctx: RolloutDefinitionContext): void =>
    {
        this.pushScope(
            this.pushNewSymbol(RolloutDefinitionSymbol, ctx, ctx._rollout_name?.getText())
        );
    }
    public override enterRolloutControl = (ctx: RolloutControlContext): void =>
    {
        this.pushNewSymbol(RolloutControlSymbol, ctx,
            ctx._controlName?.getText(),
            ctx.rolloutControlType().getText()
        );
    }
    public override exitRolloutControl = (ctx: RolloutControlContext): void => { this.popSymbol() }

    // public override enterRolloutControlType = (ctx: RolloutControlTypeContext):void => {}

    public override enterRolloutGroup = (ctx: RolloutGroupContext): void =>
    {
        this.pushNewSymbol(rolloutGroupSymbol, ctx, ctx._group_name?.text!);
    }
    public override exitRolloutGroup = (ctx: RolloutGroupContext): void => { this.popSymbol() }

    public override exitRolloutDefinition = (ctx: RolloutDefinitionContext): void =>
    {
        this.popScope();
        this.popSymbol();
    }
    // Utility
    public override enterUtilityDefinition = (ctx: UtilityDefinitionContext): void =>
    {
        this.pushScope(
            this.pushNewSymbol(UtilityDefinitionSymbol, ctx, ctx._utility_name?.getText())
        );
    }
    public override exitUtilityDefinition = (ctx: UtilityDefinitionContext): void =>
    {
        this.popScope();
        this.popSymbol();
    }
    // RC menu
    public override enterRcmenuDefinition = (ctx: RcmenuDefinitionContext): void =>
    {
        this.pushScope(
            this.pushNewSymbol(RcMenuDefinitionSymbol, ctx, ctx._rc_name?.getText())
        );
    }
    public override enterRc_submenu = (ctx: Rc_submenuContext): void =>
    {
        this.pushNewSymbol(AttributesDefSymbol, ctx, ctx._submenu_name?.text!);
    }
    public override exitRc_submenu = (ctx: Rc_submenuContext): void => { this.popSymbol(); }

    public override enterRcmenuControl = (ctx: RcmenuControlContext): void =>
    {
        const id = ctx.operand()?.[0].getText() ?? ctx.identifier()?.getText();
        this.pushNewSymbol(
            RcControlSymbol, ctx, id,
            ctx.MenuItem()?.getText() ?? ctx.Separator()?.getText()
        );
    }
    public override exitRcmenuControl = (ctx: RcmenuControlContext): void => { this.popSymbol(); }

    public override exitRcmenuDefinition = (ctx: RcmenuDefinitionContext): void =>
    {
        this.popScope();
        this.popSymbol();
    }
    //attributes - scope
    public override enterAttributesDefinition = (ctx: AttributesDefinitionContext): void =>
    {
        this.pushScope(
            this.pushNewSymbol(AttributesDefSymbol, ctx, ctx.identifier().getText())
        );
    }
    public override exitAttributesDefinition = (ctx: AttributesDefinitionContext): void =>
    {
        this.popScope();
        this.popSymbol();
    }
    // params
    public override enterParamsDefinition = (ctx: ParamsDefinitionContext): void =>
    {
        this.pushScope(
            this.pushNewSymbol(ParamsDefSymbol, ctx, ctx.identifier().getText())
        );
    }
    public override exitParamsDefinition = (ctx: ParamsDefinitionContext): void =>
    {
        this.popScope();
        this.popSymbol();
    }
    public override enterParamDefinition = (ctx: ParamDefinitionContext): void =>
    {
        this.pushNewSymbol(ParamsDefSymbol, ctx, ctx.identifier().getText())
    }
    public override exitParamDefinition = (ctx: ParamDefinitionContext): void => { this.popSymbol(); }
    // */
    // struct definition
    public override enterStructDefinition = (ctx: StructDefinitionContext): void =>
    {
        this.pushScope(
            this.pushNewSymbol(StructDefinitionSymbol, ctx, ctx._str_name?.getText())
        );
    }
    public override exitStructDefinition = (ctx: StructDefinitionContext): void =>
    {
        this.popScope();
        this.popSymbol();
    }

    public override enterStruct_member = (ctx: Struct_memberContext): void =>
    {
        /*
        if (ctx.children.length > 0) {
            const rule = ctx.children[0] as ParserRuleContext
            if (rule.ruleIndex === mxsParser.RULE_identifier) { }
        }
        */
        this.pushNewSymbol(StructMemberSymbol, ctx, ctx.identifier().getText());
    }
    public override exitStruct_member = (ctx: Struct_memberContext): void => { this.popSymbol(); }

    // event clause
    public override enterEventHandlerClause = (ctx: EventHandlerClauseContext): void =>
    {
        this.pushNewSymbol(EventHandlerClauseSymbol, ctx, ctx._ev_args?._ev_type?.getText());
    }
    public override exitEventHandlerClause = (ctx: EventHandlerClauseContext): void => { this.popSymbol(); }

    // fn defintition
    public override enterFnDefinition = (ctx: FnDefinitionContext): void =>
    {
        this.pushScope(
            this.pushNewSymbol(FnDefinitionSymbol, ctx, ctx._fn_name?.getText())
        );
    }
    public override exitFnDefinition = (ctx: FnDefinitionContext): void =>
    {
        this.popScope();
        this.popSymbol();
    }
    public override enterFn_args = (ctx: Fn_argsContext): void => 
    {
        this.pushNewSymbol(fnArgsSymbol, ctx, ctx.identifier().ids().getText());
    }
    public override exitFn_args = (ctx: Fn_argsContext): void => { this.popSymbol(); }

    public override enterFn_params = (ctx: Fn_paramsContext): void =>
    {
        // this is a workaround for param: without assignment
        this.pushNewSymbol(fnParamsSymbol, ctx, ctx.identifier()?.ids().getText() || ctx.kw_override()?.getText());
    }
    public override exitFn_params = (ctx: Fn_paramsContext): void => { this.popSymbol(); }

    // public override enterParam_name = (ctx: Param_nameContext): void => { this.pushNewSymbol(ParamSymbol, ctx, ctx.getText()); }
    // public override exitParam_name = (ctx: Param_nameContext): void => { this.popSymbol(); }

    // public override enterDeclarationExpression = (ctx: DeclarationExpressionContext): void => { }
    // public override exitDeclarationExpression = (ctx: DeclarationExpressionContext): void => { }

    public override enterVariableDeclaration = (ctx: VariableDeclarationContext): void =>
    {
        /*
        // AssignmentContext.enterVariableDeclaration
        let name = ctx.children[0] instanceof AssignmentExpressionContext
            ? ctx.children[0]._left?.getText()
            : ctx.children[0].getText()

        this.pushNewSymbol(VariableDeclSymbol, ctx, name);
        */
        const symbol = this.pushNewSymbol(VariableDeclSymbol, ctx, ctx.identifier().getText());
        this.pushScope(symbol);

        if (ctx.parent && ctx.parent.ruleIndex === mxsParser.RULE_declarationExpression) {
            const decl = (ctx.parent as DeclarationExpressionContext)._scope?.getText().toLowerCase() || 'local';
            (symbol as VariableDeclSymbol).declarationScope = decl;
        }
    }

    public override exitVariableDeclaration = (ctx: VariableDeclarationContext): void =>
    {
        this.popScope();
        this.popSymbol();
    }
    //-------------------------------------------------------------
    // /*
    public override enterExpr_seq = (ctx: Expr_seqContext): void =>
    {
        this.pushScope(
            this.pushNewSymbol(ExpSeqSymbol, ctx, ctx.ruleIndex.toString())
        );
    }

    public override exitExpr_seq = (ctx: Expr_seqContext): void =>
    {
        this.popScope();
        this.popSymbol();
    }
    // */
    //-------------------------------------------------------------
    // for loop
    public override enterFor_body = (ctx: For_bodyContext): void =>
    {
        const symbol = this.pushNewSymbol(forBodySymbol, ctx, ctx.getText());
        this.pushScope(symbol);
    }
    public override exitFor_body = (ctx: For_bodyContext): void =>
    {
        this.popScope();
        this.popSymbol();
    }

    // public override enterForLoopExpression = (ctx: ForLoopExpressionContext): void => { this.pushNewSymbol(forLoopExpressionSymbol, ctx)}
    // public override exitForLoopExpression = (ctx: ForLoopExpressionContext): void => {this.popSymbol()}
    // public override enterLoopExitStatement = (ctx: LoopExitStatementContext): void => {this.pushNewSymbol(loopExitStatementSymbol, ctx)}
    // public override exitLoopExitStatement = (ctx: LoopExitStatementContext): void => {this.popSymbol()}

    // function call
    public override enterFunctionCall = (ctx: FunctionCallContext): void => 
    {
        this.pushNewSymbol(FnCallSymbol, ctx, ctx._caller?.getText());
    }
    public override exitFunctionCall = (ctx: FunctionCallContext): void => { this.popSymbol(); }
    // params
    public override enterParam = (ctx: ParamContext): void =>
    {
        this.pushNewSymbol(ParamSymbol, ctx);
    }
    public override exitParam = (ctx: ParamContext): void => { this.popSymbol(); }


    /*
    public override enterAssignmentExpression = (ctx: AssignmentExpressionContext): void =>
    {
        // this.pushNewSymbol(AssignmentExpressionSymbol, ctx, ctx._left?.getText());
        this.pushNewSymbol(AssignmentExpressionSymbol, ctx, ctx.destination().getText());
    }
    public override exitAssignmentExpression = (ctx: AssignmentExpressionContext): void => { this.popSymbol(); }
    */
    /*
    public override enterAssignment = (ctx: AssignmentContext): void => { this.pushNewSymbol(AssignmentSymbol, ctx); }
    public override exitAssignment = (ctx: AssignmentContext): void => { this.popSymbol(); }
    //*/
    /*
    public override exitExprOperand = (ctx: ExprOperandContext): void =>
    {
        const expr_operand = ctx.expr_operand()
        const op = expr_operand.operand()
        if (op) {
            const id = op.factor()?.identifier()
            if (id) {
                this.addNewSymbol(IdentifierSymbol, id, id.getText());
            }
        }
    }
    public override exitExpr_operand = (ctx: Expr_operandContext): void => { this.popSymbol(); }

    public override exitFactor = (ctx: FactorContext): void =>
    {
        if (ctx.identifier()) { this.addNewSymbol(IdentifierSymbol, ctx, ctx.getText()); }
    }
    // */

    // Identifiers
    public override exitIdentifier = (ctx: IdentifierContext): void =>
    {
        // IF I emmit an identifier here, but also use the current enterVariableDeclaration, I will have duplicated symbols
        // Use operand or factor instead, for now.
        this.addNewSymbol(IdentifierSymbol, ctx, ctx.ids().getText());
    }
    public override exitPath = (ctx: PathContext): void =>
    {
        // emiting an identifier here
        this.addNewSymbol(IdentifierSymbol, ctx, ctx.getText());
    }
    public override enterKw_override = (ctx: Kw_overrideContext): void =>
    {
        this.addNewSymbol(IdentifierSymbol, ctx, ctx.getText());
    }

    // by-ref: emmiting an identifier token here...
    // public override exitBy_ref = (ctx: By_refContext): void => { this.addNewSymbol(IdentifierSymbol, ctx, ctx.ids()?.getText() ?? ctx.path()?.getText()); }

    public override visitTerminal = (node: TerminalNode): void =>
    {
        /*
        switch (node.symbol.type) {
            case mxsLexer.PATH:
                this.addNewSymbol(IdentifierSymbol,node, node.getText())
            break;
            //operators
            //...
        }
        */
    }
}