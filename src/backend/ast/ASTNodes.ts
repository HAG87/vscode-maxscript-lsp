/**
 * MaxScript AST nodes using Tylasu library
 * POC: Focus on variable declarations and references only
 */

import { Node, Position, ReferenceByName, PossiblyNamed } from '@strumenta/tylasu';

// Scope node - can contain declarations
export abstract class ScopeNode extends Node {
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
        if (decl.name) {
            this.declarations.set(decl.name, decl);
            decl.declaringScope = this;
        }
    }
}

// Root program node
export class Program extends ScopeNode {
    statements: Node[] = [];
}

// Variable declaration: local x = 5
export class VariableDeclaration extends Node implements PossiblyNamed {
    name?: string;
    scope: 'local' | 'global' | 'persistent'; // MaxScript specific
    initializer?: Expression;
    
    // Scope where this is declared
    declaringScope?: ScopeNode;
    
    // All references to this declaration
    references: VariableReference[] = [];
    
    constructor(name: string, scope: 'local' | 'global' | 'persistent', position?: Position) {
        super(position);
        this.name = name;
        this.scope = scope;
    }
}

// Variable reference: usage of a variable
export class VariableReference extends Node implements PossiblyNamed {
    name?: string;
    
    // Tylasu reference - links to declaration
    declaration?: ReferenceByName<VariableDeclaration>;
    
    constructor(name: string, position?: Position) {
        super(position);
        this.name = name;
        this.declaration = new ReferenceByName(name);
    }
}

// Function definition (scope node)
export class FunctionDefinition extends ScopeNode implements PossiblyNamed {
    name?: string;
    parameters: VariableDeclaration[] = [];
    body?: BlockExpression;
    
    constructor(name: string, position?: Position) {
        super(position);
        this.name = name;
    }
}

// Block expression (scope node) - (expr1; expr2; expr3)
export class BlockExpression extends ScopeNode {
    expressions: Expression[] = [];
}

// Base expression
export abstract class Expression extends Node {
}

// Assignment expression
export class AssignmentExpression extends Expression {
    target?: VariableReference;
    value?: Expression;
    
    constructor(target?: VariableReference, value?: Expression, position?: Position) {
        super(position);
        this.target = target;
        this.value = value;
    }
}
