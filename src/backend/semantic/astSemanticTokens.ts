import { workspace } from 'vscode';
import { ISemanticToken } from "../../types";
import { CallExpression, DefinitionBlock, FunctionDefinition, MemberExpression, Program, StructDefinition, StructMemberField, VariableReference } from "../ast/ASTNodes";
import { ASTQuery } from "../ast/ASTQuery";
import { IIdentifierCandidate } from './semanticTokenListener';

    function astTokenLocationForName(
        nodePosition: { start: { line: number; column: number }; end: { line: number; column: number } },
        name: string,
        tokenCandidates: Map<string, IIdentifierCandidate[]>
    ): { line: number; startCharacter: number; length: number } | undefined {
        const inSpan = (candidate: IIdentifierCandidate): boolean => {
            const line = candidate.line;
            const column = candidate.startCharacter;

            if (line < nodePosition.start.line || line > nodePosition.end.line) {
                return false;
            }
            if (line === nodePosition.start.line && column < nodePosition.start.column) {
                return false;
            }
            // End position is treated as exclusive.
            if (line === nodePosition.end.line && column >= nodePosition.end.column) {
                return false;
            }
            return true;
        };

        const targetName = name.toLowerCase();
        const candidates = tokenCandidates.get(targetName) ?? [];

        for (const candidate of candidates) {
            if (!inSpan(candidate)) {
                continue;
            }

            return {
                line: candidate.line,
                startCharacter: candidate.startCharacter,
                length: candidate.length,
            };
        }

        // Fallback keeps behavior predictable even if token lookup misses edge cases.
        return {
            line: nodePosition.start.line,
            startCharacter: Math.max(0, nodePosition.start.column),
            length: name.length,
        };
    }
    
export default function appendAstSemanticTokens(ast: Program, semTokensCollection: ISemanticToken[], tokenCandidates: Map<string, IIdentifierCandidate[]>): void
    {
        if (!ast) {
            return;
        }

        const traceRouting = workspace.getConfiguration('maxScript').get<boolean>('providers.traceRouting', false);

        const beforeCount = semTokensCollection.length;

        const existing = new Set<string>(
            semTokensCollection.map((t) => `${t.line}:${t.startCharacter}:${t.length}:${String(t.tokenType)}`),
        );

        const pushNamedToken = (
            name: string | undefined,
            nodePosition: { start: { line: number; column: number }; end: { line: number; column: number } } | undefined,
            tokenType: string,
            tokenModifiers: string[] = [],
        ) => {
            if (!name || !nodePosition) {
                return;
            }
            const loc = astTokenLocationForName(nodePosition, name, tokenCandidates);
            if (!loc || loc.length <= 0) {
                return;
            }

            const key = `${loc.line}:${loc.startCharacter}:${loc.length}:${tokenType}`;
            if (existing.has(key)) {
                return;
            }
            existing.add(key);

            semTokensCollection.push({
                line: loc.line,
                startCharacter: loc.startCharacter,
                length: loc.length,
                tokenType,
                tokenModifiers,
            });
        };

        for (const node of ASTQuery.walkAllNodes(ast)) {
            if (node instanceof FunctionDefinition) {
                const isStructMethod = !!(node.parent instanceof StructMemberField
                    || node.parent instanceof StructDefinition
                    || node.parent?.parent instanceof StructDefinition);
                pushNamedToken(
                    node.name,
                    node.position,
                    isStructMethod ? 'method' : 'function',
                    ['declaration'],
                );
                continue;
            }

            if (node instanceof StructDefinition) {
                pushNamedToken(node.name, node.position, 'struct', ['declaration']);
                continue;
            }

            if (node instanceof DefinitionBlock) {
                pushNamedToken(node.name, node.position, 'namespace', ['declaration']);
                continue;
            }

            if (node instanceof VariableReference) {
                const resolvedDeclaration = node.declaration?.referred;
                if (resolvedDeclaration) {
                    const semanticNode = ASTQuery.findSemanticNodeForDeclaration(ast, resolvedDeclaration);
                    if (semanticNode instanceof FunctionDefinition) {
                        const isCallLike = node.parent instanceof CallExpression || node.parent instanceof MemberExpression;
                        pushNamedToken(node.name, node.position, isCallLike ? 'method' : 'function');
                    } else if (semanticNode instanceof StructDefinition) {
                        pushNamedToken(node.name, node.position, 'struct');
                    } else if (semanticNode instanceof DefinitionBlock) {
                        pushNamedToken(node.name, node.position, 'namespace');
                    }
                }
            }
        }

        // Reinforce function tokens from resolved declaration/reference graph.
        // This ensures call sites like `foo 1` are typed from semantic binding,
        // even when parse-shape differs from expected call-expression forms.
        for (const node of ASTQuery.walkAllNodes(ast)) {
            if (!(node instanceof FunctionDefinition) || !node.name) {
                continue;
            }

            const declaration = node.parentScope?.declarations.get(node.name);
            if (!declaration) {
                continue;
            }

            const isStructMethod = !!(node.parent instanceof StructMemberField
                || node.parent instanceof StructDefinition
                || node.parent?.parent instanceof StructDefinition);
            const fnTokenType = isStructMethod ? 'method' : 'function';

            // declaration site
            pushNamedToken(node.name, declaration.position ?? node.position, fnTokenType, ['declaration']);

            // all bound references
            for (const ref of declaration.references) {
                pushNamedToken(ref.name, ref.position, fnTokenType);
            }
        }

        // SemanticTokensBuilder.push(range, ...) requires document order (line asc, then char asc).
        // Listener tokens and AST tokens are collected independently so the combined array
        // may be unsorted; fix that here before the provider reads it.
        semTokensCollection.sort((a, b) => a.line !== b.line ? a.line - b.line : a.startCharacter - b.startCharacter);

        if (traceRouting) {
            const afterCount = semTokensCollection.length;
            console.log(`[language-maxscript][SemanticTokens][AST] appended=${afterCount - beforeCount} total=${afterCount}`);
        }
    }