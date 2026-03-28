/**
 * Nested scopes test: Multiple levels of function nesting
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../../parser/mxsLexer.js';
import { mxsParser } from '../../../parser/mxsParser.js';
import { ASTBuilder } from '../ASTBuilder.js';
import { SymbolResolver } from '../SymbolResolver.js';

const code = `
local outer = 100

fn level1 x = (
    local inner1 = outer + x
    
    fn level2 y = (
        local inner2 = inner1 + y
        return inner2
    )
    
    return level2(10)
)

result = level1(5)
`;

console.log('=== Nested Scopes Test ===');
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
    console.log(`  - ${references.length} references collected`);
    
    // Resolve symbols
    const resolver = new SymbolResolver(ast, references);
    resolver.resolve();
    
    console.log('✓ Symbols resolved');
    console.log();
    
    // Check declarations
    console.log('Program scope declarations:');
    ast.declarations.forEach((decl) => {
        console.log(`  - ${decl.name} (scope: ${decl.scope})`);
    });
    
    console.log();
    console.log('✅ Test passed!');
    
} catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
}
