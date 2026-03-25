/*
TODO:
 - Fix definition for symbols referenced from an enclosed construct (e.g. calling a method of a
   struct instance variable — requires tracking struct instance types at call sites)
*/
import {
  CancellationToken, Definition, DefinitionLink, DefinitionProvider,
    Location, Position, ProviderResult, Range, TextDocument,
  Uri, workspace,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import type { Position as AstPosition } from '@strumenta/tylasu';
import { ASTQuery } from '@backend/ast/ASTQuery.js';
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

    /** Finds the range of `name` within the given AST node's position span. */
    private astNameRange(document: TextDocument, position: AstPosition, name: string): Range | undefined {
        const enclosingRange = this.astPositionToRange(position);
        const snippet = document.getText(enclosingRange);
        const offset = snippet.indexOf(name);
        if (offset < 0) {
            return undefined;
        }
        const prefix = snippet.slice(0, offset);
        const lines = prefix.split(/\r?\n/);
        const lineOffset = lines.length - 1;
        const startLine = enclosingRange.start.line + lineOffset;
        const startCharacter = lineOffset === 0
            ? enclosingRange.start.character + lines[0].length
            : lines[lineOffset].length;
        return new Range(startLine, startCharacter, startLine, startCharacter + name.length);
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
                if (declaration?.name) {
                    // Determine the file that actually owns this declaration.
                    // Workspace globals live in a different file; local decls fall back to the current file.
                    const declarationUri = this.backend.getDeclarationSourceUri(declaration) ?? context!.sourceUri;
                    const isRemote = declarationUri !== context!.sourceUri;
                    const targetContext = isRemote ? this.backend.getExistingContext(declarationUri) : context;
                    const targetAst = targetContext?.getResolvedAST();
                    if (targetAst) {
                        const semanticNode = ASTQuery.findSemanticNodeForDeclaration(targetAst, declaration);
                        const targetPosition = semanticNode.position ?? declaration.position;
                        if (targetPosition) {
                            // For cross-file declarations we cannot search the other file's TextDocument here,
                            // so fall back to the raw position range; for same-file we can still pinpoint the name token.
                            const nameRange = isRemote
                                ? this.astPositionToRange(targetPosition)
                                : (this.astNameRange(document, targetPosition, declaration.name)
                                    ?? this.astPositionToRange(targetPosition));
                            if (traceRouting) {
                                console.log(`[language-maxscript][DefinitionProvider] route=${isRemote ? 'AST-xfile' : 'AST'}`);
                            }
                            resolve(new Location(Uri.parse(declarationUri), nameRange));
                            return;
                        }
                    }
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