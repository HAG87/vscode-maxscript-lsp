import { BaseSymbol, SymbolConstructor } from 'antlr4-c3';
import { ParseTree, TerminalNode } from 'antlr4ng';

import {
  AccessorContext, AttributesDefinitionContext, DeclarationExpressionContext,
  EventHandlerClauseContext, Expr_seqContext, Fn_argsContext, Fn_paramsContext,
  FnDefinitionContext, For_bodyContext, FunctionCallContext, IdentifierContext,
  IndexContext, Kw_overrideContext, MacroscriptDefinitionContext, mxsParser,
  ParamContext, ParamDefinitionContext, ParamsDefinitionContext, PathContext,
  PluginDefinitionContext, PropertyContext, Rc_submenuContext,
  RcmenuControlContext, RcmenuDefinitionContext, RolloutControlContext,
  RolloutDefinitionContext, RolloutGroupContext, Struct_memberContext,
  StructDefinitionContext, ToolDefinitionContext, UtilityDefinitionContext,
  VariableDeclarationContext,
} from '../parser/mxsParser.js';
import { mxsParserListener } from '../parser/mxsParserListener.js';
import {
  AttributesDefSymbol, ContextSymbolTable, EventHandlerClauseSymbol, ExprSymbol,
  ExpSeqSymbol, fnArgsSymbol, FnCallSymbol, FnDefinitionSymbol,
  fnParamsSymbol, ForBodySymbol, IdentifierSymbol, MacroScriptDefinitionSymbol,
  ParamsDefSymbol, ParamSymbol, PluginDefinitionSymbol, PropertyAccessSymbol,
  RcControlSymbol, RcMenuDefinitionSymbol, RolloutControlSymbol,
  RolloutDefinitionSymbol, rolloutGroupSymbol, StructDefinitionSymbol,
  StructMemberSymbol, ToolDefinitionSymbol, UtilityDefinitionSymbol,
  VariableDeclSymbol,
} from './ContextSymbolTable.js';

export class symbolTableListener extends mxsParserListener
{
    private symbolStack: BaseSymbol[] = [];
    // private scopeStack: BaseSymbol[] = [];

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
        /*
        if (this.scopeStack.length > 0 && symbol instanceof ExprSymbol) {
            (symbol as ExprSymbol).scope = [...this.scopeStack];
        }
        */
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
        /*
        if (this.scopeStack.length > 0 && symbol instanceof ExprSymbol) {
            (symbol as ExprSymbol).scope = [...this.scopeStack];
        }
        */
        this.symbolStack.push(symbol);
        return symbol;
    }

    private popSymbol(): BaseSymbol | undefined
    {
        return this.symbolStack.pop();
    }
    /*
    private pushScope(symbol: BaseSymbol): void
    {
        this.scopeStack.push(symbol);
        if (symbol instanceof ExprSymbol) {
            (symbol as ExprSymbol).scope = [...this.scopeStack];
        }
    }
    private popScope(): void { this.scopeStack.pop(); }
    */

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
    public override enterPluginDefinition = (ctx: PluginDefinitionContext): void =>
    {
        this.pushNewSymbol(PluginDefinitionSymbol, ctx, ctx.plugin_predicate()._plugin_name?.getText())
        // this.pushScope( this.pushNewSymbol(PluginDefinitionSymbol, ctx, ctx.plugin_predicate()._plugin_name?.getText()) );
    }
    public override exitPluginDefinition = (ctx: PluginDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // MacroScript
    public override enterMacroscriptDefinition = (ctx: MacroscriptDefinitionContext): void =>
    {
        this.pushNewSymbol(MacroScriptDefinitionSymbol, ctx, ctx.macroscript_predicate()._macro_name?.getText())
        // this.pushScope( this.pushNewSymbol(MacroScriptDefinitionSymbol, ctx, ctx.macroscript_predicate()._macro_name?.getText()) );
    }
    public override exitMacroscriptDefinition = (ctx: MacroscriptDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // Tool
    public override enterToolDefinition = (ctx: ToolDefinitionContext): void =>
    {
        this.pushNewSymbol(ToolDefinitionSymbol, ctx, ctx.tool_predicate()._tool_name?.getText())
        // this.pushScope( this.pushNewSymbol(ToolDefinitionSymbol, ctx, ctx.tool_predicate()._tool_name?.getText()) );
    }
    public override exitToolDefinition = (ctx: ToolDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // Rollout
    public override enterRolloutDefinition = (ctx: RolloutDefinitionContext): void =>
    {
        this.pushNewSymbol(RolloutDefinitionSymbol, ctx, ctx.rollout_predicate()._rollout_name?.getText())
        // this.pushScope( this.pushNewSymbol(RolloutDefinitionSymbol, ctx, ctx.rollout_predicate()._rollout_name?.getText()) );
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
        this.pushNewSymbol(rolloutGroupSymbol, ctx, ctx.group_predicate()._group_name?.text);
    }
    public override exitRolloutGroup = (ctx: RolloutGroupContext): void => { this.popSymbol() }

    public override exitRolloutDefinition = (ctx: RolloutDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // Utility
    public override enterUtilityDefinition = (ctx: UtilityDefinitionContext): void =>
    {
        this.pushNewSymbol(UtilityDefinitionSymbol, ctx, ctx.utility_predicate()._utility_name?.getText())
        // this.pushScope( this.pushNewSymbol(UtilityDefinitionSymbol, ctx, ctx.utility_predicate()._utility_name?.getText()) );
    }
    public override exitUtilityDefinition = (ctx: UtilityDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // RC menu
    public override enterRcmenuDefinition = (ctx: RcmenuDefinitionContext): void =>
    {
        this.pushNewSymbol(RcMenuDefinitionSymbol, ctx, ctx.rcmenu_predicate()._rc_name?.getText())
        // this.pushScope( this.pushNewSymbol(RcMenuDefinitionSymbol, ctx, ctx.rcmenu_predicate()._rc_name?.getText()) );
    }
    public override enterRc_submenu = (ctx: Rc_submenuContext): void =>
    {
        this.pushNewSymbol(AttributesDefSymbol, ctx, ctx.submenu_predicate()._submenu_name?.text);
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
        this.popSymbol();
        // this.popScope();
    }
    //attributes - scope
    public override enterAttributesDefinition = (ctx: AttributesDefinitionContext): void =>
    {
        this.pushNewSymbol(AttributesDefSymbol, ctx, ctx.attributes_predicate().identifier().getText())
        // this.pushScope( this.pushNewSymbol(AttributesDefSymbol, ctx, ctx.attributes_predicate().identifier().getText()) );
    }
    public override exitAttributesDefinition = (ctx: AttributesDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // params
    public override enterParamsDefinition = (ctx: ParamsDefinitionContext): void =>
    {
        this.pushNewSymbol(ParamsDefSymbol, ctx, ctx.params_predicate().identifier().getText())
        // this.pushScope( this.pushNewSymbol(ParamsDefSymbol, ctx, ctx.params_predicate().identifier().getText()) );
    }
    public override exitParamsDefinition = (ctx: ParamsDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    public override enterParamDefinition = (ctx: ParamDefinitionContext): void =>
    {
        this.pushNewSymbol(ParamsDefSymbol, ctx, ctx.identifier().getText())
    }
    public override exitParamDefinition = (ctx: ParamDefinitionContext): void => { this.popSymbol(); }
    // when statement
    /*
    public override enterWhenStatement = (ctx: WhenStatementContext): void =>
    {
        this.pushNewSymbol(whenStatementSymbol, ctx)
    }
    public override exitWhenStatement = (ctx: WhenStatementContext): void => { this.popSymbol(); }
    // */
    // struct definition
    public override enterStructDefinition = (ctx: StructDefinitionContext): void =>
    {
        this.pushNewSymbol(StructDefinitionSymbol, ctx, ctx._str_name?.getText())
        // this.pushScope( this.pushNewSymbol(StructDefinitionSymbol, ctx, ctx._str_name?.getText()) );
    }
    public override exitStructDefinition = (ctx: StructDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }

    public override enterStruct_member = (ctx: Struct_memberContext): void =>
    {
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
        this.pushNewSymbol(FnDefinitionSymbol, ctx, ctx._fn_name?.getText())
        // this.pushScope( this.pushNewSymbol(FnDefinitionSymbol, ctx, ctx._fn_name?.getText()) );
    }
    public override exitFnDefinition = (ctx: FnDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
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
        // this.pushScope(symbol);

        if (ctx.parent && ctx.parent.ruleIndex === mxsParser.RULE_declarationExpression) {
            const decl = (ctx.parent as DeclarationExpressionContext)._scope?.getText().toLowerCase() || 'local';
            (symbol as VariableDeclSymbol).declarationScope = decl;
        }
    }

    public override exitVariableDeclaration = (ctx: VariableDeclarationContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    //-------------------------------------------------------------
    // /*
    public override enterExpr_seq = (ctx: Expr_seqContext): void =>
    {
        this.pushNewSymbol(ExpSeqSymbol, ctx, ctx.ruleIndex.toString())
        // this.pushScope( this.pushNewSymbol(ExpSeqSymbol, ctx, ctx.ruleIndex.toString()) );
    }

    public override exitExpr_seq = (ctx: Expr_seqContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // */
    //-------------------------------------------------------------
    // for loop
    public override enterFor_body = (ctx: For_bodyContext): void =>
    {
        this.pushNewSymbol(ForBodySymbol, ctx, ctx.getText());
        // this.pushScope(this.pushNewSymbol(ForBodySymbol, ctx, ctx.getText()););
    }
    public override exitFor_body = (ctx: For_bodyContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }

    // public override enterForLoopExpression = (ctx: ForLoopExpressionContext): void => { this.pushNewSymbol(forLoopExpressionSymbol, ctx)}
    // public override exitForLoopExpression = (ctx: ForLoopExpressionContext): void => {this.popSymbol()}
    // public override enterLoopExitStatement = (ctx: LoopExitStatementContext): void => {this.pushNewSymbol(loopExitStatementSymbol, ctx)}
    // public override exitLoopExitStatement = (ctx: LoopExitStatementContext): void => {this.popSymbol()}

    // function call
    public override enterFunctionCall = (ctx: FunctionCallContext): void => 
    {
        //TODO: get caller definition...
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
    //TODO: references...
    public override enterAccessor = (ctx: AccessorContext): void =>
    {
        const factor = ctx.factor()
        const id = factor.identifier()
        if (id) {
            //...
        }
        this.pushNewSymbol(AccesorSymbol, ctx, ctx.factor())
    }
    public override exitAccessor = (ctx: AccessorContext): void => { this.popSymbol(); }
    */
    public override enterProperty = (ctx: PropertyContext): void =>
    {
        this.pushNewSymbol(PropertyAccessSymbol, ctx, ctx.identifier()!.getText())
    }
    public override exitProperty = (ctx: PropertyContext): void => { this.popSymbol(); }
    /*
    // public override enterIndex = (ctx: IndexContext): void => { this.pushNewSymbol(PropertyAccessSymbol, ctx) }
    // public override exitIndex = (ctx: IndexContext): void => { this.popSymbol(); }
    // */
    /*
    public override enterAssignmentExpression = (ctx: AssignmentExpressionContext): void =>
    {
        // this.pushNewSymbol(AssignmentExpressionSymbol, ctx, ctx._left?.getText());
        this.pushNewSymbol(AssignmentExpressionSymbol, ctx, ctx.destination().getText());
    }
    public override exitAssignmentExpression = (ctx: AssignmentExpressionContext): void => { this.popSymbol(); }
    // */

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

    /*
    public override visitTerminal = (node: TerminalNode): void =>
    {
        switch (node.symbol.type) {
            case mxsLexer.PATH:
                this.addNewSymbol(IdentifierSymbol,node, node.getText())
            break;
            //operators
            //...
        }
    }
    */
}