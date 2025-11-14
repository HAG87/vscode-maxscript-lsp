/**
 * POC Test: Variable declaration and reference resolution
 * Tests the Tylasu AST approach with simple MaxScript code
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../parser/mxsLexer.js';
import { mxsParser } from '../../parser/mxsParser.js';
import { ASTBuilder } from './ASTBuilder.js';
import { Program, VariableDeclaration, VariableReference } from './ASTNodes.js';
import { SymbolResolver } from './SymbolResolver.js';

/**
 * Parse MaxScript code and build AST
 */
function parseToAST(code: string): Program {
    // Lex and parse
    const inputStream = CharStream.fromString(code);
    const lexer = new mxsLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new mxsParser(tokenStream);
    
    // Build AST
    const builder = new ASTBuilder();
    const program = builder.visitProgram(parser.program());
    
    // Resolve symbols
    const resolver = new SymbolResolver(program);
    resolver.resolve();
    
    return program;
}

/**
 * Find all references to a declaration
 * O(1) lookup using direct reference array
 */
function findReferences(declaration: VariableDeclaration): VariableReference[] {
    return declaration.references;
}

/**
 * Find declaration for a reference
 * O(1) lookup using direct link
 */
function findDeclaration(reference: VariableReference): VariableDeclaration | undefined {
    return reference.declaration?.referred;
}

/**
 * Test 1: Simple local variable
 */
function test1() {
    console.log('=== Test 1: Simple local variable ===');
    const code = 'local x = 5\ny = x + 1';
    const ast = parseToAST(code);
    
    // Find declarations
    const xDecl = ast.declarations.get('x');
    console.log(`Declaration 'x': ${xDecl?.name} (${xDecl?.scope})`);
    console.log(`References to 'x': ${xDecl?.references.length}`);
    
    // Find references
    const refs = findReferences(xDecl!);
    refs.forEach((ref, i) => {
        console.log(`  Reference ${i + 1}: line ${ref.position?.start.line}, resolved: ${ref.declaration?.referred?.name}`);
    });
}

/**
 * Test 2: Function scope
 */
function test2() {
    console.log('\n=== Test 2: Function scope ===');
    const code = `fn myFunc x = (
    local y = x * 2
    y
)`;
    const ast = parseToAST(code);
    
    // Find function
    const fnDecl = ast.declarations.get('myFunc');
    console.log(`Function: ${fnDecl?.name}`);
    
    // Check parameter resolution
    console.log('(Parameter resolution test - requires function scope traversal)');
}

/**
 * Test 3: Unresolved reference (implicit global)
 */
function test3() {
    console.log('\n=== Test 3: Unresolved reference (implicit global) ===');
    const code = 'z = undeclaredVar + 10';
    const ast = parseToAST(code);
    
    console.log('(Unresolved reference test - demonstrates MaxScript implicit globals)');
}

/**
 * Benchmark: O(1) vs O(n²) lookup
 */
function benchmark() {
    console.log('\n=== Benchmark: AST O(1) lookup ===');
    const code = 'local x = 1\n'.repeat(100) + 'y = x';
    
    const start = performance.now();
    const ast = parseToAST(code);
    const buildTime = performance.now() - start;
    
    // Find last reference
    const startLookup = performance.now();
    const xDecl = ast.declarations.get('x');
    const refs = findReferences(xDecl!);
    const lookupTime = performance.now() - startLookup;
    
    console.log(`Build time: ${buildTime.toFixed(2)}ms`);
    console.log(`Lookup time: ${lookupTime.toFixed(4)}ms (O(1) - ${refs.length} references)`);
    console.log('Compare to O(n²) antlr4-c3 approach which would traverse entire tree');
}

// Run tests
export function runPOC() {
    console.log('🚀 Tylasu AST POC - Variable Resolution\n');
    
    test1();
    test2();
    test3();
    benchmark();
    
    console.log('\n✅ POC Complete');
}
