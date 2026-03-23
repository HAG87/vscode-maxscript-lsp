import { BaseSymbol, SymbolConstructor } from 'antlr4-c3';
import { ParseTree, TerminalNode } from 'antlr4ng';

import {
  AccessorContext, AttributesDefinitionContext, DeclarationStatementContext,
  EventHandlerStatementContext, ExprSeqContext, FnArgsContext, FnParamsContext,
  FnDefinitionContext, ForBodyContext, FunctionCallContext, IdentifierContext,
  IndexContext, KwOverrideContext, MacroscriptDefinitionContext, mxsParser,
  ParamContext, ParamDefinitionContext, ParamsDefinitionContext, PathContext,
  PluginDefinitionContext, PropertyContext, RcSubmenuDefinitionContext,
  RcmenuControlContext, RcmenuDefinitionContext, ReferenceContext, RolloutControlContext,
  RolloutDefinitionContext, RolloutGroupDefinitionContext, StructMemberContext,
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

    public override enterExpr_seq = (ctx: ExprSeqContext): void => {
        this.pushNewSymbol(ExpSeqSymbol, ctx, ctx.ruleIndex.toString());
    }
    // */
    
    // Plugin
    public override enterPluginDefinition = (ctx: PluginDefinitionContext): void =>
    {
        this.pushNewSymbol(PluginDefinitionSymbol, ctx, ctx.pluginClause()._plugin_name?.getText())
        // this.pushScope( this.pushNewSymbol(PluginDefinitionSymbol, ctx, ctx.pluginClause()._plugin_name?.getText()) );
    }
    public override exitPluginDefinition = (ctx: PluginDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // MacroScript
    public override enterMacroscriptDefinition = (ctx: MacroscriptDefinitionContext): void =>
    {
        this.pushNewSymbol(MacroScriptDefinitionSymbol, ctx, ctx.macroscriptClause()._macro_name?.getText())
        // this.pushScope( this.pushNewSymbol(MacroScriptDefinitionSymbol, ctx, ctx.macroscriptClause()._macro_name?.getText()) );
    }
    public override exitMacroscriptDefinition = (ctx: MacroscriptDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // Tool
    public override enterToolDefinition = (ctx: ToolDefinitionContext): void =>
    {
        this.pushNewSymbol(ToolDefinitionSymbol, ctx, ctx.toolClause()._tool_name?.getText())
        // this.pushScope( this.pushNewSymbol(ToolDefinitionSymbol, ctx, ctx.toolClause()._tool_name?.getText()) );
    }
    public override exitToolDefinition = (ctx: ToolDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // Rollout
    public override enterRolloutDefinition = (ctx: RolloutDefinitionContext): void =>
    {
        this.pushNewSymbol(RolloutDefinitionSymbol, ctx, ctx.rolloutClause()._rollout_name?.getText())
        // this.pushScope( this.pushNewSymbol(RolloutDefinitionSymbol, ctx, ctx.rolloutClause()._rollout_name?.getText()) );
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
        this.pushNewSymbol(rolloutGroupDefinitionSymbol, ctx, ctx.groupClause()._group_name?.text);
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
        this.pushNewSymbol(UtilityDefinitionSymbol, ctx, ctx.utilityClause()._utility_name?.getText())
        // this.pushScope( this.pushNewSymbol(UtilityDefinitionSymbol, ctx, ctx.utilityClause()._utility_name?.getText()) );
    }
    public override exitUtilityDefinition = (ctx: UtilityDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // RC menu
    public override enterRcmenuDefinition = (ctx: RcmenuDefinitionContext): void =>
    {
        this.pushNewSymbol(RcMenuDefinitionSymbol, ctx, ctx.rcmenuClause()._rc_name?.getText())
        // this.pushScope( this.pushNewSymbol(RcMenuDefinitionSymbol, ctx, ctx.rcmenuClause()._rc_name?.getText()) );
    }
    public override enterRcSubmenuDefinition = (ctx: RcSubmenuDefinitionContext): void =>
    {
        this.pushNewSymbol(AttributesDefSymbol, ctx, ctx.submenuClause()._submenu_name?.text);
    }
    public override exitRcSubmenuDefinition = (ctx: RcSubmenuDefinitionContext): void => { this.popSymbol(); }

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
        this.pushNewSymbol(AttributesDefSymbol, ctx, ctx.attributesClause().identifier().getText())
        // this.pushScope( this.pushNewSymbol(AttributesDefSymbol, ctx, ctx.attributesClause().identifier().getText()) );
    }
    public override exitAttributesDefinition = (ctx: AttributesDefinitionContext): void =>
    {
        this.popSymbol();
        // this.popScope();
    }
    // params
    public override enterParamsDefinition = (ctx: ParamsDefinitionContext): void =>
    {
        this.pushNewSymbol(ParamsDefSymbol, ctx, ctx.paramsClause().identifier().getText())
        // this.pushScope( this.pushNewSymbol(ParamsDefSymbol, ctx, ctx.paramsClause().identifier().getText()) );
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

    public override enterStructMember = (ctx: StructMemberContext): void =>
    {
        this.pushNewSymbol(StructMemberSymbol, ctx, ctx.identifier().getText());
    }
    public override exitStructMember = (ctx: StructMemberContext): void => { this.popSymbol(); }

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
    public override enterFnArgs = (ctx: FnArgsContext): void => 
    {
        this.pushNewSymbol(fnArgsSymbol, ctx, ctx.identifier()?.getText());
    }
    public override exitFnArgs = (ctx: FnArgsContext): void => { this.popSymbol(); }

    public override enterFnParams = (ctx: FnParamsContext): void =>
    {
        // this is a workaround for param: without assignment
        this.pushNewSymbol(fnParamsSymbol, ctx, ctx.identifier()?.getText());
    }
    public override exitFnParams = (ctx: FnParamsContext): void => { this.popSymbol(); }

    // public override enterParamName = (ctx: ParamNameContext): void => { this.pushNewSymbol(ParamSymbol, ctx, ctx.getText()); }
    // public override exitParamName = (ctx: ParamNameContext): void => { this.popSymbol(); }

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
        const evType = refs && refs.length >= 2 ? refs[1] : refs?.[0];
        this.pushNewSymbol(EventHandlerStatementSymbol, ctx, evType?.getText());
    }
    public override exitEventHandlerStatement = (ctx: EventHandlerStatementContext): void => { this.popSymbol(); }

    /* for loop */
    public override enterForBody = (ctx: ForBodyContext): void =>
    {
        this.pushNewSymbol(ForBodySymbol, ctx, ctx.getText());
        // this.pushScope(this.pushNewSymbol(ForBodySymbol, ctx, ctx.getText()););
    }
    public override exitForBody = (ctx: ForBodyContext): void =>
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
    public override enterExpr_seq = (ctx: ExprSeqContext): void =>
    {
        this.pushNewSymbol(ExpSeqSymbol, ctx, ctx.ruleIndex.toString())
        // this.pushScope( this.pushNewSymbol(ExpSeqSymbol, ctx, ctx.ruleIndex.toString()) );
    }

    public override exitExpr_seq = (ctx: ExprSeqContext): void =>
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
        this.pushNewSymbol(FnCallSymbol, ctx, ctx.fnCaller()?.getText());
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
        const expr_operand = ctx.exprOperand()
        const op = expr_operand.operand()
        if (op) {
            const id = op.factor()?.identifier()
            if (id) {
                this.addNewSymbol(IdentifierSymbol, id, id.getText());
            }
        }
    }
    public override exitExpr_operand = (ctx: ExprOperandContext): void => { this.popSymbol(); }
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
    
    public override enterKwOverride = (ctx: KwOverrideContext): void =>
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