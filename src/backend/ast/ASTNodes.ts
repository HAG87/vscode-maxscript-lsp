/**
 * MaxScript AST nodes using Tylasu library
 * 
 * IMPLEMENTATION STATUS:
 * ✅ Implemented AST Nodes:
 * 
 * Core & Scope:
 * - ScopeNode: Abstract base for scope-bearing nodes
 * - Program: Root program node
 * - BlockExpression: Parenthesized expression sequences (expr1; expr2; expr3)
 * 
 * Declarations & References:
 * - VariableDeclaration: Variable declarations (local/global/persistent)
 * - VariableReference: Variable references/usage
 * - FunctionArgument: Simple function arguments (fn test a b c)
 * - FunctionParameter: Named function parameters (fn test size:10)
 * - FunctionDefinition: Function definitions with body
 * 
 * Struct Related:
 * - StructDefinition: Struct definitions
 * - StructMember: Struct member wrapper with accessibility
 * - StructMemberField: Struct field declarations with optional initializer
 * 
 * Literals:
 * - NumberLiteral: Numeric literals (5, 10.5, 0xFF, 1.5e10)
 * - StringLiteral: String literals ("hello", @"verbatim")
 * - BooleanLiteral: Boolean literals (true, false, on, off)
 * - NameLiteral: Name literals (#myName, #'name with spaces')
 * - UndefinedLiteral: undefined/unsupplied
 * - ArrayLiteral: Array literals #(1, 2, 3) - currently empty elements
 * - VectorLiteral: Vector literals [x, y, z] for point2/3/4 values
 *
 * Advanced Literals:
 * - VectorLiteral: Vector literals [x, y] [x, y, z] [x, y, z, w] (point2, point3, point4)
 * 
 * Operators & Expressions:
 * - BinaryExpression: Binary operators (a + b, x * y)
 * - UnaryExpression: Unary operators (-x, not y)
 * - CallExpression: Function calls myFunc(a, b)
 * - MemberExpression: Property access (obj.property)
 * - IndexExpression: Array/collection indexing (arr[1])
 * - AssignmentExpression: Variable assignments (x = 5) - simple references only
 * 
 * Note: Property paths like obj.prop1[0].prop2 are represented as nested MemberExpression
 * and IndexExpression nodes. The parser captures accessors as a flat array (to avoid left
 * recursion), so the AST builder must reconstruct the proper nested structure by chaining
 * these expressions: IndexExpression(MemberExpression(IndexExpression(MemberExpression(...))))
 * 
 * Definition Blocks:
 * - DefinitionBlock: Unified node for all definition blocks (MacroScript, Utility, Rollout, Tool, RCMenu, Plugin, Attributes)
 *   Each has: kind, name, parameters, and body clauses (expressions, functions, structs, event handlers)
 * 
 * ⏳ Pending AST Nodes:
 * 
 * Control Flow Statements:
 * - IfStatement: if-then-else conditionals
 * - WhileStatement: while loops
 * - DoWhileStatement: do-while loops
 * - ForStatement: for loops (for i in collection, for i = 1 to 10)
 * - ForWhereClause: for-where filtering
 * - ForWhileClause: for-while conditions
 * - CaseStatement: case/of switch statements
 * - CaseItem: Individual case branches
 * - TryStatement: try-catch error handling
 * - CatchClause: catch blocks
 * - ReturnStatement: return statements
 * - ExitStatement: exit/continue statements
 * - WhenStatement: when construct
 * 
 * Context Expressions:
 * - ContextExpression: at/in/with/set level/time/coordsys expressions
 * - AtLevelExpression: at level context
 * - InCoordSysExpression: in coordsys context
 * - WithExpression: with context
 * 
 * Event Handlers:
 * - EventHandlerClause: on <event> do <handler> clauses
 * 
 * Advanced Literals:
 * - PathLiteral: File path literals ($scripts/test.ms)
 * - IntervalLiteral: Time interval literals (interval start end)
 * - PercentLiteral: Percentage literals (50%)
 * - TimeValueLiteral: Time value literals (10f, 10t, 10s)
 * 
 * Note: Matrix3, Quat, Angle, and Color are not implemented as literals since they use
 * function call syntax (matrix3 [1,0,0] [0,1,0] [0,0,1], quat 0 0 0 1, color 255 0 0)
 * and will be handled as CallExpression nodes.
 * 
 * Complex Expressions:
 * - DereferenceExpression: Dereference expressions ($obj)
 * - ArrayComprehension: Collect expressions (for x in arr where condition collect result)
 * - TernaryExpression: Conditional expressions (if condition then a else b as value)
 * 
 * Assignment Targets:
 * - ComplexAssignmentTarget: Support for property paths, derefs, and accessors as assignment targets
 *   (Currently AssignmentExpression only supports simple VariableReference targets)
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
        }
    }
    
    /**
     * Get all declarations in this scope (for symbol tree)
     */
    getDeclarations(): VariableDeclaration[] {
        return Array.from(this.declarations.values());
    }
    
    /**
     * Get all nested scopes (functions, blocks) for hierarchical symbol tree
     */
    abstract getChildScopes(): ScopeNode[];
}

// Root program node
export class Program extends ScopeNode {
    statements: Node[] = [];
    
    getChildScopes(): ScopeNode[] {
        // Return all child scopes - filtering happens in SymbolTreeBuilder
        return this.statements.filter(stmt => stmt instanceof ScopeNode) as ScopeNode[];
    }
}

// Variable declaration: local x = 5
export class VariableDeclaration extends Node implements PossiblyNamed {
    name?: string;
    scope: 'local' | 'global' | 'persistent'; // MaxScript specific
    initializer?: Expression;
    
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

// Function argument: simple identifier in function definition (fn test a b c)
export class FunctionArgument extends Node implements PossiblyNamed {
    name?: string;
    
    constructor(name: string, position?: Position) {
        super(position);
        this.name = name;
    }
}

// Function parameter: named parameter with optional default (fn test size:10 color:blue)
export class FunctionParameter extends Node implements PossiblyNamed {
    name?: string;
    defaultValue?: Expression;
    
    constructor(name: string, defaultValue?: Expression, position?: Position) {
        super(position);
        this.name = name;
        this.defaultValue = defaultValue;
    }
}

// Struct member field: identifier with optional assignment (myField, myField = 10)
export class StructMemberField extends Node implements PossiblyNamed {
    name?: string;
    initializer?: Expression;
    
    constructor(name: string, initializer?: Expression, position?: Position) {
        super(position);
        this.name = name;
        this.initializer = initializer;
    }
}

// Function definition (scope node)
export class FunctionDefinition extends ScopeNode implements PossiblyNamed {
    name?: string;
    arguments: FunctionArgument[] = [];  // Simple args: fn test a b c
    parameters: FunctionParameter[] = []; // Named params: fn test size:10
    body?: BlockExpression;
    
    constructor(name: string, position?: Position) {
        super(position);
        this.name = name;
    }
    
    getChildScopes(): ScopeNode[] {
        // Return body if it exists
        return this.body ? [this.body] : [];
    }
}

// Struct member: can be field, method, or event with accessibility
export class StructMember extends Node implements PossiblyNamed {
    name?: string;
    accessibility: 'public' | 'private'; // MaxScript struct member accessibility
    value?: VariableDeclaration | FunctionDefinition ; // The actual member (field, method or event)
    
    constructor(name: string, value: VariableDeclaration | FunctionDefinition, accessibility: 'public' | 'private' = 'public', position?: Position) {
        super(position);
        this.name = name;
        this.value = value;
        this.accessibility = accessibility;
    }
}

// Struct definition (scope node)
export class StructDefinition extends ScopeNode implements PossiblyNamed {
    name?: string;
    members: StructMember[] = []; // All struct members (fields, methods, events)
    
    constructor(name: string, position?: Position) {
        super(position);
        this.name = name;
    }
    
    getChildScopes(): ScopeNode[] {
        // Return all method scopes from members
        return this.members
            .map(m => m.value)
            .filter(v => v instanceof FunctionDefinition) as FunctionDefinition[];
    }
}

// Definition block (scope node) - MacroScript, Utility, Rollout, Tool, RCMenu, Plugin, Attributes
// All follow similar pattern: <keyword> <name> <params>? ( <clauses> )
export class DefinitionBlock extends ScopeNode implements PossiblyNamed {
    kind: 'macroscript' | 'utility' | 'rollout' | 'tool' | 'rcmenu' | 'plugin' | 'attributes';
    name?: string;
    parameters: Expression[] = []; // Optional parameters in the predicate
    clauses: Node[] = []; // Body clauses: expressions, functions, structs, event handlers, controls, etc.
    
    // Plugin-specific: plugin kind (e.g., 'geometry', 'modifier', 'material')
    pluginKind?: string;
    
    constructor(kind: DefinitionBlock['kind'], name: string, position?: Position) {
        super(position);
        this.kind = kind;
        this.name = name;
    }
    
    getChildScopes(): ScopeNode[] {
        // Return all scope-bearing clauses (functions, structs, nested definitions)
        return this.clauses.filter(clause => clause instanceof ScopeNode) as ScopeNode[];
    }
}

// Block expression (scope node) - (expr1; expr2; expr3)
export class BlockExpression extends ScopeNode {
    expressions: Node[] = [];  // Can contain Expression, FunctionDefinition, VariableDeclaration, etc.
    
    getChildScopes(): ScopeNode[] {
        // Return all child scopes - filtering happens in SymbolTreeBuilder
        return this.expressions.filter(expr => expr instanceof ScopeNode) as ScopeNode[];
    }
}

// Base expression
export abstract class Expression extends Node {
    //... common expression properties
}

// ============================================================================
// LITERAL EXPRESSIONS (Terminal Nodes)
// ============================================================================

// Number literal: 5, 10.5, 0xFF, 1.5e10
export class NumberLiteral extends Expression {
    value: number;
    rawText: string; // Original text representation
    
    constructor(value: number, rawText: string, position?: Position) {
        super(position);
        this.value = value;
        this.rawText = rawText;
    }
}

// String literal: "hello", @"verbatim"
export class StringLiteral extends Expression {
    value: string;
    isVerbatim: boolean;
    
    constructor(value: string, isVerbatim: boolean = false, position?: Position) {
        super(position);
        this.value = value;
        this.isVerbatim = isVerbatim;
    }
}

// Boolean literal: true, false, on, off
export class BooleanLiteral extends Expression {
    value: boolean;
    
    constructor(value: boolean, position?: Position) {
        super(position);
        this.value = value;
    }
}

// Name literal: #myName, #'name with spaces'
export class NameLiteral extends Expression {
    value: string;
    
    constructor(value: string, position?: Position) {
        super(position);
        this.value = value;
    }
}

// Undefined/Unsupplied: undefined, unsupplied
export class UndefinedLiteral extends Expression {
    constructor(position?: Position) {
        super(position);
    }
}

// Array literal: #(1, 2, 3)
export class ArrayLiteral extends Expression {
    values: Expression[] = [];
    
    constructor(values: Expression[] = [], position?: Position) {
        super(position);
        this.values = values;
    }
}

// Vector literal: [x, y], [x, y, z], [x, y, z, w]
// Used for point2, point3, point4 values
export class VectorLiteral extends Expression {
    values: Expression[];
    
    constructor(values: Expression[], position?: Position) {
        super(position);
        this.values = values;
    }
    
    /** Get the dimensionality of the vector (2, 3, or 4) */
    get dimension(): number {
        return this.values.length;
    }
}

// ============================================================================
// OPERATOR EXPRESSIONS
// ============================================================================

// Binary expression: a + b, x * y, etc.
export class BinaryExpression extends Expression {
    operator: string;
    left: Expression;
    right: Expression;
    
    constructor(operator: string, left: Expression, right: Expression, position?: Position) {
        super(position);
        this.operator = operator;
        this.left = left;
        this.right = right;
    }
}

// Unary expression: -x, not y
export class UnaryExpression extends Expression {
    operator: string;
    operand: Expression;
    
    constructor(operator: string, operand: Expression, position?: Position) {
        super(position);
        this.operator = operator;
        this.operand = operand;
    }
}

// Function call expression: myFunc(a, b)
export class CallExpression extends Expression {
    callee: Expression; // Function being called (could be reference, member access, etc.)
    arguments: Expression[] = [];
    
    constructor(callee: Expression, args: Expression[] = [], position?: Position) {
        super(position);
        this.callee = callee;
        this.arguments = args;
    }
}

// Member access expression: obj.property
export class MemberExpression extends Expression {
    object: Expression;
    property: string;
    
    constructor(object: Expression, property: string, position?: Position) {
        super(position);
        this.object = object;
        this.property = property;
    }
}

// Index access expression: arr[1], obj[#prop]
export class IndexExpression extends Expression {
    object: Expression;
    index: Expression;
    
    constructor(object: Expression, index: Expression, position?: Position) {
        super(position);
        this.object = object;
        this.index = index;
    }
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
