import { ParserRuleContext } from "antlr4ng";
import { FunctionCallContext, IdentifierContext, mxsParser, PropertyContext, VariableDeclarationContext } from "../parser/mxsParser.js";
import { mxsParserListener } from "../parser/mxsParserListener.js";
import { ISemanticToken } from "../types.js";
import { maxAPI } from "./schemas/mxsAPI.js";


export class semanticTokenListener extends mxsParserListener
{
    private symbolStack: ParserRuleContext[] = [];
    // private symbolStack
    public constructor(private tokenStack: ISemanticToken[])
    {
        // clear the token list
        // console.log('recompute semtokens');
        tokenStack.length = 0;
        super();
    }

    public override enterFunctionCall = (ctx: FunctionCallContext): void =>
    {
        this.symbolStack.push(ctx);
    }
    public override exitFunctionCall = (ctx: FunctionCallContext): void =>
    {
        /*
        if (ctx._caller && ctx._caller.start && ctx._caller.ruleIndex !== mxsParser.RULE_expr_seq) {
            const txt = ctx._caller.getText();
            this.addToken(ctx._caller.start.line, ctx._caller.start.column, txt.length,
                'method',
                ['modification']
            );
            return;
        }
        // */
        this.symbolStack.pop();
    }
    /*
    public override enterFunctionCall = (ctx: FunctionCallContext): void => { this.symbolStack.push(ctx); }
    public override exitFunctionCall = (ctx: FunctionCallContext): void => { this.symbolStack.pop(); }

    public override enterVariableDeclaration = (ctx: VariableDeclarationContext): void => { this.symbolStack.push(ctx); }
    public override exitVariableDeclaration = (ctx: VariableDeclarationContext): void => { this.symbolStack.pop(); }

    public override enterProperty = (ctx: PropertyContext): void => { this.symbolStack.push(ctx); }
    public override exitProperty = (ctx: PropertyContext): void => { this.symbolStack.pop(); }
    */
    public override exitIdentifier = (ctx: IdentifierContext): void =>
    {
        if (!ctx.start) { return };

        const txt = ctx.getText();

        if (maxAPI.class.has(txt)) {
            this.addToken(ctx.start.line, ctx.start.column, txt.length,
                'class',
                ['defaultLibrary', 'static']
            );
            return;
        }
        if (maxAPI.function.has(txt)) {
            this.addToken(ctx.start.line, ctx.start.column, txt.length,
                'function',
                ['defaultLibrary']
            );
            return;
        }
        if (maxAPI.interface.has(txt)) {
            this.addToken(ctx.start.line, ctx.start.column, txt.length,
                'interface',
                ['defaultLibrary']
            );
            return;
        }
        if (maxAPI.namespace.has(txt)) {
            this.addToken(ctx.start.line, ctx.start.column, txt.length,
                'namespace',
                ['defaultLibrary']
            );
            return;
        }
        if (maxAPI.struct.has(txt)) {
            this.addToken(ctx.start.line, ctx.start.column, txt.length,
                'struct',
                ['defaultLibrary']
            );
            return;
        }

        if (maxAPI.type.has(txt)) {
            this.addToken(ctx.start.line, ctx.start.column, txt.length,
                'type',
                ['defaultLibrary']
            );
            return;
        }
        if (maxAPI.variable.has(txt)) {
            this.addToken(ctx.start.line, ctx.start.column, txt.length,
                'variable',
                ['defaultLibrary']
            );
            return;
        }
        if (maxAPI.constant.has(txt)) {
            this.addToken(ctx.start.line, ctx.start.column, txt.length,
                'variable',
                ['defaultLibrary', 'readonly']
            );
            return;
        }
        /*
        if (this.symbolStack.length > 0) { 
            const curr = this.symbolStack[this.symbolStack.length - 1];
            if (curr.ruleIndex === mxsParser.RULE_functionCall) {
                this.addToken(ctx.start.line, ctx.start.column, txt.length,
                    'method',
                    ['modification']
                );
                return;
            }
        }
        */
    }

    private addToken(line: number, startCharacter: number, length: number, tokenType: string, tokenModifiers: string[]): void
    {
        this.tokenStack.push(
            {
                line,
                startCharacter,
                length,
                tokenType,
                tokenModifiers,
            }
        )
    }
}