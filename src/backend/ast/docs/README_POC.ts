/**
 * Example integration of Tylasu AST POC
 * Shows the intended AST pipeline and a small set of helper lookups.
 *
 * Note:
 * This file is historical guidance, not the provider-facing query layer.
 * The real migration target is a dedicated AST/query API that can serve
 * definitions, references, scopes, and contextual lookups consistently.
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../../parser/mxsLexer.js';
import { mxsParser } from '../../../parser/mxsParser.js';
import { ASTBuilder } from '../ASTBuilder.js';
import { Program, VariableDeclaration, VariableReference } from '../ASTNodes.js';
import { SymbolResolver } from '../SymbolResolver.js';

/**
 * Parse MaxScript code and build resolved AST
 */
export function buildAST(code: string): Program {
    // 1. Lex and parse with ANTLR (existing pipeline)
    const inputStream = CharStream.fromString(code);
    const lexer = new mxsLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new mxsParser(tokenStream);
    const parseTree = parser.program();
    
    // 2. Build AST from parse tree
    const builder = new ASTBuilder();
    const ast = builder.visitProgram(parseTree);
    
    // 3. Resolve all symbol references
    const resolver = new SymbolResolver(ast);
    resolver.resolve();
    
    return ast;
}

function containsPosition(line: number, column: number, node: { position?: Program['position'] }): boolean {
    const position = node.position;
    if (!position) {
        return false;
    }

    const startsBefore = position.start.line < line
        || (position.start.line === line && position.start.column <= column);
    const endsAfter = position.end.line > line
        || (position.end.line === line && position.end.column >= column);

    return startsBefore && endsAfter;
}

function nodeSpanScore(node: { position?: Program['position'] }): number {
    const position = node.position;
    if (!position) {
        return Number.MAX_SAFE_INTEGER;
    }

    return (position.end.line - position.start.line) * 100000 + (position.end.column - position.start.column);
}

function findInnermostNode<T>(ast: Program, line: number, column: number, predicate: (node: unknown) => node is T): T | undefined {
    let bestMatch: T | undefined;
    let bestScore = Number.MAX_SAFE_INTEGER;

    for (const node of ast.walk()) {
        if (!predicate(node) || !containsPosition(line, column, node)) {
            continue;
        }

        const score = nodeSpanScore(node);
        if (score <= bestScore) {
            bestMatch = node;
            bestScore = score;
        }
    }

    return bestMatch;
}

/**
 * Example: Find all references to the declaration or reference under a position.
 *
 * Lookup of the declaration's references remains O(1); locating the node by position
 * is still a tree walk until the dedicated query layer is added.
 */
export function findReferencesAt(ast: Program, line: number, column: number) {
    const referenceNode = findInnermostNode(ast, line, column, (node): node is VariableReference => node instanceof VariableReference);
    if (referenceNode?.declaration?.referred) {
        return referenceNode.declaration.referred.references;
    }

    const declarationNode = findInnermostNode(ast, line, column, (node): node is VariableDeclaration => node instanceof VariableDeclaration);
    return declarationNode?.references ?? [];
}

/**
 * Example: Find the declaration referenced at a given position.
 */
export function findDefinitionAt(ast: Program, line: number, column: number) {
    const referenceNode = findInnermostNode(ast, line, column, (node): node is VariableReference => node instanceof VariableReference);
    return referenceNode?.declaration?.referred;
}

/**
 * Comparison with current antlr4-c3 approach:
 * 
 * OLD (antlr4-c3):
 * 1. ContextSymbolTable.getScopedSymbolOccurrences(symbol, scope)
 * 2. → findSymbolInstances() - walks entire parse tree
 * 3. → Multiple DFS traversals with isScopeSibling/isScopeChild heuristics
 * 4. → O(n²) complexity, unreliable scope matching
 * 
 * NEW (Tylasu AST):
 * 1. Locate the AST node at the cursor position
 * 2. → Follow `VariableReference.declaration.referred` to the declaration
 * 3. → Use `declaration.references` for O(1) reference access after node lookup
 * 4. → 100% reliable binding once references are resolved during AST build
 * 
 * Performance note:
 * The O(1) guarantee applies to resolved declaration/reference relationships,
 * not to cursor-to-node lookup. That lookup still needs a query layer, which is
 * the next migration step before providers switch over.
 */
