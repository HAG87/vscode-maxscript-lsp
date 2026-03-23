/**
 * Resolves symbol references in the AST using Tylasu
 * 
 * PURPOSE:
 * Links variable/function references to their declarations (semantic binding).
 * This enables features like go-to-definition, find-all-references, and unused variable detection.
 * 
 * PROCESS:
 * 1. Walks the AST tree respecting scope boundaries
 * 2. For each VariableReference, finds its VariableDeclaration using scope chain lookup
 * 3. Creates bidirectional links:
 *    - Reference.declaration → points to Declaration
 *    - Declaration.references[] → contains all References
 * 
 * SCOPE HANDLING:
 * - Respects MaxScript scope rules (local → function → global)
 * - Functions create new scope for parameters and locals
 * - Structs create scope for members and methods
 * - Blocks create scope for their local declarations
 * 
 * USAGE:
 * ```typescript
 * // After building AST from parse tree
 * const ast = ASTBuilder.buildAST(parseTree);
 * 
 * // Resolve all symbol references
 * const resolver = new SymbolResolver(ast, collectedReferences);
 * resolver.resolve();
 * 
 * // Now AST has resolved links:
 * // - Each VariableReference knows its VariableDeclaration
 * // - Each VariableDeclaration knows all its references
 * 
 * // Use for language features:
 * // - Go-to-definition: follow reference.declaration.referred
 * // - Find-all-references: access declaration.references[]
 * // - Unused variables: check if declaration.references.length === 0
 * 
 * // Then build symbol tree for VS Code outline:
 * const symbols = SymbolTreeBuilder.buildSymbolTree(ast, sourceUri);
 * ```
 * 
 * @see SymbolTreeBuilder - Converts resolved AST to hierarchical symbol tree for VS Code outline
 * @see ASTBuilder - Creates initial AST from ANTLR parse tree
 */

import {
    AssignmentExpression,
    BlockExpression,
    CaseStatement,
    ContextStatement,
    DefinitionBlock,
    DoWhileStatement,
    EventHandlerStatement,
    Expression,
    ExitStatement,
    ForStatement,
    FunctionDefinition,
    IfStatement,
    ParameterDefinition,
    Program,
    RcMenuItem,
    ReturnStatement,
    RolloutControl,
    ScopeNode,
    StructDefinition,
    TryStatement,
    VariableDeclaration,
    VariableReference,
    WhenStatement,
    WhileStatement,
} from './ASTNodes.js';

export class SymbolResolver {
    // Track current scope during traversal
    private currentScope: ScopeNode;
    
    constructor(private program: Program, references: VariableReference[] = []) {
        this.currentScope = program;
    }
    
    /**
     * Main entry point - resolves all symbol references in the AST
     * FIX #1: Removed the incorrect first resolution pass that used program.resolve()
     * Now uses a single tree walk that respects scope boundaries
     */
    resolve(): void {
        // Single pass: walk AST respecting scope boundaries
        this.visitProgram(this.program);
    }
    
    private visitProgram(node: Program): void {
        this.currentScope = node;
        for (const stmt of node.statements) {
            this.visit(stmt);
        }
    }
    
    private visitVariableDeclaration(node: VariableDeclaration): void {
        // Declaration is already added to scope by ASTBuilder
        // Resolve any initializer expressions
        if (node.initializer) {
            this.visit(node.initializer);
        }

        if (node instanceof RolloutControl) {
            if (node.caption) {
                this.visit(node.caption);
            }
            for (const parameter of node.parameters) {
                this.visit(parameter);
            }
        }

        if (node instanceof RcMenuItem) {
            for (const operand of node.operands) {
                this.visit(operand);
            }
            for (const parameter of node.parameters) {
                this.visit(parameter);
            }
        }

        if (node instanceof ParameterDefinition) {
            for (const parameter of node.parameters) {
                this.visit(parameter);
            }
        }
    }
    
    private visitVariableReference(node: VariableReference): void {
        if (!node.name || !node.declaration) return;
        
        // Resolve using scope chain - this respects lexical scoping
        const resolved = this.currentScope.resolve(node.name);
        
        if (resolved) {
            // Use Tylasu's ReferenceByName to link
            node.declaration.referred = resolved;
            
            // Add back-reference from declaration
            resolved.references.push(node);
        }
        // If no declaration found, reference remains unresolved (implicit global in MaxScript)
    }
    
    private visitFunctionDefinition(node: FunctionDefinition): void {
        // Functions create a new scope
        const previousScope = this.currentScope;
        this.currentScope = node;
        
        // Resolve body expressions
        if (node.body) {
            this.visit(node.body);
        }
        
        this.currentScope = previousScope;
    }
    
    private visitStructDefinition(node: StructDefinition): void {
        // Structs create a new scope
        const previousScope = this.currentScope;
        this.currentScope = node;
        
        // Resolve members (if they contain expressions)
        for (const member of node.members) {
            if (member.value) {
                this.visit(member.value);
            }
        }
        
        this.currentScope = previousScope;
    }
    
    private visitBlockExpression(node: BlockExpression): void {
        // Blocks create new scope in MaxScript
        const previousScope = this.currentScope;
        this.currentScope = node;
        
        for (const expr of node.expressions) {
            this.visit(expr);
        }
        
        this.currentScope = previousScope;
    }
    
    private visitAssignmentExpression(node: AssignmentExpression): void {
        // Visit target (left side - may be a reference)
        if (node.target) {
            this.visit(node.target);
        }
        
        // Visit value (right side)
        if (node.value) {
            this.visit(node.value);
        }
    }

    private visitIfStatement(node: IfStatement): void {
        this.visit(node.condition);
        if (node.thenBody) this.visit(node.thenBody);
        if (node.elseBody) this.visit(node.elseBody);
        if (node.doBody) this.visit(node.doBody);
    }

    private visitWhileStatement(node: WhileStatement): void {
        this.visit(node.condition);
        this.visit(node.body);
    }

    private visitDoWhileStatement(node: DoWhileStatement): void {
        this.visit(node.body);
        this.visit(node.condition);
    }

    private visitForStatement(node: ForStatement): void {
        this.visit(node.variable);
        if (node.indexVariable) this.visit(node.indexVariable);
        if (node.filteredIndexVariable) this.visit(node.filteredIndexVariable);
        this.visit(node.sequence);
        if (node.toValue) this.visit(node.toValue);
        if (node.byValue) this.visit(node.byValue);
        if (node.whereCondition) this.visit(node.whereCondition);
        if (node.whileCondition) this.visit(node.whileCondition);
        this.visit(node.body);
    }

    private visitTryStatement(node: TryStatement): void {
        this.visit(node.tryBody);
        this.visit(node.catchBody);
    }

    private visitCaseStatement(node: CaseStatement): void {
        if (node.testValue) this.visit(node.testValue);
        for (const item of node.items) {
            this.visit(item.value);
            this.visit(item.body);
        }
    }

    private visitReturnStatement(node: ReturnStatement): void {
        if (node.value) this.visit(node.value);
    }

    private visitExitStatement(node: ExitStatement): void {
        if (node.value) this.visit(node.value);
    }

    private visitContextStatement(node: ContextStatement): void {
        for (const clause of node.clauses) {
            this.visit(clause);
        }
        if (node.body) this.visit(node.body);
    }

    private visitWhenStatement(node: WhenStatement): void {
        if (node.targetType) this.visit(node.targetType);
        this.visit(node.targets);
        for (const parameter of node.parameters) {
            this.visit(parameter);
        }
        if (node.handler) this.visit(node.handler);
        this.visit(node.body);
    }

    private visitEventHandlerStatement(node: EventHandlerStatement): void {
        if (node.target) this.visit(node.target);
        this.visit(node.eventType);
        for (const arg of node.eventArgs) {
            this.visit(arg);
        }
        this.visit(node.body);
    }

    private visitDefinitionBlock(node: DefinitionBlock): void {
        const previousScope = this.currentScope;
        this.currentScope = node;

        for (const parameter of node.parameters) {
            this.visit(parameter);
        }

        for (const clause of node.clauses) {
            this.visit(clause);
        }

        this.currentScope = previousScope;
    }
    
    /**
     * Generic visit dispatcher
     * FIX #2: Added catch-all for expression nodes not explicitly handled
     * This ensures references nested in BinaryExpression, CallExpression, etc. are resolved
     */
    private visit(node: any): void {
        if (!node) return;
        
        if (node instanceof Program) {
            this.visitProgram(node);
        } else if (node instanceof VariableDeclaration) {
            this.visitVariableDeclaration(node);
        } else if (node instanceof VariableReference) {
            this.visitVariableReference(node);
        } else if (node instanceof FunctionDefinition) {
            this.visitFunctionDefinition(node);
        } else if (node instanceof StructDefinition) {
            this.visitStructDefinition(node);
        } else if (node instanceof BlockExpression) {
            this.visitBlockExpression(node);
        } else if (node instanceof AssignmentExpression) {
            this.visitAssignmentExpression(node);
        } else if (node instanceof IfStatement) {
            this.visitIfStatement(node);
        } else if (node instanceof WhileStatement) {
            this.visitWhileStatement(node);
        } else if (node instanceof DoWhileStatement) {
            this.visitDoWhileStatement(node);
        } else if (node instanceof ForStatement) {
            this.visitForStatement(node);
        } else if (node instanceof TryStatement) {
            this.visitTryStatement(node);
        } else if (node instanceof CaseStatement) {
            this.visitCaseStatement(node);
        } else if (node instanceof ReturnStatement) {
            this.visitReturnStatement(node);
        } else if (node instanceof ExitStatement) {
            this.visitExitStatement(node);
        } else if (node instanceof ContextStatement) {
            this.visitContextStatement(node);
        } else if (node instanceof WhenStatement) {
            this.visitWhenStatement(node);
        } else if (node instanceof EventHandlerStatement) {
            this.visitEventHandlerStatement(node);
        } else if (node instanceof DefinitionBlock) {
            this.visitDefinitionBlock(node);
        } else {
            // Catch-all for expression nodes (BinaryExpression, CallExpression, etc)
            // Walk immediate children to find any nested VariableReferences
            for (const child of node.children) {
                this.visit(child);
            }
        }
    }
}
