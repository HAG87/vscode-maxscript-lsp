/**
 * Simple test: Basic variable declaration and reference
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../parser/mxsLexer.js';
import { mxsParser } from '../../parser/mxsParser.js';
import { ASTBuilder } from './ASTBuilder.js';
import { SymbolResolver } from './SymbolResolver.js';

const code = `
local x = 5
y = x + 1
`;

console.log('=== Simple Variable Test ===');
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
    
    // Check results
    const xDecl = ast.declarations.get('x');
    if (xDecl) {
        console.log(`Declaration 'x':`);
        console.log(`  - Scope: ${xDecl.scope}`);
        console.log(`  - Position: line ${xDecl.position?.start.line}, col ${xDecl.position?.start.column}`);
        console.log(`  - References: ${xDecl.references.length}`);
        
        if (xDecl.references.length > 0) {
            xDecl.references.forEach((ref, i) => {
                const resolved = ref.declaration?.referred;
                console.log(`  - Ref ${i + 1}: line ${ref.position?.start.line}, resolved=${!!resolved}`);
            });
        }
    } else {
        console.log('❌ Declaration "x" not found!');
    }
    
    console.log();
    console.log('✅ Test passed!');
    
} catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
}
