/**
 * Resolves symbol references in the AST
 * Implements variable declaration/reference linking
 */

import {
    ASTNode,
    ASTVisitor,
    AssignmentExpression,
    BlockExpression,
    Expression,
    FunctionDefinition,
    Program,
    ScopeNode,
    VariableDeclaration,
    VariableReference,
} from './ASTNodes.js';

export class SymbolResolver implements ASTVisitor<void> {
    // Track current scope during traversal
    private currentScope: ScopeNode;
    
    constructor(private program: Program) {
        this.currentScope = program;
    }
    
    resolve(): void {
        this.visitProgram(this.program);
    }
    
    visitProgram(node: Program): void {
        this.currentScope = node;
        for (const stmt of node.statements) {
            this.visit(stmt);
        }
    }
    
    visitVariableDeclaration(node: VariableDeclaration): void {
        // Declaration is already added to scope by ASTBuilder
        // Nothing to resolve here
    }
    
    visitVariableReference(node: VariableReference): void {
        // Resolve the reference using scope chain
        const declaration = this.currentScope.resolve(node.name);
        
        if (declaration) {
            // Link reference to declaration
            node.declaration = declaration;
            
            // Add back-reference from declaration
            declaration.references.push(node);
        }
        // If no declaration found, reference remains unresolved (implicit global in MaxScript)
    }
    
    visitFunctionDefinition(node: FunctionDefinition): void {
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
    
    visitBlockExpression(node: BlockExpression): void {
        // Blocks create new scope in MaxScript
        const previousScope = this.currentScope;
        
        // Use block as scope
        this.currentScope = node;
        
        for (const expr of node.expressions) {
            this.visit(expr);
        }
        
        this.currentScope = previousScope;
    }
    
    visitAssignmentExpression(node: AssignmentExpression): void {
        // Visit target (left side - may be a reference)
        if (node.target) {
            this.visit(node.target);
        }
        
        // Visit value (right side)
        if (node.value) {
            this.visit(node.value);
        }
    }
    
    // Generic visit dispatcher
    private visit(node: ASTNode): void {
        if (node instanceof Program) {
            this.visitProgram(node);
        } else if (node instanceof VariableDeclaration) {
            this.visitVariableDeclaration(node);
        } else if (node instanceof VariableReference) {
            this.visitVariableReference(node);
        } else if (node instanceof FunctionDefinition) {
            this.visitFunctionDefinition(node);
        } else if (node instanceof BlockExpression) {
            this.visitBlockExpression(node);
        }
        // Add more node types as needed
    }
}
