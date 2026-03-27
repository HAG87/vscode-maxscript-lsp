import {
    CancellationToken, LinkedEditingRangeProvider, LinkedEditingRanges, Position,
    ProviderResult, Range, TextDocument, workspace,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import { Utilities } from './utils.js';

export class mxsLinkedEditingRangeProvider implements LinkedEditingRangeProvider
{
    public constructor(private backend: mxsBackend) { }


    private nowMs(): number {
        return typeof performance !== 'undefined' ? performance.now() : Date.now();
    }

    provideLinkedEditingRanges(
        document: TextDocument,
        position: Position,
        token: CancellationToken): ProviderResult<LinkedEditingRanges>
    {
        if (token.isCancellationRequested) {
            return undefined;
        }
        const sourceContext = this.backend.getContext(document.uri.toString());
        const config = workspace.getConfiguration('maxScript');
        const useAst = config.get<boolean>('providers.ast.linkedEditingRangeProvider', true);
        const traceRouting = config.get<boolean>('providers.traceRouting', false);
        const tracePerformance = config.get<boolean>('providers.tracePerformance', false);
        const providerStart = tracePerformance ? this.nowMs() : 0;
        const logPerformance = (route: 'AST' | 'None', ranges: number, reason?: string): void => {
            if (!tracePerformance) {
                return;
            }
            const reasonPart = reason ? ` reason=${reason}` : '';
            console.log(`[language-maxscript][Performance] linkedEditingRangeProvider uri=${document.uri.toString()} duration=${(this.nowMs() - providerStart).toFixed(2)}ms route=${route} ranges=${ranges}${reasonPart}`);
        };

        if (useAst) {
            const sourceLineText = document.lineAt(position.line).text;
            // Use the same reference lookup as ReferenceProvider, but WITH includeDeclaration
            const astReferences = sourceContext.getAstReferenceLocations(
                position.line + 1,
                position.character,
                true,  // includeDeclaration
                sourceLineText,
            );



            if (astReferences && astReferences.length > 0) {
                const ranges: Range[] = astReferences.map((reference) =>
                    Utilities.lexicalRangeToRange(reference.range));

                if (traceRouting) {
                    console.log(`[language-maxscript][LinkedEditingRangeProvider] route=AST ranges=${ranges.length}`);
                }
                logPerformance('AST', ranges.length);
                return new LinkedEditingRanges(ranges);
            }
            if (traceRouting) {
                console.log('[language-maxscript][LinkedEditingRangeProvider] route=None reason=no-references');
            }
            logPerformance('None', 0, 'no-references');
            return undefined;
        }

        if (traceRouting) {
            console.log('[language-maxscript][LinkedEditingRangeProvider] route=None reason=ast-disabled');
        }



        logPerformance('None', 0, 'ast-disabled');
        return undefined;
    }
}

