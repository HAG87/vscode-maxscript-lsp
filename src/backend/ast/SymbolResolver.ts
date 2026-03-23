/**
 * Resolves symbol references in the AST using Tylasu
 * 
 * PURPOSE:
 * Links variable/function references to their declarations (semantic binding).
 * This enables features like go-to-definition, find-all-references, and unused variable detection.
 * 
 * PROCESS:
 * 1. Walks the AST tree respecting scope boundaries
 * 2. For each VariableReference, finds its VariableDeclaration using scope chain lookup
 * 3. Creates bidirectional links:
 *    - Reference.declaration → points to Declaration
 *    - Declaration.references[] → contains all References
 * 
 * SCOPE HANDLING:
 * - Respects MaxScript scope rules (local → function → global)
 * - Functions create new scope for parameters and locals
 * - Structs create scope for members and methods
 * - Blocks create scope for their local declarations
 * 
 * USAGE:
 * ```typescript
 * // After building AST from parse tree
 * const ast = ASTBuilder.buildAST(parseTree);
 * 
 * // Resolve all symbol references
 * const resolver = new SymbolResolver(ast, collectedReferences);
 * resolver.resolve();
 * 
 * // Now AST has resolved links:
 * // - Each VariableReference knows its VariableDeclaration
 * // - Each VariableDeclaration knows all its references
 * 
 * // Use for language features:
 * // - Go-to-definition: follow reference.declaration.referred
 * // - Find-all-references: access declaration.references[]
 * // - Unused variables: check if declaration.references.length === 0
 * 
 * // Then build symbol tree for VS Code outline:
 * const symbols = SymbolTreeBuilder.buildSymbolTree(ast, sourceUri);
 * ```
 * 
 * @see SymbolTreeBuilder - Converts resolved AST to hierarchical symbol tree for VS Code outline
 * @see ASTBuilder - Creates initial AST from ANTLR parse tree
 */

import {
    AssignmentExpression,
    BlockExpression,
    Expression,
    FunctionDefinition,
    Program,
    ScopeNode,
    StructDefinition,
    VariableDeclaration,
    VariableReference,
} from './ASTNodes.js';

export class SymbolResolver {
    // Track current scope during traversal
    private currentScope: ScopeNode;
    
    constructor(private program: Program, references: VariableReference[] = []) {
        this.currentScope = program;
    }
    
    /**
     * Main entry point - resolves all symbol references in the AST
     * FIX #1: Removed the incorrect first resolution pass that used program.resolve()
     * Now uses a single tree walk that respects scope boundaries
     */
    resolve(): void {
        // Single pass: walk AST respecting scope boundaries
        this.visitProgram(this.program);
    }
    
    private visitProgram(node: Program): void {
        this.currentScope = node;
        for (const stmt of node.statements) {
            this.visit(stmt);
        }
    }
    
    private visitVariableDeclaration(node: VariableDeclaration): void {
        // Declaration is already added to scope by ASTBuilder
        // Resolve any initializer expressions
        if (node.initializer) {
            this.visit(node.initializer);
        }
    }
    
    private visitVariableReference(node: VariableReference): void {
        if (!node.name || !node.declaration) return;
        
        // Resolve using scope chain - this respects lexical scoping
        const resolved = this.currentScope.resolve(node.name);
        
        if (resolved) {
            // Use Tylasu's ReferenceByName to link
            node.declaration.referred = resolved;
            
            // Add back-reference from declaration
            resolved.references.push(node);
        }
        // If no declaration found, reference remains unresolved (implicit global in MaxScript)
    }
    
    private visitFunctionDefinition(node: FunctionDefinition): void {
        // Functions create a new scope
        const previousScope = this.currentScope;
        this.currentScope = node;
        
        // Resolve body expressions
        if (node.body) {
            this.visit(node.body);
        }
        
        this.currentScope = previousScope;
    }
    
    private visitStructDefinition(node: StructDefinition): void {
        // Structs create a new scope
        const previousScope = this.currentScope;
        this.currentScope = node;
        
        // Resolve members (if they contain expressions)
        for (const member of node.members) {
            if (member.value) {
                this.visit(member.value);
            }
        }
        
        this.currentScope = previousScope;
    }
    
    private visitBlockExpression(node: BlockExpression): void {
        // Blocks create new scope in MaxScript
        const previousScope = this.currentScope;
        this.currentScope = node;
        
        for (const expr of node.expressions) {
            this.visit(expr);
        }
        
        this.currentScope = previousScope;
    }
    
    private visitAssignmentExpression(node: AssignmentExpression): void {
        // Visit target (left side - may be a reference)
        if (node.target) {
            this.visit(node.target);
        }
        
        // Visit value (right side)
        if (node.value) {
            this.visit(node.value);
        }
    }
    
    /**
     * Generic visit dispatcher
     * FIX #2: Added catch-all for expression nodes not explicitly handled
     * This ensures references nested in BinaryExpression, CallExpression, etc. are resolved
     */
    private visit(node: any): void {
        if (!node) return;
        
        if (node instanceof Program) {
            this.visitProgram(node);
        } else if (node instanceof VariableDeclaration) {
            this.visitVariableDeclaration(node);
        } else if (node instanceof VariableReference) {
            this.visitVariableReference(node);
        } else if (node instanceof FunctionDefinition) {
            this.visitFunctionDefinition(node);
        } else if (node instanceof StructDefinition) {
            this.visitStructDefinition(node);
        } else if (node instanceof BlockExpression) {
            this.visitBlockExpression(node);
        } else if (node instanceof AssignmentExpression) {
            this.visitAssignmentExpression(node);
        } else {
            // FIX #2: Catch-all for expression nodes (BinaryExpression, CallExpression, etc)
            // Walk children to find any nested VariableReferences
            if (typeof node.walkChildren === 'function') {
                for (const child of node.walkChildren()) {
                    this.visit(child);
                }
            }
        }
    }
}
