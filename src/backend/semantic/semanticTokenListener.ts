import {
    FnArgsContext,
    FnParamsContext,
    IdentifierContext, ParamNameContext,
} from '@parser/mxsParser.js';
import { mxsParserListener } from '@parser/mxsParserListener.js';
import { ISemanticToken } from '@backend/types.js';
import { maxAPILookup } from '@backend/schemas/mxsAPI.js';

// Pre-allocated modifier arrays to avoid repeated allocations
/*
const MODIFIERS_DEFAULT_LIBRARY = ['defaultLibrary'];
const MODIFIERS_DEFAULT_LIBRARY_STATIC = ['defaultLibrary', 'static'];
const MODIFIERS_DEFAULT_LIBRARY_READONLY = ['defaultLibrary', 'readonly'];
*/
// Use shared lookup exported from mxsAPI for fast classification

export class semanticTokenListener extends mxsParserListener
{
    private collect: boolean = true
    public constructor(
        private tokenStack: ISemanticToken[],
        private identifierCandidates?: Map<string, ISemanticToken[]>,
    ) {
        // clear the token list
        tokenStack.length = 0;
        super();
    }
    // filter out identifiers that are part of declarations, as opposed to references
    public override enterFnArgs = (_ctx: FnArgsContext): void => { this.collect = false; }
    public override exitFnArgs = (_ctx: FnArgsContext): void => { this.collect = true; }

    public override enterFnParams = (_ctx: FnParamsContext): void => { this.collect = false; }
    public override exitFnParams = (_ctx: FnParamsContext): void => { this.collect = true; }

    public override enterParamName = (_ctx: ParamNameContext): void => { this.collect = false; }
    public override exitParamName = (_ctx: ParamNameContext): void => { this.collect = true; }
    
    //...

    public override exitIdentifier = (ctx: IdentifierContext): void => {
        if (!this.collect) { return; }
        
        const start = ctx.start;
        if (!start) { return; }

        const txt = ctx.getText().toLowerCase();

        // Single lookup using the prebuilt map to minimize per-identifier work
        const info = maxAPILookup.get(txt);
        if (info) {
            this.tokenStack.push({
                startLine: start.line,
                startCharacter: start.column,
                length: txt.length,
                tokenType: info.tokenType,
                tokenModifiers: info.tokenModifiers,
            });
            return;
        }

        // Only non-API identifiers are collected as AST placement candidates.
        if (this.identifierCandidates) {
            const bucket = this.identifierCandidates.get(txt);
            const candidate: ISemanticToken = {
                startLine: start.line,
                startCharacter: start.column,
                length: txt.length,
            };
            if (bucket) {
                bucket.push(candidate);
            } else {
                this.identifierCandidates.set(txt, [candidate]);
            }
        }
    }
}