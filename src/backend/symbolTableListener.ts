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



} from "../parser/mxsParser.js";

/*
export class simpleExpressionSymbol extends ScopedSymbol {}

export class variableDeclarationSymbol extends ScopedSymbol {}

export class assignmentExpressionSymbol extends ScopedSymbol {}

export class assignmentOpExpressionSymbol extends ScopedSymbol {}

export class whileLoopExpressionSymbol extends ScopedSymbol {}

export class doLoopExpressionSymbol extends ScopedSymbol {}

export class forLoopExpressionSymbol extends ScopedSymbol {}

export class loopExitStatementSymbol extends ScopedSymbol {}

export class caseExpressionSymbol extends ScopedSymbol {}

export class structDefinitionSymbol extends ScopedSymbol {}

export class tryExpressionSymbol extends ScopedSymbol {}

export class fnDefinitionSymbol extends ScopedSymbol {}

export class fnReturnStatementSymbol extends ScopedSymbol {}
export class contextExpressionSymbol extends ScopedSymbol {}

export class attributesDefinitionSymbol extends ScopedSymbol {}

export class whenStatementSymbol extends ScopedSymbol {}



rolloutControl

rolloutGroup

fnDefinition
structDefinition

eventHandlerClause

toolDefinition

rolloutDefinition

eventHandlerClause

rc_submenu

rcmenuControl

nDefinition

structDefinition

toolDefinition

rolloutDefinition

eventHandlerClause

paramsDefinition

eventHandlerClause

paramsDefinition

rolloutDefinition

TypecastExpr

ExprOperand

UnaryExpr

ExponentExpr

ProductExpr

AdditionExpr

ComparisonExpr

LogicNOTExpr

LogicExpr

FnCallExpr

deRef

OperandExpr

operand

accessor


bool

STRING

PATH

NAME

NUMBER

TIMEVAL

QUESTION

array

bitArray

point3

point2

box2

expr_seq

*/

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
        this.pushNewSymbol(FnDefinitionSymbol, ctx, ctx._str_name?.getText());
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

    public override enterVariableDeclaration = (ctx: VariableDeclarationContext): void =>
    {
        //  It can be several declarations in the same statement.
        //  Here we flatten the nd emmit a symbol for each Declaration
        // Will be added to the curent scope, but will not produce a ymbol

        //  Assignment is treated as a child of the declaration.
        //  This will not create symbols for the assignment expression

        // AssignmentExpression can contain high Level symbols, so I should return scoped symbols here
        // and do the falltening on the SymbolProvider

        const decls = ctx._decl;
        for (const decl of decls) {
            const declMember = decl.children[0] as (AssignmentExpressionContext | IdentifierContext);
            
            // /*
            if (declMember instanceof AssignmentExpressionContext) {
                // console.log(declName._left?.getText());
                this.addNewSymbol(IdentifierSymbol,declMember.ruleContext ,declMember._left?.getText())
            } else {
                // console.log(declName.getText());
                this.addNewSymbol(IdentifierSymbol,declMember.ruleContext ,declMember?.getText())
            }
            // */
        }

    }
    public override exitVariableDeclaration = (ctx: VariableDeclarationContext): void =>
    {
        // this.popSymbol();

    }
    public override exitIdentifier = (ctx: IdentifierContext): void =>
    {
        // this.addNewSymbol(IdentifierSymbol, ctx, ctx.getText());
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