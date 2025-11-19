/**
 * Builds AST from ANTLR parse tree using Tylasu
 * POC: Variables only
 */

import { ParserRuleContext } from 'antlr4ng';
import { Position, Point, Node } from '@strumenta/tylasu';
import {
    DeclarationExpressionContext,
    ExprContext,
    Expr_seqContext,
    FnDefinitionContext,
    IdentifierContext,
    mxsParser,
    ProgramContext,
    Struct_bodyContext,
    StructDefinitionContext,
    VariableDeclarationContext,
} from '../../parser/mxsParser.js';
import { mxsParserVisitor } from '../../parser/mxsParserVisitor.js';
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
        const declExpr = ctx.declarationExpression();
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
    visitExpr_seq = (ctx: Expr_seqContext): BlockExpression => {
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
    visitDeclarationExpression = (ctx: DeclarationExpressionContext): any => {
        const scope = ctx._scope?.getText()?.toLowerCase() as 'local' | 'global' | 'persistent' | undefined;
        const scopeType = scope || 'local';
        
        const declarations: VariableDeclaration[] = [];
        
        for (const varDeclCtx of ctx._decl) {
            const name = varDeclCtx.identifier().getText();
            const position = this.getPosition(varDeclCtx);
            
            const decl = new VariableDeclaration(name, scopeType, position);
            
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
        
        // Add parameters as declarations in function scope
        for (const argCtx of ctx.fn_args()) {
            const paramName = argCtx.reference().getText();
            const paramPosition = this.getPosition(argCtx);
            const param = new VariableDeclaration(paramName, 'local', paramPosition);
            fnDef.parameters.push(param);
            fnDef.addDeclaration(param);
        }
        
        // Visit body - fn_body contains a single expr (could be expr_seq or simple expr)
        if (ctx.fn_body()) {
            const bodyExpr = this.visit(ctx.fn_body());
            
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
        if (ctx.struct_body()) {
            this.visit(ctx.struct_body());
        }
        
        // Pop struct scope
        this.popScope();
        
        return structDef;
    }
    
    // Struct body - processes members and methods
    visitStruct_body = (ctx: Struct_bodyContext): null => {
        // Get the current struct from scope stack
        const structDef = this.getCurrentScope() as StructDefinition;
        
        // Process all struct members
        for (const membersCtx of ctx.struct_members()) {
            // Check if it's a function definition (method)
            const fnDef = membersCtx.fnDefinition();
            if (fnDef) {
                const method = this.visit(fnDef) as FunctionDefinition;
                structDef.methods.push(method);
                continue;
            }
            
            // Otherwise it's a struct member (field)
            const memberCtx = membersCtx.struct_member();
            if (memberCtx) {
                const fieldName = memberCtx.identifier().getText();
                const fieldPosition = this.getPosition(memberCtx);
                
                const field = new VariableDeclaration(fieldName, 'local', fieldPosition);
                structDef.members.push(field);
                structDef.addDeclaration(field);
            }
        }
        
        return null;
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
    
    // Default: return null for unsupported nodes in POC
    protected defaultResult(): null {
        return null;
    }
}
