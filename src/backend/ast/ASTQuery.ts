/**
 * ASTQuery — stable, provider-facing query API for the resolved MaxScript AST.
 *
 * This module is the intended seam between the AST pipeline and VS Code providers.
 * All position-based lookups, declaration/reference navigation, and scope ancestry
 * queries should go through here rather than reaching into ASTNodes/SymbolResolver
 * directly.
 *
 * API surface:
 *   findNodeAtPosition        – narrowest AST node at a source position
 *   findDeclarationAtPosition – declaration (or declaration of reference) at cursor
 *   findReferenceAtPosition   – VariableReference node at cursor (if any)
 *   findReferencesForDeclaration – O(1) – all usages of a declaration
 *   findDefinitionForReference   – O(1) – declaration pointed to by a reference
 *   getScopeChain             – scope-ancestor list from a node up to Program
 *   getEnclosingScope         – nearest ScopeNode ancestor
 *   getEnclosingDefinitionBlock – nearest DefinitionBlock ancestor
 */

import { Node, Position } from '@strumenta/tylasu';
import {
    Program,
    ScopeNode,
    VariableDeclaration,
    VariableReference,
    DefinitionBlock,
} from './ASTNodes.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class ASTQuery {
    /**
     * Returns the narrowest AST node whose span contains (line, column).
     * Useful for hover and generic contextual queries.
     *
     * Line and column are 1-based to match Tylasu Position semantics.
     */
    static findNodeAtPosition(ast: Program, line: number, column: number): Node | undefined {
        return this.findInnermost(ast, line, column, (n): n is Node => true);
    }

    /**
     * Returns the VariableReference node at (line, column), if any.
     */
    static findReferenceAtPosition(
        ast: Program,
        line: number,
        column: number,
    ): VariableReference | undefined {
        return this.findInnermost(ast, line, column, (n): n is VariableReference => n instanceof VariableReference);
    }

    /**
     * Returns the VariableDeclaration at (line, column).
     * If the cursor is on a reference, the reference's resolved declaration is returned.
     * If the cursor is directly on a declaration, that declaration is returned.
     * Returns undefined if no declaration can be resolved at the position.
     */
    static findDeclarationAtPosition(
        ast: Program,
        line: number,
        column: number,
    ): VariableDeclaration | undefined {
        // Prefer reference -> follow its link first (reference span is smaller)
        const ref = this.findReferenceAtPosition(ast, line, column);
        if (ref) {
            return ref.declaration?.referred ?? undefined;
        }
        // Cursor may be sitting directly on the declaration name
        return this.findInnermost(
            ast,
            line,
            column,
            (n): n is VariableDeclaration => n instanceof VariableDeclaration,
        );
    }

    /**
     * Returns all VariableReferences that point to the given declaration.
     * O(1) - result comes directly from the pre-linked declaration.references array.
     */
    static findReferencesForDeclaration(
        declaration: VariableDeclaration,
    ): readonly VariableReference[] {
        return declaration.references;
    }

    /**
     * Returns the VariableDeclaration that a reference resolves to.
     * O(1) - follows the pre-linked ReferenceByName.
     */
    static findDefinitionForReference(
        reference: VariableReference,
    ): VariableDeclaration | undefined {
        return reference.declaration?.referred ?? undefined;
    }

    /**
     * Returns the chain of ScopeNode ancestors from node up to (and including) Program.
     * The first element is the nearest enclosing scope; the last is Program.
     */
    static getScopeChain(node: Node): ScopeNode[] {
        const chain: ScopeNode[] = [];
        let current: Node | undefined = node.parent ?? undefined;
        while (current) {
            if (current instanceof ScopeNode) {
                chain.push(current);
            }
            current = current.parent ?? undefined;
        }
        return chain;
    }

    /**
     * Returns the nearest ScopeNode ancestor of node (exclusive of node itself).
     * Returns undefined only if node is Program root with no parent.
     */
    static getEnclosingScope(node: Node): ScopeNode | undefined {
        let current: Node | undefined = node.parent ?? undefined;
        while (current) {
            if (current instanceof ScopeNode) return current;
            current = current.parent ?? undefined;
        }
        return undefined;
    }

    /**
     * Returns the nearest DefinitionBlock ancestor of node.
     * Useful for resolving which rollout/macroscript/plugin a cursor is inside.
     */
    static getEnclosingDefinitionBlock(node: Node): DefinitionBlock | undefined {
        let current: Node | undefined = node.parent ?? undefined;
        while (current) {
            if (current instanceof DefinitionBlock) return current;
            current = current.parent ?? undefined;
        }
        return undefined;
    }

    /**
     * Returns a flat list of all VariableDeclarations reachable from the given scope
     * and its ancestors. Useful for completion item generation.
     *
     * Declarations are ordered from nearest scope (innermost) to root.
     * Each name appears only once (first occurrence wins, matching MaxScript shadowing).
     */
    static getVisibleDeclarations(scope: ScopeNode): VariableDeclaration[] {
        const seen = new Set<string>();
        const result: VariableDeclaration[] = [];

        let current: ScopeNode | undefined = scope;
        while (current) {
            for (const [name, decl] of current.declarations) {
                if (!seen.has(name)) {
                    seen.add(name);
                    result.push(decl);
                }
            }
            current = current.parentScope;
        }

        return result;
    }

    /**
     * Converts a Tylasu Position to a plain object compatible with VS Code Range.
     * (0-based lines, 0-based columns as VS Code uses)
     *
     * Tylasu Position uses 1-based lines and 0-based columns from lexer.
     * We only adjust lines here; columns are already 0-based from ANTLR.
     */
    static positionToRange(position: Position): {
        start: { line: number; character: number };
        end: { line: number; character: number };
    } {
        return {
            start: {
                line: position.start.line - 1,
                character: position.start.column,
            },
            end: {
                line: position.end.line - 1,
                character: position.end.column,
            },
        };
    }

    private static containsPosition(line: number, column: number, node: Node): boolean {
        const pos = node.position;
        if (!pos) return false;
        const startsBefore =
            pos.start.line < line || (pos.start.line === line && pos.start.column <= column);
        const endsAfter =
            pos.end.line > line || (pos.end.line === line && pos.end.column >= column);
        return startsBefore && endsAfter;
    }

    private static spanScore(node: Node): number {
        const pos = node.position;
        if (!pos) return Number.MAX_SAFE_INTEGER;
        return (pos.end.line - pos.start.line) * 100_000 + (pos.end.column - pos.start.column);
    }

    /**
     * Returns the smallest-span AST node at (line, column) that satisfies predicate.
     * Walks the full tree via Tylasu node.walk() generator.
     */
    private static findInnermost<T extends Node>(
        root: Program,
        line: number,
        column: number,
        predicate: (n: Node) => n is T,
    ): T | undefined {
        let best: T | undefined;
        let bestScore = Number.MAX_SAFE_INTEGER;

        for (const node of root.walk()) {
            if (!predicate(node) || !this.containsPosition(line, column, node)) continue;
            const score = this.spanScore(node);
            if (score <= bestScore) {
                best = node;
                bestScore = score;
            }
        }

        return best;
    }
}
