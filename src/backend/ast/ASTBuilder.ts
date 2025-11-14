/**
 * Builds AST from ANTLR parse tree
 * POC: Variables only
 */

import { ParserRuleContext } from 'antlr4ng';
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
    ASTNode,
    AssignmentExpression,
    BlockExpression,
    Expression,
    FunctionDefinition,
    Position,
    Program,
    Range,
    ScopeNode,
    VariableDeclaration,
    VariableReference,
} from './ASTNodes.js';

export class ASTBuilder extends mxsParserVisitor<ASTNode | ASTNode[] | null> {
    // Stack to track current scope
    private scopeStack: ScopeNode[] = [];
    
    // Root program
    private program: Program;
    
    constructor() {
        super();
        this.program = new Program();
        this.scopeStack.push(this.program);
    }
    
    getProgram(): Program {
        return this.program;
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
    
    private getRange(ctx: ParserRuleContext): Range | undefined {
        if (!ctx.start || !ctx.stop) return undefined;
        
        return {
            start: { line: ctx.start.line, column: ctx.start.column },
            end: { line: ctx.stop.line, column: ctx.stop.column }
        };
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
    
    // Declaration expression: local x, y = 5
    visitDeclarationExpression = (ctx: DeclarationExpressionContext): ASTNode[] => {
        const scope = ctx._scope?.getText()?.toLowerCase() as 'local' | 'global' | 'persistent' | undefined;
        const scopeType = scope || 'local';
        
        const declarations: VariableDeclaration[] = [];
        
        for (const varDeclCtx of ctx._decl) {
            const name = varDeclCtx.identifier().getText();
            const range = this.getRange(varDeclCtx);
            
            const decl = new VariableDeclaration(name, scopeType, range);
            
            // Add to current scope
            this.getCurrentScope().addDeclaration(decl);
            
            declarations.push(decl);
        }
        
        return declarations;
    }
    
    // Function definition: fn myFunc x y = (...)
    visitFnDefinition = (ctx: FnDefinitionContext): FunctionDefinition => {
        const name = ctx._fn_name?.getText() || 'anonymous';
        const range = this.getRange(ctx);
        
        const fnDef = new FunctionDefinition(name, range);
        
        // Add function to current scope as a declaration
        const fnDecl = new VariableDeclaration(name, 'local', range);
        this.getCurrentScope().addDeclaration(fnDecl);
        
        // Push function scope
        this.pushScope(fnDef);
        
        // Add parameters as declarations in function scope
        for (const argCtx of ctx.fn_args()) {
            const paramName = argCtx.identifier().getText();
            const paramRange = this.getRange(argCtx);
            const param = new VariableDeclaration(paramName, 'local', paramRange);
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
        const range = this.getRange(ctx);
        
        // Create reference (will be resolved later)
        const ref = new VariableReference(name, range);
        
        return ref;
    }
    
    // Default: return null for unsupported nodes in POC
    protected defaultResult(): null {
        return null;
    }
}
