/*
THIS IS BROKEN!
TODO:
 - Fix definition for symbols with the same name or referenced from an enclosed construct (linke calling a method of a structure that initiated into a variable)
 - I should implement a method to derive a reference tree, instead of looking at the symbol table, of find a better implementation of the symbol table, keeping track of references in the listener
 - keep track of named symbols, definition, references and aliases (assignations and re-assignation). respect scope
*/
import {
  CancellationToken, Definition, DefinitionLink, DefinitionProvider,
    Location, Position, ProviderResult, Range, TextDocument,
  Uri, workspace,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import type { Position as AstPosition } from '@strumenta/tylasu';
import { Utilities } from './utils.js';

export class mxsDefinitionProvider implements DefinitionProvider
{
    public constructor(private backend: mxsBackend) { }

    private astPositionToRange(position: AstPosition): Range {
        return new Range(
            position.start.line - 1,
            position.start.column,
            position.end.line - 1,
            position.end.column,
        );
    }

    provideDefinition(
        document: TextDocument,
        position: Position,
        token: CancellationToken): ProviderResult<Definition | DefinitionLink[]>
    {
        return new Promise((resolve) =>
        {
            const context = this.backend.getContext(document.uri.toString());
// /*
            const config = workspace.getConfiguration('maxScript');
            const useAst = config.get<boolean>('providers.ast.definitionProvider', true);
            const fallbackToLegacy = config.get<boolean>('providers.fallbackToLegacy', true);
            const traceRouting = config.get<boolean>('providers.traceRouting', false);

            if (useAst) {
                // Primary path: AST query layer
                const declaration = context?.astDeclarationAtPosition(
                    position.line + 1,
                    position.character,
                );
                if (declaration?.position) {
                    if (traceRouting) {
                        console.log('[language-maxscript][DefinitionProvider] route=AST');
                    }
                    resolve(new Location(Uri.parse(context.sourceUri), this.astPositionToRange(declaration.position)));
                    return;
                }
                if (traceRouting) {
                    console.log('[language-maxscript][DefinitionProvider] route=AST-miss');
                }
            }
// */
            if (!fallbackToLegacy) {
                if (traceRouting) {
                    console.log('[language-maxscript][DefinitionProvider] route=None (legacy fallback disabled)');
                }
                resolve(null);
                return;
            }

            // Fallback path: legacy symbol table
            const info = context?.symbolDefinition(
                position.line + 1,
                position.character,
            );
            if (traceRouting) {
                console.log('[language-maxscript][DefinitionProvider] route=Legacy');
            }

            if (info) {
                // VS code shows the text for the range given here on holding ctrl/cmd, which is rather
                // useless given that we show this info already in the hover provider. So, in order
                // to limit the amount of text we only pass on the smallest range which is possible.
                // Yet we need the correct start position to not break the goto-definition feature.
                if (info.definition) {
                    resolve(new Location(Uri.parse(info.source), Utilities.lexicalRangeToRange(info.definition.range)));
                } else {
                    // Empty for built-in entities.
                    resolve(new Location(Uri.parse(""), new Position(0, 0)));
                }
            } else resolve(null);
        });
    }
}