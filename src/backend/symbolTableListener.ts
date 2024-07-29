import { LiteralSymbol, BlockSymbol, BaseSymbol, VariableSymbol, SymbolConstructor, ScopedSymbol } from "antlr4-c3";
import { ParseTree, ParserRuleContext, TerminalNode } from "antlr4ng";

import { mxsParserListener } from "../parser/mxsParserListener.js";
import
{
    ContextSymbolTable,
    FnDefinitionSymbol,
    StructDefinitionSymbol,
    VariableDeclSymbol,
    IdentifierSymbol,
    AssignmentExpressionSymbol,
} from "./ContextSymbolTable.js";
import { mxsLexer } from "../parser/mxsLexer.js";

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



} from "../parser/mxsParser.js";

export class symbolTableListener extends mxsParserListener
{
    private symbolStack: BaseSymbol[] = [];

    public constructor(
        private symbolTable: ContextSymbolTable
    )
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

    public override enterStructDefinition = (ctx: StructDefinitionContext): void =>
    {
        this.pushNewSymbol(StructDefinitionSymbol, ctx, ctx._str_name?.getText());
    }
    public override exitStructDefinition = (ctx: StructDefinitionContext): void =>
    {
        this.popSymbol();
    }

    public override enterFnDefinition = (ctx: FnDefinitionContext): void =>
    {
        this.pushNewSymbol(FnDefinitionSymbol, ctx, ctx._fn_name?.getText());
    }
    public override exitFnDefinition = (ctx: FnDefinitionContext): void =>
    {
        //console.log(this.symbolStack[0]);
        this.popSymbol();
    }

    // public override enterDeclarationExpression = (ctx: DeclarationExpressionContext): void => { }
    // public override exitDeclarationExpression = (ctx: DeclarationExpressionContext): void => { }

    public override enterVariableDeclaration = (ctx: VariableDeclarationContext): void =>
    {
        let name = ctx.children[0] instanceof AssignmentExpressionContext
            ? ctx.children[0]._left?.getText()
            : ctx.children[0].getText()

        this.pushNewSymbol(VariableDeclSymbol, ctx, name);
    }

    public override exitVariableDeclaration = (ctx: VariableDeclarationContext): void =>
    {
        this.popSymbol();
    }

    public override enterAssignmentExpression = (ctx: AssignmentExpressionContext): void =>
    {
        this.pushNewSymbol(AssignmentExpressionSymbol, ctx, ctx._left?.getText());
    }

    public override exitAssignmentExpression = (ctx: AssignmentExpressionContext): void =>
    {
        this.popSymbol();
    }

    public override exitExprOperand = (ctx: ExprOperandContext): void =>
    {
        /*
        const expr_operand = ctx.expr_operand()
        const op = expr_operand.operand()
        if (op) {
            const id = op.factor()?.identifier()
            if (id) {
                this.addNewSymbol(IdentifierSymbol, id, id.getText());
            }
        }
        // */
    }

    // public override exitExpr_operand = (ctx: Expr_operandContext): void => { }

    public override exitFactor = (ctx: FactorContext): void =>
    {
        // if (ctx.identifier()) {
        //     this.addNewSymbol(IdentifierSymbol, ctx, ctx.getText());
        // }
    }

    public override exitIdentifier = (ctx: IdentifierContext): void =>
    {
        // IF I emmit an identifier here, but also use the current enterVariableDeclaration, I will have duplicated symbols
        // Use operand or factor instead, for now.

        this.addNewSymbol(IdentifierSymbol, ctx, ctx.getText());
    }

    public override visitTerminal = (node: TerminalNode): void =>
    {
        //operators
        //...
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
        this.symbolStack.push(symbol);

        return symbol;
    }

    private popSymbol(): BaseSymbol | undefined
    {
        return this.symbolStack.pop();
    }
}