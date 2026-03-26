/*
TODO:
 - Fix references for symbols referenced from an enclosed construct (e.g. calling a method of a
   struct instance variable — requires tracking struct instance types at call sites)
*/
import {
    CancellationToken, Location, Position, ProviderResult,
    ReferenceContext, ReferenceProvider, TextDocument, Uri, workspace,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import { Utilities } from './utils.js';

export class mxsReferenceProvider implements ReferenceProvider
{
    public constructor(private backend: mxsBackend) { }

    private nowMs(): number {
        return typeof performance !== 'undefined' ? performance.now() : Date.now();
    }

    provideReferences(
        document: TextDocument,
        position: Position,
        context: ReferenceContext,
        token: CancellationToken): ProviderResult<Location[]>
    {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const sourceContext = this.backend.getContext(document.uri.toString());
        const config = workspace.getConfiguration('maxScript');
        const useAst = config.get<boolean>('providers.ast.referenceProvider', true);
        const traceRouting = config.get<boolean>('providers.traceRouting', false);
        const tracePerformance = config.get<boolean>('providers.tracePerformance', false);
        const providerStart = tracePerformance ? this.nowMs() : 0;
        const logPerformance = (route: 'AST' | 'None', refs: number, reason?: string): void => {
            if (!tracePerformance) {
                return;
            }
            const reasonPart = reason ? ` reason=${reason}` : '';
            console.log(`[language-maxscript][Performance] referenceProvider uri=${document.uri.toString()} duration=${(this.nowMs() - providerStart).toFixed(2)}ms route=${route} refs=${refs}${reasonPart}`);
        };

        if (useAst) {
            const sourceLineText = document.lineAt(position.line).text;
            const astReferences = sourceContext.getAstReferenceLocations(
                position.line + 1,
                position.character,
                context.includeDeclaration,
                sourceLineText,
            );

            if (astReferences) {
                const parsedUris = new Map<string, Uri>();
                const result = astReferences.map((reference) =>
                    new Location(
                        parsedUris.get(reference.uri)
                        ?? (() => {
                            const parsed = reference.uri === document.uri.toString()
                                ? document.uri
                                : Uri.parse(reference.uri);
                            parsedUris.set(reference.uri, parsed);
                            return parsed;
                        })(),
                        Utilities.lexicalRangeToRange(reference.range),
                    ));

                if (traceRouting) {
                    console.log(`[language-maxscript][ReferenceProvider] route=AST refs=${result.length}`);
                }
                logPerformance('AST', result.length);
                return result;
            }

            if (traceRouting) {
                console.log('[language-maxscript][ReferenceProvider] route=None reason=ast-miss');
            }
        }

        if (traceRouting) {
            console.log(`[language-maxscript][ReferenceProvider] route=None reason=${useAst ? 'ast-miss' : 'ast-disabled'}`);
        }
        logPerformance('None', 0, useAst ? 'ast-miss' : 'ast-disabled');
        return undefined;
    }
}