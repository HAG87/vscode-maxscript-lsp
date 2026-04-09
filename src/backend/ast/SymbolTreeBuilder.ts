/**
 * Builds a hierarchical symbol tree from the AST for VS Code DocumentSymbol
 * 
 * PURPOSE:
 * Converts the resolved AST into VS Code's ISymbolInfo format for the outline view,
 * breadcrumbs, and document navigation features.
 * 
 * VS Code DocumentSymbol Requirements:
 * - Hierarchical structure (functions contain their local variables)
 * - Parent-child relationships (struct contains methods, methods contain locals)
 * - Proper symbol kinds (Variable, Function, Class, etc.)
 * - Position information for navigation
 * 
 * MAXSCRIPT LANGUAGE COMPONENTS FOR SYMBOL OUTLINE:
 * ✅ Implemented:
 * - Variables: local, global, persistent declarations
 * - Functions: function definitions with arguments, parameters, and local variables
 * - Structs: struct definitions with fields and methods
 * - Struct Members: public/private fields and methods
 * - Nested Functions: functions defined inside other functions or blocks
 * 
 * ⏳ Pending:
 * - MacroScripts: macroscript definitions (should appear as top-level symbols)
 * - Utilities: utility plugin definitions
 * - Rollouts: rollout UI definitions with controls
 * - Tools: tool definitions
 * - RCMenus: right-click menu definitions
 * - Plugins: plugin definitions (geometry, modifier, material, etc.)
 * - Attributes: attribute definitions (custom attributes)
 * - Event Handlers: on <event> do <handler> clauses in rollouts/structs
 * - Control Declarations: UI controls in rollouts (button, spinner, checkbox, etc.)
 * 
 * STRUCTURE:
 * The builder creates a tree where:
 * - Functions contain: parameters, local variables, nested functions
 * - Structs contain: member fields, methods (with accessibility markers)
 * - MacroScripts contain: local functions, variables, event handlers
 * - Rollouts contain: controls, event handlers, local functions
 * - Blocks are transparent (their contents bubble up to parent)
 * 
 * METHODS:
 * - `buildSymbolTree()` - Creates hierarchical tree (default, for outline view)
 * - `buildFullSymbolTree()` - Creates flattened list with hierarchy (for search/filter)
 * 
 * USAGE:
 * ```typescript
 * // 1. Build and resolve AST
 * const ast = ASTBuilder.buildAST(parseTree);
 * const resolver = new SymbolResolver(ast, references);
 * resolver.resolve();
 * 
 * // 2. Build hierarchical symbol tree for VS Code outline
 * const symbols = SymbolTreeBuilder.buildSymbolTree(ast, documentUri);
 * 
 * // Returns ISymbolInfo[] with nested structure:
 * // Function: myFunction
 * //   ├─ Parameter: x
 * //   ├─ Parameter: y
 * //   ├─ LocalVar: result
 * //   └─ Function: inner (nested)
 * //       └─ LocalVar: temp
 * // 
 * // Struct: MyStruct
 * //   ├─ Field: count
 * //   ├─ Field: name (private)
 * //   ├─ Method: init
 * //   └─ Method: getValue (private)
 * 
 * // 3. Use in VS Code DocumentSymbolProvider
 * provideDocumentSymbols(document: TextDocument): DocumentSymbol[] {
 *     const context = this.backend.getContext(document.uri.toString());
 *     const ast = context.getAST(); // Hypothetical method
 *     const symbols = SymbolTreeBuilder.buildSymbolTree(ast, document.uri.toString());
 *     
 *     // Convert ISymbolInfo[] to DocumentSymbol[]
 *     return symbols.map(s => this.toDocumentSymbol(s));
 * }
 * ```
 * 
 * WORKFLOW:
 * Parse → AST → Resolve → SymbolTree → VS Code Outline
 *        ↑              ↑              ↑
 *   ASTBuilder  SymbolResolver  SymbolTreeBuilder
 * 
 * @see SymbolResolver - Resolves references before building symbol tree
 * @see ISymbolInfo - Output format (types.ts)
 */

import { ISymbolInfo, SymbolKind, IDefinition, ILexicalRange } from '@backend/types.js';
import {
    DefinitionBlock,
    EventHandlerStatement,
    Program,
    ScopeNode,
    VariableDeclaration,
    FunctionDefinition,
    FunctionArgument,
    FunctionParameter,
    StructDefinition,
    StructMemberField,
    BlockExpression,
    ParameterDefinition,
    RcMenuItem,
    RolloutControl,
} from './ASTNodes.js';

export class SymbolTreeBuilder {
    /**
     * Build hierarchical symbol tree from AST Program node
     */
    static buildSymbolTree(program: Program, sourceUri: string): ISymbolInfo[] {
        const symbols: ISymbolInfo[] = [];
        
        // First, add top-level declarations that are not functions or structs (globals, locals)
        for (const [name, decl] of program.declarations) {
            // Skip function and struct declarations - they're handled as statements
            // Functions and structs are added to declarations by ASTBuilder but also appear in statements
            const isFunctionDecl = program.statements.some(
                stmt => stmt instanceof FunctionDefinition && stmt.name === name
            );
            const isStructDecl = program.statements.some(
                stmt => stmt instanceof StructDefinition && stmt.name === name
            );
            const isDefinitionDecl = program.statements.some(
                stmt => stmt instanceof DefinitionBlock && stmt.name === name
            );
            
            if (!isFunctionDecl && !isStructDecl && !isDefinitionDecl) {
                const symbol = this.buildVariableSymbol(decl, sourceUri);
                if (symbol) {
                    symbols.push(symbol);
                }
            }
        }
        
        // Then, process all statements (functions, structs, etc.)
        for (const stmt of program.statements) {
            // Top-level variables were already emitted from program.declarations.
            if (stmt instanceof VariableDeclaration) {
                continue;
            }

            if (stmt instanceof BlockExpression) {
                symbols.push(...this.buildTransparentBlockSymbols(stmt, sourceUri));
                continue;
            }

            const symbol = this.buildSymbolForNode(stmt, sourceUri);
            if (symbol) {
                symbols.push(symbol);
            }
        }
        
        return symbols;
    }
    
    /**
     * Build symbol info for any node type (dispatcher)
     */
    private static buildSymbolForNode(node: any, sourceUri: string): ISymbolInfo | null {
        if (node instanceof FunctionDefinition) {
            return this.buildFunctionSymbol(node, sourceUri);
        }
        if (node instanceof StructDefinition) {
            return this.buildStructSymbol(node, sourceUri);
        }
        if (node instanceof DefinitionBlock) {
            return this.buildDefinitionBlockSymbol(node, sourceUri);
        }
        if (node instanceof VariableDeclaration) {
            return this.buildVariableSymbol(node, sourceUri);
        }
        if (node instanceof EventHandlerStatement) {
            return this.buildEventHandlerSymbol(node, sourceUri);
        }
        // Add more node types here as needed
        
        return null; // Unknown node type, skip
    }
    
    /**
     * Build symbol info for a function with its arguments, parameters, and local variables as children
     */
    private static buildFunctionSymbol(func: FunctionDefinition, sourceUri: string): ISymbolInfo {
        const children: ISymbolInfo[] = [];
        
        // Add simple arguments as children (fn test a b c)
        for (const arg of func.arguments) {
            children.push({
                name: arg.name || '<unnamed>',
                kind: SymbolKind.Parameter,
                source: sourceUri,
                definition: this.positionToDefinition(arg),
            });
        }
        
        // Add named parameters as children (fn test size:10)
        for (const param of func.parameters) {
            const description = param.defaultValue ? 'with default' : undefined;
            children.push({
                name: param.name || '<unnamed>',
                kind: SymbolKind.Parameter,
                source: sourceUri,
                definition: this.positionToDefinition(param),
                description,
            });
        }
        
        for (const childScope of func.getChildScopes()) {
            if (childScope instanceof BlockExpression) {
                children.push(...this.buildTransparentBlockSymbols(childScope, sourceUri));
                continue;
            }

            const symbol = this.buildSymbolForNode(childScope, sourceUri);
            if (symbol) {
                children.push(symbol);
            }
        }
        
        return {
            name: func.name || '<anonymous>',
            kind: SymbolKind.Function,
            source: sourceUri,
            definition: this.positionToDefinition(func),
            children: children.length > 0 ? children : undefined,
        };
    }
    
    /**
     * Build symbol info for a struct with its members and methods as children
     */
    private static buildStructSymbol(struct: StructDefinition, sourceUri: string): ISymbolInfo {
        const children: ISymbolInfo[] = [];
        
        // Process all struct members (fields, methods, and events)
        for (const member of struct.members) {
            if (!member.value) continue;
            
            // Check if this is a method (FunctionDefinition) or a field (StructMemberField)
            if (member.value instanceof FunctionDefinition) {
                // Add method
                const methodSymbol = this.buildFunctionSymbol(member.value, sourceUri);
                // Optionally mark private methods with description
                if (member.accessibility === 'private' && methodSymbol) {
                    methodSymbol.description = 'private';
                }
                children.push(methodSymbol);
            } else if (member.value instanceof StructMemberField) {
                // Add field - create symbol from StructMemberField
                const fieldSymbol: ISymbolInfo = {
                    name: member.value.name || '<unnamed>',
                    kind: SymbolKind.Field,
                    source: sourceUri,
                    definition: this.positionToDefinition(member.value),
                    description: member.accessibility === 'private' ? 'private' : undefined,
                };
                children.push(fieldSymbol);
            } else if (member.value instanceof EventHandlerStatement) {
                const eventSymbol = this.buildEventHandlerSymbol(member.value, sourceUri);
                if (member.accessibility === 'private') {
                    eventSymbol.description = eventSymbol.description
                        ? `${eventSymbol.description}, private`
                        : 'private';
                }
                children.push(eventSymbol);
            }
        }
        
        return {
            name: struct.name || '<anonymous>',
            kind: SymbolKind.Struct,
            source: sourceUri,
            definition: this.positionToDefinition(struct),
            children: children.length > 0 ? children : undefined,
        };
    }

    private static buildDefinitionBlockSymbol(block: DefinitionBlock, sourceUri: string): ISymbolInfo {
        const children = this.buildDefinitionBlockChildren(block, sourceUri);

        return {
            name: block.name || '<anonymous>',
            kind: this.definitionBlockKind(block),
            source: sourceUri,
            definition: this.positionToDefinition(block),
            description: block.kind === 'plugin' ? block.pluginKind : undefined,
            children: children.length > 0 ? children : undefined,
        };
    }

    private static buildEventHandlerSymbol(eventHandler: EventHandlerStatement, sourceUri: string): ISymbolInfo {
        const targetName = eventHandler.target?.name;
        const eventName = eventHandler.eventType.name || '<event>';

        return {
            name: targetName ? `${targetName}.${eventName}` : eventName,
            kind: SymbolKind.Event,
            source: sourceUri,
            definition: this.positionToDefinition(eventHandler),
            description: eventHandler.action === 'return' ? 'return' : undefined,
        };
    }
    
    /**
     * Build symbol info for a variable declaration
     */
    /**
     * Build symbol info for a variable with nested scopes from initializer
     */
    private static buildVariableSymbol(
        decl: VariableDeclaration, 
        sourceUri: string,
        kind?: SymbolKind
    ): ISymbolInfo {
        // Determine symbol kind based on scope type
        let symbolKind = kind;
        if (!symbolKind) {
            if (decl instanceof RolloutControl) {
                symbolKind = SymbolKind.Control;
            } else if (decl instanceof RcMenuItem) {
                symbolKind = SymbolKind.RcMenuControl;
            } else if (decl instanceof ParameterDefinition) {
                symbolKind = SymbolKind.Parameter;
            } else {
                switch (decl.scope) {
                    case 'local':
                        symbolKind = SymbolKind.LocalVar;
                        break;
                    case 'global':
                        symbolKind = SymbolKind.GlobalVar;
                        break;
                    case 'persistent':
                        symbolKind = SymbolKind.GlobalVar; // Treat persistent as global for now
                        break;
                    default:
                        symbolKind = SymbolKind.Variable;
                }
            }
        }
        
        // Check if initializer contains nested scopes (e.g., local x = (fn inner y = y * 2))
        let children: ISymbolInfo[] | undefined;
        if (decl.initializer instanceof BlockExpression) {
            children = this.buildTransparentBlockSymbols(decl.initializer, sourceUri);
            if (children.length === 0) {
                children = undefined;
            }
        }
        
        return {
            name: decl.name || '<unnamed>',
            kind: symbolKind,
            source: sourceUri,
            definition: this.positionToDefinition(decl),
            description: this.variableDescription(decl),
            children,
        };
    }

    private static buildDefinitionBlockChildren(block: DefinitionBlock, sourceUri: string): ISymbolInfo[] {
        const children: ISymbolInfo[] = [];
        const scopedClauseNames = new Set(
            block.clauses
                .filter(clause => clause instanceof FunctionDefinition || clause instanceof StructDefinition || clause instanceof DefinitionBlock)
                .map(clause => clause.name)
                .filter((name): name is string => Boolean(name))
        );

        for (const [name, decl] of block.declarations) {
            if (!scopedClauseNames.has(name)) {
                children.push(this.buildVariableSymbol(decl, sourceUri));
            }
        }

        for (const clause of block.clauses) {
            if (clause instanceof VariableDeclaration) {
                continue;
            }

            const symbol = this.buildSymbolForNode(clause, sourceUri);
            if (symbol) {
                children.push(symbol);
            }
        }

        return children;
    }

    private static buildTransparentBlockSymbols(block: BlockExpression, sourceUri: string): ISymbolInfo[] {
        const symbols: ISymbolInfo[] = [];
        const scopedExpressionNames = new Set(
            block.expressions
                .filter(expr => expr instanceof FunctionDefinition || expr instanceof StructDefinition || expr instanceof DefinitionBlock)
                .map(expr => expr.name)
                .filter((name): name is string => Boolean(name))
        );

        for (const [name, decl] of block.declarations) {
            if (!scopedExpressionNames.has(name)) {
                symbols.push(this.buildVariableSymbol(decl, sourceUri));
            }
        }

        for (const expr of block.expressions) {
            if (expr instanceof VariableDeclaration) {
                continue;
            }

            if (expr instanceof BlockExpression) {
                symbols.push(...this.buildTransparentBlockSymbols(expr, sourceUri));
                continue;
            }

            const symbol = this.buildSymbolForNode(expr, sourceUri);
            if (symbol) {
                symbols.push(symbol);
            }
        }

        return symbols;
    }

    private static definitionBlockKind(block: DefinitionBlock): SymbolKind {
        switch (block.kind) {
            case 'macroscript':
                return SymbolKind.MacroScript;
            case 'utility':
                return SymbolKind.Utility;
            case 'rollout':
                return SymbolKind.Rollout;
            case 'rolloutGroup':
                return SymbolKind.Object;
            case 'tool':
                return SymbolKind.Tool;
            case 'rcmenu':
                return SymbolKind.RcMenu;
            case 'submenu':
                return SymbolKind.Object;
            case 'plugin':
                return SymbolKind.Plugin;
            case 'parameters':
                return SymbolKind.Parameters;
            case 'attributes':
                return SymbolKind.Attributes;
        }
    }

    private static variableDescription(decl: VariableDeclaration): string | undefined {
        if (decl instanceof RolloutControl) {
            return decl.controlType;
        }

        if (decl instanceof RcMenuItem) {
            return decl.itemType;
        }

        return decl.scope !== 'local' ? decl.scope : undefined;
    }
    
    /**
     * Convert Tylasu Position to IDefinition
     */
    private static positionToDefinition(node: any): IDefinition | undefined {
        if (!node.position) return undefined;
        
        const pos = node.position;
        
        // Tylasu Position has Point objects with line/column from ANTLR (1-based line, 0-based column)
        // ILexicalRange stores ANTLR's native format - conversion to VS Code happens at provider boundary
        const range: ILexicalRange = {
            start: {
                row: pos.start.line,          // Keep ANTLR's 1-based line
                column: pos.start.column      // Keep ANTLR's 0-based column
            },
            end: {
                row: pos.end.line,            // Keep ANTLR's 1-based line
                column: pos.end.column        // Keep ANTLR's 0-based column
            }
        };
        
        return {
            text: node.name || '',
            range
        };
    }
    
    /**
     * Recursively collect nested symbols from child scopes
     * This handles nested functions inside blocks
     */
    private static collectNestedSymbols(scope: ScopeNode, sourceUri: string, symbols: ISymbolInfo[]): void {
        // Get child scopes (nested functions, nested blocks)
        for (const childScope of scope.getChildScopes()) {
            const symbol = this.buildSymbolForNode(childScope, sourceUri);
            if (symbol) {
                symbols.push(symbol);
            } else {
                // If no symbol (e.g., BlockExpression), recurse deeper
                this.collectNestedSymbols(childScope, sourceUri, symbols);
            }
        }
    }
    
    /**
     * Walk the entire AST and build a flat list of all symbols with hierarchy
     * This is an alternative approach that captures the full program structure
     */
    static buildFullSymbolTree(program: Program, sourceUri: string): ISymbolInfo[] {
        return this.buildScopeSymbols(program, sourceUri);
    }
    
    /**
     * Recursively build symbols for a scope and all its children
     */
    private static buildScopeSymbols(scope: ScopeNode, sourceUri: string): ISymbolInfo[] {
        const symbols: ISymbolInfo[] = [];
        
        // Add all declarations in this scope
        for (const decl of scope.getDeclarations()) {
            symbols.push(this.buildVariableSymbol(decl, sourceUri));
        }
        
        // Process child scopes
        for (const childScope of scope.getChildScopes()) {
            const symbol = this.buildSymbolForNode(childScope, sourceUri);
            if (symbol) {
                symbols.push(symbol);
            } else {
                // For generic scopes (blocks) without a symbol, recurse into them
                symbols.push(...this.buildScopeSymbols(childScope, sourceUri));
            }
        }
        
        return symbols;
    }
}
