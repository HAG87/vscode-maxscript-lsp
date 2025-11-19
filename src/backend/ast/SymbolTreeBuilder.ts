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
 * STRUCTURE:
 * The builder creates a tree where:
 * - Functions contain: parameters, local variables, nested functions
 * - Structs contain: member fields, methods
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

import { ISymbolInfo, SymbolKind, IDefinition, ILexicalRange } from '../../types.js';
import {
    Program,
    ScopeNode,
    VariableDeclaration,
    FunctionDefinition,
    StructDefinition,
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
            
            if (!isFunctionDecl && !isStructDecl) {
                const symbol = this.buildVariableSymbol(decl, sourceUri);
                if (symbol) {
                    symbols.push(symbol);
                }
            }
        }
        
        // Then, process all statements (functions, structs, etc.)
        for (const stmt of program.statements) {
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
        if (node instanceof VariableDeclaration) {
            return this.buildVariableSymbol(node, sourceUri);
        }
        // Add more node types here as needed
        
        return null; // Unknown node type, skip
    }
    
    /**
     * Build symbol info for a function with its parameters and local variables as children
     */
    private static buildFunctionSymbol(func: FunctionDefinition, sourceUri: string): ISymbolInfo {
        const children: ISymbolInfo[] = [];
        
        // Add parameters as children
        for (const param of func.parameters) {
            children.push(this.buildVariableSymbol(param, sourceUri, SymbolKind.Parameter));
        }
        
        // Add local variables declared in function body scope
        if (func.body) {
            for (const decl of func.body.getDeclarations()) {
                // Skip if it's a function (will be added as nested function below)
                const isFunc = func.body.expressions.some(
                    expr => expr instanceof FunctionDefinition && expr.name === decl.name
                );
                if (!isFunc) {
                    children.push(this.buildVariableSymbol(decl, sourceUri));
                }
            }
        }
        
        // Add nested functions and structures from child scopes
        // func.getChildScopes() returns [body] where body is BlockExpression
        // BlockExpression.getChildScopes() returns nested functions/blocks
        for (const childScope of func.getChildScopes()) {
            // Recursively collect symbols from nested scopes
            for (const nestedScope of childScope.getChildScopes()) {
                const symbol = this.buildSymbolForNode(nestedScope, sourceUri);
                if (symbol) {
                    children.push(symbol);
                }
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
        
        // Add struct members (fields)
        for (const member of struct.members) {
            children.push(this.buildVariableSymbol(member, sourceUri, SymbolKind.Field));
        }
        
        // Add struct methods
        for (const method of struct.methods) {
            children.push(this.buildFunctionSymbol(method, sourceUri));
        }
        
        return {
            name: struct.name || '<anonymous>',
            kind: SymbolKind.Struct,
            source: sourceUri,
            definition: this.positionToDefinition(struct),
            children: children.length > 0 ? children : undefined,
        };
    }
    
    /**
     * Build symbol info for a variable declaration
     */
    private static buildVariableSymbol(
        decl: VariableDeclaration, 
        sourceUri: string,
        kind?: SymbolKind
    ): ISymbolInfo {
        // Determine symbol kind based on scope type
        let symbolKind = kind;
        if (!symbolKind) {
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
        
        return {
            name: decl.name || '<unnamed>',
            kind: symbolKind,
            source: sourceUri,
            definition: this.positionToDefinition(decl),
            description: decl.scope !== 'local' ? decl.scope : undefined,
        };
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
