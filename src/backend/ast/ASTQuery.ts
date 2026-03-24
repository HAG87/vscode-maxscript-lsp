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
    Expression,
    AssignmentExpression,
    CallExpression,
    MemberExpression,
    DefinitionBlock,
    FunctionDefinition,
    StructDefinition,
    FunctionArgument,
    FunctionParameter,
    RolloutControl,
    RcMenuItem,
    ParameterDefinition,
    StructMemberField,
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
        // 1. Cursor may be on a VariableReference — follow its link (fastest path)
        const ref = this.findReferenceAtPosition(ast, line, column);
        if (ref) {
            return ref.declaration?.referred
                ?? this.findInferredDeclarationForReference(ast, ref);
        }

        // 1b. Cursor may be on a member/property token like `foo.bar` where `bar`
        // is modeled as MemberExpression.property (string), not a VariableReference.
        const member = this.findMemberExpressionAtPosition(ast, line, column);
        if (member) {
            return this.findDeclarationForMemberExpression(ast, member);
        }

        // 2. Try to find a declaration-defining node at this position.
        //    These include FunctionDefinition, StructDefinition, DefinitionBlock,
        //    FunctionArgument, FunctionParameter, StructMemberField, etc.
        //    Their corresponding VariableDeclaration lives in the parent/owner scope's
        //    declarations map — not in the tree itself.
        return this.findDeclarationLikeNodeAtPosition(ast, line, column);
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
     * Returns all MemberExpression nodes whose property resolves to the declaration.
     * This complements declaration.references for member lookups (e.g. foo.bar, st.bar).
     */
    static findMemberReferencesForDeclaration(
        ast: Program,
        declaration: VariableDeclaration,
    ): readonly MemberExpression[] {
        const result: MemberExpression[] = [];

        for (const node of this.walkNodes(ast)) {
            if (!(node instanceof MemberExpression)) {
                continue;
            }

            const resolved = this.findDeclarationForMemberExpression(ast, node);
            if (resolved === declaration) {
                result.push(node);
            }
        }

        return result;
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
     * Returns the MemberExpression node whose property token contains (line, column), if any.
     */
    static findMemberExpressionAtPosition(
        ast: Program,
        line: number,
        column: number,
    ): MemberExpression | undefined {
        return this.findInnermost(ast, line, column, (n): n is MemberExpression => n instanceof MemberExpression);
    }

    /**
     * Returns the richest AST node corresponding to a bound declaration.
     * This is useful when a reference resolves to a scope declaration entry
     * but the user-facing hover/outline should describe the actual construct
     * (function, struct, parameter, rollout control, etc.).
     */
    static findSemanticNodeForDeclaration(
        ast: Program,
        declaration: VariableDeclaration,
    ): Node {
        const declarationName = declaration.name;
        const declarationPosition = declaration.position;

        if (!declarationName || !declarationPosition) {
            return declaration;
        }

        let fallback: Node = declaration;

        for (const node of this.walkNodes(ast)) {
            if (!(node instanceof Node)) {
                continue;
            }

            const nodeName = (node as { name?: string }).name;
            if (nodeName !== declarationName || !this.samePosition(node, declaration)) {
                continue;
            }

            if (
                node instanceof FunctionDefinition ||
                node instanceof StructDefinition ||
                node instanceof DefinitionBlock ||
                node instanceof FunctionArgument ||
                node instanceof FunctionParameter ||
                node instanceof RolloutControl ||
                node instanceof RcMenuItem ||
                node instanceof ParameterDefinition ||
                node instanceof StructMemberField
            ) {
                return node;
            }

            fallback = node;
        }

        return fallback;
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
     * Returns visible declarations at a specific source position.
     *
     * This applies linear-flow visibility: a declaration is visible only if it
     * starts at or before (line, column). Declarations defined later in the file
     * are excluded.
     */
    static getVisibleDeclarationsAtPosition(
        scope: ScopeNode,
        line: number,
        column: number,
    ): VariableDeclaration[] {
        const seen = new Set<string>();
        const result: VariableDeclaration[] = [];

        let current: ScopeNode | undefined = scope;
        while (current) {
            for (const [name, decl] of current.declarations) {
                if (seen.has(name)) {
                    continue;
                }
                if (!this.isDeclarationVisibleAtPosition(decl, line, column)) {
                    continue;
                }
                seen.add(name);
                result.push(decl);
            }
            current = current.parentScope;
        }

        return result;
    }

    /**
     * Returns member declarations from a struct/definition scope accessible from the given declaration.
     * Used for member access completions (foo.bar where foo is a struct instance).
     *
     * Returns all visible declarations from the struct/definition scope (members, methods, properties).
     */
    static getMemberCompletions(
        ast: Program,
        declaration: VariableDeclaration,
    ): VariableDeclaration[] {
        const structScope = this.findStructScopeForDeclaration(ast, declaration);
        if (!structScope) {
            return [];
        }
        // Return ONLY the struct's own members — do NOT walk up parentScope.
        return [...structScope.declarations.values()];
    }

    /**
     * Resolves the object (left side of dot) in a member access expression.
     * For `foo.bar`, this returns the declaration for `foo`.
     */
    static findDeclarationForMemberExpressionObject(
        ast: Program,
        memberExpression: MemberExpression,
    ): VariableDeclaration | undefined {
        return this.findDeclarationForExpression(ast, memberExpression.object);
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

    private static isDeclarationVisibleAtPosition(
        declaration: VariableDeclaration,
        line: number,
        column: number,
    ): boolean {
        const pos = declaration.position;
        if (!pos) {
            return true;
        }

        if (pos.start.line < line) {
            return true;
        }
        if (pos.start.line > line) {
            return false;
        }
        return pos.start.column <= column;
    }

    private static spanScore(node: Node): number {
        const pos = node.position;
        if (!pos) return Number.MAX_SAFE_INTEGER;
        return (pos.end.line - pos.start.line) * 100_000 + (pos.end.column - pos.start.column);
    }

    private static findDeclarationForMemberExpression(
        ast: Program,
        memberExpression: MemberExpression,
    ): VariableDeclaration | undefined {
        const structScope = this.findStructScopeForExpression(ast, memberExpression.object);
        if (!structScope) {
            return undefined;
        }
        return structScope.declarations.get(memberExpression.property);
    }

    private static findStructScopeForExpression(
        ast: Program,
        expression: Expression,
    ): StructDefinition | undefined {
        if (expression instanceof VariableReference) {
            const declaration = this.findDefinitionForReference(expression);
            if (declaration) {
                return this.findStructScopeForDeclaration(ast, declaration);
            }

            const inferredDeclaration = this.findInferredDeclarationForReference(ast, expression);
            return inferredDeclaration ? this.findStructScopeForDeclaration(ast, inferredDeclaration) : undefined;
        }

        if (expression instanceof CallExpression) {
            return this.findStructScopeForCallExpression(ast, expression);
        }

        if (expression instanceof MemberExpression) {
            const memberDeclaration = this.findDeclarationForMemberExpression(ast, expression);
            return memberDeclaration ? this.findStructScopeForDeclaration(ast, memberDeclaration) : undefined;
        }

        return undefined;
    }

    /**
     * Resolves an expression to the VariableDeclaration it refers to.
     * Used internally for member completion lookups.
     */
    private static findDeclarationForExpression(
        ast: Program,
        expression: Expression,
    ): VariableDeclaration | undefined {
        if (expression instanceof VariableReference) {
            const declaration = this.findDefinitionForReference(expression);
            if (declaration) {
                return declaration;
            }
            return this.findInferredDeclarationForReference(ast, expression);
        }

        if (expression instanceof CallExpression) {
            // For calls, try to find what struct is being constructed
            if (expression.callee instanceof VariableReference) {
                const calleeDeclaration = this.findDefinitionForReference(expression.callee);
                if (calleeDeclaration) {
                    return calleeDeclaration;
                }
            }
            return undefined;
        }

        if (expression instanceof MemberExpression) {
            // Recursively resolve the member expression
            return this.findDeclarationForMemberExpression(ast, expression);
        }

        return undefined;
    }

    private static findInferredDeclarationForReference(
        ast: Program,
        reference: VariableReference,
    ): VariableDeclaration | undefined {
        const referenceName = reference.name;
        const referencePosition = reference.position;
        if (!referenceName || !referencePosition) {
            return undefined;
        }

        let bestStructDeclaration: VariableDeclaration | undefined;
        let bestAssignmentPosition: Position | undefined;

        for (const node of this.walkNodes(ast)) {
            if (!(node instanceof VariableReference) || node === reference) {
                continue;
            }

            const parent = node.parent;
            if (!(parent instanceof AssignmentExpression)) {
                continue;
            }

            if (parent.target !== node || node.name !== referenceName) {
                continue;
            }

            const assignmentPosition = parent.position;
            if (!assignmentPosition || !this.isPositionBeforeOrEqual(assignmentPosition.start, referencePosition.start)) {
                continue;
            }

            const inferredStruct = parent.value
                ? this.findStructScopeForExpression(ast, parent.value)
                : undefined;
            if (!inferredStruct?.name) {
                continue;
            }

            const structDeclaration = inferredStruct.parentScope?.declarations.get(inferredStruct.name);
            if (!structDeclaration) {
                continue;
            }

            if (!bestAssignmentPosition || this.isPositionBeforeOrEqual(bestAssignmentPosition.start, assignmentPosition.start)) {
                bestAssignmentPosition = assignmentPosition;
                bestStructDeclaration = structDeclaration;
            }
        }

        return bestStructDeclaration;
    }

    private static isPositionBeforeOrEqual(left: { line: number; column: number }, right: { line: number; column: number }): boolean {
        return left.line < right.line || (left.line === right.line && left.column <= right.column);
    }

    private static findStructScopeForDeclaration(
        ast: Program,
        declaration: VariableDeclaration,
    ): StructDefinition | undefined {
        const semanticNode = this.findSemanticNodeForDeclaration(ast, declaration);
        if (semanticNode instanceof StructDefinition) {
            return semanticNode;
        }

        const initializer = declaration.initializer;
        if (initializer instanceof CallExpression) {
            return this.findStructScopeForCallExpression(ast, initializer);
        }

        if (initializer instanceof VariableReference) {
            const aliasedDeclaration = this.findDefinitionForReference(initializer);
            return aliasedDeclaration ? this.findStructScopeForDeclaration(ast, aliasedDeclaration) : undefined;
        }

        return undefined;
    }

    private static findStructScopeForCallExpression(
        ast: Program,
        callExpression: CallExpression,
    ): StructDefinition | undefined {
        if (callExpression.callee instanceof VariableReference) {
            const calleeDeclaration = this.findDefinitionForReference(callExpression.callee);
            return calleeDeclaration ? this.findStructScopeForDeclaration(ast, calleeDeclaration) : undefined;
        }

        if (callExpression.callee instanceof MemberExpression) {
            const memberDeclaration = this.findDeclarationForMemberExpression(ast, callExpression.callee);
            return memberDeclaration ? this.findStructScopeForDeclaration(ast, memberDeclaration) : undefined;
        }

        return undefined;
    }

    private static findDeclarationLikeNodeAtPosition(
        ast: Program,
        line: number,
        column: number,
    ): VariableDeclaration | undefined {
        // Find the innermost declaration-defining AST node at (line, column).
        // These nodes define names but their corresponding VariableDeclaration entries
        // live in a scope's `declarations` Map, not in the tree proper.
        const declarationNode = this.findInnermost(
            ast,
            line,
            column,
            (n): n is Node => this.isDeclarationLikeNode(n),
        );

        if (!declarationNode) {
            return undefined;
        }

        const declarationName = (declarationNode as { name?: string }).name;
        if (!declarationName) {
            return undefined;
        }

        // Determine which scope holds the declaration entry:
        //
        // FunctionDefinition "myFunc": its VariableDeclaration is in the parentScope
        // StructDefinition "MyStruct":  its VariableDeclaration is in the parentScope
        // DefinitionBlock "myUtil":     its VariableDeclaration is in the parentScope
        //
        // FunctionArgument "x":        its VariableDeclaration is in the FunctionDefinition scope
        // FunctionParameter "size":    its VariableDeclaration is in the FunctionDefinition scope
        // StructMemberField "field1":  its VariableDeclaration is in the StructDefinition scope
        // RolloutControl "btn":        its VariableDeclaration is already a VariableDeclaration (subclass)
        // RcMenuItem "item":           its VariableDeclaration is already a VariableDeclaration (subclass)
        // ParameterDefinition "width": its VariableDeclaration is already a VariableDeclaration (subclass)

        // Case 1: the node IS already a VariableDeclaration (subclasses like RolloutControl)
        if (declarationNode instanceof VariableDeclaration) {
            return declarationNode;
        }

        // Case 2: FunctionDefinition / StructDefinition / DefinitionBlock
        //         → look up name in parentScope
        if (
            declarationNode instanceof FunctionDefinition
            || declarationNode instanceof StructDefinition
            || declarationNode instanceof DefinitionBlock
        ) {
            // Only resolve to the definition name when the cursor is actually on the
            // definition's own start line/column (i.e. on the name keyword token),
            // not anywhere inside the body that happens to be enclosed by this node.
            const defPos = declarationNode.position;
            if (defPos && defPos.start.line === line && defPos.start.column <= column) {
                return (declarationNode as FunctionDefinition | StructDefinition | DefinitionBlock).parentScope?.declarations.get(declarationName);
            }
            return undefined;
        }

        // Case 3: FunctionArgument / FunctionParameter / StructMemberField
        //         → these are children of a FunctionDefinition or StructDefinition;
        //           find the innermost ScopeNode whose position contains (line, col)
        //           and whose declarations map has this name.
        return this.findDeclarationInEnclosingScopeByName(ast, line, column, declarationName);
    }

    /**
     * Walks all ScopeNodes in the tree to find the innermost one that contains
     * (line, column) and has a declaration with the given name.
     * Used for FunctionArgument / FunctionParameter / StructMemberField.
     */
    private static findDeclarationInEnclosingScopeByName(
        ast: Program,
        line: number,
        column: number,
        name: string,
    ): VariableDeclaration | undefined {
        let bestScope: ScopeNode | undefined;
        let bestScore = Number.MAX_SAFE_INTEGER;

        for (const node of ast.walk()) {
            if (!(node instanceof ScopeNode)) continue;
            if (!this.containsPosition(line, column, node)) continue;
            const decl = node.declarations.get(name);
            if (!decl) continue;
            const score = this.spanScore(node);
            if (score < bestScore) {
                bestScore = score;
                bestScope = node;
            }
        }

        return bestScope?.declarations.get(name);
    }

    private static isDeclarationLikeNode(node: Node): boolean {
        return node instanceof VariableDeclaration
            || node instanceof FunctionDefinition
            || node instanceof StructDefinition
            || node instanceof DefinitionBlock
            || node instanceof FunctionArgument
            || node instanceof FunctionParameter
            || node instanceof StructMemberField
            || node instanceof RolloutControl
            || node instanceof RcMenuItem
            || node instanceof ParameterDefinition;
    }

    private static samePosition(left: Node, right: Node): boolean {
        const leftPos = left.position;
        const rightPos = right.position;
        if (!leftPos || !rightPos) {
            return false;
        }

        return leftPos.start.line === rightPos.start.line
            && leftPos.start.column === rightPos.start.column
            && leftPos.end.line === rightPos.end.line
            && leftPos.end.column === rightPos.end.column;
    }

    /** Exposes the full-tree walk for external diagnostics/tests. */
    static *walkAllNodes(root: Program): Iterable<Node> {
        yield* root.walk();
    }

    private static *walkNodes(root: Program): Iterable<Node> {
        yield* root.walk();
    }

    /**
     * Returns the smallest-span AST node at (line, column) that satisfies predicate.
     */
    private static findInnermost<T extends Node>(
        root: Program,
        line: number,
        column: number,
        predicate: (n: Node) => n is T,
    ): T | undefined {
        let best: T | undefined;
        let bestScore = Number.MAX_SAFE_INTEGER;

        for (const node of this.walkNodes(root)) {
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
