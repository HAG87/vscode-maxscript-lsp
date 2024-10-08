import { ParserRuleContext, TerminalNode } from 'antlr4ng';

import { mxsLexer } from '../parser/mxsLexer.js';
import {
  AccessorContext, AssignmentContext, AttributesDefinitionContext,
  Case_itemContext, CaseExpressionContext, CommaContext,
  ContextExpressionContext, DoLoopExpressionContext, EventHandlerClauseContext,
  Expr_operandContext, Expr_seqContext, ExprContext, FactorContext,
  FnDefinitionContext, FnReturnStatementContext, ForLoopExpressionContext,
  FunctionCallContext, IdentifierContext, IfExpressionContext, IndexContext,
  LbContext, LbkContext, LcContext, LpContext,
  MacroscriptDefinitionContext, mxsParser, OperandContext, Param_nameContext,
  ParamContext, ParamsDefinitionContext, Paren_pairContext,
  PluginDefinitionContext, ProgramContext, PropertyContext, RbContext,
  Rc_submenuContext, RcContext, RcmenuControlContext, RcmenuDefinitionContext,
  RolloutControlContext, RolloutDefinitionContext, RolloutGroupContext,
  RpContext, SimpleExpressionContext, Struct_bodyContext,
  StructDefinitionContext, ToolDefinitionContext, TryExpressionContext,
  UtilityDefinitionContext, WhenStatementContext, WhileLoopExpressionContext,
} from '../parser/mxsParser.js';
import { mxsParserVisitor } from '../parser/mxsParserVisitor.js';
import { ICodeFormatSettings, IMinifySettings } from '../types.js';

export class mxsParserVisitorMinifier extends mxsParserVisitor<string>
{
    constructor(private options: ICodeFormatSettings & IMinifySettings)
    {
        super()
        // console.log(JSON.stringify(options.condenseWhitespace))
        // if (options) { Object.assign(this.options, options) }
    }
    /* options:
    * - to return null to stop the visit,
    * - to return children to continue,
    * - to return something to perform an action ordered at a higher level of the tree.
    */
    //-------------------------------------------------------
    visitProgram = (ctx: ProgramContext): string =>
        this.visitChildren(ctx)!
    visitExpr = (ctx: ExprContext): string =>
        this.visitChildren(ctx)!
    //-------------------------------------------------------
    visitPluginDefinition = (ctx: PluginDefinitionContext): string =>
        this.visitChildren(ctx)!
    visitParamsDefinition = (ctx: ParamsDefinitionContext): string =>
        this.visitChildren(ctx)!
    //-------------------------------------------------------
    visitToolDefinition = (ctx: ToolDefinitionContext): string =>
        this.visitChildren(ctx)!
    // visitTool_predicate = (ctx: Tool_predicateContext): string => { return this.visitChildren(ctx)! }
    // visitTool_body = (ctx: Tool_bodyContext): string => { return this.visitChildren(ctx)! }
    //-------------------------------------------------------
    visitMacroscriptDefinition = (ctx: MacroscriptDefinitionContext): string =>
        this.visitChildren(ctx)!
    // visitMacropscript_predicate = (ctx: Macropscript_predicateContext): string => { return this.visitChildren(ctx)! }
    // visitMacroscript_body = (ctx: Macroscript_bodyContext): string => { return this.visitChildren(ctx)! }
    //-------------------------------------------------------
    visitUtilityDefinition = (ctx: UtilityDefinitionContext): string =>
        this.visitChildren(ctx)!
    visitRolloutDefinition = (ctx: RolloutDefinitionContext): string =>
        this.visitChildren(ctx)!
    // visitRollout_predicate = (ctx: Rollout_predicateContext): string => { return this.visitChildren(ctx)! }
    // visitRollout_body = (ctx: Rollout_bodyContext): string => { return this.visitChildren(ctx)! }
    visitRolloutGroup = (ctx: RolloutGroupContext): string =>
        this.visitChildren(ctx)!
    visitRolloutControl = (ctx: RolloutControlContext): string =>
        this.visitChildren(ctx)!
    //-------------------------------------------------------
    visitRcmenuDefinition = (ctx: RcmenuDefinitionContext): string =>
        this.visitChildren(ctx)!
    visitRcmenuControl = (ctx: RcmenuControlContext): string =>
        this.visitChildren(ctx)!
    visitRc_submenu = (ctx: Rc_submenuContext): string =>
        this.visitChildren(ctx)!
    //-------------------------------------------------------
    visitAttributesDefinition = (ctx: AttributesDefinitionContext): string =>
        this.visitChildren(ctx)!
    visitWhenStatement = (ctx: WhenStatementContext): string =>
        this.visitChildren(ctx)!
    //-------------------------------------------------------
    visitStructDefinition = (ctx: StructDefinitionContext): string =>
        this.visitChildren(ctx)!
    visitStruct_body = (ctx: Struct_bodyContext): string =>
        this.visitChildren(ctx)!
    visitEventHandlerClause = (ctx: EventHandlerClauseContext): string =>
        this.visitChildren(ctx)!
    visitFnDefinition = (ctx: FnDefinitionContext): string =>
        this.visitChildren(ctx)!
    visitFnReturnStatement = (ctx: FnReturnStatementContext): string =>
        this.visitChildren(ctx)!
    //-------------------------------------------------------
    visitCaseExpression = (ctx: CaseExpressionContext): string =>
    {
        /*
        console.log(ctx.case_item())
        let result = ''
        for (const child of ctx.children) {
            let res = this.aggregateResult(result, this.visit(child))
            console.log(res)
        }
        console.log(result)
        */
        return (this.visitChildren(ctx)! + this.options.newLineChar)
    }
    // case item
    visitCase_item = (ctx: Case_itemContext): string =>
    {
        const factor = this.visit(ctx.factor())!
        const expr = this.visit(ctx.expr())!
        // add spaces for numbers to avoid timeval problem
        const right = /[0-9]$/.test(factor) ? this.options.whitespaceChar : this.defaultResult()
        const left = /^[-+:0-9]/.test(expr) ? this.options.whitespaceChar : this.defaultResult()

        return factor + right + this.visit(ctx.COLON())! + left + expr
    }
    visitIfExpression = (ctx: IfExpressionContext): string =>
        this.visitChildren(ctx)!
    visitDoLoopExpression = (ctx: DoLoopExpressionContext): string =>
        this.visitChildren(ctx)!
    visitWhileLoopExpression = (ctx: WhileLoopExpressionContext): string =>
        this.visitChildren(ctx)!
    visitForLoopExpression = (ctx: ForLoopExpressionContext): string =>
        this.visitChildren(ctx)!
    visitTryExpression = (ctx: TryExpressionContext): string =>
        this.visitChildren(ctx)!
    visitContextExpression = (ctx: ContextExpressionContext): string =>
        this.visitChildren(ctx)!
    //-------------------------------------------------------
    visitExpr_seq = (ctx: Expr_seqContext): string =>
    {

        // /*
        const expressions = ctx.expr()
        if (expressions.length === 1 && this.options.removeUnnecessaryScopes) {
            if (ctx.parent) {

                let parent = ctx.parent
                while (parent.parent && (
                    parent.ruleIndex === mxsParser.RULE_factor ||
                    parent.ruleIndex === mxsParser.RULE_operand
                )) {
                    parent = parent.parent
                }
                const parentRule = parent.ruleIndex

                if (
                    parentRule !== mxsParser.RULE_accessor &&
                    parentRule !== mxsParser.RULE_fn_args &&
                    parentRule !== mxsParser.RULE_fn_caller &&
                    parentRule !== mxsParser.RULE_operand_arg
                ) {
                    // console.log(parent)
                    // console.log(ctx.getText())
                    return this.visit(expressions[0])!
                }
            }
        }
        // */
        // let res = this.visitChildren(ctx)!
        // console.log(res)
        // return res
        return this.visitChildren(ctx)!
    }
    //-------------------------------------------------------
    visitSimpleExpression = (ctx: SimpleExpressionContext): string =>
        this.visitChildren(ctx)!
    visitExpr_operand = (ctx: Expr_operandContext): string =>
        this.visitChildren(ctx)!
    //-------------------------------------------------------    
    visitAssignment = (ctx: AssignmentContext): string =>
        this.visitChildren(ctx)!
    visitOperand = (ctx: OperandContext): string =>
        this.visitChildren(ctx)!
    //accessor
    visitAccessor = (ctx: AccessorContext): string =>
        this.visitChildren(ctx)!
    visitProperty = (ctx: PropertyContext): string =>
        this.visitChildren(ctx)!
    visitIndex = (ctx: IndexContext): string =>
        this.visitChildren(ctx)!
    visitFactor = (ctx: FactorContext): string =>
        this.visitChildren(ctx)!
    //-------------------------------------------------------
    visitFunctionCall = (ctx: FunctionCallContext): string =>
        this.visitChildren(ctx)!
    visitParam = (ctx: ParamContext): string =>
        this.visitChildren(ctx)!
    // visitOperand_arg = (ctx: Operand_argContext): ParseTree => { return ctx.children[0] }
    visitParam_name = (ctx: Param_nameContext): string => { return ctx.getText() }
    //-------------------------------------------------------
    visitIdentifier = (ctx: IdentifierContext): string => { return ctx.getText() }
    // visitString?: ((ctx: StringContext) => string) | undefined;
    // visitNumber?: ((ctx: NumberContext) => string) | undefined;
    // visitTimeval?: ((ctx: TimevalContext) => string) | undefined;
    // visitBool?: ((ctx: BoolContext) => string) | undefined;
    // visitPath?: ((ctx: PathContext) => string) | undefined;
    // visitName?: ((ctx: NameContext) => string) | undefined;
    /*
    visitArray = (ctx: ArrayContext): string => {
        return this.visitChildren(ctx.arrayList()!)
        return this.visitChildren(ctx)
    }
    // */
    // visitArrayList = (ctx: ArrayListContext): string => { return this.visitChildren(ctx)}
    // visitBitArray = (ctx: BitArrayContext): string => { return this.visitChildren(ctx)}
    // visitBitList = (ctx: BitListContext): string => { return this.visitChildren(ctx)}
    //-------------------------------------------------------
    visitParen_pair = (ctx: Paren_pairContext): string => ctx.getText()
    visitLp = (_ctx: LpContext): string => '('
    visitRp = (_ctx: RpContext): string => ')'
    visitLc = (_ctx: LcContext): string => '{'
    visitRc = (_ctx: RcContext): string => '}'
    visitLb = (_ctx: LbContext): string => '['
    visitRb = (_ctx: RbContext): string => ']'
    visitComma = (_ctx: CommaContext): string => ','
    //-------------------------------------------------------
    visitLbk = (_ctx: LbkContext): string => { return this.options.exprEndChar }
    visitTerminal = (node: TerminalNode): string =>
    {
        switch (node.symbol.type) {
            case mxsLexer.UNARY_MINUS:
                return this.options.whitespaceChar + node.getText()
            case mxsLexer.NL:
                return this.defaultResult()
            case mxsLexer.EOF:
                return this.defaultResult()
            default:
                return node.getText()
        }
    }
    //-------------------------------------------------------
    protected aggregateResult(aggregate: string | null, nextResult: string | null): string | null
    {
        if (aggregate) {
            if (nextResult) {
                // filter duplicate exprEndChar
                if (
                    aggregate.endsWith(this.options.exprEndChar) &&
                    nextResult.startsWith(this.options.exprEndChar
                    )) {
                    return aggregate;
                }
                if (this.options.condenseWhitespace) {
                    // special cases
                    const end = /[$0-9_\p{L}]$/u.test(aggregate)
                    const start = /^([0-9_\p{L}]|[:]{2})/u.test(nextResult)

                    const minusEnd = aggregate.endsWith('-')
                    const minusStart = nextResult.startsWith('-')

                    const ddotEnd = aggregate.endsWith(':')
                    const ddotStart = nextResult.startsWith(':') || nextResult.startsWith('=')

                    if (start && end || (minusStart && minusEnd) || (ddotStart && ddotEnd)) {
                        aggregate += this.options.whitespaceChar
                    }
                } else {
                    aggregate += this.options.whitespaceChar
                }
                return aggregate + nextResult

            }
            return aggregate
        }
        return nextResult
    }
    protected defaultResult(): string { return '' }

    protected shouldVisitNextChild(_node: ParserRuleContext, _currentResult: string | null): boolean { return true }
    visitChildren(node: ParserRuleContext, filterTerminal?: number): string
    {
        let result = this.defaultResult()
        const n2 = node.getChildCount()
        for (let i = 0; i < n2; i++) {

            if (!this.shouldVisitNextChild(node, result)) {
                break
            }
            const c = node.getChild(i)

            if (c) {
                if (filterTerminal && c instanceof TerminalNode &&
                    c.symbol.type === filterTerminal) {
                    continue
                }
                const childResult = c.accept(this)
                // eval strings
                result = this.aggregateResult(result, childResult) ?? result
            }
        }
        return result
    }
}