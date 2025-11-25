import { BaseSymbol, SymbolConstructor } from 'antlr4-c3';
import { ParseTree, TerminalNode } from 'antlr4ng';

import {
  AccessorContext, AttributesDefinitionContext, DeclarationStatementContext,
  EventHandlerStatementContext, Expr_seqContext, Fn_argsContext, Fn_paramsContext,
  FnDefinitionContext, For_bodyContext, FunctionCallContext, IdentifierContext,
  IndexContext, Kw_overrideContext, MacroscriptDefinitionContext, mxsParser,
  ParamContext, ParamDefinitionContext, ParamsDefinitionContext, PathContext,
  PluginDefinitionContext, PropertyContext, Rc_submenudefinitionContext,
  RcmenuControlContext, RcmenuDefinitionContext, ReferenceContext, RolloutControlContext,
  RolloutDefinitionContext, RolloutGroupDefinitionContext, Struct_memberContext,
  StructDefinitionContext, ToolDefinitionContext, UtilityDefinitionContext,
  VariableDeclarationContext,
} from '../parser/mxsParser.js';
import { mxsParserListener } from '../parser/mxsParserListener.js';
import {
  AttributesDefSymbol, EventHandlerStatementSymbol, ExprSymbol,
  ExpSeqSymbol, fnArgsSymbol, FnCallSymbol, FnDefinitionSymbol,
  fnParamsSymbol, ForBodySymbol, IdentifierSymbol, MacroScriptDefinitionSymbol,
  ParamsDefSymbol, ParamSymbol, PluginDefinitionSymbol, PropertyAccessSymbol,
  RcControlSymbol, RcMenuDefinitionSymbol, RolloutControlSymbol,
  RolloutDefinitionSymbol, rolloutGroupDefinitionSymbol, StructDefinitionSymbol,
  StructMemberSymbol, ToolDefinitionSymbol, UtilityDefinitionSymbol,
  VariableDeclSymbol,
} from './symbols/symbolTypes.js';
import { ContextSymbolTable } from './ContextSymbolTable.js';

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
    public override exitExpr = (ctx: ExprContext): void => { this.popSymbol(); }

    public override enterExpr_seq = (ctx: Expr_seqContext): void => {
        this.pushNewSymbol(ExpSeqSymbol, ctx, ctx.ruleIndex.toString());
    }
    // */
    
    // Plugin
    public override enterPluginDefinition = (ctx: PluginDefinitionContext): void =>
    {
        this.pushNewSymbol(PluginDefinitionSymbol, ctx, ctx.plugin_clause()._plugin_name?.getText())
        // this.pushScope( this.pushNewSymbol(PluginDefinitionSymbol, ctx, ctx.plugin_clause()._plugin_name?.getText()) );
    }
    public override exitPluginDefinition = (ctx: PluginDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // MacroScript
    public override enterMacroscriptDefinition = (ctx: MacroscriptDefinitionContext): void =>
    {
        this.pushNewSymbol(MacroScriptDefinitionSymbol, ctx, ctx.macroscript_clause()._macro_name?.getText())
        // this.pushScope( this.pushNewSymbol(MacroScriptDefinitionSymbol, ctx, ctx.macroscript_clause()._macro_name?.getText()) );
    }
    public override exitMacroscriptDefinition = (ctx: MacroscriptDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // Tool
    public override enterToolDefinition = (ctx: ToolDefinitionContext): void =>
    {
        this.pushNewSymbol(ToolDefinitionSymbol, ctx, ctx.tool_clause()._tool_name?.getText())
        // this.pushScope( this.pushNewSymbol(ToolDefinitionSymbol, ctx, ctx.tool_clause()._tool_name?.getText()) );
    }
    public override exitToolDefinition = (ctx: ToolDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // Rollout
    public override enterRolloutDefinition = (ctx: RolloutDefinitionContext): void =>
    {
        this.pushNewSymbol(RolloutDefinitionSymbol, ctx, ctx.rollout_clause()._rollout_name?.getText())
        // this.pushScope( this.pushNewSymbol(RolloutDefinitionSymbol, ctx, ctx.rollout_clause()._rollout_name?.getText()) );
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

    public override enterRolloutGroupDefinition = (ctx: RolloutGroupDefinitionContext): void =>
    {
        this.pushNewSymbol(rolloutGroupDefinitionSymbol, ctx, ctx.group_clause()._group_name?.text);
    }
    public override exitRolloutGroupDefinition = (ctx: RolloutGroupDefinitionContext): void => { this.popSymbol() }

    public override exitRolloutDefinition = (ctx: RolloutDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // Utility
    public override enterUtilityDefinition = (ctx: UtilityDefinitionContext): void =>
    {
        this.pushNewSymbol(UtilityDefinitionSymbol, ctx, ctx.utility_clause()._utility_name?.getText())
        // this.pushScope( this.pushNewSymbol(UtilityDefinitionSymbol, ctx, ctx.utility_clause()._utility_name?.getText()) );
    }
    public override exitUtilityDefinition = (ctx: UtilityDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // RC menu
    public override enterRcmenuDefinition = (ctx: RcmenuDefinitionContext): void =>
    {
        this.pushNewSymbol(RcMenuDefinitionSymbol, ctx, ctx.rcmenu_clause()._rc_name?.getText())
        // this.pushScope( this.pushNewSymbol(RcMenuDefinitionSymbol, ctx, ctx.rcmenu_clause()._rc_name?.getText()) );
    }
    public override enterRc_submenudefinition = (ctx: Rc_submenudefinitionContext): void =>
    {
        this.pushNewSymbol(AttributesDefSymbol, ctx, ctx.submenu_clause()._submenu_name?.text);
    }
    public override exitRc_submenudefinition = (ctx: Rc_submenudefinitionContext): void => { this.popSymbol(); }

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
        this.pushNewSymbol(AttributesDefSymbol, ctx, ctx.attributes_clause().identifier().getText())
        // this.pushScope( this.pushNewSymbol(AttributesDefSymbol, ctx, ctx.attributes_clause().identifier().getText()) );
    }
    public override exitAttributesDefinition = (ctx: AttributesDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // params
    public override enterParamsDefinition = (ctx: ParamsDefinitionContext): void =>
    {
        this.pushNewSymbol(ParamsDefSymbol, ctx, ctx.params_clause().identifier().getText())
        // this.pushScope( this.pushNewSymbol(ParamsDefSymbol, ctx, ctx.params_clause().identifier().getText()) );
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
    //-------------------------------------------------------------
    /* struct definition */
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

    //-------------------------------------------------------------
    /* fn defintition */
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
        this.pushNewSymbol(fnArgsSymbol, ctx, ctx.identifier()?.getText());
    }
    public override exitFn_args = (ctx: Fn_argsContext): void => { this.popSymbol(); }

    public override enterFn_params = (ctx: Fn_paramsContext): void =>
    {
        // this is a workaround for param: without assignment
        this.pushNewSymbol(fnParamsSymbol, ctx, ctx.identifier()?.getText());
    }
    public override exitFn_params = (ctx: Fn_paramsContext): void => { this.popSymbol(); }

    // public override enterParam_name = (ctx: Param_nameContext): void => { this.pushNewSymbol(ParamSymbol, ctx, ctx.getText()); }
    // public override exitParam_name = (ctx: Param_nameContext): void => { this.popSymbol(); }

    //-------------------------------------------------------------
    /* Variable declaration */

    //TODO: references...
    // public override enterdeclarationStatement = (ctx: declarationStatementContext): void => { }
    // public override exitdeclarationStatement = (ctx: declarationStatementContext): void => { }

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

        if (ctx.parent && ctx.parent.ruleIndex === mxsParser.RULE_declarationStatement) {
            const decl = (ctx.parent as DeclarationStatementContext)._scope?.getText().toLowerCase() || 'local';
            (symbol as VariableDeclSymbol).declarationScope = decl;
        }
    }

    public override exitVariableDeclaration = (ctx: VariableDeclarationContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    //-------------------------------------------------------------
    // /* event clause */
    public override enterEventHandlerStatement = (ctx: EventHandlerStatementContext): void =>
    {
        const refs = ctx._ev_args?._refs;
        const evType = refs && refs.length > 1 ? refs[1] : refs?.[0];
        this.pushNewSymbol(EventHandlerStatementSymbol, ctx, evType?.getText());
    }
    public override exitEventHandlerStatement = (ctx: EventHandlerStatementContext): void => { this.popSymbol(); }

    /* for loop */
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

    // public override enterforLoopStatement = (ctx: forLoopStatementContext): void => { this.pushNewSymbol(forLoopStatementSymbol, ctx)}
    // public override exitforLoopStatement = (ctx: forLoopStatementContext): void => {this.popSymbol()}
    // public override enterLoopExitStatement = (ctx: LoopExitStatementContext): void => {this.pushNewSymbol(loopExitStatementSymbol, ctx)}
    // public override exitLoopExitStatement = (ctx: LoopExitStatementContext): void => {this.popSymbol()}
    //-------------------------------------------------------------
    /* expression sequence */
    // Expression sequences are just grouping constructs and don't need symbol table entries
    /*
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
    */
    //-------------------------------------------------------------
    /* function call */
    //TODO: references...
    public override enterFunctionCall = (ctx: FunctionCallContext): void =>
    {
        //TODO: get caller definition...
        this.pushNewSymbol(FnCallSymbol, ctx, ctx.fn_caller()?.getText());
    }
    public override exitFunctionCall = (ctx: FunctionCallContext): void => { this.popSymbol(); }

    /* params */
    //TODO: references...
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
    /* properties */
    //TODO: references...
    public override enterProperty = (ctx: PropertyContext): void =>
    {
        this.pushNewSymbol(PropertyAccessSymbol, ctx, ctx.identifier()?.getText())
    }
    public override exitProperty = (ctx: PropertyContext): void => { this.popSymbol(); }

    /*
    // public override enterIndex = (ctx: IndexContext): void => { this.pushNewSymbol(PropertyAccessSymbol, ctx) }
    // public override exitIndex = (ctx: IndexContext): void => { this.popSymbol(); }
    // */

    /*
    //TODO: references...
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

    /* Identifiers */
    //TODO: references...
    public override exitIdentifier = (ctx: IdentifierContext): void =>
    {
        this.addNewSymbol(IdentifierSymbol, ctx, ctx.getText());
    }

    public override exitReference = (ctx: ReferenceContext): void =>
    {
        // Only emit for $global or &byref — plain identifier already handled by exitIdentifier
        if (ctx.getChildCount() > 1) {
            this.addNewSymbol(IdentifierSymbol, ctx, ctx.getText());
        }
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