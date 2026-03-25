/*
TODO:
 - Fix references for symbols referenced from an enclosed construct (e.g. calling a method of a
   struct instance variable — requires tracking struct instance types at call sites)
*/
import {
    CancellationToken, Location, Position, ProviderResult, Range,
    ReferenceContext, ReferenceProvider, TextDocument, workspace,
} from 'vscode';

import type { Position as AstPosition } from '@strumenta/tylasu';
import { mxsBackend } from '@backend/Backend.js';
import { ASTQuery } from '@backend/ast/ASTQuery.js';
import { Utilities } from './utils.js';

export class mxsReferenceProvider implements ReferenceProvider
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
            const fallbackToLegacy = config.get<boolean>('providers.fallbackToLegacy', true);
            const traceRouting = config.get<boolean>('providers.traceRouting', false);
// /*
            if (useAst) {
                const ast = sourceContext.getResolvedAST();
                const declaration = sourceContext.astDeclarationAtPosition(
                    position.line + 1,
                    position.character,
                );

                // Primary path: AST query layer
                if (declaration) {
                    const result: Location[] = [];
                    if (context.includeDeclaration) {
                        if (declaration.position) {
                            result.push(new Location(document.uri, this.astPositionToRange(declaration.position)));
                        }
                    }

                    for (const reference of declaration.references) {
                        if (!reference.position) {
                            continue;
                        }
                        result.push(new Location(document.uri, this.astPositionToRange(reference.position)));
                    }

                    // Member/property references (foo.bar, st.bar) are represented as
                    // MemberExpression nodes, not VariableReference nodes.
                    if (ast) {
                        for (const memberReference of ASTQuery.findMemberReferencesForDeclaration(ast, declaration)) {
                            if (!memberReference.position) {
                                continue;
                            }
                            result.push(new Location(document.uri, this.astPositionToRange(memberReference.position)));
                        }
                    }

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
// */
            if (!fallbackToLegacy) {
                if (traceRouting) {
                    console.log('[language-maxscript][ReferenceProvider] route=None (legacy fallback disabled)');
                }
                resolve(undefined);
                return;
            }

            // Fallback path: legacy symbol table
            const occurrences = sourceContext.symbolInfoAtPositionCtxOccurrences(
                position.line + 1,
                position.character,
            );
            if (traceRouting) {
                console.log('[language-maxscript][ReferenceProvider] route=Legacy');
            }

            if (occurrences) {
                const result: Location[] = [];
                const targets = Utilities.symbolTargets(occurrences);
                for (const target of targets) {
                    result.push(new Location(target.uri, target.range));
                }
                resolve(result);
            } else {
                resolve(undefined);
            }
        });
    }
}