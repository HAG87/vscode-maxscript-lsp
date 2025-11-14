/**
 * Tylasu-inspired AST nodes for MaxScript
 * POC: Focus on variable declarations and references only
 */

import { ParserRuleContext } from 'antlr4ng';

// Base position information
export interface Position {
    line: number;
    column: number;
}

export interface Range {
    start: Position;
    end: Position;
}

// Base AST Node
export abstract class ASTNode {
    range?: Range;
    parent?: ASTNode;
    
    constructor(range?: Range) {
        this.range = range;
    }
    
    abstract accept<T>(visitor: ASTVisitor<T>): T;
}

// Scope node - can contain declarations
export abstract class ScopeNode extends ASTNode {
    declarations: Map<string, VariableDeclaration> = new Map();
    
    // Direct reference to parent scope for fast lookups
    parentScope?: ScopeNode;
    
    /**
     * Resolve a symbol in this scope or parent scopes
     * O(1) lookup in each scope level
     */
    resolve(name: string): VariableDeclaration | undefined {
        const local = this.declarations.get(name);
        if (local) return local;
        
        return this.parentScope?.resolve(name);
    }
    
    /**
     * Add a declaration to this scope
     */
    addDeclaration(decl: VariableDeclaration): void {
        this.declarations.set(decl.name, decl);
        decl.declaringScope = this;
    }
}

// Root program node
export class Program extends ScopeNode {
    statements: ASTNode[] = [];
    
    accept<T>(visitor: ASTVisitor<T>): T {
        return visitor.visitProgram(this);
    }
}

// Variable declaration: local x = 5
export class VariableDeclaration extends ASTNode {
    name: string;
    scope: 'local' | 'global' | 'persistent'; // MaxScript specific
    initializer?: Expression;
    
    // Scope where this is declared
    declaringScope?: ScopeNode;
    
    // All references to this declaration
    references: VariableReference[] = [];
    
    constructor(name: string, scope: 'local' | 'global' | 'persistent', range?: Range) {
        super(range);
        this.name = name;
        this.scope = scope;
    }
    
    accept<T>(visitor: ASTVisitor<T>): T {
        return visitor.visitVariableDeclaration(this);
    }
}

// Variable reference: usage of a variable
export class VariableReference extends ASTNode {
    name: string;
    
    // Direct link to declaration (O(1) lookup after resolution)
    declaration?: VariableDeclaration;
    
    constructor(name: string, range?: Range) {
        super(range);
        this.name = name;
    }
    
    accept<T>(visitor: ASTVisitor<T>): T {
        return visitor.visitVariableReference(this);
    }
}

// Function definition (scope node)
export class FunctionDefinition extends ScopeNode {
    name: string;
    parameters: VariableDeclaration[] = [];
    body?: BlockExpression;
    
    constructor(name: string, range?: Range) {
        super(range);
        this.name = name;
    }
    
    accept<T>(visitor: ASTVisitor<T>): T {
        return visitor.visitFunctionDefinition(this);
    }
}

// Block expression (scope node) - (expr1; expr2; expr3)
export class BlockExpression extends ScopeNode {
    expressions: Expression[] = [];
    
    accept<T>(visitor: ASTVisitor<T>): T {
        return visitor.visitBlockExpression(this);
    }
}

// Base expression
export abstract class Expression extends ASTNode {
}

// Assignment expression
export class AssignmentExpression extends Expression {
    target: VariableReference;
    value: Expression;
    
    constructor(target: VariableReference, value: Expression, range?: Range) {
        super(range);
        this.target = target;
        this.value = value;
    }
    
    accept<T>(visitor: ASTVisitor<T>): T {
        return visitor.visitAssignmentExpression(this);
    }
}

// Visitor pattern for AST traversal
export interface ASTVisitor<T> {
    visitProgram(node: Program): T;
    visitVariableDeclaration(node: VariableDeclaration): T;
    visitVariableReference(node: VariableReference): T;
    visitFunctionDefinition(node: FunctionDefinition): T;
    visitBlockExpression(node: BlockExpression): T;
    visitAssignmentExpression(node: AssignmentExpression): T;
}
