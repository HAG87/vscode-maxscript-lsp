/*
TODO:
 - Fix definition for symbols referenced from an enclosed construct (e.g. calling a method of a
   struct instance variable — requires tracking struct instance types at call sites)
*/
import {
  CancellationToken, Definition, DefinitionLink, DefinitionProvider,
        Location, Position, ProviderResult, TextDocument,
  Uri, workspace,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import { Utilities } from './utils.js';

export class mxsDefinitionProvider implements DefinitionProvider
{
    public constructor(private backend: mxsBackend) { }

    provideDefinition(
        document: TextDocument,
        position: Position,
        token: CancellationToken): ProviderResult<Definition | DefinitionLink[]>
    {
        return new Promise((resolve) =>
        {
            if (token.isCancellationRequested) {
                resolve(null);
                return;
            }

            const cancelSubscription = token.onCancellationRequested(() => {
                cancelSubscription.dispose();
                resolve(null);
            });

            const context = this.backend.getContext(document.uri.toString());

            const config = workspace.getConfiguration('maxScript');
            const useAst = config.get<boolean>('providers.ast.definitionProvider', true);
            const traceRouting = config.get<boolean>('providers.traceRouting', false);

            if (useAst) {
                if (token.isCancellationRequested) {
                    cancelSubscription.dispose();
                    resolve(null);
                    return;
                }

                const definitionTarget = context.getAstDefinitionTarget(
                    position.line + 1,
                    position.character,
                    document.getText(),
                    () => token.isCancellationRequested,
                );
                if (definitionTarget) {
                    if (traceRouting) {
                        const route = definitionTarget.targetUri === context.sourceUri ? 'AST' : 'AST-xfile';
                        console.log(`[language-maxscript][DefinitionProvider] route=${route}`);
                    }
                    cancelSubscription.dispose();
                    resolve(new Location(
                        Uri.parse(definitionTarget.targetUri),
                        Utilities.lexicalRangeToRange(definitionTarget.range),
                    ));
                    return;
                }
                if (traceRouting) {
                    console.log('[language-maxscript][DefinitionProvider] route=AST-miss');
                }
            }

            if (traceRouting) {
                console.log('[language-maxscript][DefinitionProvider] route=None');
            }
            cancelSubscription.dispose();
            resolve(null);
        });
    }
}