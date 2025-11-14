import { ParserRuleContext, ParseTree, TerminalNode } from 'antlr4ng';

import { mxsLexer } from '../../parser/mxsLexer.js';
import {
  ArrayContext, ArrayListContext, Attributes_predicateContext,
  AttributesDefinitionContext, BitArrayContext, BitListContext,
  Case_itemContext, Case_predicateContext, CaseExpressionContext, CommaContext,
  ContextExpressionContext, De_refContext, DeclarationExpressionContext,
  DoLoopExpressionContext, EventHandlerClauseContext, Expr_seqContext,
  Fn_bodyContext, FnDefinitionContext, FnReturnStatementContext,
  For_sequenceContext, For_whereContext, For_whileContext,
  ForLoopExpressionContext, Group_predicateContext, IdentifierContext,
  IfExpressionContext, LbContext, LbkContext, LcContext,
  LpContext, Macroscript_predicateContext, MacroscriptDefinitionContext,
  Params_predicateContext, ParamsDefinitionContext, Paren_pairContext,
  Plugin_predicateContext, PluginDefinitionContext, ProgramContext, RbContext,
  Rc_submenuContext, RcContext, Rcmenu_predicateContext, RcmenuControlContext,
  RcmenuDefinitionContext, Rollout_predicateContext, RolloutControlContext,
  RolloutDefinitionContext, RolloutGroupContext, RpContext,
  SimpleExpressionContext, Struct_accessContext, Struct_bodyContext,
  StructDefinitionContext, Submenu_predicateContext, Tool_predicateContext,
  ToolDefinitionContext, TryExpressionContext, Utility_predicateContext,
  UtilityDefinitionContext, WhenStatementContext, WhileLoopExpressionContext,
} from '../../parser/mxsParser.js';
import { mxsParserVisitor } from '../../parser/mxsParserVisitor.js';
import {
  ICodeFormatSettings, IMinifySettings, IPrettifySettings,
} from '../../types.js';

type R = codeToken | codeBlock

enum codeTypes
{
    ASSIGN,
    BLOCK_COMMENT,
    COLON,
    COMMA,
    DOT,
    EMPTY,
    ID,
    KEYWORD,
    LBRACE,
    LBRACK,
    LINE_BREAK,
    BREAK,
    LINE_COMMENT,
    LINE_CONTINUATION,
    LPAREN,
    MODIF,
    NUMBER,
    OPERATOR,
    RBRACE,
    RBRACK,
    RPAREN,
    SHARP,
    SYMBOL,
    UNARY,
    VALUE,
    VOID,
    WHITESPACE,
}
enum blockTypes
{
    DECL,
    EXPR,
    FIELDS,
    LIST,
    SEQUENCE,
}

const tokenToCodeType = new Map<number, codeTypes>([
    [mxsLexer.ABOUT, codeTypes.KEYWORD],
    [mxsLexer.AMP, codeTypes.SYMBOL],
    [mxsLexer.AND, codeTypes.KEYWORD],
    [mxsLexer.Angle, codeTypes.ID],
    [mxsLexer.ANIMATE, codeTypes.KEYWORD],
    [mxsLexer.AS, codeTypes.KEYWORD],
    [mxsLexer.ASSIGN, codeTypes.ASSIGN],
    [mxsLexer.AT, codeTypes.KEYWORD],
    [mxsLexer.Attributes, codeTypes.KEYWORD],
    [mxsLexer.Bitmap, codeTypes.ID],
    [mxsLexer.BLOCK_COMMENT, codeTypes.BLOCK_COMMENT],
    [mxsLexer.Button, codeTypes.ID],
    [mxsLexer.BY, codeTypes.KEYWORD],
    [mxsLexer.CASE, codeTypes.KEYWORD],
    [mxsLexer.CATCH, codeTypes.KEYWORD],
    [mxsLexer.CHANGE, codeTypes.KEYWORD],
    [mxsLexer.CheckBox, codeTypes.ID],
    [mxsLexer.CheckButton, codeTypes.ID],
    [mxsLexer.COLLECT, codeTypes.KEYWORD],
    [mxsLexer.COLON, codeTypes.COLON],
    [mxsLexer.ColorPicker, codeTypes.ID],
    [mxsLexer.ComboBox, codeTypes.ID],
    [mxsLexer.COMMA, codeTypes.COMMA],
    [mxsLexer.COMPARE, codeTypes.OPERATOR],
    [mxsLexer.COORDSYS, codeTypes.KEYWORD],
    [mxsLexer.CurveControl, codeTypes.ID],
    [mxsLexer.DefaultAction, codeTypes.KEYWORD],
    [mxsLexer.DELETED, codeTypes.KEYWORD],
    [mxsLexer.DIV, codeTypes.OPERATOR],
    [mxsLexer.DO, codeTypes.KEYWORD],
    [mxsLexer.DontRepeatMessages, codeTypes.KEYWORD],
    [mxsLexer.DOT, codeTypes.DOT],
    [mxsLexer.DOTDOT, codeTypes.OPERATOR],
    [mxsLexer.DotnetControl, codeTypes.ID],
    [mxsLexer.DropdownList, codeTypes.ID],
    [mxsLexer.EditText, codeTypes.ID],
    [mxsLexer.ELSE, codeTypes.KEYWORD],
    [mxsLexer.EQ, codeTypes.ASSIGN],
    [mxsLexer.EXIT, codeTypes.KEYWORD],
    [mxsLexer.FALSE, codeTypes.VALUE],
    [mxsLexer.FN, codeTypes.KEYWORD],
    [mxsLexer.FOR, codeTypes.KEYWORD],
    [mxsLexer.GLOB, codeTypes.KEYWORD],
    [mxsLexer.GLOBAL, codeTypes.KEYWORD],
    [mxsLexer.Group, codeTypes.KEYWORD],
    [mxsLexer.GroupBox, codeTypes.ID],
    [mxsLexer.Hyperlink, codeTypes.ID],
    [mxsLexer.ID, codeTypes.ID],
    [mxsLexer.IF, codeTypes.KEYWORD],
    [mxsLexer.ImgTag, codeTypes.ID],
    [mxsLexer.IN, codeTypes.KEYWORD],
    [mxsLexer.Label, codeTypes.ID],
    [mxsLexer.LBRACE, codeTypes.LBRACE],
    [mxsLexer.LBRACK, codeTypes.SYMBOL],
    [mxsLexer.LEVEL, codeTypes.KEYWORD],
    [mxsLexer.LINE_COMMENT, codeTypes.LINE_COMMENT],
    [mxsLexer.ListBox, codeTypes.ID],
    [mxsLexer.LOCAL, codeTypes.KEYWORD],
    [mxsLexer.LPAREN, codeTypes.LPAREN],
    [mxsLexer.MacroRecorderEmitterEnabled, codeTypes.KEYWORD],
    [mxsLexer.MacroScript, codeTypes.KEYWORD],
    [mxsLexer.MapButton, codeTypes.ID],
    [mxsLexer.MAPPED, codeTypes.MODIF],
    [mxsLexer.MaterialButton, codeTypes.ID],
    [mxsLexer.MenuItem, codeTypes.ID],
    [mxsLexer.MINUS, codeTypes.OPERATOR],
    [mxsLexer.MultilistBox, codeTypes.ID],
    [mxsLexer.MXScallstackCaptureEnabled, codeTypes.KEYWORD],
    [mxsLexer.NAME, codeTypes.ID],
    [mxsLexer.NL, codeTypes.LINE_BREAK],
    [mxsLexer.NOT, codeTypes.KEYWORD],
    [mxsLexer.NUMBER, codeTypes.NUMBER],
    [mxsLexer.OF, codeTypes.KEYWORD],
    [mxsLexer.OFF, codeTypes.KEYWORD],
    [mxsLexer.ON, codeTypes.KEYWORD],
    [mxsLexer.OR, codeTypes.KEYWORD],
    [mxsLexer.Parameters, codeTypes.KEYWORD],
    [mxsLexer.PATH, codeTypes.ID],
    [mxsLexer.PERSISTENT, codeTypes.MODIF],
    [mxsLexer.PickButton, codeTypes.ID],
    [mxsLexer.Plugin, codeTypes.KEYWORD],
    [mxsLexer.PLUS, codeTypes.OPERATOR],
    [mxsLexer.PopupBenu, codeTypes.ID],
    [mxsLexer.POW, codeTypes.OPERATOR],
    [mxsLexer.PrintAllElements, codeTypes.KEYWORD],
    [mxsLexer.PRIVATE, codeTypes.MODIF],
    [mxsLexer.PROD, codeTypes.OPERATOR],
    [mxsLexer.Progressbar, codeTypes.ID],
    [mxsLexer.PUBLIC, codeTypes.MODIF],
    [mxsLexer.QUESTION, codeTypes.SYMBOL],
    [mxsLexer.QUIET, codeTypes.KEYWORD],
    [mxsLexer.QUOTED_ID, codeTypes.ID],
    [mxsLexer.RadioButtons, codeTypes.ID],
    [mxsLexer.RBRACE, codeTypes.RBRACE],
    [mxsLexer.RBRACK, codeTypes.SYMBOL],
    [mxsLexer.RCmenu, codeTypes.KEYWORD],
    [mxsLexer.REDRAW, codeTypes.KEYWORD],
    [mxsLexer.RESOURCE, codeTypes.VALUE],
    [mxsLexer.RETURN, codeTypes.KEYWORD],
    [mxsLexer.Rollout, codeTypes.KEYWORD],
    [mxsLexer.RPAREN, codeTypes.RPAREN],
    [mxsLexer.Separator, codeTypes.ID],
    [mxsLexer.SET, codeTypes.KEYWORD],
    [mxsLexer.SHARP, codeTypes.SHARP],
    [mxsLexer.Slider, codeTypes.ID],
    [mxsLexer.Spinner, codeTypes.ID],
    [mxsLexer.STRING, codeTypes.VALUE],
    [mxsLexer.STRUCT, codeTypes.KEYWORD],
    [mxsLexer.SubMenu, codeTypes.ID],
    [mxsLexer.Subrollout, codeTypes.ID],
    [mxsLexer.THEN, codeTypes.KEYWORD],
    [mxsLexer.TIME, codeTypes.KEYWORD],
    [mxsLexer.Timer, codeTypes.ID],
    [mxsLexer.TIMEVAL, codeTypes.NUMBER],
    [mxsLexer.TO, codeTypes.KEYWORD],
    [mxsLexer.Tool, codeTypes.KEYWORD],
    [mxsLexer.TRUE, codeTypes.VALUE],
    [mxsLexer.TRY, codeTypes.KEYWORD],
    [mxsLexer.UNARY_MINUS, codeTypes.OPERATOR],
    [mxsLexer.UNDO, codeTypes.KEYWORD],
    [mxsLexer.Utility, codeTypes.KEYWORD],
    [mxsLexer.WHEN, codeTypes.KEYWORD],
    [mxsLexer.WHERE, codeTypes.KEYWORD],
    [mxsLexer.WHILE, codeTypes.KEYWORD],
    [mxsLexer.WITH, codeTypes.KEYWORD],
    [mxsLexer.WS, codeTypes.WHITESPACE],
])

const mandatoryWS: Set<number> = new Set([
    codeTypes.ID,
    codeTypes.NUMBER,
    codeTypes.KEYWORD,
    // codeTypes.UNARY
])
const mandatoryCases: Set<[number, number]> = new Set([
    [codeTypes.COLON, codeTypes.ASSIGN],
    [codeTypes.COLON, codeTypes.OPERATOR],
])
const shouldSkip: Set<number> = new Set([
    codeTypes.WHITESPACE,
    codeTypes.LINE_BREAK,
    codeTypes.BREAK,
    codeTypes.SHARP,
    codeTypes.DOT,
    codeTypes.UNARY,
    codeTypes.LBRACK,
    //  codeTypes.COMMA,
    //  codeTypes.COLON,
])
const shouldSkipNext: Set<number> = new Set([
    codeTypes.EMPTY,
    codeTypes.WHITESPACE,
    codeTypes.LINE_BREAK,
    codeTypes.BREAK,
    codeTypes.COMMA,
    codeTypes.COLON,
    codeTypes.DOT,
    codeTypes.LBRACK,
    codeTypes.RBRACK,
])
const blockPairs: Set<number> = new Set([
    codeTypes.LPAREN,
    codeTypes.RPAREN,
    codeTypes.LBRACE,
    codeTypes.RBRACE,
])

export class codeToken
{
    val: string
    type: codeTypes
    pos?: number
    indent?: number
    public hasPrefix = false
    constructor(val: string, type: codeTypes, pos?: number)
    {
        this.val = val
        this.type = type
        this.pos = pos
    }
    public check = (type: codeTypes): boolean => this.type === type
    public prepend = (val: string): void => { this.val = val + this.val }
    public append = (val: string): void => { this.val += val }

    public hasLineBreaks(): boolean
    {
        return this.type === codeTypes.LINE_BREAK || this.type === codeTypes.BREAK
    }
}

export class codeBlock
{
    vals: R[]
    indent: number
    start?: codeToken | codeToken[]
    end?: codeToken | codeToken[]
    type: blockTypes
    constructor(vals?: R[], indent?: number, start?: codeToken | codeToken[], end?: codeToken | codeToken[], type?: blockTypes)
    {
        this.vals = vals ?? []
        this.indent = indent ?? 0
        this.start = start
        this.end = end
        this.type = type ?? blockTypes.SEQUENCE
    }
    get first(): codeToken | codeBlock
    {
        return this.vals[0]
    }
    get last(): codeToken | codeBlock
    {
        return this.vals[this.vals.length - 1]
    }
    public hasLineBreaks(): boolean
    {
        let res = false
        for (const val of this.vals) {
            if (val instanceof codeBlock) {
                if (!res) {
                    res = val.hasLineBreaks()
                }
            } else if (val.check(codeTypes.LINE_BREAK)) {
                res = true
            }
        }
        return res
    }
    public startsWithNL(): boolean
    {
        return (this.first instanceof codeToken && this.first.check(codeTypes.LINE_BREAK))
    }
    public endsWithNL(): boolean
    {
        return (this.last instanceof codeToken && this.last.check(codeTypes.LINE_BREAK))
    }
    public isEmpty(): boolean { return this.vals.length === 0 }
    public canBeMultiline(): boolean { return this.vals.length > 1 }
    protected emmitIndent(options: ICodeFormatSettings, level: number): codeToken
    {
        return new codeToken(options.indentChar.repeat(level), codeTypes.WHITESPACE)
    }
    protected emmitWS(options: ICodeFormatSettings): codeToken
    {
        return new codeToken(options.whitespaceChar, codeTypes.WHITESPACE)
    }
    protected emmitNL(options: ICodeFormatSettings, indent?: number): codeToken
    {
        const token = new codeToken(options.newLineChar, codeTypes.LINE_BREAK)
        token.indent = indent
        return token
    }
    protected blockWrap(block: codeBlock, items: codeToken[], linebreaks: boolean = true): void
    {
        if (block.start && block.end) {
            const start: codeToken[] = Array.isArray(block.start) ? block.start : [block.start]
            const end: codeToken[] = Array.isArray(block.end) ? block.end : [block.end]

            items.unshift(...start.filter(item => linebreaks ? true : item.type !== codeTypes.LINE_BREAK))
            items.push(...end.filter(item => linebreaks ? true : item.type !== codeTypes.LINE_BREAK))
            // items.unshift(...start); items.push(...end)
        }
    }
    protected insertAt(items: codeToken[], insert: codeToken, markers?: codeTypes[])
    {
        let i = 0
        if (markers) {
            while (i < items.length) {
                // /*
                if (markers.includes(items[i].type)) {
                    items.splice(i + 1, 0, insert);
                    i += 2;
                } else i++;
            }
        } else {
            i = 1
            while (i <= items.length - 1) {
                items.splice(i, 0, insert);
                i += 2;
            }
        }
    }
    /*
    protected breakAtKeyword(options: ICodeFormatSettings, items: codeToken[], indent: number)
    {
        const kwPatterAfter = /(then|do|collect|on|when|where|while|try|of|else|catch)/i
        const kwPatternBoth = /(else|catch)/i
        let i = 0
        while (i < items.length) {
            if ((items[i].type === codeTypes.KEYWORD && kwPatterAfter.test(items[i].val))) {
                const next = items[i + 1]
                const replacement = [items[i]]
                // insert after
                if (next.type !== codeTypes.LINE_BREAK &&
                    next.type !== codeTypes.WHITESPACE) {
                    replacement.push(this.emmitNL(options, indent + 1))
                }
                // insert before
                if (kwPatternBoth.test(items[i].val)) {
                    const prev = items[i - 1]
                    if (prev && prev.type !== codeTypes.LINE_BREAK &&
                        prev.type !== codeTypes.WHITESPACE
                    ) {
                        replacement.unshift(this.emmitNL(options, indent))
                    }
                }
                items.splice(i, 1, ...replacement)
                i += replacement.length
            } else {
                i++;
            }
        }
    }
    */
    protected flatten(options: ICodeFormatSettings, parent?: codeBlock): codeToken[]
    {
        const result: codeToken[] = [];
        //-----------------------------------------------------
        // main loop to visit children
        for (let i = 0; i <= this.vals.length - 1; i++) {
            //----------------------------
            const item = this.vals[i];
            // const next = i < this.vals.length ? this.vals[i + 1] : null;
            // const prev = i > 0 ? this.vals[i - 1] : null;
            //----------------------------
            if (item instanceof codeToken) {
                // filter null tokens
                if (item.type !== codeTypes.VOID) {
                    if (options.codeblock.newlineAllways) {
                        result.push(item)
                    } else if (item.type !== codeTypes.LINE_BREAK) {
                        result.push(item)
                    }
                }
            } else {
                // blockNode
                //----------------------------------
                /*
                if (item.isEmpty()) {                    
                    const empty: codeToken[] = []
                    this.blockWrap(item, empty)
                    result.push(...empty);                    
                    continue;
                }
                // */
                //----------------------------------
                const inner = item.flatten(options, this);
                //----------------------------------
                // const hasLinebreaks = item.hasLineBreaks();
                //----------------------------------
                switch (item.type) {
                    case blockTypes.DECL:
                        //TODO: ad linebreak here??
                        break;
                    case blockTypes.EXPR:
                        // I can do this in the visitor but I need check for expr_seq
                        // if (options.statements.useLineBreaks) { this.breakAtKeyword(inner, item.indent) }
                        break;
                    case blockTypes.LIST:
                        if (options.list.useLineBreaks && inner.length > 1) {
                            this.insertAt(inner, this.emmitNL(options, item.indent), [codeTypes.COMMA])
                        }
                        // wrap the block
                        this.blockWrap(item, inner, options.list.useLineBreaks);
                        break;
                    case blockTypes.SEQUENCE:
                        // mandatory linebreaks here should come from the tree, because here whe dont have a context to determine them
                        this.blockWrap(item, inner, true);
                        break;
                    case blockTypes.FIELDS:
                        // this.insertAt(inner, this.emmitNL(item.indent), [codeTypes.COMMA, codeTypes.MODIF])
                        this.blockWrap(item, inner, true);
                        break;
                }
                //----------------------------------
                if (!options.codeblock.parensInNewLine) {
                    const last: codeToken | undefined = result[result.length - 1];
                    if (last) {
                        const start: codeToken | undefined = inner[0];
                        if (
                            // (last.type === codeTypes.LINE_BREAK || last.type === codeTypes.BREAK) &&
                            last.type === codeTypes.LINE_BREAK &&
                            blockPairs.has(start.type)
                        ) {
                            result.pop()
                        }
                    }
                }
                //------------------------------
                result.push(...inner)
                //------------------------------
            }
        }
        //-----------------------------------------------------
        return result;
    }
    // toString(options: ICodeFormatSettings): string
    // toString(options: ICodeFormatSettings, start: number, stop: number): string
    // toString(options: ICodeFormatSettings = defaultFormatSettings, start?: number, stop?: number): string
    toString(options: ICodeFormatSettings & IMinifySettings & IPrettifySettings): string
    {
        const result = this.flatten(options)
        let acc = ''
        // mandatory whitespace

        // insert whitespaces and apply indentation
        for (let i = 0; i < result.length; i++) {
            // const prev = result[i - 1]
            const current = result[i]
            const next = result[i + 1]
            //-----------------------
            switch (current.type) {
                // mandatory linebreak
                case codeTypes.BREAK:
                    acc += current.val
                    // indent
                    if (!options.condenseWhitespace) {
                        acc += options.indentChar.repeat(current.indent ?? 0)
                    }
                    break;

                case codeTypes.LINE_BREAK:
                    {
                        if (options.codeblock.newlineAllways) {
                            let emmit = true
                            if (!options.codeblock.parensInNewLine) {
                                if (next && (next.type === codeTypes.LPAREN || next.type === codeTypes.LBRACE)) {
                                    emmit = false
                                }
                            }
                            if (emmit) {
                                // if (!options.condenseWhitespace options.codeblock.newlineAllways options.codeblock.parensInNewLine)
                                acc += current.val
                                if (!options.condenseWhitespace) {
                                    acc += options.indentChar.repeat(current.indent ?? 0)
                                }
                            }
                        }
                    }
                    break;
                default:
                    acc += current.val
                    break;
            }
            //-----------------------
            if (next) {
                // add whitespace
                if (options.condenseWhitespace) {
                    //TODO: mandatory whitespace
                    if (
                        (mandatoryWS.has(current.type) &&
                            mandatoryWS.has(next.type)) ||
                        next.type === codeTypes.UNARY ||
                        next.hasPrefix ||
                        mandatoryCases.has([current.type, next.type])
                    ) {
                        acc += options.whitespaceChar
                    }
                } else {
                    // all whitespace
                    const invalidWs = shouldSkip.has(current.type) || shouldSkipNext.has(next.type)

                    if (!invalidWs && !current.hasPrefix) {
                        if (options.codeblock.spaced) {
                            acc += options.whitespaceChar
                        } else if (
                            (current.type !== codeTypes.LPAREN &&
                                current.type !== codeTypes.LBRACE) &&
                            (next.type !== codeTypes.RPAREN &&
                                next.type !== codeTypes.RBRACE)
                        ) {
                            acc += options.whitespaceChar
                        }
                    }
                }
            }
        }
        // return result.reduce((acc: string, curr: codeToken) => { return acc += curr.val; }, '');
        return acc;
    }
}

//---------------------------------------------------------------------------
export class mxsParserVisitorFormatter extends mxsParserVisitor<R | R[]>
{
    private indentLevel = 0;

    constructor(private options: ICodeFormatSettings & IMinifySettings)
    {
        super()
    }
    /* options:
    * - to return null to stop the visit,
    * - to return children to continue,
    * - to return something to perform an action ordered at a higher level of the tree.
    */
    //-------------------------------------------------------
    visitProgram = (ctx: ProgramContext): codeBlock =>
    {
        return new codeBlock(this.collectWithLineBreak(ctx.expr(), false))
        // return new codeBlock(this.visitChildren(ctx))

    }
    // visitExpr = (ctx: ExprContext): R[] => { return this.visitChildren(ctx)! }
    //-------------------------------------------------------
    //#region High-level Definitions
    visitPluginDefinition = (ctx: PluginDefinitionContext): codeBlock =>
    {
        const vals = [this.visit(ctx.plugin_predicate())!].flat()
        //--------------------------------------------
        this.indentLevel++;
        //--------------------------------------------
        const clause = new codeBlock(
            this.collectWithLineBreak(ctx.plugin_clause()),
            this.indentLevel,
            [<codeToken>this.visit(ctx.lp()), this.emmitLineBreak()],
            [this.emmitLineBreak(false, this.indentLevel > 0 ? this.indentLevel - 1 : 0), <codeToken>this.visit(ctx.rp())],
            blockTypes.SEQUENCE
        )
        //--------------------------------------------
        this.indentLevel--;
        //--------------------------------------------
        return new codeBlock(
            [...vals, this.emmitLineBreak(), clause],
            this.indentLevel,
            undefined, undefined,
            blockTypes.DECL
        )
    }
    visitPlugin_predicate = (ctx: Plugin_predicateContext): codeBlock => // this.visitChildren(ctx)
    {
        const vals = [
            this.visit(ctx.Plugin())!,
            this.visit(ctx._plugin_kind!)!,
            this.visit(ctx._plugin_name!)!,
            ...ctx.param().map(param =>
                [
                    this.emmitLineBreak(false, this.indentLevel + 1),
                    this.visit(param)!
                ].flat())
        ].flat()

        return new codeBlock(
            vals,
            // this.visitChildren(ctx)!,
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.DECL
        )
    }
    //-------------------------------------------------------
    visitParamsDefinition = (ctx: ParamsDefinitionContext): codeBlock =>
    {
        const vals = [this.visit(ctx.params_predicate())!].flat()
        //--------------------------------------------
        this.indentLevel++;
        //--------------------------------------------
        const clause = new codeBlock(
            this.collectWithLineBreak(ctx.params_clause()),
            this.indentLevel,
            [<codeToken>this.visit(ctx.lp()), this.emmitLineBreak()],
            [this.emmitLineBreak(false, this.indentLevel > 0 ? this.indentLevel - 1 : 0), <codeToken>this.visit(ctx.rp())],
            blockTypes.SEQUENCE
        )
        //--------------------------------------------
        this.indentLevel--
        //--------------------------------------------
        return new codeBlock(
            [...vals, this.emmitLineBreak(), clause],
            this.indentLevel,
            undefined, undefined,
            blockTypes.DECL
        )
    }
    visitParams_predicate = (ctx: Params_predicateContext): R[] => this.visitChildren(ctx)
    //-------------------------------------------------------
    visitToolDefinition = (ctx: ToolDefinitionContext): codeBlock =>
    {
        const vals = [this.visit(ctx.tool_predicate())!].flat()
        //------------------
        this.indentLevel++;
        //------------------
        const clause = new codeBlock(
            this.collectWithLineBreak(ctx.tool_clause()),
            this.indentLevel,
            [<codeToken>this.visit(ctx.lp()), this.emmitLineBreak()],
            [this.emmitLineBreak(false, this.indentLevel > 0 ? this.indentLevel - 1 : 0), <codeToken>this.visit(ctx.rp())],
            blockTypes.SEQUENCE
        )
        //------------------
        this.indentLevel--;
        //------------------
        return new codeBlock(
            [...vals, this.emmitLineBreak(), clause],
            this.indentLevel,
            undefined, undefined,
            blockTypes.DECL
        )
    }
    visitTool_predicate = (ctx: Tool_predicateContext): R[] => this.visitChildren(ctx)
    //-------------------------------------------------------
    visitMacroscriptDefinition = (ctx: MacroscriptDefinitionContext): codeBlock =>
    {
        const vals = [this.visit(ctx.macroscript_predicate())!].flat()
        //------------------
        this.indentLevel++;
        //------------------
        const clause = new codeBlock(
            this.collectWithLineBreak(ctx.macroscript_clause()),
            this.indentLevel,
            [<codeToken>this.visit(ctx.lp()), this.emmitLineBreak()],
            [this.emmitLineBreak(false, this.indentLevel > 0 ? this.indentLevel - 1 : 0), <codeToken>this.visit(ctx.rp())],
            blockTypes.SEQUENCE
        )
        //------------------
        this.indentLevel--;
        //------------------
        return new codeBlock(
            [...vals, this.emmitLineBreak(), clause],
            this.indentLevel,
            undefined, undefined,
            blockTypes.DECL
        )
    }

    visitMacroscript_predicate = (ctx: Macroscript_predicateContext): codeBlock =>
    {
        const vals = [
            this.visit(ctx.MacroScript())!,
            this.visit(ctx.identifier())!,
            // this.emmitLineBreak(false, this.indentLevel)!,
            ...ctx.param().map(param =>
                [
                    this.emmitLineBreak(false, this.indentLevel + 1),
                    this.visit(param)!
                ].flat())
        ].flat()

        return new codeBlock(
            vals,
            // this.visitChildren(ctx)!,
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.DECL
        )
    }
    //-------------------------------------------------------
    visitUtilityDefinition = (ctx: UtilityDefinitionContext): codeBlock =>
    {
        const vals = [this.visit(ctx.utility_predicate())!].flat()
        //------------------
        this.indentLevel++;
        //------------------
        const clause = new codeBlock(
            this.collectWithLineBreak(ctx.rollout_clause()),
            this.indentLevel,
            [<codeToken>this.visit(ctx.lp()), this.emmitLineBreak()],
            [this.emmitLineBreak(false, this.indentLevel > 0 ? this.indentLevel - 1 : 0), <codeToken>this.visit(ctx.rp())],
            blockTypes.SEQUENCE
        )
        //------------------
        this.indentLevel--;
        //------------------
        return new codeBlock(
            [...vals, this.emmitLineBreak(), clause],
            this.indentLevel,
            undefined, undefined,
            blockTypes.DECL
        )
    }
    visitUtility_predicate = (ctx: Utility_predicateContext): R[] => this.visitChildren(ctx)
    visitRolloutDefinition = (ctx: RolloutDefinitionContext): codeBlock =>
    {
        const vals = [this.visit(ctx.rollout_predicate())!].flat()
        //------------------
        this.indentLevel++;
        //------------------
        const clause = new codeBlock(
            this.collectWithLineBreak(ctx.rollout_clause()),
            this.indentLevel,
            [<codeToken>this.visit(ctx.lp()), this.emmitLineBreak()],
            [this.emmitLineBreak(false, this.indentLevel > 0 ? this.indentLevel - 1 : 0), <codeToken>this.visit(ctx.rp())],
            blockTypes.SEQUENCE
        )
        //------------------
        this.indentLevel--;
        //------------------
        return new codeBlock(
            [...vals, this.emmitLineBreak(), clause],
            this.indentLevel,
            undefined, undefined,
            blockTypes.DECL
        )
    }
    visitRollout_predicate = (ctx: Rollout_predicateContext): R[] => this.visitChildren(ctx)
    visitRolloutGroup = (ctx: RolloutGroupContext): codeBlock =>
    {
        const vals = [this.visit(ctx.group_predicate())!].flat()
        //------------------
        this.indentLevel++;
        //------------------
        const clause = new codeBlock(
            this.collectWithLineBreak(ctx.rolloutControl()),
            this.indentLevel,
            [<codeToken>this.visit(ctx.lp()), this.emmitLineBreak()],
            [this.emmitLineBreak(false, this.indentLevel > 0 ? this.indentLevel - 1 : 0), <codeToken>this.visit(ctx.rp())],
            blockTypes.SEQUENCE
        )
        // console.log(clause)
        //------------------
        this.indentLevel--;
        //------------------
        return new codeBlock(
            [...vals, this.emmitLineBreak(), clause],
            this.indentLevel,
            undefined, undefined,
            blockTypes.DECL
        )
    }
    visitGroup_predicate = (ctx: Group_predicateContext): R[] => this.visitChildren(ctx)
    visitRolloutControl = (ctx: RolloutControlContext): codeBlock =>
    {
        return new codeBlock(
            this.visitChildren(ctx),
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.EXPR
        )
    }
    //-------------------------------------------------------
    visitRcmenuDefinition = (ctx: RcmenuDefinitionContext): codeBlock =>
    {
        const vals = [this.visit(ctx.rcmenu_predicate())!].flat()
        //------------------
        this.indentLevel++;
        //------------------
        const clause = new codeBlock(
            this.collectWithLineBreak(ctx.rc_clause()),
            this.indentLevel,
            [<codeToken>this.visit(ctx.lp()), this.emmitLineBreak()],
            [this.emmitLineBreak(false, this.indentLevel > 0 ? this.indentLevel - 1 : 0), <codeToken>this.visit(ctx.rp())],
            blockTypes.SEQUENCE
        )
        //------------------
        this.indentLevel--;
        //------------------
        return new codeBlock(
            [...vals, this.emmitLineBreak(), clause],
            this.indentLevel,
            undefined, undefined,
            blockTypes.DECL
        )
    }
    visitRcmenu_predicate = (ctx: Rcmenu_predicateContext): R[] => this.visitChildren(ctx)
    visitRcmenuControl = (ctx: RcmenuControlContext): codeBlock =>
    {
        return new codeBlock(
            this.visitChildren(ctx),
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.EXPR
        )
    }
    visitRc_submenu = (ctx: Rc_submenuContext): codeBlock =>
    {
        const vals = [this.visit(ctx.submenu_predicate())!].flat()
        //------------------
        this.indentLevel++;
        //------------------
        const clause = new codeBlock(
            this.collectWithLineBreak(ctx.rc_clause()),
            this.indentLevel,
            [<codeToken>this.visit(ctx.lp()), this.emmitLineBreak()],
            [this.emmitLineBreak(false, this.indentLevel > 0 ? this.indentLevel - 1 : 0), <codeToken>this.visit(ctx.rp())],
            blockTypes.SEQUENCE
        )
        //------------------
        this.indentLevel--;
        //------------------
        return new codeBlock(
            [...vals, this.emmitLineBreak(), clause],
            this.indentLevel,
            undefined, undefined,
            blockTypes.DECL
        )
    }
    visitSubmenu_predicate = (ctx: Submenu_predicateContext): R[] => this.visitChildren(ctx)
    //-------------------------------------------------------
    visitAttributesDefinition = (ctx: AttributesDefinitionContext): codeBlock =>
    {
        const vals = [this.visit(ctx.attributes_predicate())!].flat()
        //------------------
        this.indentLevel++;
        //------------------
        const clause = new codeBlock(
            this.collectWithLineBreak(ctx.attributes_clause()),
            this.indentLevel,
            [<codeToken>this.visit(ctx.lp()), this.emmitLineBreak()],
            [this.emmitLineBreak(false, this.indentLevel > 0 ? this.indentLevel - 1 : 0), <codeToken>this.visit(ctx.rp())],
            blockTypes.SEQUENCE
        )
        //------------------
        this.indentLevel--;
        //------------------
        return new codeBlock(
            [...vals, this.emmitLineBreak(), clause],
            this.indentLevel,
            undefined, undefined,
            blockTypes.DECL
        )
    }
    visitAttributes_predicate = (ctx: Attributes_predicateContext): codeBlock => // this.visitChildren(ctx)
    {
        const vals = [
            this.visit(ctx.Attributes())!,
            this.visit(ctx.identifier())!,
            // this.emmitLineBreak(false, this.indentLevel)!,
            ...ctx.param().map(param =>
                [
                    this.emmitLineBreak(true, this.indentLevel + 1),
                    this.visit(param)!
                ].flat())
        ].flat()

        return new codeBlock(
            vals,
            // this.visitChildren(ctx)!,
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.DECL
        )
    }
    //#endregion
    //-------------------------------------------------------
    //#region Basic Definitions
    visitStructDefinition = (ctx: StructDefinitionContext): codeBlock =>
    {
        const body = <codeBlock>this.visit(ctx.struct_body())

        body.start = [<codeToken>this.visit(ctx.lp()), this.emmitLineBreak(false, this.indentLevel + 1)]
        body.end = [this.emmitLineBreak(false, this.indentLevel > 0 ? this.indentLevel - 1 : 0), <codeToken>this.visit(ctx.rp())]

        const vals = [
            this.visit(ctx.STRUCT())!,
            this.visit(ctx._str_name!)!,
            this.emmitLineBreak(),
            body
        ].flat()

        return new codeBlock(
            vals,
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.DECL
        )
    }
    visitStruct_body = (ctx: Struct_bodyContext): codeBlock =>
    {
        this.indentLevel++;
        //------------------
        const body: (R | R[])[] = []

        for (const [i, member] of ctx.children.entries()) {
            body.push(this.visit(member)!)
            if (member instanceof CommaContext || member instanceof Struct_accessContext) {
                body.push(this.emmitLineBreak())
            }
        }

        const block = new codeBlock(
            // this.visitChildren(ctx)!,
            body.flat(),
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.FIELDS
        )
        //------------------
        this.indentLevel--;
        return block
    }
    //-------------------------------------------------------
    visitFnDefinition = (ctx: FnDefinitionContext): codeBlock =>
    {
        return new codeBlock(
            this.visitChildren(ctx)!,
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.DECL
        )
    }
    visitFn_body = (ctx: Fn_bodyContext): codeBlock =>
    {
        const vals = [
            this.visit(ctx.EQ())!,
            this.emmitLineBreak(false, this.indentLevel)!,
            this.visit(ctx.expr())!
        ].flat()
        return new codeBlock(
            vals,
            // this.visitChildren(ctx)!,
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.DECL
        )
    }
    //-------------------------------------------------------
    visitDeclarationExpression = (ctx: DeclarationExpressionContext): codeBlock =>
    {
        return new codeBlock(
            this.visitChildren(ctx)!,
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.DECL
        )
    }
    //#endregion
    //-------------------------------------------------------
    //#region Basic Expressions
    visitEventHandlerClause = (ctx: EventHandlerClauseContext): codeBlock =>
    {
        const vals: (R | R[])[] = []
        let last: ParseTree | undefined;

        for (const [i, child] of ctx.children.entries()) {
            if (last && last instanceof TerminalNode) {

                let indent: number = this.indentLevel
                let ref = i
                while (ctx.children[ref] instanceof TerminalNode && (<TerminalNode>ctx.children[ref]).symbol.type === mxsLexer.NL) {
                    ref++;
                }
                if (!ctx.children[ref].getText().startsWith('(')) {
                    indent++;
                }
                switch (last.symbol.type) {
                    case mxsLexer.DO:
                    case mxsLexer.RETURN:
                        vals.push(this.emmitLineBreak(false, indent))
                        break;
                }
            }
            vals.push(this.visit(child)!)
            last = child
        }
        return new codeBlock(
            // this.visitChildren(ctx)!,
            vals.flat(),
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.EXPR
        )
    }
    visitFnReturnStatement = (ctx: FnReturnStatementContext): codeBlock =>
    {
        const vals: (R | R[])[] = []
        let last: ParseTree | undefined;

        for (const [i, child] of ctx.children.entries()) {
            if (last && last instanceof TerminalNode) {
                let indent: number = this.indentLevel
                let ref = i
                while (ctx.children[ref] instanceof TerminalNode && (<TerminalNode>ctx.children[ref]).symbol.type === mxsLexer.NL) {
                    ref++;
                }
                if (!ctx.children[ref].getText().startsWith('(')) {
                    indent++;
                }

                if (last.symbol.type === mxsLexer.RETURN) {
                    vals.push(this.emmitLineBreak(false, indent))
                }
            }
            vals.push(this.visit(child)!)
            last = child
        }
        return new codeBlock(
            // this.visitChildren(ctx)!,
            vals.flat(),
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.EXPR
        )
    }
    visitWhenStatement = (ctx: WhenStatementContext): codeBlock =>
    {
        // break at keyword
        const vals: (R | R[])[] = []
        let last: ParseTree | undefined;

        for (const [i, child] of ctx.children.entries()) {
            if (last && last instanceof TerminalNode) {

                let indent: number = this.indentLevel
                let ref = i
                while (ctx.children[ref] instanceof TerminalNode && (<TerminalNode>ctx.children[ref]).symbol.type === mxsLexer.NL) {
                    ref++;
                }
                if (!ctx.children[ref].getText().startsWith('(')) {
                    indent++;
                }
                if (last.symbol.type === mxsLexer.DO) {
                    vals.push(this.emmitLineBreak(false, indent))
                }
            }
            vals.push(this.visit(child)!)
            last = child
        }
        return new codeBlock(
            // this.visitChildren(ctx)!,
            vals.flat(),
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.EXPR
        )
    }
    // case item
    visitCaseExpression = (ctx: CaseExpressionContext): codeBlock =>
    {
        const vals = [this.visit(ctx.case_predicate())!].flat()
        //--------------------------------------------
        this.indentLevel++;
        //--------------------------------------------
        // console.log(this.collectWithLineBreak(ctx.case_item(), false))
        const clause = new codeBlock(
            this.collectWithLineBreak(ctx.case_item(), false),
            this.indentLevel,
            [<codeToken>this.visit(ctx.lp()), this.emmitLineBreak()],
            [this.emmitLineBreak(false, this.indentLevel > 0 ? this.indentLevel - 1 : 0), <codeToken>this.visit(ctx.rp())],
            blockTypes.SEQUENCE
        )
        //--------------------------------------------
        this.indentLevel--;
        //--------------------------------------------
        return new codeBlock(
            [...vals, this.emmitLineBreak(), clause, this.emmitLineBreak(true)],
            this.indentLevel,
            undefined, undefined,
            blockTypes.EXPR
        )
    }
    visitCase_predicate = (ctx: Case_predicateContext): R[] => this.visitChildren(ctx)
    visitCase_item = (ctx: Case_itemContext): codeBlock =>
    {
        // start val with the factor
        const vals: (R | R[])[] = [this.visit(ctx.factor())!]
        // add spaces for numbers to avoid timeval problem
        if (/[0-9]$/.test(ctx.factor().getText())) {
            vals.push(this.emmitWhiteSpac())
        }
        // add colon
        vals.push(this.visit(ctx.COLON())!)
        // add spaces for numbers to avoid timeval problem
        if (/^[-+0-9]/.test(ctx.expr().getText())) {
            vals.push(this.emmitWhiteSpac())
        }
        // add expression
        vals.push(this.visit(ctx.expr())!)
        // return the block
        return new codeBlock(
            vals.flat(),
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.EXPR
        )
    }
    visitIfExpression = (ctx: IfExpressionContext): codeBlock =>
    {
        const vals: (R | R[])[] = []
        
        // IF keyword and condition
        vals.push(this.visit(ctx.IF())!)
        vals.push(this.visit(ctx.simpleExpression())!)
        
        // THEN branch
        if (ctx.THEN()) {
            vals.push(this.visit(ctx.THEN()!)!)
            
            const thenBody = ctx._thenBody!
            const thenBodyText = thenBody.getText()
            const indent = thenBodyText.startsWith('(') ? this.indentLevel : this.indentLevel + 1
            vals.push(this.emmitLineBreak(false, indent))
            vals.push(this.visit(thenBody)!)
            
            // ELSE branch (optional)
            if (ctx.ELSE()) {
                vals.push(this.emmitLineBreak(false, this.indentLevel))
                vals.push(this.visit(ctx.ELSE()!)!)
                
                const elseBody = ctx._elseBody!
                const elseBodyText = elseBody.getText()
                const elseIndent = elseBodyText.startsWith('(') ? this.indentLevel : this.indentLevel + 1
                vals.push(this.emmitLineBreak(false, elseIndent))
                vals.push(this.visit(elseBody)!)
            }
        }
        // DO branch
        else if (ctx.DO()) {
            vals.push(this.visit(ctx.DO()!)!)
            
            const doBody = ctx._doBody!
            const doBodyText = doBody.getText()
            const indent = doBodyText.startsWith('(') ? this.indentLevel : this.indentLevel + 1
            vals.push(this.emmitLineBreak(false, indent))
            vals.push(this.visit(doBody)!)
        }
        
        return new codeBlock(
            vals.flat(),
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.EXPR
        )
    }
    visitDoLoopExpression = (ctx: DoLoopExpressionContext): codeBlock =>
    {
        const vals: (R | R[])[] = []
        
        vals.push(this.visit(ctx.DO()!)!)
        
        const body = ctx._body!
        const bodyText = body.getText()
        let indent = bodyText.startsWith('(') ? this.indentLevel : this.indentLevel + 1
        vals.push(this.emmitLineBreak(false, indent))
        vals.push(this.visit(body)!)
        
        vals.push(this.visit(ctx.WHILE()!)!)
        
        const condition = ctx._condition!
        const conditionText = condition.getText()
        indent = conditionText.startsWith('(') ? this.indentLevel : this.indentLevel + 1
        vals.push(this.emmitLineBreak(false, indent))
        vals.push(this.visit(condition)!)
        
        return new codeBlock(
            vals.flat(),
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.EXPR
        )
    }
    visitWhileLoopExpression = (ctx: WhileLoopExpressionContext): codeBlock =>
    {
        const vals: (R | R[])[] = []
        
        vals.push(this.visit(ctx.WHILE()!)!)
        vals.push(this.visit(ctx._condition!)!)
        vals.push(this.visit(ctx.DO()!)!)
        
        const body = ctx._body!
        const bodyText = body.getText()
        const indent = bodyText.startsWith('(') ? this.indentLevel : this.indentLevel + 1
        vals.push(this.emmitLineBreak(false, indent))
        vals.push(this.visit(body)!)
        
        return new codeBlock(
            vals.flat(),
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.EXPR
        )
    }
    visitForLoopExpression = (ctx: ForLoopExpressionContext): codeBlock =>
    {
        const vals: (R | R[])[] = []
        
        vals.push(this.visit(ctx.FOR()!)!)
        vals.push(this.visit(ctx.for_body())!)
        
        // _for_operator and _for_action are Token objects, not rule contexts
        vals.push(new codeToken(ctx._for_operator!.text!, tokenToCodeType.get(ctx._for_operator!.type) ?? codeTypes.KEYWORD))
        vals.push(this.visit(ctx.for_sequence())!)
        vals.push(new codeToken(ctx._for_action!.text!, tokenToCodeType.get(ctx._for_action!.type) ?? codeTypes.KEYWORD))
        
        const body = ctx._body!
        const bodyText = body.getText()
        const indent = bodyText.startsWith('(') ? this.indentLevel : this.indentLevel + 1
        vals.push(this.emmitLineBreak(false, indent))
        vals.push(this.visit(body)!)
        
        return new codeBlock(
            vals.flat(),
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.EXPR
        )
    }
    visitFor_sequence = (ctx: For_sequenceContext): codeBlock =>
    {
        const vals: (R | R[])[] = []
        let last: ParseTree | undefined;

        for (const [i, child] of ctx.children.entries()) {
            if (last && last instanceof TerminalNode) {
                let indent: number = this.indentLevel
                let ref = i
                while (ctx.children[ref] instanceof TerminalNode && (<TerminalNode>ctx.children[ref]).symbol.type === mxsLexer.NL) {
                    ref++;
                }
                if (!ctx.children[ref].getText().startsWith('(')) {
                    indent++;
                }
                switch (last.symbol.type) {
                    case mxsLexer.WHILE:
                    case mxsLexer.WHERE:
                        vals.splice(vals.length - 1, 0,
                            this.emmitLineBreak(false, this.indentLevel))
                        vals.push(this.emmitLineBreak(false, indent))
                        break;
                }
            }
            vals.push(this.visit(child)!)
            last = child
        }
        return new codeBlock(
            // this.visitChildren(ctx)!,
            vals.flat(),
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.EXPR
        )
    }
    visitFor_where = (ctx: For_whereContext): codeBlock =>
    {
        const vals: (R | R[])[] = []
        let last: ParseTree | undefined;

        for (const [i, child] of ctx.children.entries()) {
            if (last && last instanceof TerminalNode) {

                let indent: number = this.indentLevel
                let ref = i
                while (ctx.children[ref] instanceof TerminalNode && (<TerminalNode>ctx.children[ref]).symbol.type === mxsLexer.NL) {
                    ref++;
                }
                if (!ctx.children[ref].getText().startsWith('(')) {
                    indent++;
                }
                switch (last.symbol.type) {
                    case mxsLexer.WHILE:
                    case mxsLexer.WHERE:
                        vals.splice(vals.length - 1, 0,
                            this.emmitLineBreak(false, this.indentLevel))
                        vals.push(this.emmitLineBreak(false, indent))
                        break;
                }
            }
            vals.push(this.visit(child)!)
            last = child
        }
        return new codeBlock(
            // this.visitChildren(ctx)!,
            vals.flat(),
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.EXPR
        )
    }
    visitFor_while = (ctx: For_whileContext): codeBlock =>
    {
        const vals: (R | R[])[] = []
        let last: ParseTree | undefined;

        for (const [i, child] of ctx.children.entries()) {
            if (last && last instanceof TerminalNode) {

                let indent: number = this.indentLevel
                let ref = i
                while (ctx.children[ref] instanceof TerminalNode && (<TerminalNode>ctx.children[ref]).symbol.type === mxsLexer.NL) {
                    ref++;
                }
                if (!ctx.children[ref].getText().startsWith('(')) {
                    indent++;
                }
                switch (last.symbol.type) {
                    case mxsLexer.WHILE:
                    case mxsLexer.WHERE:
                        vals.splice(vals.length - 1, 0,
                            this.emmitLineBreak(false, this.indentLevel))
                        vals.push(this.emmitLineBreak(false, indent))
                        break;
                }
            }
            vals.push(this.visit(child)!)
            last = child
        }
        return new codeBlock(
            // this.visitChildren(ctx)!,
            vals.flat(),
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.EXPR
        )
    }
    visitTryExpression = (ctx: TryExpressionContext): codeBlock =>
    {
        const vals: (R | R[])[] = []
        
        vals.push(this.visit(ctx.TRY()!)!)
        
        const tryBody = ctx._tryBody!
        const tryBodyText = tryBody.getText()
        let indent = tryBodyText.startsWith('(') ? this.indentLevel : this.indentLevel + 1
        vals.push(this.emmitLineBreak(false, indent))
        vals.push(this.visit(tryBody)!)
        
        vals.push(this.emmitLineBreak(false, this.indentLevel))
        vals.push(this.visit(ctx.CATCH()!)!)
        
        const catchBody = ctx._catchBody!
        const catchBodyText = catchBody.getText()
        indent = catchBodyText.startsWith('(') ? this.indentLevel : this.indentLevel + 1
        vals.push(this.emmitLineBreak(false, indent))
        vals.push(this.visit(catchBody)!)
        
        return new codeBlock(
            vals.flat(),
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.EXPR
        )
    }
    visitContextExpression = (ctx: ContextExpressionContext): codeBlock =>
    {
        return new codeBlock(
            this.visitChildren(ctx)!,
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.EXPR
        )
    }
    //#endregion
    //-------------------------------------------------------
    visitExpr_seq = (ctx: Expr_seqContext): codeBlock =>
    {
        this.indentLevel++;
        //--------------------------------------------
        const
            // res = this.visitChildren(ctx), start = [<codeToken>res.shift()], end = [<codeToken>res.pop()]
            res = this.collectWithLineBreak(ctx.expr(), false),
            start = [<codeToken>this.visit(ctx.lp())],
            end = [<codeToken>this.visit(ctx.rp())]
        // add linebreaks
        if (res.some(item => item.hasLineBreaks()) || res.length > 1) {
            start.push(this.emmitLineBreak())
            end.unshift(this.emmitLineBreak(false, this.indentLevel > 0 ? this.indentLevel - 1 : 0))
        }
        const block = new codeBlock(res, this.indentLevel, start, end, blockTypes.SEQUENCE)
        //--------------------------------------------
        this.indentLevel--;
        return block
    }
    //-------------------------------------------------------
    visitSimpleExpression = (ctx: SimpleExpressionContext): R =>
    {
        /*
        // enable this if fn_call is enabled
        const operand = ctx.expr_operand()
        if (operand) {
            return this.visitChildren(operand)?.[0]
        } else {
            return new codeBlock(
                this.visitChildren(ctx)!,
                this.indentLevel,
                undefined,
                undefined,
                blockTypes.EXPR
            )
        } // */
        // /*
        return new codeBlock(
            this.visitChildren(ctx)!,
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.EXPR
        ) // */
    }
    // visitExpr_operand = (ctx: Expr_operandContext): string => this.visitChildren(ctx)!
    //-------------------------------------------------------    
    // visitAssignment = (ctx: AssignmentContext): string => this.visitChildren(ctx)!
    // visitOperand = (ctx: OperandContext): string => this.visitChildren(ctx)!
    // visitAccessor = (ctx: AccessorContext): string => this.visitChildren(ctx)!

    // visitProperty = (ctx: PropertyContext): string => this.visitChildren(ctx)!
    // visitIndex = (ctx: IndexContext): string => this.visitChildren(ctx)!

    // visitFactor = (ctx: FactorContext): R => this.visitChildren(ctx)?.[0]
    //-------------------------------------------------------
    /*
    visitFunctionCall = (ctx: FunctionCallContext): codeBlock =>
    {
        return new codeBlock(
            this.visitChildren(ctx)!,
            this.indentLevel,
            undefined,
            undefined,
            blockTypes.EXPR
        )
    }
    // */
    // visitParam = (ctx: ParamContext): string => { return this.visitChildren(ctx) }
    // visitOperand_arg = (ctx: Operand_argContext): ParseTree => { return ctx.children[0] }
    // visitParam_name = (ctx: Param_nameContext): string => { return ctx.getText() }
    //-------------------------------------------------------
    //#region Values
    visitDe_ref = (ctx: De_refContext): R[] =>
    {
        const vals = this.visitChildren(ctx)!;
        // change prefix state
        Object.assign(<codeToken>vals[0], { isPrefix: true });
        // (vals[0] as codeToken).isPrefix = true
        return vals
    }
    visitIdentifier = (ctx: IdentifierContext): codeToken =>
        {
            const token = new codeToken(ctx.getText(), codeTypes.ID, ctx.start?.start)
            if (ctx.AMP() || ctx.GLOB()) {
                token.hasPrefix = true;
            }
            return token
        }
    //-------------------------------------------------------
    visitArray = (ctx: ArrayContext): codeBlock =>
    {
        this.indentLevel++;
        //-----------------------
        const list = ctx.arrayList()

        const block = new codeBlock(
            list ? <R[]>this.visit(list)! : [],
            this.indentLevel,
            [
                this.visitTerminal(ctx.SHARP()),
                <codeToken>this.visit(ctx.lp()),
                this.emmitLineBreak()
            ],
            [this.emmitLineBreak(false, this.indentLevel > 0 ? this.indentLevel - 1 : 0), <codeToken>this.visit(ctx.rp())],
            blockTypes.LIST
        )
        //-----------------------
        this.indentLevel--;
        //-----------------------
        return block
    }
    visitArrayList = (ctx: ArrayListContext): R[] => this.visitChildren(ctx)
    visitBitArray = (ctx: BitArrayContext): codeBlock =>
    {
        this.indentLevel++;
        //-----------------------
        const list = ctx.bitList()

        const block = new codeBlock(
            list ? <R[]>this.visit(list)! : [],
            this.indentLevel,
            [
                this.visitTerminal(ctx.SHARP()),
                <codeToken>this.visit(ctx.lc()),
                this.emmitLineBreak()
            ],
            [this.emmitLineBreak(), <codeToken>this.visit(ctx.rc())],
            blockTypes.LIST
        )
        //-----------------------
        this.indentLevel--;
        //-----------------------
        return block
    }
    visitBitList = (ctx: BitListContext): R[] => this.visitChildren(ctx)
    //-------------------------------------------------------
    // visitString = (ctx: StringContext): codeToken => {}
    // visitNumber = (ctx: NumberContext): codeToken => {}
    // visitTimeval = (ctx: TimevalContext): codeToken => {}
    // visitBool = (ctx: BoolContext): codeToken => {}
    // visitPath = (ctx: PathContext): codeToken => {}
    // visitName = (ctx: NameContext): codeToken => {}
    //-------------------------------------------------------
    //#endregion
    //-------------------------------------------------------
    //#region Terminals
    visitParen_pair = (ctx: Paren_pairContext): codeToken =>
    {
        return new codeToken(
            ctx.LPAREN().getText() + ctx.RPAREN().getText(),
            codeTypes.EMPTY,
            ctx.start?.start
        )
    }
    visitLp = (ctx: LpContext): codeToken => new codeToken('(', codeTypes.LPAREN, ctx.start?.start)
    visitRp = (ctx: RpContext): codeToken => new codeToken(')', codeTypes.RPAREN, ctx.start?.start)
    visitLc = (ctx: LcContext): codeToken => new codeToken('{', codeTypes.LBRACE, ctx.start?.start)
    visitRc = (ctx: RcContext): codeToken => new codeToken('}', codeTypes.RBRACE, ctx.start?.start)
    visitLb = (ctx: LbContext): codeToken => new codeToken('[', codeTypes.LBRACK, ctx.start?.start)
    visitRb = (ctx: RbContext): codeToken => new codeToken(']', codeTypes.RBRACK, ctx.start?.start)
    visitComma = (ctx: CommaContext): codeToken => new codeToken(',', codeTypes.COMMA, ctx.start?.start)
    //-------------------------------------------------------
    // this will emmit a line break token for mandatory linebreaks
    // visitLbk = (ctx: LbkContext): codeToken => this.breakResult()
    visitLbk = (ctx: LbkContext): codeToken => this.defaultResult(ctx.start?.start)
    //-------------------------------------------------------
    visitTerminal = (node: TerminalNode): codeToken =>
    {
        switch (node.symbol.type) {
            case mxsLexer.UNARY_MINUS:
                {
                    const token = new codeToken(node.getText(), codeTypes.UNARY, node.symbol.start)
                    token.hasPrefix = true
                    return token
                }
            case mxsLexer.NL:
                return this.defaultResult(node.symbol.start)
            case mxsLexer.EOF:
                return this.defaultResult(node.symbol.start)
            default:
                return new codeToken(node.getText(), tokenToCodeType.get(node.symbol.type) ?? codeTypes.VALUE, node.symbol.start)
        }
    }
    //#endregion
    //-------------------------------------------------------
    protected emmitLineBreak(mandatory: boolean = false, indent: number = this.indentLevel): codeToken
    {
        const token: codeToken =
            mandatory
                ? new codeToken(this.options.exprEndChar, codeTypes.BREAK)
                : new codeToken(this.options.newLineChar, codeTypes.LINE_BREAK);
        token.indent = indent
        return token
    }
    protected emmitWhiteSpac(): codeToken
    {
        return new codeToken(this.options.whitespaceChar, codeTypes.WHITESPACE)
    }
    protected collectWithLineBreak(ctx: ParserRuleContext[], isOptional: boolean = true): R[]
    {
        const result: R[] = [];
        for (const [i, ex] of ctx.entries()) {
            const curr = this.visit(ex)!
            if (Array.isArray(curr)) {
                result.push(...curr)
            } else {
                result.push(curr)
            }
            if (i < ctx.length - 1) {
                result.push(this.emmitLineBreak(!isOptional))
            }
        }
        return result
    }
    //-------------------------------------------------------
    protected defaultResult(pos?: number): codeToken { return new codeToken('', codeTypes.VOID, pos) }
    protected shouldVisitNextChild(_node: ParserRuleContext, _currentResult: codeToken | codeBlock): boolean { return true }
    protected aggregateResult(aggregate: R[], nextResult: codeToken | codeBlock | R[]): R[]
    {
        return Array.isArray(nextResult) ? nextResult : [nextResult];
    }
    visitChildren(node: ParserRuleContext, filterTerminal: number = mxsLexer.NL): R[]
    {
        const result: R[] = []
        const n2 = node.getChildCount()
        for (let i = 0; i < n2; i++) {
            if (!this.shouldVisitNextChild(node, result[result.length - 1])) {
                break
            }
            const c = node.getChild(i)
            if (c) {
                if (filterTerminal && c instanceof TerminalNode &&
                    c.symbol.type === filterTerminal) {
                    continue
                }
                const childResult = c.accept(this)
                if (childResult) {
                    // result.push(...this.aggregateResult(result, childResult))
                    result.push(...(Array.isArray(childResult) ? childResult : [childResult]))
                }
            }
        }
        return result
    }
}