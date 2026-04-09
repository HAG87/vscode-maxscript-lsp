import { ISemanticToken, type SemTokenModifier, type SemTokenType } from "@backend/types.js";
import { CallExpression, DefinitionBlock, FunctionDefinition, MemberExpression,
    Program, StructDefinition, StructMemberField,
    VariableDeclaration, VariableReference } from "../ast/ASTNodes.js";
import { ASTQuery } from "@ast/ASTQuery.js";

type SemanticDeclarationNode = FunctionDefinition | StructDefinition | DefinitionBlock | VariableDeclaration;

    function astTokenLocationForName(
        nodePosition: { start: { line: number; column: number }; end: { line: number; column: number } },
        name: string,
        tokenCandidates: Map<string, ISemanticToken[]>,
        tokenLocationCache: Map<string, ISemanticToken | undefined>,
    ): ISemanticToken | undefined {
        const cacheKey = `${name.toLowerCase()}:${nodePosition.start.line}:${nodePosition.start.column}:${nodePosition.end.line}:${nodePosition.end.column}`;
        const cached = tokenLocationCache.get(cacheKey);
        if (cached !== undefined) {
            return cached;
        }

        const inSpan = (candidate: ISemanticToken): boolean => {
            const line = candidate.startLine;
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

        const candidates = tokenCandidates.get(name.toLowerCase()) ?? [];

        for (const candidate of candidates) {
            if (!inSpan(candidate)) {
                continue;
            }

            tokenLocationCache.set(cacheKey, candidate);
            return candidate;
        }

        // Fallback keeps behavior predictable even if token lookup misses edge cases.
        const fallback = {
            startLine: nodePosition.start.line,
            startCharacter: Math.max(0, nodePosition.start.column),
            length: name.length,
        };
        tokenLocationCache.set(cacheKey, fallback);
        return fallback;
    }

    function buildSemanticDeclarationIndex(ast: Program): {
        semanticNodeByDeclaration: Map<VariableDeclaration, SemanticDeclarationNode>;
        functionDeclarations: Array<{ node: FunctionDefinition; declaration: VariableDeclaration }>;
    } {
        const semanticNodeByDeclaration = new Map<VariableDeclaration, SemanticDeclarationNode>();
        const functionDeclarations: Array<{ node: FunctionDefinition; declaration: VariableDeclaration }> = [];

        for (const node of ASTQuery.walkAllNodes(ast)) {
            if (node instanceof VariableDeclaration) {
                semanticNodeByDeclaration.set(node, node);
            }

            if (!(node instanceof FunctionDefinition || node instanceof StructDefinition || node instanceof DefinitionBlock)) {
                continue;
            }

            if (!node.name) {
                continue;
            }

            const declaration = node.parentScope?.resolveLocal(node.name);
            if (!declaration) {
                continue;
            }

            semanticNodeByDeclaration.set(declaration, node);

            if (node instanceof FunctionDefinition) {
                functionDeclarations.push({ node, declaration });
            }
        }

        return { semanticNodeByDeclaration, functionDeclarations };
    }
    
export default function appendAstSemanticTokens(
    ast: Program,
    semTokensCollection: ISemanticToken[],
    tokenCandidates: Map<string, ISemanticToken[]>,
    traceRouting: boolean = false,
): void
    {
        if (!ast) {
            return;
        }

        const beforeCount = semTokensCollection.length;
        const tokenLocationCache = new Map<string, ISemanticToken | undefined>();
        const {
            semanticNodeByDeclaration,
            functionDeclarations,
        } = buildSemanticDeclarationIndex(ast);

        const existing = new Set<string>(
            semTokensCollection.map((t) => `${t.startLine}:${t.startCharacter}:${t.length}:${String(t.tokenType)}`),
        );

        const pushNamedToken = (
            name: string | undefined,
            nodePosition: { start: { line: number; column: number }; end: { line: number; column: number } } | undefined,
            tokenType: SemTokenType,
            tokenModifiers: SemTokenModifier[] = [],
        ) => {
            if (!name || !nodePosition) {
                return;
            }
            const locatedToken = astTokenLocationForName(nodePosition, name, tokenCandidates, tokenLocationCache);
            if (!locatedToken || locatedToken.length <= 0) {
                return;
            }

            const key = `${locatedToken.startLine}:${locatedToken.startCharacter}:${locatedToken.length}:${tokenType}`;

            if (existing.has(key)) {
                return;
            }
            existing.add(key);

            locatedToken.tokenType = tokenType;
            locatedToken.tokenModifiers = tokenModifiers;

            semTokensCollection.push(locatedToken);
        };

        for (const node of ASTQuery.walkAllNodes(ast))
        {
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
                    const semanticNode = semanticNodeByDeclaration.get(resolvedDeclaration) ?? resolvedDeclaration;
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
        for (const { node, declaration } of functionDeclarations) {
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
        semTokensCollection.sort((a, b) => a.startLine !== b.startLine ? a.startLine - b.startLine : a.startCharacter - b.startCharacter);

        if (traceRouting) {
            const afterCount = semTokensCollection.length;
            console.log(`[language-maxscript][SemanticTokens][AST] appended=${afterCount - beforeCount} total=${afterCount}`);
        }
    }