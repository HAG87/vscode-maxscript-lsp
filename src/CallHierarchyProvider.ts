import { basename } from 'path';
import {
    CallHierarchyIncomingCall,
    CallHierarchyItem,
    CallHierarchyOutgoingCall,
    CallHierarchyProvider,
    CancellationToken,
    Position,
    ProviderResult,
    Range,
    SymbolKind,
    TextDocument,
    Uri,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import { ASTQuery } from '@backend/ast/ASTQuery.js';
import {
    CallExpression,
    FunctionDefinition,
    MemberExpression,
    Program,
    StructDefinition,
    VariableDeclaration,
    VariableReference,
} from '@backend/ast/ASTNodes.js';
import { Utilities } from './utils.js';

interface DeclarationDescriptor {
    declaration: VariableDeclaration;
    uri: string;
    ast: Program;
}

export class mxsCallHierarchyProvider implements CallHierarchyProvider {
    private readonly itemDeclarations = new WeakMap<CallHierarchyItem, DeclarationDescriptor>();

    public constructor(private backend: mxsBackend) { }

    private rangeFromDeclaration(declaration: VariableDeclaration): Range | undefined {
        return declaration.position
            ? Utilities.lexicalRangeToRange({
                start: {
                    row: declaration.position.start.line,
                    column: declaration.position.start.column,
                },
                end: {
                    row: declaration.position.end.line,
                    column: declaration.position.end.column,
                },
            })
            : undefined;
    }

    private selectionRangeFromDeclaration(declaration: VariableDeclaration): Range | undefined {
        const range = this.rangeFromDeclaration(declaration);
        if (!range || !declaration.name) {
            return range;
        }

        const start = range.start;
        const end = start.translate(0, declaration.name.length);
        return new Range(start, end);
    }

    private toItem(
        declaration: VariableDeclaration,
        sourceUri: string,
        ast: Program,
    ): CallHierarchyItem | undefined {
        if (!declaration.name) {
            return undefined;
        }

        const semanticNode = ASTQuery.findSemanticNodeForDeclaration(ast, declaration);
        if (!(semanticNode instanceof FunctionDefinition)) {
            return undefined;
        }

        const kind = this.isStructMethod(semanticNode) ? SymbolKind.Method : SymbolKind.Function;
        const itemRange = this.rangeFromDeclaration(declaration);
        const selectionRange = this.selectionRangeFromDeclaration(declaration) ?? itemRange;
        if (!itemRange || !selectionRange) {
            return undefined;
        }

        const item = new CallHierarchyItem(
            kind,
            declaration.name,
            basename(Uri.parse(sourceUri).fsPath),
            Uri.parse(sourceUri),
            itemRange,
            selectionRange,
        );

        this.itemDeclarations.set(item, { declaration, uri: sourceUri, ast });
        return item;
    }

    private isStructMethod(functionNode: FunctionDefinition): boolean {
        let current = functionNode.parent;
        while (current) {
            if (current instanceof StructDefinition) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }

    private resolveItemDeclaration(item: CallHierarchyItem): DeclarationDescriptor | undefined {
        const cached = this.itemDeclarations.get(item);
        if (cached) {
            return cached;
        }

        const context = this.backend.contexts.get(item.uri.toString())?.context;
        const ast = context?.getResolvedAST();
        if (!context || !ast) {
            return undefined;
        }

        const declaration = context.astDeclarationAtPosition(
            item.selectionRange.start.line + 1,
            item.selectionRange.start.character,
        );
        if (!declaration || !declaration.name) {
            return undefined;
        }

        const resolved = { declaration, uri: context.sourceUri, ast };
        this.itemDeclarations.set(item, resolved);
        return resolved;
    }

    private resolveCalleeDeclaration(ast: Program, callExpression: CallExpression): VariableDeclaration | undefined {
        if (callExpression.callee instanceof VariableReference) {
            return ASTQuery.findDefinitionForReference(callExpression.callee);
        }
        if (callExpression.callee instanceof MemberExpression) {
            return ASTQuery.resolveMemberExpressionDeclaration(ast, callExpression.callee);
        }
        return undefined;
    }

    private findEnclosingFunction(node: { parent?: unknown }): FunctionDefinition | undefined {
        let current = node.parent;
        while (current) {
            if (current instanceof FunctionDefinition) {
                return current;
            }
            current = (current as { parent?: unknown }).parent;
        }
        return undefined;
    }

    private declarationForFunction(fn: FunctionDefinition): VariableDeclaration | undefined {
        return fn.name ? fn.parentScope?.resolveLocal(fn.name) : undefined;
    }

    private isSameDeclaration(
        left: VariableDeclaration,
        leftUri: string,
        right: VariableDeclaration,
        rightUri: string,
    ): boolean {
        if (left === right) {
            return true;
        }

        if (!left.name || !right.name || left.name !== right.name || leftUri !== rightUri) {
            return false;
        }

        if (!left.position || !right.position) {
            return false;
        }

        return left.position.start.line === right.position.start.line
            && left.position.start.column === right.position.start.column
            && left.position.end.line === right.position.end.line
            && left.position.end.column === right.position.end.column;
    }

    prepareCallHierarchy(
        document: TextDocument,
        position: Position,
        token: CancellationToken,
    ): ProviderResult<CallHierarchyItem | CallHierarchyItem[]> {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const context = this.backend.getContext(document.uri.toString());
        const ast = context.getResolvedAST();
        if (!ast) {
            return undefined;
        }

        const declaration = context.astDeclarationAtPosition(position.line + 1, position.character);
        if (!declaration) {
            return undefined;
        }

        const item = this.toItem(declaration, context.sourceUri, ast);
        return item ? [item] : undefined;
    }

    provideCallHierarchyOutgoingCalls(
        item: CallHierarchyItem,
        token: CancellationToken,
    ): ProviderResult<CallHierarchyOutgoingCall[]> {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const source = this.resolveItemDeclaration(item);
        if (!source) {
            return undefined;
        }

        const semanticNode = ASTQuery.findSemanticNodeForDeclaration(source.ast, source.declaration);
        if (!(semanticNode instanceof FunctionDefinition)) {
            return undefined;
        }

        const callsByTarget = new Map<string, { item: CallHierarchyItem; fromRanges: Range[] }>();

        for (const node of semanticNode.walk()) {
            if (token.isCancellationRequested || !(node instanceof CallExpression) || !node.position) {
                continue;
            }

            const callee = this.resolveCalleeDeclaration(source.ast, node);
            if (!callee) {
                continue;
            }

            const sourceContext = this.backend.contexts.get(source.uri)?.context;
            const calleeUri = sourceContext?.getDeclarationSourceUri(callee) ?? source.uri;
            const calleeContext = this.backend.contexts.get(calleeUri)?.context;
            const calleeAst = calleeContext?.getResolvedAST();
            if (!calleeAst) {
                continue;
            }

            const calleeItem = this.toItem(callee, calleeUri, calleeAst);
            if (!calleeItem) {
                continue;
            }

            const key = `${calleeItem.uri.toString()}|${calleeItem.selectionRange.start.line}:${calleeItem.selectionRange.start.character}`;
            const callRange = Utilities.lexicalRangeToRange({
                start: {
                    row: node.position.start.line,
                    column: node.position.start.column,
                },
                end: {
                    row: node.position.end.line,
                    column: node.position.end.column,
                },
            });

            const existing = callsByTarget.get(key);
            if (existing) {
                existing.fromRanges.push(callRange);
            } else {
                callsByTarget.set(key, { item: calleeItem, fromRanges: [callRange] });
            }
        }

        return [...callsByTarget.values()].map((entry) =>
            new CallHierarchyOutgoingCall(entry.item, entry.fromRanges));
    }

    provideCallHierarchyIncomingCalls(
        item: CallHierarchyItem,
        token: CancellationToken,
    ): ProviderResult<CallHierarchyIncomingCall[]> {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const target = this.resolveItemDeclaration(item);
        if (!target) {
            return undefined;
        }

        const incoming = new Map<string, { item: CallHierarchyItem; fromRanges: Range[] }>();

        for (const entry of this.backend.contexts.values()) {
            if (token.isCancellationRequested) {
                break;
            }

            const callerContext = entry.context;
            const callerAst = callerContext.getResolvedAST();
            if (!callerAst) {
                continue;
            }

            for (const node of ASTQuery.walkAllNodes(callerAst)) {
                if (token.isCancellationRequested || !(node instanceof CallExpression) || !node.position) {
                    continue;
                }

                const calleeDeclaration = this.resolveCalleeDeclaration(callerAst, node);
                if (!calleeDeclaration) {
                    continue;
                }

                const resolvedCalleeUri = callerContext.getDeclarationSourceUri(calleeDeclaration) ?? callerContext.sourceUri;
                if (!this.isSameDeclaration(calleeDeclaration, resolvedCalleeUri, target.declaration, target.uri)) {
                    continue;
                }

                const callerFn = this.findEnclosingFunction(node);
                if (!callerFn) {
                    continue;
                }

                const callerDeclaration = this.declarationForFunction(callerFn);
                if (!callerDeclaration) {
                    continue;
                }

                const callerUri = callerContext.getDeclarationSourceUri(callerDeclaration) ?? callerContext.sourceUri;
                const callerItemAst = this.backend.contexts.get(callerUri)?.context.getResolvedAST();
                if (!callerItemAst) {
                    continue;
                }

                const callerItem = this.toItem(callerDeclaration, callerUri, callerItemAst);
                if (!callerItem) {
                    continue;
                }

                const callRange = Utilities.lexicalRangeToRange({
                    start: {
                        row: node.position.start.line,
                        column: node.position.start.column,
                    },
                    end: {
                        row: node.position.end.line,
                        column: node.position.end.column,
                    },
                });

                const key = `${callerItem.uri.toString()}|${callerItem.selectionRange.start.line}:${callerItem.selectionRange.start.character}`;
                const existing = incoming.get(key);
                if (existing) {
                    existing.fromRanges.push(callRange);
                } else {
                    incoming.set(key, {
                        item: callerItem,
                        fromRanges: [callRange],
                    });
                }
            }
        }

        return [...incoming.values()].map((entry) =>
            new CallHierarchyIncomingCall(entry.item, entry.fromRanges));
    }
}
