/**
 * Builds AST from ANTLR parse tree using Tylasu
 * 
 * IMPLEMENTATION STATUS:
 * ✅ Implemented parser rules:
 * - program: Top-level program structure
 * - expr: Expression dispatcher
 * - expr_seq: Parenthesized expression blocks
 * - declarationStatement: local/global/persistent variable declarations
 * - contextStatement: at/in/with/set context expressions
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
 * - eventHandlerStatement: on <event> do <handler>
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
import { Position, Point, Node, assignParents } from '@strumenta/tylasu';
import {
    AccessorContext,
    ArrayContext,
    AttributesDefinitionContext,
    BoolContext,
    CaseStatementContext,
    ContextStatementContext,
    CtxClauseContext,
    CtxSetContext,
    DoLoopStatementContext,
    DeRefContext,
    DeclarationStatementContext,
    EventHandlerStatementContext,
    ExprContext,
    ExprOperandContext,
    ExprSeqContext,
    FactorContext,
    AccesibleFactorContext,
    BasicFactorContext,
    PostfixExprContext,
    PostfixOpContext,
    FnDefinitionContext,
    FnReturnStatementContext,
    FunctionCallContext,
    FnParamsContext,
    IdentifierContext,
    IfStatementContext,
    IndexContext,
    LoopExitStatementContext,
    MacroscriptDefinitionContext,
    mxsParser,
    OperandArgContext,
    ForLoopStatementContext,
    ParamContext,
    ParamDefinitionContext,
    PathContext,
    ParamsDefinitionContext,
    PluginDefinitionContext,
    ProgramContext,
    PropertyContext,
    RcSubmenuDefinitionContext,
    RcmenuControlContext,
    ReferenceContext,
    RcmenuDefinitionContext,
    RolloutControlContext,
    RolloutDefinitionContext,
    RolloutGroupDefinitionContext,
    SimpleExpressionContext,
    StructBodyContext,
    StructDefinitionContext,
    ToolDefinitionContext,
    TryStatementContext,
    UtilityDefinitionContext,
    VariableDeclarationContext,
    WhenClauseContext,
    WhenStatementContext,
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
    DefinitionBlock,
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
    ContextClause,
    ContextStatement,
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
    EventHandlerStatement,
    PathLiteral,
    ParameterDefinition,
    RcMenuItem,
    RolloutControl,
    WhenStatement,
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
        const stopText = ctx.stop.text ?? '';
        // ctx.stop.column is the start column of the stop token; add its text length
        // so that the position spans the full token rather than ending at its first char.
        const end = new Point(ctx.stop.line, ctx.stop.column + stopText.length);
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
        
        assignParents(this.program);
        return this.program;
    }
    
    // Expression - visit all children to collect references
    visitExpr = (ctx: ExprContext): Expression | Expression[] | null => {
        // Check if this expression directly contains specific node types
        const contextStmt = ctx.contextStatement();
        if (contextStmt) {
            return this.visit(contextStmt);
        }
        const whenStmt = ctx.whenStatement();
        if (whenStmt) {
            return this.visit(whenStmt);
        }
        const macroscriptDef = ctx.macroscriptDefinition();
        if (macroscriptDef) {
            return this.visit(macroscriptDef);
        }
        const utilityDef = ctx.utilityDefinition();
        if (utilityDef) {
            return this.visit(utilityDef);
        }
        const rolloutDef = ctx.rolloutDefinition();
        if (rolloutDef) {
            return this.visit(rolloutDef);
        }
        const toolDef = ctx.toolDefinition();
        if (toolDef) {
            return this.visit(toolDef);
        }
        const rcmenuDef = ctx.rcmenuDefinition();
        if (rcmenuDef) {
            return this.visit(rcmenuDef);
        }
        const pluginDef = ctx.pluginDefinition();
        if (pluginDef) {
            return this.visit(pluginDef);
        }
        const attributesDef = ctx.attributesDefinition();
        if (attributesDef) {
            return this.visit(attributesDef);
        }
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

    visitContextStatement = (ctx: ContextStatementContext): ContextStatement => {
        const position = this.getPosition(ctx);

        if (ctx.ctxCascading()) {
            const node = new ContextStatement('cascading', position);
            const cascading = ctx.ctxCascading()!;
            node.clauses = cascading.ctxClause().map(clause => this.buildContextClause(clause));
            node.body = this.visitBodyInScopedBlock(cascading.expr()) as Expression;
            return node;
        }

        const node = new ContextStatement('set', position);
        const setContext = ctx.ctxSet();
        if (setContext) {
            node.clauses.push(this.buildContextSetClause(setContext));
        }
        return node;
    }

    visitWhenStatement = (ctx: WhenStatementContext): WhenStatement => {
        const position = this.getPosition(ctx);
        const clause = ctx.whenClause();
        const targetReferences = clause.reference();

        let targetType: VariableReference | undefined;
        let targets: Expression;

        if (clause.path()) {
            targets = this.visit(clause.path()!) as Expression;
        } else if (clause.exprSeq()) {
            targets = this.visit(clause.exprSeq()!) as Expression;
        } else if (clause.array()) {
            targets = this.visit(clause.array()!) as Expression;
        } else if (targetReferences.length > 1) {
            targetType = this.unwrapVariableReference(this.visit(targetReferences[0]) as Expression);
            targets = this.visit(targetReferences[1]) as Expression;
        } else if (targetReferences.length === 1) {
            targets = this.visit(targetReferences[0]) as Expression;
        } else {
            targets = new UndefinedLiteral(position);
        }

        const eventText = clause.identifier().getText().toLowerCase();
        const event: 'change' | 'deleted' = eventText === 'deleted' ? 'deleted' : 'change';
        const body = this.visitBodyInScopedBlock(ctx.expr()) as Expression;
        const node = new WhenStatement(targets, event, body, position);

        if (targetType) {
            node.targetType = targetType;
        }

        node.parameters = clause.param()
            .map(param => this.visit(param) as Expression | null)
            .filter((param): param is Expression => param instanceof Expression);

        const handler = clause.factor();
        if (handler) {
            node.handler = this.visit(handler) as Expression;
        }

        return node;
    }

    visitMacroscriptDefinition = (ctx: MacroscriptDefinitionContext): DefinitionBlock => {
        const clause = ctx.macroscriptClause();
        const parameters = this.collectExpressions(clause.param());
        return this.buildDefinitionBlock(
            'macroscript',
            clause._macro_name?.getText() || 'anonymous',
            this.getPosition(ctx),
            parameters,
            ctx.macroscriptMembers(),
        );
    }

    visitUtilityDefinition = (ctx: UtilityDefinitionContext): DefinitionBlock => {
        const clause = ctx.utilityClause();
        const parameters = [
            this.visit(clause.factor()) as Expression,
            ...this.collectExpressions(clause.param()),
        ];
        return this.buildDefinitionBlock(
            'utility',
            clause._utility_name?.getText() || 'anonymous',
            this.getPosition(ctx),
            parameters,
            ctx.rolloutMembers(),
        );
    }

    visitRolloutDefinition = (ctx: RolloutDefinitionContext): DefinitionBlock => {
        const clause = ctx.rolloutClause();
        const parameters = [
            this.visit(clause.factor()) as Expression,
            ...this.collectExpressions(clause.param()),
        ];
        return this.buildDefinitionBlock(
            'rollout',
            clause._rollout_name?.getText() || 'anonymous',
            this.getPosition(ctx),
            parameters,
            ctx.rolloutMembers(),
        );
    }

    visitRolloutGroupDefinition = (ctx: RolloutGroupDefinitionContext): DefinitionBlock => {
        const clause = ctx.groupClause();
        return this.buildDefinitionBlock(
            'rolloutGroup',
            this.parseQuotedText(clause._group_name?.text) || 'anonymous',
            this.getPosition(ctx),
            [],
            ctx.rolloutControl(),
        );
    }

    visitRolloutControl = (ctx: RolloutControlContext): RolloutControl => {
        const position = this.getPosition(ctx);
        const name = ctx._controlName?.getText() || 'anonymous';
        const controlType = ctx.rolloutControlType().getText();
        const caption = ctx.factor() ? this.visit(ctx.factor()!) as Expression : undefined;
        const parameters = this.collectExpressions(ctx.param());

        const control = new RolloutControl(name, controlType, caption, parameters, position);
        this.getCurrentScope().addDeclaration(control);
        return control;
    }

    visitToolDefinition = (ctx: ToolDefinitionContext): DefinitionBlock => {
        const clause = ctx.toolClause();
        const parameters = this.collectExpressions(clause.param());
        return this.buildDefinitionBlock(
            'tool',
            clause._tool_name?.getText() || 'anonymous',
            this.getPosition(ctx),
            parameters,
            ctx.toolMembers(),
        );
    }

    visitRcmenuDefinition = (ctx: RcmenuDefinitionContext): DefinitionBlock => {
        const clause = ctx.rcmenuClause();
        return this.buildDefinitionBlock(
            'rcmenu',
            clause._rc_name?.getText() || 'anonymous',
            this.getPosition(ctx),
            [],
            ctx.rcMembers(),
        );
    }

    visitRcSubmenuDefinition = (ctx: RcSubmenuDefinitionContext): DefinitionBlock => {
        const clause = ctx.submenuClause();
        return this.buildDefinitionBlock(
            'submenu',
            this.parseQuotedText(clause._submenu_name?.text) || 'anonymous',
            this.getPosition(ctx),
            this.collectExpressions(clause.param()),
            ctx.rcMembers(),
        );
    }

    visitRcmenuControl = (ctx: RcmenuControlContext): RcMenuItem => {
        const position = this.getPosition(ctx);
        const itemType: 'menuitem' | 'separator' = ctx.MenuItem() ? 'menuitem' : 'separator';
        const name = ctx.identifier()?.getText()
            ?? ctx.factor()?.[0]?.getText()
            ?? itemType;
        const operands = ctx.factor().map(operand => this.visit(operand) as Expression);
        const parameters = this.collectExpressions(ctx.param());

        const item = new RcMenuItem(name, itemType, operands, parameters, position);
        this.getCurrentScope().addDeclaration(item);
        return item;
    }

    visitPluginDefinition = (ctx: PluginDefinitionContext): DefinitionBlock => {
        const clause = ctx.pluginClause();
        const parameters = this.collectExpressions(clause.param());
        return this.buildDefinitionBlock(
            'plugin',
            clause._plugin_name?.getText() || 'anonymous',
            this.getPosition(ctx),
            parameters,
            ctx.pluginMembers(),
            clause._plugin_kind?.getText(),
        );
    }

    visitParamsDefinition = (ctx: ParamsDefinitionContext): DefinitionBlock => {
        const clause = ctx.paramsClause();
        return this.buildDefinitionBlock(
            'parameters',
            clause.identifier().getText(),
            this.getPosition(ctx),
            this.collectExpressions(clause.param()),
            ctx.paramsMembers(),
        );
    }

    visitParamDefinition = (ctx: ParamDefinitionContext): ParameterDefinition => {
        const position = this.getPosition(ctx);
        const definition = new ParameterDefinition(
            ctx.identifier().getText(),
            this.collectExpressions(ctx.param()),
            position,
        );
        this.getCurrentScope().addDeclaration(definition);
        return definition;
    }

    visitAttributesDefinition = (ctx: AttributesDefinitionContext): DefinitionBlock => {
        const clause = ctx.attributesClause();
        const parameters = this.collectExpressions(clause.param());
        return this.buildDefinitionBlock(
            'attributes',
            clause.identifier().getText(),
            this.getPosition(ctx),
            parameters,
            ctx.attributesMembers(),
        );
    }

    visitEventHandlerStatement = (ctx: EventHandlerStatementContext): EventHandlerStatement => {
        const position = this.getPosition(ctx);
        const references = ctx._ev_args?._refs ?? [];
        const action: 'do' | 'return' = ctx._ev_action?.text?.toLowerCase() === 'return' ? 'return' : 'do';
        const bodyCtx = (ctx._ev_body ?? ctx.expr()) as ParserRuleContext;
        const body = this.visitBodyInScopedBlock(bodyCtx) as Expression;

        const eventTypeRef = references.length >= 2 ? references[1] : references[0];
        const eventType = this.unwrapVariableReference(this.visit(eventTypeRef) as Expression)
            ?? new VariableReference(eventTypeRef?.getText() || 'anonymous', this.getPosition(eventTypeRef));
        const node = new EventHandlerStatement(eventType, action, body, position);

        if (references.length >= 2) {
            node.target = this.unwrapVariableReference(this.visit(references[0]) as Expression);
        }

        if (references.length >= 3) {
            node.eventArgs = references.slice(2)
                .map(ref => this.unwrapVariableReference(this.visit(ref) as Expression))
                .filter((ref): ref is VariableReference => ref instanceof VariableReference);
        }

        return node;
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
            const thenCtx = ctx._thenBody ?? ctx.expr(0)!;
            const thenBody = this.visitBodyInScopedBlock(thenCtx) as Expression;
            node.thenBody = thenBody;

            const elseExpr = ctx._elseBody;
            if (elseExpr) {
                node.elseBody = this.visitBodyInScopedBlock(elseExpr) as Expression;
            }
        } else if (ctx.DO()) {
            const doCtx = ctx._doBody ?? ctx.expr(0)!;
            const doBody = this.visitBodyInScopedBlock(doCtx) as Expression;
            node.doBody = doBody;
        }

        return node;
    }

    // While loop: while cond do body
    visitWhileLoopStatement = (ctx: WhileLoopStatementContext): WhileStatement => {
        const position = this.getPosition(ctx);
        const condition = (ctx._condition ? this.visit(ctx._condition) : this.visit(ctx.expr(0)!)) as Expression;
        const bodyCtx = ctx._body ?? ctx.expr(1)!;
        const body = this.visitBodyInScopedBlock(bodyCtx) as Expression;
        return new WhileStatement(condition, body, position);
    }

    // Do loop: do body while cond
    visitDoLoopStatement = (ctx: DoLoopStatementContext): DoWhileStatement => {
        const position = this.getPosition(ctx);
        const bodyCtx = ctx._body ?? ctx.expr(0)!;
        const body = this.visitBodyInScopedBlock(bodyCtx) as Expression;
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
        const bodyCtx = ctx._body ?? ctx.expr();
        const body = this.visitBodyInScopedBlock(bodyCtx) as Expression;

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
        const tryCtx = ctx._tryBody ?? ctx.expr(0)!;
        const catchCtx = ctx._catchBody ?? ctx.expr(1)!;
        const tryBody = this.visitBodyInScopedBlock(tryCtx) as Expression;
        const catchBody = this.visitBodyInScopedBlock(catchCtx) as Expression;
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
            const body = this.visitBodyInScopedBlock(itemCtx.expr()) as Expression;
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
    
    // Factor now delegates to basicFactor / accesibleFactor.
    visitFactor = (ctx: FactorContext): Expression => {
        if (ctx.basicFactor()) {
            return this.visit(ctx.basicFactor()!) as Expression;
        }
        if (ctx.accesibleFactor()) {
            return this.visit(ctx.accesibleFactor()!) as Expression;
        }
        return new UndefinedLiteral(this.getPosition(ctx));
    }

    visitBasicFactor = (ctx: BasicFactorContext): Expression => {
        const position = this.getPosition(ctx);

        if (ctx.NUMBER()) {
            const text = ctx.NUMBER()!.getText();
            return new NumberLiteral(parseFloat(text), text, position);
        }

        if (ctx.TIMEVAL()) {
            return new NameLiteral(ctx.TIMEVAL()!.getText(), position);
        }

        if (ctx.bool()) {
            return this.visit(ctx.bool()!) as Expression;
        }

        if (ctx.name()) {
            const text = ctx.name()!.getText();
            const value = text.startsWith('#') ? text.substring(1) : text;
            return new NameLiteral(value, position);
        }

        return new UndefinedLiteral(position);
    }

    visitAccesibleFactor = (ctx: AccesibleFactorContext): Expression => {
        const position = this.getPosition(ctx);
        let result: Expression;

        if (ctx.reference()) {
            result = this.visit(ctx.reference()!) as Expression;
        } else if (ctx.STRING()) {
            const text = ctx.STRING()!.getText();
            const isVerbatim = text.startsWith('@"');
            const value = isVerbatim
                ? text.substring(2, text.length - 1)
                : text.substring(1, text.length - 1).replace(/\\"/g, '"');
            result = new StringLiteral(value, isVerbatim, position);
        } else if (ctx.RESOURCE()) {
            result = new NameLiteral(ctx.RESOURCE()!.getText(), position);
        } else if (ctx.path()) {
            result = this.visit(ctx.path()!) as Expression;
        } else if (ctx.QUESTION()) {
            result = new UndefinedLiteral(position);
        } else if (ctx.array()) {
            result = this.visit(ctx.array()!) as Expression;
        } else if (ctx.bitArray()) {
            result = this.visit(ctx.bitArray()!) as Expression;
        } else if (ctx.vector()) {
            result = this.visit(ctx.vector()!) as Expression;
        } else if (ctx.exprSeq()) {
            result = this.visit(ctx.exprSeq()!) as Expression;
        } else {
            result = new UndefinedLiteral(position);
        }

        for (const accessorCtx of ctx.accessor()) {
            result = this.applyAccessor(result, accessorCtx);
        }

        return result;
    }

    visitBool = (ctx: BoolContext): BooleanLiteral => {
        const position = this.getPosition(ctx);
        const text = ctx.getText().toLowerCase();
        const value = text === 'true' || text === 'on';
        return new BooleanLiteral(value, position);
    }

    visitArray = (ctx: ArrayContext): ArrayLiteral => {
        const position = this.getPosition(ctx);
        const values = ctx.arrayList()?.expr().map(expr => this.visit(expr) as Expression) ?? [];
        return new ArrayLiteral(values, position);
    }

    visitPath = (ctx: PathContext): Expression => {
        const position = this.getPosition(ctx);
        const path = new PathLiteral(ctx.PATH().getText(), position);

        if (ctx.AMP()) {
            return new ReferenceExpression(path, position);
        }

        return path;
    }

    visitParam = (ctx: ParamContext): Expression | null => {
        return this.visit(ctx.operandArg()) as Expression | null;
    }

    visitOperandArg = (ctx: OperandArgContext): Expression => {
        const position = this.getPosition(ctx);
        const operand = this.visit(ctx.factor()) as Expression;

        if (ctx.UNARY_MINUS()) {
            return new UnaryExpression('-', operand, position);
        }

        return operand;
    }

    // FunctionCall is now a postfix suffix (no caller in this context).
    visitFunctionCall = (ctx: FunctionCallContext): Expression => {
        const args: Expression[] = [];
        for (const argCtx of ctx.operandArg()) {
            args.push(this.visit(argCtx) as Expression);
        }
        for (const paramCtx of ctx.param()) {
            const paramValue = this.visit(paramCtx) as Expression | null;
            if (paramValue) {
                args.push(paramValue);
            }
        }

        // Caller is applied in visitPostfixExpr. Return a placeholder when visited directly.
        return new CallExpression(new UndefinedLiteral(this.getPosition(ctx)), args, this.getPosition(ctx));
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
    
    // Expression operand: deRef | postfixExpr
    visitExprOperand = (ctx: ExprOperandContext): Expression => {
        const deRef = ctx.deRef();
        if (deRef) {
            return this.visit(deRef) as Expression;
        }

        const postfixExpr = ctx.postfixExpr();
        if (postfixExpr) {
            return this.visit(postfixExpr) as Expression;
        }

        return new UndefinedLiteral();
    }

    visitPostfixExpr = (ctx: PostfixExprContext): Expression => {
        let result: Expression;

        if (ctx.basicFactor()) {
            result = this.visit(ctx.basicFactor()!) as Expression;
        } else if (ctx.accesibleFactor()) {
            result = this.visit(ctx.accesibleFactor()!) as Expression;
        } else {
            return new UndefinedLiteral(this.getPosition(ctx));
        }

        for (const op of ctx.postfixOp()) {
            if (op.accessor()) {
                result = this.applyAccessor(result, op.accessor()!);
                continue;
            }

            const call = op.functionCall();
            if (call) {
                const args: Expression[] = [];
                for (const argCtx of call.operandArg()) {
                    args.push(this.visit(argCtx) as Expression);
                }
                for (const paramCtx of call.param()) {
                    const paramValue = this.visit(paramCtx) as Expression | null;
                    if (paramValue) {
                        args.push(paramValue);
                    }
                }
                result = new CallExpression(result, args, this.getPosition(call));
            }
        }

        return result;
    }

    visitPostfixOp = (ctx: PostfixOpContext): Expression => {
        if (ctx.functionCall()) {
            return this.visit(ctx.functionCall()!) as Expression;
        }
        if (ctx.accessor()) {
            return this.visit(ctx.accessor()!) as Expression;
        }
        return new UndefinedLiteral(this.getPosition(ctx));
    }

    // Dereference operator: *ref, *ref.prop, *$path
    visitDeRef = (ctx: DeRefContext): Expression => {
        const position = this.getPosition(ctx);

        let result: Expression;
        if (ctx.reference()) {
            result = this.visit(ctx.reference()!) as Expression;
        } else if (ctx.path()) {
            result = this.visit(ctx.path()!) as Expression;
        } else {
            result = new UndefinedLiteral(position);
        }

        for (const accessorCtx of ctx.accessor()) {
            result = this.applyAccessor(result, accessorCtx);
        }

        return new DereferenceExpression(result, position);
    }

    // Accessor is now a single postfix operation: property or index
    visitAccessor = (ctx: AccessorContext): Expression => {
        if (ctx.property()) {
            return this.visit(ctx.property()!) as Expression;
        }
        if (ctx.index()) {
            return this.visit(ctx.index()!) as Expression;
        }
        return new UndefinedLiteral(this.getPosition(ctx));
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

    private applyAccessor(base: Expression, accessorCtx: AccessorContext): Expression {
        if (accessorCtx.property()) {
            const propertyCtx = accessorCtx.property()!;
            const propName = propertyCtx.identifier()?.getText() || propertyCtx.kwOverride()?.getText() || '';
            return new MemberExpression(base, propName, this.getPosition(propertyCtx));
        }

        if (accessorCtx.index()) {
            const indexCtx = accessorCtx.index()!;
            return new IndexExpression(base, this.visit(indexCtx.expr()) as Expression, this.getPosition(indexCtx));
        }

        return base;
    }
    
    // Default: return null for unsupported nodes in POC
    protected defaultResult(): null {
        return null;
    }

    private buildContextClause(ctx: CtxClauseContext): ContextClause {
        const position = this.getPosition(ctx);

        if (ctx.AT()) {
            const label = ctx.LEVEL() ? 'level' : 'time';
            return new ContextClause('at', label, this.visit(ctx.factor()!) as Expression, position);
        }

        if (ctx.IN()) {
            if (ctx.ctxCoordsys()) {
                return this.buildNestedContextClause('in', ctx.ctxCoordsys()!, position);
            }
            return new ContextClause('in', undefined, this.visit(ctx.factor()!) as Expression, position);
        }

        if (ctx.WITH()) {
            if (ctx.ctxUndo()) {
                return this.buildUndoClause('with', ctx.ctxUndo()!, position);
            }
            if (ctx.ctxSwitches()) {
                const switchName = ctx.ctxSwitches()!.getChild(0)?.getText().toLowerCase();
                return new ContextClause('with', switchName, this.visit(ctx.ctxSwitches()!.factor()) as Expression, position);
            }
        }

        if (ctx.ctxAbout()) {
            return this.buildAboutClause(ctx.ctxAbout()!, position);
        }

        if (ctx.ctxCoordsys()) {
            return this.buildCoordsysClause(ctx.ctxCoordsys()!, position);
        }

        if (ctx.ctxUndo()) {
            return this.buildUndoClause('undo', ctx.ctxUndo()!, position);
        }

        if (ctx.ctxSwitches()) {
            const switchName = ctx.ctxSwitches()!.getChild(0)?.getText().toLowerCase();
            return new ContextClause('switch', switchName, this.visit(ctx.ctxSwitches()!.factor()) as Expression, position);
        }

        return new ContextClause('unknown', undefined, undefined, position);
    }

    private buildContextSetClause(ctx: CtxSetContext): ContextClause {
        const position = this.getPosition(ctx);

        if (ctx.ANIMATE()) {
            return new ContextClause('set', 'animate', this.visit(ctx.factor()!) as Expression, position);
        }
        if (ctx.TIME()) {
            return new ContextClause('set', 'time', this.visit(ctx.factor()!) as Expression, position);
        }
        if (ctx.LEVEL()) {
            return new ContextClause('set', 'level', this.visit(ctx.factor()!) as Expression, position);
        }
        if (ctx.IN()) {
            return new ContextClause('set', 'in', this.visit(ctx.factor()!) as Expression, position);
        }
        if (ctx.ctxCoordsys()) {
            return this.buildNestedContextClause('set', ctx.ctxCoordsys()!, position);
        }
        if (ctx.ctxAbout()) {
            return this.buildNestedContextClause('set', ctx.ctxAbout()!, position);
        }
        if (ctx.ctxUndo()) {
            return this.buildUndoClause('set', ctx.ctxUndo()!, position);
        }

        return new ContextClause('set', undefined, undefined, position);
    }

    private buildNestedContextClause(kind: string, nested: ParserRuleContext, position?: Position): ContextClause {
        if (nested.constructor.name === 'CtxCoordsysContext') {
            const clause = this.buildCoordsysClause(nested as any, position);
            return new ContextClause(kind, clause.label, clause.value, position);
        }
        if (nested.constructor.name === 'CtxAboutContext') {
            const clause = this.buildAboutClause(nested as any, position);
            return new ContextClause(kind, clause.label, clause.value, position);
        }

        return new ContextClause(kind, nested.getText().toLowerCase(), undefined, position);
    }

    private buildAboutClause(ctx: any, position?: Position): ContextClause {
        const label = ctx.COORDSYS() ? 'coordsys' : undefined;
        const value = ctx.factor() ? this.visit(ctx.factor()) as Expression : undefined;
        return new ContextClause('about', label, value, position);
    }

    private buildCoordsysClause(ctx: any, position?: Position): ContextClause {
        const label = ctx.LOCAL() ? 'local' : undefined;
        const value = ctx.factor() ? this.visit(ctx.factor()) as Expression : undefined;
        return new ContextClause('coordsys', label, value, position);
    }

    private buildUndoClause(kind: string, ctx: any, position?: Position): ContextClause {
        let label: string | undefined;
        if (ctx.STRING()) {
            label = ctx.STRING().getText();
        } else if (ctx.param()) {
            label = ctx.param().getText();
        } else if (ctx.reference()) {
            label = ctx.reference().getText();
        }

        return new ContextClause(kind, label, this.visit(ctx.factor()) as Expression, position);
    }

    private unwrapVariableReference(expr: Expression | null | undefined): VariableReference | undefined {
        if (!expr) {
            return undefined;
        }

        if (expr instanceof VariableReference) {
            return expr;
        }

        if (expr instanceof ReferenceExpression && expr.operand instanceof VariableReference) {
            return expr.operand;
        }

        return undefined;
    }

    private collectExpressions(contexts: ParserRuleContext[]): Expression[] {
        return contexts
            .map(context => this.visit(context) as Expression | null)
            .filter((expr): expr is Expression => expr instanceof Expression);
    }

    /**
     * Visit a control-flow body in an explicit synthetic block scope when needed.
     * This ensures non-parenthesized bodies (e.g. `if ... do local x = 1`) do not
     * leak declarations into the parent scope.
     */
    private visitBodyInScopedBlock(bodyCtx: ParserRuleContext): Expression {
        // If the body is already an exprSeq, it creates its own scope via visitExprSeq.
        // Avoid pre-visiting other body shapes here to prevent declarations from landing
        // in the parent scope before we push the synthetic scoped block.
        const maybeExprSeq = (bodyCtx as unknown as { exprSeq?: () => unknown }).exprSeq;
        if (typeof maybeExprSeq === 'function' && maybeExprSeq.call(bodyCtx)) {
            const existingScoped = this.visit(bodyCtx);
            return existingScoped as Expression;
        }

        const scopedBody = new BlockExpression(this.getPosition(bodyCtx));
        scopedBody.parentScope = this.getCurrentScope();

        this.pushScope(scopedBody);
        const scopedNode = this.visit(bodyCtx);
        if (Array.isArray(scopedNode)) {
            for (const child of scopedNode) {
                if (child instanceof Node) {
                    scopedBody.expressions.push(child);
                }
            }
        } else if (scopedNode instanceof Node) {
            scopedBody.expressions.push(scopedNode);
        }
        this.popScope();

        return scopedBody as unknown as Expression;
    }

    private parseQuotedText(text?: string): string | undefined {
        if (!text) {
            return undefined;
        }

        if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
            return text.substring(1, text.length - 1);
        }

        return text;
    }

    private buildDefinitionBlock(
        kind: DefinitionBlock['kind'],
        name: string,
        position: Position | undefined,
        parameters: Expression[],
        memberContexts: ParserRuleContext[],
        pluginKind?: string,
    ): DefinitionBlock {
        const block = new DefinitionBlock(kind, name, position);
        block.parameters = parameters;
        block.pluginKind = pluginKind;

        const blockDecl = new VariableDeclaration(name, 'local', position);
        this.getCurrentScope().addDeclaration(blockDecl);

        this.pushScope(block);
        for (const memberContext of memberContexts) {
            this.appendDefinitionClause(block, this.visit(memberContext));
        }
        this.popScope();

        return block;
    }

    private appendDefinitionClause(block: DefinitionBlock, value: any): void {
        if (Array.isArray(value)) {
            for (const item of value) {
                if (item instanceof Node) {
                    block.clauses.push(item);
                }
            }
            return;
        }

        if (value instanceof Node) {
            block.clauses.push(value);
        }
    }
}
