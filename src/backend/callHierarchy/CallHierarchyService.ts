import { basename } from 'path';

import type { IAstContext } from '@backend/IAstContext.js';
import type { ILexicalRange } from '@backend/types.js';
import { ASTQuery } from '@ast/ASTQuery.js';
import {
    CallExpression,
    FunctionDefinition,
    MemberExpression,
    StructDefinition,
    VariableDeclaration,
    VariableReference,
} from '@ast/ASTNodes.js';

export interface CallHierarchyDescriptor {
    uri: string;
    name: string;
    selectionRange: ILexicalRange;
}

export interface CallHierarchyItemModel {
    name: string;
    detail: string;
    kind: 'function' | 'method';
    uri: string;
    range: ILexicalRange;
    selectionRange: ILexicalRange;
}

export interface CallHierarchyCallModel {
    item: CallHierarchyItemModel;
    fromRanges: ILexicalRange[];
}

export class CallHierarchyService {
    private toLexicalRange(position: {
        start: { line: number; column: number };
        end: { line: number; column: number };
    }): ILexicalRange {
        return {
            start: {
                row: position.start.line,
                column: position.start.column,
            },
            end: {
                row: position.end.line,
                column: position.end.column,
            },
        };
    }

    private selectionRangeFromDeclaration(declaration: VariableDeclaration): ILexicalRange | undefined {
        if (!declaration.position || !declaration.name) {
            return undefined;
        }

        return {
            start: {
                row: declaration.position.start.line,
                column: declaration.position.start.column,
            },
            end: {
                row: declaration.position.start.line,
                column: declaration.position.start.column + declaration.name.length,
            },
        };
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

    private declarationToItem(
        sourceContext: IAstContext,
        declaration: VariableDeclaration,
    ): CallHierarchyItemModel | undefined {
        if (!declaration.name || !declaration.position) {
            return undefined;
        }

        const ast = sourceContext.getResolvedAST();
        if (!ast) {
            return undefined;
        }

        const semanticNode = ASTQuery.findSemanticNodeForDeclaration(ast, declaration);
        if (!(semanticNode instanceof FunctionDefinition)) {
            return undefined;
        }

        const selectionRange = this.selectionRangeFromDeclaration(declaration);
        if (!selectionRange) {
            return undefined;
        }

        return {
            name: declaration.name,
            detail: basename(sourceContext.sourceUri),
            kind: this.isStructMethod(semanticNode) ? 'method' : 'function',
            uri: sourceContext.sourceUri,
            range: this.toLexicalRange(declaration.position),
            selectionRange,
        };
    }

    private descriptorFromItem(item: CallHierarchyItemModel): CallHierarchyDescriptor {
        return {
            uri: item.uri,
            name: item.name,
            selectionRange: item.selectionRange,
        };
    }

    private resolveDeclarationFromDescriptor(
        sourceContext: IAstContext,
        descriptor: CallHierarchyDescriptor,
    ): VariableDeclaration | undefined {
        const declaration = sourceContext.astDeclarationAtPosition(
            descriptor.selectionRange.start.row,
            descriptor.selectionRange.start.column,
        );

        if (!declaration || !declaration.name || declaration.name !== descriptor.name) {
            return undefined;
        }

        return declaration;
    }

    private resolveCalleeDeclaration(sourceContext: IAstContext, callExpression: CallExpression): VariableDeclaration | undefined {
        const ast = sourceContext.getResolvedAST();
        if (!ast) {
            return undefined;
        }

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

    public prepareItem(
        sourceContext: IAstContext,
        row1Based: number,
        column0Based: number,
    ): { item: CallHierarchyItemModel; descriptor: CallHierarchyDescriptor } | undefined {
        const declaration = sourceContext.astDeclarationAtPosition(row1Based, column0Based);
        if (!declaration) {
            return undefined;
        }

        const item = this.declarationToItem(sourceContext, declaration);
        if (!item) {
            return undefined;
        }

        return {
            item,
            descriptor: this.descriptorFromItem(item),
        };
    }

    public getOutgoingCalls(
        sourceContext: IAstContext,
        descriptor: CallHierarchyDescriptor,
        getContextByUri: (uri: string) => IAstContext | undefined,
    ): CallHierarchyCallModel[] {
        const sourceDeclaration = this.resolveDeclarationFromDescriptor(sourceContext, descriptor);
        const ast = sourceContext.getResolvedAST();
        if (!sourceDeclaration || !ast) {
            return [];
        }

        const semanticNode = ASTQuery.findSemanticNodeForDeclaration(ast, sourceDeclaration);
        if (!(semanticNode instanceof FunctionDefinition)) {
            return [];
        }

        const callsByTarget = new Map<string, CallHierarchyCallModel>();

        for (const node of semanticNode.walk()) {
            if (!(node instanceof CallExpression) || !node.position) {
                continue;
            }

            const calleeDeclaration = this.resolveCalleeDeclaration(sourceContext, node);
            if (!calleeDeclaration) {
                continue;
            }

            const calleeUri = sourceContext.getDeclarationSourceUri(calleeDeclaration) ?? sourceContext.sourceUri;
            const calleeContext = getContextByUri(calleeUri);
            if (!calleeContext) {
                continue;
            }

            const calleeItem = this.declarationToItem(calleeContext, calleeDeclaration);
            if (!calleeItem) {
                continue;
            }

            const key = `${calleeItem.uri}|${calleeItem.selectionRange.start.row}:${calleeItem.selectionRange.start.column}`;
            const callRange = this.toLexicalRange(node.position);
            const existing = callsByTarget.get(key);
            if (existing) {
                existing.fromRanges.push(callRange);
            } else {
                callsByTarget.set(key, {
                    item: calleeItem,
                    fromRanges: [callRange],
                });
            }
        }

        return [...callsByTarget.values()];
    }

    public getIncomingCalls(
        targetContext: IAstContext,
        descriptor: CallHierarchyDescriptor,
        sourceContexts: Iterable<IAstContext>,
    ): CallHierarchyCallModel[] {
        const targetDeclaration = this.resolveDeclarationFromDescriptor(targetContext, descriptor);
        if (!targetDeclaration) {
            return [];
        }

        const incoming = new Map<string, CallHierarchyCallModel>();

        for (const callerContext of sourceContexts) {
            const callerAst = callerContext.getResolvedAST();
            if (!callerAst) {
                continue;
            }

            for (const node of ASTQuery.walkAllNodes(callerAst)) {
                if (!(node instanceof CallExpression) || !node.position) {
                    continue;
                }

                const calleeDeclaration = this.resolveCalleeDeclaration(callerContext, node);
                if (!calleeDeclaration) {
                    continue;
                }

                const calleeUri = callerContext.getDeclarationSourceUri(calleeDeclaration) ?? callerContext.sourceUri;
                if (!this.isSameDeclaration(calleeDeclaration, calleeUri, targetDeclaration, targetContext.sourceUri)) {
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

                const callerItem = this.declarationToItem(callerContext, callerDeclaration);
                if (!callerItem) {
                    continue;
                }

                const key = `${callerItem.uri}|${callerItem.selectionRange.start.row}:${callerItem.selectionRange.start.column}`;
                const callRange = this.toLexicalRange(node.position);
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

        return [...incoming.values()];
    }
}
