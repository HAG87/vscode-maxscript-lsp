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

    private nowMs(): number {
        return typeof performance !== 'undefined' ? performance.now() : Date.now();
    }

    provideDefinition(
        document: TextDocument,
        position: Position,
        token: CancellationToken): ProviderResult<Definition | DefinitionLink[]>
    {
        if (token.isCancellationRequested) {
            return null;
        }

        const context = this.backend.getContext(document.uri.toString());

        const config = workspace.getConfiguration('maxScript');
        const traceRouting = config.get<boolean>('providers.traceRouting', false);
        const tracePerformance = config.get<boolean>('providers.tracePerformance', false);
        const providerStart = tracePerformance ? this.nowMs() : 0;
        const logPerformance = (route: 'AST' | 'None', scope?: 'local' | 'xfile', reason?: string): void => {
            if (!tracePerformance) {
                return;
            }
            const scopePart = scope ? ` scope=${scope}` : '';
            const reasonPart = reason ? ` reason=${reason}` : '';
            console.log(`[language-maxscript][Performance] definitionProvider uri=${document.uri.toString()} duration=${(this.nowMs() - providerStart).toFixed(2)}ms route=${route}${scopePart}${reasonPart}`);
        };

        const currentLineText = document.lineAt(position.line).text;
        const definitionTarget = context.getAstDefinitionTarget(
            position.line + 1,
            position.character,
            currentLineText,
            (row1Based) => {
                const lineIndex = row1Based - 1;
                return lineIndex >= 0 && lineIndex < document.lineCount
                    ? document.lineAt(lineIndex).text
                    : undefined;
            },
            () => token.isCancellationRequested,
        );
        if (definitionTarget) {
            if (traceRouting) {
                const scope = definitionTarget.targetUri === context.sourceUri ? 'local' : 'xfile';
                console.log(`[language-maxscript][DefinitionProvider] route=AST scope=${scope}`);
            }
            logPerformance(
                'AST',
                definitionTarget.targetUri === context.sourceUri ? 'local' : 'xfile',
            );
            return new Location(
                definitionTarget.targetUri === context.sourceUri
                    ? document.uri
                    : Uri.parse(definitionTarget.targetUri),
                Utilities.lexicalRangeToRange(definitionTarget.range),
            );
        }

        if (traceRouting) {
            console.log('[language-maxscript][DefinitionProvider] route=None reason=ast-miss');
        }

        logPerformance('None', undefined, 'ast-miss');
        return null;
    }
}