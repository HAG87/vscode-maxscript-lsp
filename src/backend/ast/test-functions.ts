/**
 * Function scope test: Local variables in functions
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../parser/mxsLexer.js';
import { mxsParser } from '../../parser/mxsParser.js';
import { ASTQuery } from './ASTQuery.js';
import { ASTBuilder } from './ASTBuilder.js';
import { SymbolResolver } from './SymbolResolver.js';
import { VariableReference } from './ASTNodes.js';

const code = `
fn myFunc x = (
    local y = x * 2
    z = y + 1
    return z
)

local a = 10
b = myFunc a
`;

console.log('=== Function Scope Test ===');
console.log('Code:', code.trim());
console.log();

try {
    // Parse
    const inputStream = CharStream.fromString(code);
    const lexer = new mxsLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new mxsParser(tokenStream);
    
    console.log('✓ Parsing complete');
    
    // Build AST
    const builder = new ASTBuilder();
    const ast = builder.visitProgram(parser.program());
    const references = builder.getAllReferences();
    
    console.log('✓ AST built');
    console.log(`  - ${ast.statements.length} statements`);
    console.log(`  - ${ast.declarations.size} declarations in program scope`);
    console.log(`  - ${references.length} references collected`);
    
    // Resolve symbols
    const resolver = new SymbolResolver(ast, references);
    resolver.resolve();
    
    console.log('✓ Symbols resolved');
    console.log();
    
    // Check function
    const funcDecl = ast.declarations.get('myFunc');
    if (funcDecl) {
        console.log(`Function 'myFunc':`);
        console.log(`  - Found: ${funcDecl.name}`);
        console.log(`  - References: ${funcDecl.references.length}`);
    }
    
    // Check local in program scope
    const aDecl = ast.declarations.get('a');
    if (aDecl) {
        console.log(`Variable 'a':`);
        console.log(`  - Scope: ${aDecl.scope}`);
        console.log(`  - References: ${aDecl.references.length}`);
    }
    
    // Check implicit global
    const bRefs: VariableReference[] = [];
    for (const node of ast.walkDescendants()) {
        if (node instanceof VariableReference && node.name === 'b') {
            bRefs.push(node);
        }
    }
    console.log(`Implicit global 'b':`);
    console.log(`  - References: ${bRefs.length}`);
    console.log(`  - Resolved: ${bRefs.some(r => r.declaration?.referred)}`);

    const fnDeclAtName = ASTQuery.findDeclarationAtPosition(ast, 2, 3);
    console.log(`Declaration at function name:`);
    console.log(`  - Resolved: ${fnDeclAtName?.name}`);

    const fnDeclAtReference = ASTQuery.findDeclarationAtPosition(ast, 9, 4);
    console.log(`Declaration at function call:`);
    console.log(`  - Resolved: ${fnDeclAtReference?.name}`);

    const argDeclAtName = ASTQuery.findDeclarationAtPosition(ast, 2, 10);
    console.log(`Declaration at function argument:`);
    console.log(`  - Resolved: ${argDeclAtName?.name}`);

    if (fnDeclAtName?.name !== 'myFunc' || fnDeclAtReference?.name !== 'myFunc' || argDeclAtName?.name !== 'x') {
        throw new Error('ASTQuery declaration lookup failed for declaration-like nodes');
    }
    
    console.log();
    console.log('✅ Test passed!');
    
} catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
}
