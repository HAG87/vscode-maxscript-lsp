import { ParserRuleContext, TerminalNode } from 'antlr4ng';

import { mxsLexer } from '../../parser/mxsLexer.js';
import {
  AccessorContext, AssignmentContext, AttributesDefinitionContext,
  CaseItemContext, CaseStatementContext, CommaContext,
  ContextStatementContext, DoLoopStatementContext, EventHandlerStatementContext,
  ExprOperandContext, ExprSeqContext, ExprContext, FactorContext,
  FnDefinitionContext, FnReturnStatementContext, ForLoopStatementContext,
  FunctionCallContext, IdentifierContext, IfStatementContext, IndexContext,
  LbContext, LbkContext, LcContext, LpContext,
  MacroscriptDefinitionContext, mxsParser, OperandContext, ParamNameContext,
  ParamContext, ParamsDefinitionContext, ParenPairContext,
  PluginDefinitionContext, ProgramContext, PropertyContext, RbContext,
  Rc_submenudefinitionContext, RcContext, RcmenuControlContext, RcmenuDefinitionContext,
  RolloutControlContext, RolloutDefinitionContext, RolloutGroupDefinitionContext,
  RpContext, SimpleExpressionContext, StructBodyContext,
  StructDefinitionContext, ToolDefinitionContext, TryStatementContext,
  UtilityDefinitionContext, WhenStatementContext, WhileLoopStatementContext,
} from '../../parser/mxsParser.js';
import { mxsParserVisitor } from '../../parser/mxsParserVisitor.js';
import { ICodeFormatSettings, IMinifySettings } from '../../types.js';

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
    // visitTool_clause = (ctx: Tool_clauseContext): string => { return this.visitChildren(ctx)! }
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
    // visitRollout_clause = (ctx: Rollout_clauseContext): string => { return this.visitChildren(ctx)! }
    // visitRollout_body = (ctx: Rollout_bodyContext): string => { return this.visitChildren(ctx)! }
    visitRolloutGroupDefinition = (ctx: RolloutGroupDefinitionContext): string =>
        this.visitChildren(ctx)!
    visitRolloutControl = (ctx: RolloutControlContext): string =>
        this.visitChildren(ctx)!
    //-------------------------------------------------------
    visitRcmenuDefinition = (ctx: RcmenuDefinitionContext): string =>
        this.visitChildren(ctx)!
    visitRcmenuControl = (ctx: RcmenuControlContext): string =>
        this.visitChildren(ctx)!
    visitRc_submenudefinition = (ctx: Rc_submenudefinitionContext): string =>
        this.visitChildren(ctx)!
    //-------------------------------------------------------
    visitAttributesDefinition = (ctx: AttributesDefinitionContext): string =>
        this.visitChildren(ctx)!
    visitWhenStatement = (ctx: WhenStatementContext): string =>
        this.visitChildren(ctx)!
    //-------------------------------------------------------
    visitStructDefinition = (ctx: StructDefinitionContext): string =>
        this.visitChildren(ctx)!
    visitStructBody = (ctx: StructBodyContext): string =>
        this.visitChildren(ctx)!
    visitEventHandlerStatement = (ctx: EventHandlerStatementContext): string =>
        this.visitChildren(ctx)!
    visitFnDefinition = (ctx: FnDefinitionContext): string =>
        this.visitChildren(ctx)!
    visitFnReturnStatement = (ctx: FnReturnStatementContext): string =>
        this.visitChildren(ctx)!
    //-------------------------------------------------------
    visitCaseStatement = (ctx: CaseStatementContext): string =>
    {
        /*
        console.log(ctx.caseItem())
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
    visitCaseItem = (ctx: CaseItemContext): string =>
    {
        const factor = this.visit(ctx.factor())!
        const expr = this.visit(ctx.expr())!
        // add spaces for numbers to avoid timeval problem
        const right = /[0-9]$/.test(factor) ? this.options.whitespaceChar : this.defaultResult()
        const left = /^[-+:0-9]/.test(expr) ? this.options.whitespaceChar : this.defaultResult()

        return factor + right + this.visit(ctx.COLON())! + left + expr
    }
    visitIfStatement = (ctx: IfStatementContext): string =>
    {
        let result = this.visit(ctx.IF())! + this.visit(ctx.simpleExpression())!
        
        if (ctx.THEN()) {
            result += this.visit(ctx.THEN()!)!
            result += this.visit(ctx._thenBody!)!
            
            if (ctx.ELSE()) {
                result += this.visit(ctx.ELSE()!)!
                result += this.visit(ctx._elseBody!)!
            }
        } else if (ctx.DO()) {
            result += this.visit(ctx.DO()!)!
            result += this.visit(ctx._doBody!)!
        }
        
        return result
    }
    visitDoLoopStatement = (ctx: DoLoopStatementContext): string =>
    {
        return this.visit(ctx.DO()!)! + this.visit(ctx._body!)! + 
               this.visit(ctx.WHILE()!)! + this.visit(ctx._condition!)!
    }
    visitWhileLoopStatement = (ctx: WhileLoopStatementContext): string =>
    {
        return this.visit(ctx.WHILE()!)! + this.visit(ctx._condition!)! + 
               this.visit(ctx.DO()!)! + this.visit(ctx._body!)!
    }
    visitForLoopStatement = (ctx: ForLoopStatementContext): string =>
    {
        const forOperator = ctx._for_operator!.text!
        const forAction = ctx._for_action!.text!
        
        return this.visit(ctx.FOR()!)! + this.visit(ctx.for_body())! + 
               forOperator + this.visit(ctx.for_sequence())! + 
               forAction + this.visit(ctx._body!)!
    }
    visitTryStatement = (ctx: TryStatementContext): string =>
    {
        return this.visit(ctx.TRY()!)! + this.visit(ctx._tryBody!)! + 
               this.visit(ctx.CATCH()!)! + this.visit(ctx._catchBody!)!
    }
    visitContextStatement = (ctx: ContextStatementContext): string =>
        this.visitChildren(ctx)!
    //-------------------------------------------------------
    visitExprSeq = (ctx: ExprSeqContext): string =>
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
                    parentRule !== mxsParser.RULE_fnArgs &&
                    parentRule !== mxsParser.RULE_fnCaller &&
                    parentRule !== mxsParser.RULE_operandArg
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
    visitExprOperand = (ctx: ExprOperandContext): string =>
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
    // visitOperand_arg = (ctx: OperandArgContext): ParseTree => { return ctx.children[0] }
    visitParam_name = (ctx: ParamNameContext): string => { return ctx.getText() }
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
    visitParenPair = (ctx: ParenPairContext): string => ctx.getText()
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