/**
 * Builds AST from ANTLR parse tree using Tylasu
 * POC: Variables only
 */

import { ParserRuleContext } from 'antlr4ng';
import { Position, Point } from '@strumenta/tylasu';
import {
    DeclarationExpressionContext,
    ExprContext,
    FnDefinitionContext,
    IdentifierContext,
    mxsParser,
    ProgramContext,
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
    visitExpr = (ctx: ExprContext): Expression | null => {
        // Visit all children to find identifiers and other expressions
        const result = this.visitChildren(ctx);
        
        // Return a generic expression for now
        return result as Expression;
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
            const paramName = argCtx.identifier().getText();
            const paramPosition = this.getPosition(argCtx);
            const param = new VariableDeclaration(paramName, 'local', paramPosition);
            fnDef.parameters.push(param);
            fnDef.addDeclaration(param);
        }
        
        // Visit body
        if (ctx.fn_body()) {
            const body = this.visit(ctx.fn_body());
            // Body is an expression, wrap in BlockExpression if needed
            if (body && !Array.isArray(body)) {
                const block = new BlockExpression();
                block.expressions.push(body as Expression);
                fnDef.body = block;
            }
        }
        
        // Pop function scope
        this.popScope();
        
        return fnDef;
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
