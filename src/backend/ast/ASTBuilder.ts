/**
 * Builds AST from ANTLR parse tree using Tylasu
 * 
 * IMPLEMENTATION STATUS:
 * ✅ Implemented parser rules:
 * - program: Top-level program structure
 * - expr: Expression dispatcher
 * - expr_seq: Parenthesized expression blocks
 * - declarationStatement: local/global/persistent variable declarations
 * - fnDefinition: Function definitions with arguments, parameters, and body
 * - structDefinition: Struct definitions
 * - struct_body: Struct body with accessibility modifiers
 * - struct_member: Struct field declarations
 * - assignmentExpression: Variable assignments
 * - accessor: Property/index access chains (obj.prop[0].nested)
 * - property: Property access (.prop) - handled in accessor
 * - index: Index access ([expr]) - handled in accessor
 * - reference: Variable references
 * - identifier: Identifiers
 * - factor: Literal expressions (numbers, strings, booleans, names, arrays, undefined)
 * - bool: Boolean literals
 * - simpleExpression: Basic expression handling (binary and unary operators)
 * - expr_operand: Expression operand handling (by_ref | de_ref | functionCall | operand)
 * - operand: Operand handling (accessor | factor)
 * - by_ref: Reference operator (&variable, &obj.prop, &$path)
 * - de_ref: Dereference operator (*ref, *ref.prop, *$path)
 * 
 * ⏳ Pending parser rules:
 * Control Flow:
 * - ifStatement: if-then-else statements
 * - whileLoopStatement: while loops
 * - doLoopStatement: do loops
 * - forLoopStatement: for loops (including for-in, for-where, for-while)
 * - caseStatement: case/of statements
 * - tryStatement: try-catch error handling
 * - loopExitStatement: exit with/continue statements
 * - fnReturnStatement: return statements
 * - whenStatement: when construct
 * 
 * Context Expressions:
 * - contexStatement: at/in/with/set/about level/time/coordsys
 * 
 * Definitions:
 * - macroscriptDefinition: MacroScript blocks
 * - utilityDefinition: Utility plugins
 * - rolloutDefinition: Rollout UI definitions
 * - toolDefinition: Tool definitions
 * - rcmenuDefinition: Right-click menu definitions
 * - pluginDefinition: Plugin definitions
 * - attributesDefinition: Attribute definitions
 * 
 * Event Handlers:
 * - eventHandlerStatement: on <event> do <handler>
 * 
 * Operators & Expressions:
 * - binaryExpression: Binary operators (+, -, *, /, etc.)
 * - unaryExpression: Unary operators (-, not, etc.)
 * - callExpression: Function calls
 * - accessor: Property/index access chains (obj.prop[0].nested) - IMPLEMENTED
 * - property: Property access (.prop) - IMPLEMENTED (handled in accessor)
 * - index: Index access ([expr]) - IMPLEMENTED (handled in accessor)
 * 
 * Literals:
 * - array: Array literals with elements
 * - path: File path literals
 * - interval: Time interval literals
 * - percent: Percentage literals
 * - timevalue: Time value literals
 * 
 * Note: Point2/3/4, Matrix3, Quat, Angle, and Color are not implemented in their own visitor
 * rules because the parser treats them as expressions, not terminals. They are handled through
 * the general expression visiting logic (simpleExpression, callExpression, etc.)
 * 
 * Destinations (assignment targets):
 * - destination: Full assignment target support (accessor paths with derefs)
 * 
 * Note: Property paths (obj.prop[0].nested) are represented as nested MemberExpression and
 * IndexExpression nodes. The parser captures accessors as a flat array (to avoid left recursion),
 * so the AST builder must reconstruct the proper nested structure by chaining these expressions.
 */

import { ParserRuleContext } from 'antlr4ng';
import { Position, Point, Node } from '@strumenta/tylasu';
import {
    AccessorContext,
    BoolContext,
    CaseStatementContext,
    DoLoopStatementContext,
    DeRefContext,
    DeclarationStatementContext,
    ExprContext,
    ExprOperandContext,
    ExprSeqContext,
    FactorContext,
    FnDefinitionContext,
    FnReturnStatementContext,
    FnParamsContext,
    IdentifierContext,
    IfStatementContext,
    IndexContext,
    LoopExitStatementContext,
    mxsParser,
    OperandContext,
    ForLoopStatementContext,
    ProgramContext,
    PropertyContext,
    ReferenceContext,
    SimpleExpressionContext,
    StructBodyContext,
    StructDefinitionContext,
    TryStatementContext,
    VariableDeclarationContext,
    WhileLoopStatementContext,
} from '../../parser/mxsParser.js';
import { mxsParserVisitor } from '../../parser/mxsParserVisitor.js';
import {
    ArrayLiteral,
    AssignmentExpression,
    BinaryExpression,
    BlockExpression,
    BooleanLiteral,
    CallExpression,
    DereferenceExpression,
    Expression,
    FunctionArgument,
    FunctionDefinition,
    FunctionParameter,
    ForStatement,
    IfStatement,
    IndexExpression,
    ExitStatement,
    MemberExpression,
    NameLiteral,
    NumberLiteral,
    Program,
    ReturnStatement,
    ReferenceExpression,
    ScopeNode,
    CaseItem,
    CaseStatement,
    StringLiteral,
    StructDefinition,
    StructMember,
    StructMemberField,
    TryStatement,
    UnaryExpression,
    UndefinedLiteral,
    VariableDeclaration,
    VariableReference,
    WhileStatement,
    DoWhileStatement,
} from './ASTNodes.js';

export class ASTBuilder extends mxsParserVisitor<any> {
    // Stack to track current scope
    private scopeStack: ScopeNode[] = [];
    
    // Root program
    private program: Program;
    
    // Collect all references for later resolution
    private allReferences: VariableReference[] = [];
    
    constructor() {
        super();
        this.program = new Program();
        this.scopeStack.push(this.program);
    }
    
    getProgram(): Program {
        return this.program;
    }
    
    getAllReferences(): VariableReference[] {
        return this.allReferences;
    }
    
    private getCurrentScope(): ScopeNode {
        return this.scopeStack[this.scopeStack.length - 1];
    }
    
    private pushScope(scope: ScopeNode): void {
        scope.parentScope = this.getCurrentScope();
        this.scopeStack.push(scope);
    }
    
    private popScope(): void {
        this.scopeStack.pop();
    }
    
    /**
     * Convert ANTLR context to Tylasu Position
     */
    private getPosition(ctx: ParserRuleContext): Position | undefined {
        if (!ctx.start || !ctx.stop) return undefined;
        
        const start = new Point(ctx.start.line, ctx.start.column);
        const end = new Point(ctx.stop.line, ctx.stop.column);
        return new Position(start, end);
    }
    
    // Program
    visitProgram = (ctx: ProgramContext): Program => {
        // Visit all expressions in the program
        for (const exprCtx of ctx.expr()) {
            const node = this.visit(exprCtx);
            if (node && !Array.isArray(node)) {
                this.program.statements.push(node);
            } else if (Array.isArray(node)) {
                // Declaration statements return VariableDeclaration[]
                this.program.statements.push(...node);
            }
        }
        
        return this.program;
    }
    
    // Expression - visit all children to collect references
    visitExpr = (ctx: ExprContext): Expression | Expression[] | null => {
        // Check if this expression directly contains specific node types
        const fnDef = ctx.fnDefinition();
        if (fnDef) {
            return this.visit(fnDef);
        }
        const structDef = ctx.structDefinition();
        if (structDef) {
            return this.visit(structDef);
        }
        const declExpr = ctx.declarationStatement();
        if (declExpr) {
            return this.visit(declExpr);
        }

        // Visit all children to find identifiers and other expressions
        const result = this.visitChildren(ctx);
        
        // Return the result (could be expression, array, or null)
        return result as Expression | Expression[] | null;
    }
    
    // Expression sequence: ( expr ; expr ; ... )
    // In MaxScript, parenthesized blocks can be used as values or as code blocks
    // Examples: local x = (5 + 5), fn test = ( ... ), if cond then ( ... )
    visitExprSeq = (ctx: ExprSeqContext): BlockExpression => {
        const block = new BlockExpression();
        const position = this.getPosition(ctx);
        if (position) {
            block.position = position;
        }
        
        // Set parent scope to current scope
        block.parentScope = this.getCurrentScope();
        
        // Push this block as the current scope to catch any declarations
        this.pushScope(block);
        
        // Visit all expr children
        for (const exprCtx of ctx.expr()) {
            const expr = this.visit(exprCtx);
            if (expr) {
                if (Array.isArray(expr)) {
                    // Flatten arrays (e.g., from declaration expressions)
                    block.expressions.push(...expr);
                } else if (expr instanceof Node) {
                    // Any AST node (Expression, FunctionDefinition, etc.)
                    block.expressions.push(expr);
                }
            }
        }
        
        // Pop scope
        this.popScope();
        
        return block;
    }
    
    // Declaration expression: local x, y = 5
    visitDeclarationStatement = (ctx: DeclarationStatementContext): any => {
        const scope = ctx._scope?.getText()?.toLowerCase() as 'local' | 'global' | 'persistent' | undefined;
        const scopeType = scope || 'local';
        
        const declarations: VariableDeclaration[] = [];
        
        for (const varDeclCtx of ctx._decl) {
            const name = varDeclCtx.identifier().getText();
            const position = this.getPosition(varDeclCtx);
            
            const decl = new VariableDeclaration(name, scopeType, position);

            // If there's an initializer expression, parse it
            const val = varDeclCtx.assignment()
            if (val) {
                const initExpr = this.visit(val);
                decl.initializer = initExpr;
            }
            // Add to current scope
            this.getCurrentScope().addDeclaration(decl);
            
            declarations.push(decl);
        }
        
        return declarations;
    }
    
    // Function definition: fn myFunc x y = (...)
    visitFnDefinition = (ctx: FnDefinitionContext): FunctionDefinition => {
        const name = ctx._fn_name?.getText() || 'anonymous';
        const position = this.getPosition(ctx);
        
        const fnDef = new FunctionDefinition(name, position);
        
        // Add function to current scope as a declaration
        const fnDecl = new VariableDeclaration(name, 'local', position);
        this.getCurrentScope().addDeclaration(fnDecl);
        
        // Push function scope
        this.pushScope(fnDef);
        
        // Add simple arguments as declarations (fn test a b c, fn test &a &b)
        for (const argCtx of ctx.fnArgs()) {
            // Check if it's by-reference (&arg) or by-value (arg)
            const isByReference = argCtx.AMP() !== null;
            const argName = argCtx.identifier().getText();
            const argPosition = this.getPosition(argCtx);
            
            const arg = new FunctionArgument(argName, isByReference, argPosition);
            fnDef.arguments.push(arg);
            
            // Also add as variable declaration in function scope
            const argDecl = new VariableDeclaration(argName, 'local', argPosition);
            fnDef.addDeclaration(argDecl);
        }
        
        // Add named parameters (fn test size:10 color:blue)
        for (const paramCtx of ctx.fnParams()) {
            const paramName = paramCtx.identifier()?.getText() || paramCtx.kwOverride()?.getText() || 'unnamed';
            const paramPosition = this.getPosition(paramCtx);
            
            // Parse default value if present
            let defaultValue: Expression | undefined;
            const operandCtx = paramCtx.operandArg();
            if (operandCtx) {
                defaultValue = this.visit(operandCtx) as Expression;
            }
            
            const param = new FunctionParameter(paramName, defaultValue, paramPosition);
            fnDef.parameters.push(param);
            
            // Also add as variable declaration in function scope
            const paramDecl = new VariableDeclaration(paramName, 'local', paramPosition);
            fnDef.addDeclaration(paramDecl);
        }
        
        // Visit body - fn_body contains a single expr (could be expr_seq or simple expr)
        if (ctx.fnBody()) {
            const bodyExpr = this.visit(ctx.fnBody());
            
            if (bodyExpr instanceof BlockExpression) {
                // expr_seq produces BlockExpression - use directly
                bodyExpr.parentScope = fnDef;
                fnDef.body = bodyExpr;
            } else if (bodyExpr instanceof Expression) {
                // Single expression - wrap in BlockExpression
                const block = new BlockExpression();
                block.parentScope = fnDef;
                block.expressions = [bodyExpr];
                fnDef.body = block;
            }
        }
        
        // Pop function scope
        this.popScope();
        
        return fnDef;
    }
    
    // Struct definition: struct MyStruct ( ... )
    visitStructDefinition = (ctx: StructDefinitionContext): StructDefinition => {
        const name = ctx._str_name?.getText() || 'anonymous';
        const position = this.getPosition(ctx);
        
        const structDef = new StructDefinition(name, position);
        
        // Add struct to current scope as a declaration
        const structDecl = new VariableDeclaration(name, 'local', position);
        this.getCurrentScope().addDeclaration(structDecl);
        
        // Push struct scope
        this.pushScope(structDef);
        
        // Visit body to collect members and methods
        if (ctx.structBody()) {
            this.visit(ctx.structBody());
        }
        
        // Pop struct scope
        this.popScope();
        
        return structDef;
    }
    
    // Struct body - wrapper that coordinates cascading accessibility with members
    visitStructBody = (ctx: StructBodyContext): null => {
        // Grammar: (struct_access)? struct_members ( comma (struct_access)? struct_members )*
        // Accessibility cascades: once set to private, all following members are private until public is set
        // Default is public, so no keyword needed for public members
        const structDef = this.getCurrentScope() as StructDefinition;
        const children = ctx.children;
        
        if (!children) return null;
        
        let currentAccessibility: 'public' | 'private' = 'public'; // Default is public
        
        // Walk through children in order to track when accessibility changes
        for (const child of children) {
            // Check if this child is a struct_access context
            if ('struct_access' in child.constructor.prototype || child.constructor.name === 'StructAccessContext') {
                const accessText = child.getText().toLowerCase();
                currentAccessibility = accessText === 'private' ? 'private' : 'public';
            }
            // Check if this child is a struct_members context
            else if ('struct_member' in child.constructor.prototype || child.constructor.name === 'StructMembersContext') {
                // Visit the child node to get the actual member value (StructMemberField, FunctionDefinition, etc.)
                const memberValue = this.visit(child);
                if (memberValue) {
                    const position = this.getPosition(child as ParserRuleContext);
                    const memberName = memberValue.name || 'anonymous';
                    const structMember = new StructMember(memberName, memberValue, currentAccessibility, position);
                    structDef.members.push(structMember);
                }
            }
        }
        
        return null;
    }
    
    // Struct member field visitor: identifier assignment?
    visitStructMember = (ctx: any): StructMemberField => {
        const fieldName = ctx.identifier().getText();
        const position = this.getPosition(ctx);
        
        // Check for assignment (initializer)
        let initializer: Expression | undefined;
        const assignmentCtx = ctx.assignment();
        if (assignmentCtx) {
            initializer = this.visit(assignmentCtx) as Expression;
        }
        
        const field = new StructMemberField(fieldName, initializer, position);
        
        // Also add as declaration to struct scope for symbol resolution
        const structDef = this.getCurrentScope() as StructDefinition;
        // TODO: Review this part, it is correct?
        const fieldDecl = new VariableDeclaration(fieldName, 'local', position);
        structDef.addDeclaration(fieldDecl);
        
        return field;
    }

    // Return statement: return expr
    visitFnReturnStatement = (ctx: FnReturnStatementContext): ReturnStatement => {
        const position = this.getPosition(ctx);
        const value = (ctx._returnValue ? this.visit(ctx._returnValue) : this.visit(ctx.expr())) as Expression;
        return new ReturnStatement(value, position);
    }

    // Loop exit statement: exit [with expr]
    visitLoopExitStatement = (ctx: LoopExitStatementContext): ExitStatement => {
        const position = this.getPosition(ctx);
        const value = ctx._exitValue ? this.visit(ctx._exitValue) as Expression : undefined;
        return new ExitStatement(value, position);
    }

    // If statement: if cond then expr [else expr] | if cond do expr
    visitIfStatement = (ctx: IfStatementContext): IfStatement => {
        const position = this.getPosition(ctx);
        const condition = this.visit(ctx._ifCondition || ctx.simpleExpression()) as Expression;
        const node = new IfStatement(condition, position);

        if (ctx.THEN()) {
            const thenBody = (ctx._thenBody ? this.visit(ctx._thenBody) : this.visit(ctx.expr(0)!)) as Expression;
            node.thenBody = thenBody;

            const elseExpr = ctx._elseBody;
            if (elseExpr) {
                node.elseBody = this.visit(elseExpr) as Expression;
            }
        } else if (ctx.DO()) {
            const doBody = (ctx._doBody ? this.visit(ctx._doBody) : this.visit(ctx.expr(0)!)) as Expression;
            node.doBody = doBody;
        }

        return node;
    }

    // While loop: while cond do body
    visitWhileLoopStatement = (ctx: WhileLoopStatementContext): WhileStatement => {
        const position = this.getPosition(ctx);
        const condition = (ctx._condition ? this.visit(ctx._condition) : this.visit(ctx.expr(0)!)) as Expression;
        const body = (ctx._body ? this.visit(ctx._body) : this.visit(ctx.expr(1)!)) as Expression;
        return new WhileStatement(condition, body, position);
    }

    // Do loop: do body while cond
    visitDoLoopStatement = (ctx: DoLoopStatementContext): DoWhileStatement => {
        const position = this.getPosition(ctx);
        const body = (ctx._body ? this.visit(ctx._body) : this.visit(ctx.expr(0)!)) as Expression;
        const condition = (ctx._condition ? this.visit(ctx._condition) : this.visit(ctx.expr(1)!)) as Expression;
        return new DoWhileStatement(body, condition, position);
    }

    // For loop: for var [,index [,filtered]] in/= seq do/collect body
    visitForLoopStatement = (ctx: ForLoopStatementContext): ForStatement => {
        const position = this.getPosition(ctx);
        const forBody = ctx.forBody();

        const loopVarExpr = this.visit(forBody._var_ || forBody.reference(0)!) as Expression;
        const loopVar = loopVarExpr instanceof VariableReference
            ? loopVarExpr
            : new VariableReference(forBody.reference(0)!.getText(), this.getPosition(forBody.reference(0)!));

        const operator: 'in' | '=' = ctx.IN() ? 'in' : '=';
        const action: 'do' | 'collect' = ctx.COLLECT() ? 'collect' : 'do';
        const sequenceCtx = ctx.forSequence();
        const sequence = this.visit(sequenceCtx.expr()) as Expression;
        const body = (ctx._body ? this.visit(ctx._body) : this.visit(ctx.expr())) as Expression;

        const node = new ForStatement(loopVar, operator, sequence, action, body, position);

        if (forBody._index_name) {
            const idxExpr = this.visit(forBody._index_name) as Expression;
            if (idxExpr instanceof VariableReference) {
                node.indexVariable = idxExpr;
            }
        }

        if (forBody._filtered_index_name) {
            const fIdxExpr = this.visit(forBody._filtered_index_name) as Expression;
            if (fIdxExpr instanceof VariableReference) {
                node.filteredIndexVariable = fIdxExpr;
            }
        }

        const forTo = sequenceCtx.forTo();
        if (forTo) {
            node.toValue = this.visit(forTo.expr()) as Expression;
        }

        const forBy = sequenceCtx.forBy();
        if (forBy) {
            node.byValue = this.visit(forBy.expr()) as Expression;
        }

        const forWhere = sequenceCtx.forWhere();
        if (forWhere) {
            node.whereCondition = this.visit(forWhere.expr()) as Expression;
        }

        const forWhile = sequenceCtx.forWhile();
        if (forWhile) {
            node.whileCondition = this.visit(forWhile.expr()) as Expression;
        }

        return node;
    }

    // Try/catch statement: try expr catch expr
    visitTryStatement = (ctx: TryStatementContext): TryStatement => {
        const position = this.getPosition(ctx);
        const tryBody = (ctx._tryBody ? this.visit(ctx._tryBody) : this.visit(ctx.expr(0)!)) as Expression;
        const catchBody = (ctx._catchBody ? this.visit(ctx._catchBody) : this.visit(ctx.expr(1)!)) as Expression;
        return new TryStatement(tryBody, catchBody, position);
    }

    // Case statement: case [expr] of (value: body ...)
    visitCaseStatement = (ctx: CaseStatementContext): CaseStatement => {
        const position = this.getPosition(ctx);
        const node = new CaseStatement(position);

        const testExpr = ctx.caseClause().expr();
        if (testExpr) {
            node.testValue = this.visit(testExpr) as Expression;
        }

        for (const itemCtx of ctx.caseItem()) {
            const itemPosition = this.getPosition(itemCtx);
            const value = this.visit(itemCtx.factor()) as Expression;
            const body = this.visit(itemCtx.expr()) as Expression;
            node.items.push(new CaseItem(value, body, itemPosition));
        }

        return node;
    }
    // Reference: identifier, global identifier, or &identifier
    visitReference = (ctx: ReferenceContext): Expression => {
        const name = ctx.identifier().getText();
        const position = this.getPosition(ctx);
        
        // Create reference (will be resolved later)
        const ref = new VariableReference(name, position);
        
        // Track for resolution
        this.allReferences.push(ref);

        // &identifier: wrap in ReferenceExpression
        if (ctx.AMP()) {
            return new ReferenceExpression(ref, position);
        }

        return ref;
    }
    
    // Identifier - could be declaration or reference
    visitIdentifier = (ctx: IdentifierContext): VariableReference => {
        const name = ctx.getText();
        const position = this.getPosition(ctx);
        
        // Create reference (will be resolved later)
        const ref = new VariableReference(name, position);
        
        // Track for resolution
        this.allReferences.push(ref);
        
        return ref;
    }
    
    // ============================================================================
    // LITERAL/TERMINAL NODE VISITORS
    // ============================================================================
    
    // Factor: terminal nodes (literals, references, arrays, etc.) CHECK: IS THIS CORRECT? 
    visitFactor = (ctx: FactorContext): Expression => {
        const position = this.getPosition(ctx);
        
        // Check each possible factor type
        if (ctx.NUMBER()) {
            const text = ctx.NUMBER()!.getText();
            const value = parseFloat(text);
            return new NumberLiteral(value, text, position);
        }
        
        if (ctx.STRING()) {
            const text = ctx.STRING()!.getText();
            // Remove quotes and handle verbatim strings
            const isVerbatim = text.startsWith('@"');
            const value = isVerbatim 
                ? text.substring(2, text.length - 1) // @"..."
                : text.substring(1, text.length - 1).replace(/\\"/g, '"'); // "..."
            return new StringLiteral(value, isVerbatim, position);
        }
        
        if (ctx.bool()) {
            const boolCtx = ctx.bool();
            if (boolCtx) return this.visit(boolCtx);
        }
        
        if (ctx.name()) {
            // Name literal: #someName
            const text = ctx.name()!.getText();
            const value = text.startsWith('#') ? text.substring(1) : text;
            return new NameLiteral(value, position);
        }
        
        if (ctx.reference()) {
            const refCtx = ctx.reference();
            if (refCtx) return this.visit(refCtx);
        }
        
        if (ctx.exprSeq()) {
            const exprSeqCtx = ctx.exprSeq();
            if (exprSeqCtx) return this.visit(exprSeqCtx);
        }
        
        if (ctx.array()) {
            // Array literal: #(1, 2, 3)
            // TODO: Parse array elements
            return new ArrayLiteral([], position);
        }
        
        if (ctx.QUESTION()) {
            // Undefined literal
            return new UndefinedLiteral(position);
        }
        
        // TODO: Handle other factor types (TIMEVAL, path, point3, etc.)
        
        // Default: return undefined literal for unhandled cases
        return new UndefinedLiteral(position);
    }
    
    // Boolean literal CHECK: IS THIS CORRECT? 
    visitBool = (ctx: BoolContext): BooleanLiteral => {
        const position = this.getPosition(ctx);
        const text = ctx.getText().toLowerCase();
        const value = text === 'true' || text === 'on';
        return new BooleanLiteral(value, position);
    }
    
    // Simple expression: handles operators and builds expression tree
    // Handles assignment, binary and unary operators based on parser precedence
    visitSimpleExpression = (ctx: SimpleExpressionContext): Expression => {
        const position = this.getPosition(ctx);

        // Assignment (lowest precedence): left = expr, left := expr
        if (ctx._left && ctx._assignExpr && (ctx.ASSIGN() || ctx.EQ())) {
            const target = this.visit(ctx._left) as Expression;
            const value = this.visit(ctx._assignExpr) as Expression;
            return new AssignmentExpression(target, value, position);
        }
        
        // Check for binary operators (left recursion handled by ANTLR)
        // The grammar defines operator precedence, so we get the proper tree
        
        // Unary operators (prefix)
        if (ctx.NOT()) {
            const right = this.visit(ctx._right!) as Expression;
            return new UnaryExpression('not', right, position);
        }
        
        if ((ctx.MINUS() || ctx.UNARY_MINUS()) && !ctx._left) {
            // Unary minus (no left operand means it's unary)
            const right = this.visit(ctx._right!) as Expression;
            return new UnaryExpression('-', right, position);
        }
        
        // Binary operators
        if (ctx._left && ctx._right) {
            const left = this.visit(ctx._left) as Expression;
            const right = this.visit(ctx._right) as Expression;
            
            // Type cast (as)
            if (ctx.AS()) {
                // TODO: Implement type cast expression
                // For now, treat as binary expression
                return new BinaryExpression('as', left, right, position);
            }
            
            // Logical operators
            if (ctx.OR()) {
                return new BinaryExpression('or', left, right, position);
            }
            if (ctx.AND()) {
                return new BinaryExpression('and', left, right, position);
            }
            
            // Comparison operators
            if (ctx.COMPARE()) {
                const operator = ctx.COMPARE()!.getText();
                return new BinaryExpression(operator, left, right, position);
            }
            
            // Arithmetic operators
            if (ctx.PLUS()) {
                return new BinaryExpression('+', left, right, position);
            }
            if (ctx.MINUS() || ctx.UNARY_MINUS()) {
                return new BinaryExpression('-', left, right, position);
            }
            if (ctx.PROD()) {
                return new BinaryExpression('*', left, right, position);
            }
            if (ctx.DIV()) {
                return new BinaryExpression('/', left, right, position);
            }
            if (ctx.POW()) {
                return new BinaryExpression('^', left, right, position);
            }
        }
        
        // Base case: expr_operand (highest precedence)
        const operand = ctx.exprOperand();
        if (operand) {
            return this.visit(operand) as Expression;
        }
        
        // Fallback
        return new UndefinedLiteral(position);
    }
    
    // Expression operand: by_ref | de_ref | functionCall | operand
    visitExprOperand = (ctx: ExprOperandContext): Expression => {
        // Check for by_ref (reference operator: &obj, &obj.prop, &$path)
        /*
        const byRef = ctx.by_ref();
        if (byRef) {
            return this.visit(byRef) as Expression;
        }
        */
        // Check for de_ref (dereference operator: *ref, *ref.prop, *$path)
        const deRef = ctx.deRef();
        if (deRef) {
            return this.visit(deRef) as Expression;
        }
        
        // Check for function call
        const functionCall = ctx.functionCall();
        if (functionCall) {
            return this.visit(functionCall) as Expression;
        }
        
        // Check for operand
        const operand = ctx.operand();
        if (operand) {
            return this.visit(operand) as Expression;
        }
        
        return new UndefinedLiteral();
    }
    
    // Reference operator: &obj, &obj.prop, &$path
    /*
    visitBy_ref = (ctx: By_refContext): Expression => {
        const position = this.getPosition(ctx);
        
        // The grammar is: by_ref: {noWSBeNext}? AMP (accessor | reference | path)
        // Visit the child (accessor, reference, or path)
        const operand = this.visitChildren(ctx) as Expression;
        
        return new ReferenceExpression(operand, position);
    }
    */
    // Dereference operator: *ref, *ref.prop, *$path
    visitDeRef = (ctx: DeRefContext): Expression => {
        const position = this.getPosition(ctx);
        
        // The grammar is: de_ref: {noWSBeNext}? PROD (accessor | reference | path)
        // Visit the child (accessor, reference, or path)
        const operand = this.visitChildren(ctx) as Expression;
        
        return new DereferenceExpression(operand, position);
    }
    
    // Operand: accessor | factor
    visitOperand = (ctx: OperandContext): Expression => {
        // Check for accessor (property/index access)
        const accessor = ctx.accessor();
        if (accessor) {
            return this.visit(accessor) as Expression;
        }
        
        // Check for factor (literals, references, etc.)
        const factor = ctx.factor();
        if (factor) {
            return this.visit(factor) as Expression;
        }
        
        return new UndefinedLiteral();
    }
    
    // Accessor: factor (index | property)+
    // Reconstructs nested MemberExpression/IndexExpression chain from flat array
    // Example: obj.prop[0].nested becomes:
    //   MemberExpression(IndexExpression(MemberExpression(obj, 'prop'), 0), 'nested')
    visitAccessor = (ctx: AccessorContext): Expression => {
        // Start with the base factor
        let result: Expression = this.visit(ctx.factor());

        // If base is a reference expression, apply property/index chain inside the reference
        // so '&obj.prop' becomes '&(obj.prop)' instead of '(&obj).prop'.
        let referenced: ReferenceExpression | undefined;
        if (result instanceof ReferenceExpression) {
            referenced = result;
            result = referenced.operand;
        }
        
        // Get all accessors (properties and indices) in order
        const children = ctx.children || [];
        
        // Iterate through children after factor (skip first child which is factor)
        for (let i = 1; i < children.length; i++) {
            const child = children[i];
            
            if (child instanceof PropertyContext) {
                // Property access: obj.prop
                const propName = child.identifier()?.getText() || child.kwOverride()?.getText() || '';
                const position = this.getPosition(child);
                result = new MemberExpression(result, propName, position);
            } else if (child instanceof IndexContext) {
                // Index access: obj[expr]
                const indexExpr = this.visit(child.expr());
                const position = this.getPosition(child);
                result = new IndexExpression(result, indexExpr, position);
            }
        }
        
        if (referenced) {
            referenced.operand = result;
            return referenced;
        }

        return result;
    }
    
    // Property: .identifier
    visitProperty = (ctx: PropertyContext): Expression => {
        // Properties are handled within visitAccessor
        // This shouldn't be called directly, but return the property name if it is
        const propName = ctx.identifier()?.getText() || ctx.kwOverride()?.getText() || '';
        const position = this.getPosition(ctx);
        return new NameLiteral(propName, position);
    }
    
    // Index: [expr]
    visitIndex = (ctx: IndexContext): Expression => {
        // Indices are handled within visitAccessor
        // This shouldn't be called directly, but visit the expression if it is
        return this.visit(ctx.expr());
    }
    
    // Default: return null for unsupported nodes in POC
    protected defaultResult(): null {
        return null;
    }
}
