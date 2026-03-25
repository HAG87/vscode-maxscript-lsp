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

    provideReferences(
        document: TextDocument,
        position: Position,
        context: ReferenceContext,
        _token: CancellationToken): ProviderResult<Location[]>
    {
        return new Promise((resolve) =>
        {
            const sourceContext = this.backend.getContext(document.uri.toString());
            const config = workspace.getConfiguration('maxScript');
            const useAst = config.get<boolean>('providers.ast.referenceProvider', true);
            const traceRouting = config.get<boolean>('providers.traceRouting', false);

            if (useAst) {
                const astReferences = sourceContext.getAstReferenceLocations(
                    position.line + 1,
                    position.character,
                    context.includeDeclaration,
                );

                if (astReferences) {
                    const result = astReferences.map((reference) =>
                        new Location(
                            Uri.parse(reference.uri),
                            Utilities.lexicalRangeToRange(reference.range),
                        ));

                    if (traceRouting) {
                        console.log(`[language-maxscript][ReferenceProvider] route=AST refs=${result.length}`);
                    }
                    resolve(result);
                    return;
                }

                if (traceRouting) {
                    console.log('[language-maxscript][ReferenceProvider] route=AST-miss');
                }
            }

            if (traceRouting) {
                console.log('[language-maxscript][ReferenceProvider] route=None');
            }
            resolve(undefined);
        });
    }
}