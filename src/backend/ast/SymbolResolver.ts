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
    private allReferences: VariableReference[];
    
    constructor(private program: Program, references: VariableReference[] = []) {
        this.currentScope = program;
        this.allReferences = references;
    }
    
    resolve(): void {
        // Resolve all collected references
        for (const ref of this.allReferences) {
            this.resolveReference(ref);
        }
        
        // Also walk the tree for any references not in the list
        this.visitProgram(this.program);
    }
    
    private resolveReference(node: VariableReference): void {
        if (!node.name || !node.declaration) return;
        
        // Resolve using scope chain (walk up from program root)
        const resolved = this.program.resolve(node.name);
        
        if (resolved) {
            // Use Tylasu's ReferenceByName to link
            node.declaration.referred = resolved;
            
            // Add back-reference from declaration
            resolved.references.push(node);
        }
        // If no declaration found, reference remains unresolved (implicit global in MaxScript)
    }
    
    private visitProgram(node: Program): void {
        this.currentScope = node;
        for (const stmt of node.statements) {
            this.visit(stmt);
        }
    }
    
    private visitVariableDeclaration(node: VariableDeclaration): void {
        // Declaration is already added to scope by ASTBuilder
        // Nothing to resolve here
    }
    
    private visitVariableReference(node: VariableReference): void {
        if (!node.name || !node.declaration) return;
        
        // Resolve using scope chain
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
        // Save current scope
        const previousScope = this.currentScope;
        
        // Enter function scope
        this.currentScope = node;
        
        // Resolve body
        if (node.body) {
            this.visit(node.body);
        }
        
        // Restore scope
        this.currentScope = previousScope;
    }
    
    private visitStructDefinition(node: StructDefinition): void {
        // Save current scope
        const previousScope = this.currentScope;
        
        // Enter struct scope
        this.currentScope = node;
        
        // Resolve methods
        for (const method of node.methods) {
            this.visit(method);
        }
        
        // Restore scope
        this.currentScope = previousScope;
    }
    
    private visitBlockExpression(node: BlockExpression): void {
        // Blocks create new scope in MaxScript
        const previousScope = this.currentScope;
        
        // Use block as scope
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
    
    // Generic visit dispatcher using Tylasu's walk pattern
    private visit(node: any): void {
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
        }
        // Add more node types as needed
    }
}
