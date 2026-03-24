import {
    FnArgsContext,
    FnParamsContext,
    IdentifierContext, ParamNameContext,
} from '../../parser/mxsParser.js';
import { mxsParserListener } from '../../parser/mxsParserListener.js';
import { ISemanticToken } from '../../types.js';
import { maxAPILookup } from '../schemas/mxsAPI.js';

export interface IIdentifierCandidate {
    line: number;
    startCharacter: number;
    length: number;
}

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
        private identifierCandidates?: Map<string, IIdentifierCandidate[]>,
    ) {
        // clear the token list
        tokenStack.length = 0;
        super();
    }
    // filter out identifiers that are part of declarations, as opposed to references
    public override enterFnArgs = (ctx: FnArgsContext): void => { this.collect = false; }
    public override exitFnArgs = (ctx: FnArgsContext): void => { this.collect = true; }

    public override enterFnParams = (ctx: FnParamsContext): void => { this.collect = false; }
    public override exitFnParams = (ctx: FnParamsContext): void => { this.collect = true; }

    public override enterParamName = (_ctx: ParamNameContext): void => { this.collect = false; }
    public override exitParamName = (_ctx: ParamNameContext): void => { this.collect = true; }
    
    //...

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

        // Only non-API identifiers are collected as AST placement candidates.
        if (this.identifierCandidates) {
            const bucket = this.identifierCandidates.get(txt);
            const candidate: IIdentifierCandidate = {
                line,
                startCharacter: column,
                length,
            };
            if (bucket) {
                bucket.push(candidate);
            } else {
                this.identifierCandidates.set(txt, [candidate]);
            }
        }
    }
}