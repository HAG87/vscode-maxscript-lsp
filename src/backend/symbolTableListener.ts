import
{
    LiteralSymbol,
    /* BlockSymbol, */
    BaseSymbol,
    VariableSymbol,
    SymbolConstructor,
    ScopedSymbol
} from "antlr4-c3";
import
{
    ParseTree,
    ParserRuleContext,
    TerminalNode
} from "antlr4ng";
// import { mxsLexer } from "../parser/mxsLexer.js";
import { mxsParserListener } from "../parser/mxsParserListener.js";
import
{
    ContextSymbolTable,
    FnDefinitionSymbol,
    StructDefinitionSymbol,
    VariableDeclSymbol,
    IdentifierSymbol,
    AssignmentExpressionSymbol,
    FnCallSymbol,
    fnArgsSymbol,
    fnParamsSymbol,
    ExpSeqSymbol,
    ExprSymbol,
    DeclarationSymbol,
    ParamSymbol,
} from "./ContextSymbolTable.js";
import
{
    FnDefinitionContext,
    ProgramContext,
    StructDefinitionContext,
    VariableDeclarationContext,
    AssignmentExpressionContext,
    IdentifierContext,
    FactorContext,
    ExprOperandContext,
    Expr_operandContext,
    DeclarationExpressionContext,
    AssignmentContext,
    Fn_argsContext,
    By_refContext,
    ExprContext,
    Expr_seqContext,
    Fn_paramsContext,
    Fn_bodyContext,
    mxsParser,
    Param_nameContext,
    ParamContext,
    Kw_overrideContext,
    FunctionCallContext,
    PathContext,
} from "../parser/mxsParser.js";
import { mxsLexer } from "../parser/mxsLexer.js";

export class symbolTableListener extends mxsParserListener
{
    private symbolStack: BaseSymbol[] = [];
    private scopeStack: BaseSymbol[] = [];
    public constructor(private symbolTable: ContextSymbolTable)
    {
        super();
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
    //-------------------------------------------------------------------------
    /*
    public override enterExpr = (ctx: ExprContext): void => {
        this.pushNewSymbol(ExpSeqSymbol, ctx, ctx.ruleIndex.toString());
    }
    public override exitExpr = (ctx: ExprContext): void => {
        this.popSymbol();
    }
    // */
    // /*
    public override enterExpr_seq = (ctx: Expr_seqContext): void =>
    {
        const symbol = this.pushNewSymbol(ExpSeqSymbol, ctx, ctx.ruleIndex.toString());
        this.pushScope(symbol);
    }

    public override exitExpr_seq = (ctx: Expr_seqContext): void =>
    {
        this.popScope();
        this.popSymbol();
    }
    // */
    public override enterStructDefinition = (ctx: StructDefinitionContext): void =>
    {
        const symbol = this.pushNewSymbol(StructDefinitionSymbol, ctx, ctx._str_name?.getText());
        this.pushScope(symbol);
    }
    public override exitStructDefinition = (ctx: StructDefinitionContext): void =>
    {
        this.popScope();
        this.popSymbol();
    }
    // fn defintition
    public override enterFnDefinition = (ctx: FnDefinitionContext): void =>
    {
        const symbol = this.pushNewSymbol(FnDefinitionSymbol, ctx, ctx._fn_name?.getText());
        this.pushScope(symbol);
    }
    public override exitFnDefinition = (ctx: FnDefinitionContext): void =>
    {
        //console.log(this.symbolStack[0]);
        this.popScope();
        this.popSymbol();
    }
    public override enterFn_args = (ctx: Fn_argsContext): void => 
    {
        this.pushNewSymbol(fnArgsSymbol, ctx);
    }
    public override exitFn_args = (ctx: Fn_argsContext): void => 
    {
        this.popSymbol();
    }
    public override enterFn_params = (ctx: Fn_paramsContext): void =>
    {
        // this is a workaround for param: without assignment
        this.pushNewSymbol(fnParamsSymbol, ctx);
    }
    public override exitFn_params = (ctx: Fn_paramsContext): void =>
    {
        this.popSymbol();
    }
    // for loop
    // public override enterFn_body = (ctx: Fn_bodyContext): void =>
    // {
    //     this.pushNewSymbol(ExpSeqSymbol, ctx);
    // }
    // public override exitFn_body = (ctx: Fn_bodyContext): void =>
    // {
    //     this.popSymbol();
    // }
    
    public override enterFunctionCall = (ctx: FunctionCallContext): void => 
    {
        this.pushNewSymbol(FnCallSymbol, ctx,  ctx._caller?.getText());
    }
    public override exitFunctionCall = (ctx: FunctionCallContext): void => 
    {
        this.popSymbol();
    }
    // /*
    public override enterParam = (ctx: ParamContext): void =>
    {
        // ctx.param_name().getText()
        this.pushNewSymbol(ParamSymbol, ctx);
    }
    public override exitParam = (ctx: ParamContext): void =>
    {
        this.popSymbol();
    }    
    // */
    /*
    public override enterParam_name = (ctx: Param_nameContext): void =>
    {
        this.pushNewSymbol(ParamSymbol, ctx, ctx.getText());
    }
    public override exitParam_name = (ctx: Param_nameContext): void =>
    {
        this.popSymbol();
    }
    //*/
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
        //    let decl = 'local';
        const symbol = this.pushNewSymbol(VariableDeclSymbol, ctx, ctx.identifier().getText());
        this.pushScope(symbol);

        if (ctx.parent && ctx.parent.ruleIndex === mxsParser.RULE_declarationExpression) {
            const decl = (ctx.parent as DeclarationExpressionContext)._scope?.getText().toLowerCase() || 'local';
            (symbol as DeclarationSymbol).declarationScope = decl;
        }

    }

    public override exitVariableDeclaration = (ctx: VariableDeclarationContext): void =>
    {
        this.popScope();
        this.popSymbol();
    }

    public override enterAssignmentExpression = (ctx: AssignmentExpressionContext): void =>
    {
        // this.pushNewSymbol(AssignmentExpressionSymbol, ctx, ctx._left?.getText());
        this.pushNewSymbol(AssignmentExpressionSymbol, ctx, ctx.destination().getText());
    }

    public override exitAssignmentExpression = (ctx: AssignmentExpressionContext): void =>
    {
        this.popSymbol();
    }
    /*
    public override enterAssignment = (ctx: AssignmentContext): void =>
    {
        // this.pushNewSymbol(AssignmentSymbol, ctx);
    }

    public override exitAssignment = (ctx: AssignmentContext): void =>
    {
        // this.popSymbol();
    }
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
    

    // public override exitExpr_operand = (ctx: Expr_operandContext): void => { }

    public override exitFactor = (ctx: FactorContext): void =>
    {
        // if (ctx.identifier()) {
        //     this.addNewSymbol(IdentifierSymbol, ctx, ctx.getText());
        // }
    }
    // */
    public override exitIdentifier = (ctx: IdentifierContext): void =>
    {
        // IF I emmit an identifier here, but also use the current enterVariableDeclaration, I will have duplicated symbols
        // Use operand or factor instead, for now.
        this.addNewSymbol(IdentifierSymbol, ctx, ctx.getText());
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
    /*
    public override enterBy_ref = (ctx: By_refContext): void =>
    {
        // this.pushNewSymbol();
    }
     //*/
    public override exitBy_ref = (ctx: By_refContext): void =>
    {
        // this.popSymbol();
        // emmiting an identifier token here...
        this.addNewSymbol(IdentifierSymbol, ctx, ctx.ids()?.getText() ?? ctx.path()?.getText());
    }
   
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
}