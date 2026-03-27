import { ParserRuleContext } from 'antlr4ng';

import {
    FnArgsContext,
    FnParamsContext,
    FunctionCallContext, IdentifierContext, ParamNameContext,
} from '../../parser/mxsParser.js';
import { mxsParserListener } from '../../parser/mxsParserListener.js';
import { ISemanticToken } from '../../types.js';
import { maxAPILookup } from '../schemas/mxsAPI.js';

// Use shared lookup exported from mxsAPI for fast classification

export class semanticTokenListener extends mxsParserListener {
    // private symbolStack: ParserRuleContext[] = [];

    private collect: boolean = true
    public constructor(private tokenStack: ISemanticToken[]) {
        // clear the token list
        tokenStack.length = 0;
        super();
    }

    public override enterFnArgs = (_ctx: FnArgsContext): void => { this.collect = false; }
    public override exitFnArgs = (_ctx: FnArgsContext): void => { this.collect = true; }

    public override enterFnParams = (_ctx: FnParamsContext): void => { this.collect = false; }
    public override exitFnParams = (_ctx: FnParamsContext): void => { this.collect = true; }

    public override enterParamName = (_ctx: ParamNameContext): void => { this.collect = false; }
    public override exitParamName = (_ctx: ParamNameContext): void => { this.collect = true; }
    
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
