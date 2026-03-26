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
    ReferenceExpression,
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
        this.resetResolutionState();
        // Single pass: walk AST respecting scope boundaries
        this.visitProgram(this.program);
    }

    /**
     * Make resolve() idempotent by clearing prior resolution links.
     * This avoids reference duplication when resolve() runs more than once
     * on the same AST instance.
     */
    private resetResolutionState(): void {
        for (const node of this.program.walk()) {
            if (node instanceof VariableDeclaration) {
                node.references = [];
                continue;
            }

            if (node instanceof VariableReference && node.declaration) {
                node.declaration.referred = undefined;
            }
        }
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
        // Visit value (right side) first
        if (node.value) {
            this.visit(node.value);
        }
        
        // Visit target (left side - may be a reference)
        // For implicit declarations: if target is a VariableReference that doesn't
        // yet have a declaration, create an implicit VariableDeclaration entry
        if (node.target && node.target instanceof VariableReference) {
            const targetName = node.target.name;
            if (targetName) {
                // Check lexical scope chain, not just current block scope.
                // Otherwise nested assignments can incorrectly create implicit locals
                // that shadow valid outer declarations (e.g. function-local vars).
                const existing = this.currentScope.resolve(targetName);
                if (!existing) {
                    // Create implicit declaration from this assignment
                    this.createImplicitDeclaration(targetName, node.target, node);
                }
            }
        }
        
        // Now visit target reference to link it
        if (node.target) {
            this.visit(node.target);
        }
    }

    private visitReferenceExpression(node: ReferenceExpression): void {
        // MaxScript by-reference arguments can implicitly introduce a binding
        // (e.g. fnCall outParam:&newNodes followed by newNodes[1]).
        if (node.operand instanceof VariableReference && node.operand.name) {
            const existing = this.currentScope.resolve(node.operand.name);
            if (!existing) {
                const scope: 'local' | 'global' = this.currentScope instanceof Program ? 'global' : 'local';
                const declaration = new VariableDeclaration(node.operand.name, scope, node.operand.position ?? node.position);
                this.currentScope.addDeclaration(declaration);
            }
        }

        this.visit(node.operand);
    }

    /**
     * Creates an implicit VariableDeclaration for a variable assignment.
     * Used for MaxScript's implicit variable binding (f = 10 implicitly declares f).
     */
    private createImplicitDeclaration(
        name: string,
        reference: VariableReference,
        assignmentNode: AssignmentExpression,
    ): void {
        // Determine scope by lexical context instead of identifier casing.
        // Top-level assignments become globals; nested assignments stay local.
        const scope: 'local' | 'global' = this.currentScope instanceof Program ? 'global' : 'local';
        
        const declaration = new VariableDeclaration(name, scope, reference.position ?? assignmentNode.position);
        declaration.initializer = assignmentNode.value ?? undefined;
        
        // Add to current scope via scope API (keeps lookup behavior consistent).
        this.currentScope.addDeclaration(declaration);
        
        // Set up the reference's declaration link
        if (reference.declaration) {
            reference.declaration.referred = declaration;
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
        // MaxScript loop variables are scoped to the for expression body/predicate.
        const previousScope = this.currentScope;
        const loopScope = new BlockExpression(node.position);
        loopScope.parentScope = previousScope;
        this.currentScope = loopScope;

        const declareLoopReference = (reference?: VariableReference) => {
            if (!reference?.name) {
                return;
            }

            if (!loopScope.resolveLocal(reference.name)) {
                loopScope.addDeclaration(new VariableDeclaration(reference.name, 'local', reference.position));
            }

            this.visit(reference);
        };

        declareLoopReference(node.variable);
        declareLoopReference(node.indexVariable);
        declareLoopReference(node.filteredIndexVariable);

        this.visit(node.sequence);
        if (node.toValue) this.visit(node.toValue);
        if (node.byValue) this.visit(node.byValue);
        if (node.whereCondition) this.visit(node.whereCondition);
        if (node.whileCondition) this.visit(node.whileCondition);

        // Ensure loop variables remain visible inside an AST body block that was
        // originally parented to outer scope during AST construction.
        if (node.body instanceof BlockExpression) {
            const previousParent = node.body.parentScope;
            node.body.parentScope = loopScope;
            this.visit(node.body);
            node.body.parentScope = previousParent;
        } else {
            this.visit(node.body);
        }

        this.currentScope = previousScope;
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

        // Some builder paths can return node arrays (e.g. declaration lists).
        // Resolve each entry and return early.
        if (Array.isArray(node)) {
            for (const entry of node) {
                this.visit(entry);
            }
            return;
        }
        
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
        } else if (node instanceof ReferenceExpression) {
            this.visitReferenceExpression(node);
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
            const children = (node as { children?: unknown }).children;
            if (Array.isArray(children)) {
                for (const child of children) {
                    this.visit(child);
                }
            }
        }
    }
}
