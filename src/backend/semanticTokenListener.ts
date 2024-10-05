import { ParserRuleContext } from 'antlr4ng';

import {
  FunctionCallContext, IdentifierContext, Param_nameContext,
} from '../parser/mxsParser.js';
import { mxsParserListener } from '../parser/mxsParserListener.js';
import { ISemanticToken } from '../types.js';
import { maxAPI } from './schemas/mxsAPI.js';

export class semanticTokenListener extends mxsParserListener
{
    // private symbolStack: ParserRuleContext[] = [];

    private collect: boolean = true
    public constructor(private tokenStack: ISemanticToken[])
    {
        // clear the token list
        tokenStack.length = 0;
        super();
    }

    // public override enterFunctionCall = (ctx: FunctionCallContext): void => { this.symbolStack.push(ctx); }
    // public override exitFunctionCall = (_ctx: FunctionCallContext): void => { this.symbolStack.pop(); }

    /*
    public override enterVariableDeclaration = (ctx: VariableDeclarationContext): void => { this.symbolStack.push(ctx); }
    public override exitVariableDeclaration = (ctx: VariableDeclarationContext): void => { this.symbolStack.pop(); }

    public override enterProperty = (ctx: PropertyContext): void => { this.symbolStack.push(ctx); }
    public override exitProperty = (ctx: PropertyContext): void => { this.symbolStack.pop(); }
    */
   public override enterParam_name = (_ctx: Param_nameContext): void => {this.collect = false;}
   public override exitParam_name = (_ctx: Param_nameContext): void => {this.collect = true;}
    public override exitIdentifier = (ctx: IdentifierContext): void =>
    {
        if (!ctx.start || !this.collect) { return }

        const txt = ctx.getText().toLowerCase();

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