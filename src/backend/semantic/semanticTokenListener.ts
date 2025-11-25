import { ParserRuleContext } from 'antlr4ng';

import {
    FunctionCallContext, IdentifierContext, Param_nameContext,
} from '../../parser/mxsParser.js';
import { mxsParserListener } from '../../parser/mxsParserListener.js';
import { ISemanticToken } from '../../types.js';
import { maxAPI, maxAPILookup } from '../schemas/mxsAPI.js';

// Pre-allocated modifier arrays to avoid repeated allocations
const MODIFIERS_DEFAULT_LIBRARY = ['defaultLibrary'];
const MODIFIERS_DEFAULT_LIBRARY_STATIC = ['defaultLibrary', 'static'];
const MODIFIERS_DEFAULT_LIBRARY_READONLY = ['defaultLibrary', 'readonly'];

// Use shared lookup exported from mxsAPI for fast classification

export class semanticTokenListener extends mxsParserListener {
    // private symbolStack: ParserRuleContext[] = [];

    private collect: boolean = true
    public constructor(private tokenStack: ISemanticToken[]) {
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
    public override enterParam_name = (_ctx: Param_nameContext): void => { this.collect = false; }
    public override exitParam_name = (_ctx: Param_nameContext): void => { this.collect = true; }
    
    public override exitIdentifier = (ctx: IdentifierContext): void => {
        if (!this.collect) { return; }
        
        const start = ctx.start;
        if (!start) { return; }

        const txt = ctx.getText().toLowerCase();
        const line = start.line;
        const column = start.column;
        const length = txt.length;

        // Single lookup using the prebuilt map to minimize per-identifier work
        const info = maxAPILookup.get(txt);
        if (info) {
            this.tokenStack.push({
                line,
                startCharacter: column,
                length,
                tokenType: info.tokenType as any,
                tokenModifiers: info.tokenModifiers,
            });
            return;
        }
        
        /*
        if (this.symbolStack.length > 0) { 
            const curr = this.symbolStack[this.symbolStack.length - 1];
            if (curr.ruleIndex === mxsParser.RULE_functionCall) {
                this.tokenStack.push({
                    line,
                    startCharacter: column,
                    length,
                    tokenType: 'method',
                    tokenModifiers: ['modification'],
                });
                return;
            }
        }
        */
    }
}
