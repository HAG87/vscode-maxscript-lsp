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
 * - PathLiteral: File path literals ($scripts/test.ms)
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
 * - ReferenceExpression: Reference operator (&obj, &obj.prop, &$path)
 * - DereferenceExpression: Dereference operator (*ref, *ref.prop, *$path)
 * 
 * Note: Property paths like obj.prop1[0].prop2 are represented as nested MemberExpression
 * and IndexExpression nodes. The parser captures accessors as a flat array (to avoid left
 * recursion), so the AST builder must reconstruct the proper nested structure by chaining
 * these expressions: IndexExpression(MemberExpression(IndexExpression(MemberExpression(...))))
 * 
 * Control Flow:
 * - IfStatement: if-then-else conditionals with optional do-variant
 * - WhileStatement: while loops (while condition do body)
 * - DoWhileStatement: do-while loops (do body while condition)
 * - TryStatement: try-catch error handling
 * - ForStatement: for loops with in/= operators, do/collect actions
 * - CaseStatement: case/of switch statements with case items
 * - ReturnStatement: return statements with optional value
 * - ExitStatement: exit statements with optional value
 * - ContextStatement: at/in/with/set context expressions
 * - ContextClause: individual context prefixes within a context statement
 * - WhenStatement: when change handlers for object monitoring
 * 
 * Event Handlers:
 * - EventHandlerStatement: on <event> do <handler> clauses (on target event args do/return body)
 * - RolloutControl: Rollout UI control declarations (button, spinner, checkbox, etc.)
 * - RcMenuItem: RCMenu item/separator declarations
 * - ParameterDefinition: Parameter block entries inside plugin/attributes definitions
 * 
 * Definition Blocks:
 * - DefinitionBlock: Unified node for all definition blocks (MacroScript, Utility, Rollout, RolloutGroup, Tool, RCMenu, RC submenu, Plugin, Parameters, Attributes)
 *   Each has: kind, name, parameters, and body clauses (expressions, functions, structs, event handlers)
 * 
 * Note: Matrix3, Quat, Angle, and Color are not implemented as literals since they use
 * function call syntax (matrix3 [1,0,0] [0,1,0] [0,0,1], quat 0 0 0 1, color 255 0 0)
 * and will be handled as CallExpression nodes.
 * 
 * ⏳ Pending AST Nodes:
 * 
 * Advanced Literals:
 * - IntervalLiteral: Time interval literals (interval start end)
 * - TimeValueLiteral: Time value literals (10f, 10t, 10s)
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
// Can be by-value (arg) or by-reference (&arg)
export class FunctionArgument extends Node implements PossiblyNamed {
    name?: string;
    isByReference: boolean = false;  // true for &arg, false for arg
    
    constructor(name: string, isByReference: boolean = false, position?: Position) {
        super(position);
        this.name = name;
        this.isByReference = isByReference;
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
    value?: VariableDeclaration | StructMemberField | FunctionDefinition | Expression; // The actual member (field, method or event)
    
    constructor(name: string, value: VariableDeclaration | StructMemberField | FunctionDefinition | Expression, accessibility: 'public' | 'private' = 'public', position?: Position) {
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
    kind: 'macroscript' | 'utility' | 'rollout' | 'rolloutGroup' | 'tool' | 'rcmenu' | 'submenu' | 'plugin' | 'parameters' | 'attributes';
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

// Path literal: $scripts/test.ms, @&$path
export class PathLiteral extends Expression {
    value: string;

    constructor(value: string, position?: Position) {
        super(position);
        this.value = value;
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
    target?: Expression;
    value?: Expression;
    
    constructor(target?: Expression, value?: Expression, position?: Position) {
        super(position);
        this.target = target;
        this.value = value;
    }
}

// Rollout control declaration: button btn "Run" width:120
// Controls become declarations in the containing rollout/group scope so handlers can resolve them.
export class RolloutControl extends VariableDeclaration {
    controlType: string;
    caption?: Expression;
    parameters: Expression[] = [];

    constructor(
        name: string,
        controlType: string,
        caption?: Expression,
        parameters: Expression[] = [],
        position?: Position,
    ) {
        super(name, 'local', position);
        this.controlType = controlType;
        this.caption = caption;
        this.parameters = parameters;
    }
}

// RCMenu item/separator declaration.
export class RcMenuItem extends VariableDeclaration {
    itemType: 'menuitem' | 'separator';
    operands: Expression[] = [];
    parameters: Expression[] = [];

    constructor(
        name: string,
        itemType: 'menuitem' | 'separator',
        operands: Expression[] = [],
        parameters: Expression[] = [],
        position?: Position,
    ) {
        super(name, 'local', position);
        this.itemType = itemType;
        this.operands = operands;
        this.parameters = parameters;
    }
}

// Parameter block entry: width type:#float default:10
export class ParameterDefinition extends VariableDeclaration {
    parameters: Expression[] = [];

    constructor(name: string, parameters: Expression[] = [], position?: Position) {
        super(name, 'local', position);
        this.parameters = parameters;
    }
}

// Reference expression: &variable, &obj.prop, &$path
// The & operator creates a reference (pointer) to a variable or property
export class ReferenceExpression extends Expression {
    operand: Expression;
    
    constructor(operand: Expression, position?: Position) {
        super(position);
        this.operand = operand;
    }
}

// Dereference expression: *variable, *ref.prop, *$path
// The * operator dereferences a reference (pointer) to access its value
export class DereferenceExpression extends Expression {
    operand: Expression;
    
    constructor(operand: Expression, position?: Position) {
        super(position);
        this.operand = operand;
    }
}

// ============================================================================
// CONTROL FLOW STATEMENTS
// ============================================================================

// If statement: if condition then body else altBody | if condition do body
// MaxScript supports two variants:
// 1. if <condition> then <body> [else <altBody>]  - traditional if-then-else
// 2. if <condition> do <body>                      - do-variant (no else)
export class IfStatement extends Expression {
    condition: Expression;
    thenBody?: Expression;  // Body for 'if...then' variant
    elseBody?: Expression;  // Optional else clause
    doBody?: Expression;    // Body for 'if...do' variant
    
    constructor(condition: Expression, position?: Position) {
        super(position);
        this.condition = condition;
    }
    
    /** True if this is the 'do' variant (if cond do body), false for 'then' variant */
    get isDoVariant(): boolean {
        return this.doBody !== undefined;
    }
}

// While statement: while condition do body
export class WhileStatement extends Expression {
    condition: Expression;
    body: Expression;
    
    constructor(condition: Expression, body: Expression, position?: Position) {
        super(position);
        this.condition = condition;
        this.body = body;
    }
}

// Do-While statement: do body while condition
export class DoWhileStatement extends Expression {
    body: Expression;
    condition: Expression;
    
    constructor(body: Expression, condition: Expression, position?: Position) {
        super(position);
        this.body = body;
        this.condition = condition;
    }
}

// Try-Catch statement: try body catch handler
// MaxScript's try-catch is simple: try <expr> catch <expr>
// The catch body is executed if any error occurs in the try body
export class TryStatement extends Expression {
    tryBody: Expression;
    catchBody: Expression;
    
    constructor(tryBody: Expression, catchBody: Expression, position?: Position) {
        super(position);
        this.tryBody = tryBody;
        this.catchBody = catchBody;
    }
}

// For statement: for var [, index [, filtered_index]] in/= sequence do/collect body
// MaxScript supports multiple for loop variants:
// - for i in array do expr
// - for i = 1 to 10 do expr
// - for i in array collect expr
// - for i = 1 to 10 by 2 where condition while condition do expr
export class ForStatement extends Expression {
    variable: VariableReference;           // Loop variable
    indexVariable?: VariableReference;     // Optional index variable
    filteredIndexVariable?: VariableReference; // Optional filtered index variable
    operator: 'in' | '=';                  // in (iterate collection) or = (numeric range)
    sequence: Expression;                  // Collection or start value
    toValue?: Expression;                  // End value (for = loops)
    byValue?: Expression;                  // Step value (for = loops)
    whereCondition?: Expression;           // Optional where filter
    whileCondition?: Expression;           // Optional while condition
    action: 'do' | 'collect';              // do (execute) or collect (accumulate results)
    body: Expression;                      // Loop body
    
    constructor(
        variable: VariableReference,
        operator: 'in' | '=',
        sequence: Expression,
        action: 'do' | 'collect',
        body: Expression,
        position?: Position
    ) {
        super(position);
        this.variable = variable;
        this.operator = operator;
        this.sequence = sequence;
        this.action = action;
        this.body = body;
    }
    
    /** True if this is a collect loop (returns array of results) */
    get isCollect(): boolean {
        return this.action === 'collect';
    }
    
    /** True if this is a numeric range loop (for i = start to end) */
    get isRange(): boolean {
        return this.operator === '=' && this.toValue !== undefined;
    }
}

// Case statement: case [expr] of ( item1: expr1; item2: expr2; ... )
export class CaseStatement extends Expression {
    testValue?: Expression;    // Optional value to test (case expr of)
    items: CaseItem[] = [];    // Case items (value: body)
    
    constructor(position?: Position) {
        super(position);
    }
}

// Case item: value : body
export class CaseItem extends Node {
    value: Expression;   // Case value (can be any factor)
    body: Expression;    // Body to execute when matched
    
    constructor(value: Expression, body: Expression, position?: Position) {
        super(position);
        this.value = value;
        this.body = body;
    }
}

// Return statement: return [expr]
export class ReturnStatement extends Expression {
    value?: Expression;  // Optional return value
    
    constructor(value?: Expression, position?: Position) {
        super(position);
        this.value = value;
    }
}

// Exit statement: exit [with expr]
// Used to exit loops, optionally with a value
export class ExitStatement extends Expression {
    value?: Expression;  // Optional exit value (with clause)
    
    constructor(value?: Expression, position?: Position) {
        super(position);
        this.value = value;
    }
}

// Context statement: at/in/with/set context prefixes applied to an expression or environment
export class ContextStatement extends Expression {
    mode: 'cascading' | 'set';
    clauses: ContextClause[] = [];
    body?: Expression;

    constructor(mode: 'cascading' | 'set', position?: Position) {
        super(position);
        this.mode = mode;
    }
}

// Context clause: a single context prefix such as 'at time', 'with undo', or 'set animate'
export class ContextClause extends Node {
    kind: string;
    label?: string;
    value?: Expression;

    constructor(kind: string, label?: string, value?: Expression, position?: Position) {
        super(position);
        this.kind = kind;
        this.label = label;
        this.value = value;
    }
}

// When statement: when [type] objects change[s]/deleted [params] do expr
// MaxScript's change handler for monitoring object changes
export class WhenStatement extends Expression {
    targetType?: VariableReference;    // Optional type filter
    targets: Expression;               // Objects to monitor (reference, path, array)
    event: 'change' | 'deleted';       // Event type
    parameters: Expression[] = [];     // Optional parameters
    handler?: Expression;              // Optional handler parameter
    body: Expression;                  // Handler body
    
    constructor(
        targets: Expression,
        event: 'change' | 'deleted',
        body: Expression,
        position?: Position
    ) {
        super(position);
        this.targets = targets;
        this.event = event;
        this.body = body;
    }
}

// Event handler statement: on target event [args] do/return body
// MaxScript's event handler syntax for UI controls and other objects
// Examples:
//   on btn pressed do print "clicked"
//   on myRollout open do initialize()
//   on myControl changed val do updateUI val
export class EventHandlerStatement extends Expression {
    target?: VariableReference;        // Optional target object (on btn pressed do...)
    eventType: VariableReference;      // Event type (pressed, changed, open, etc.)
    eventArgs: VariableReference[] = [];  // Optional event arguments
    action: 'do' | 'return';           // do (execute) or return (return value)
    body: Expression;                  // Handler body
    
    constructor(
        eventType: VariableReference,
        action: 'do' | 'return',
        body: Expression,
        position?: Position
    ) {
        super(position);
        this.eventType = eventType;
        this.action = action;
        this.body = body;
    }
}
