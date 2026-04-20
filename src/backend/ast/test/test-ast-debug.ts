/**
 * Debug AST structure
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '@parser/mxsLexer.js';
import { mxsParser } from '@parser/mxsParser.js';
import { ASTBuilder } from '../ASTBuilder.js';
import { SymbolResolver } from '../SymbolResolver.js';

const code = `
global myGlobal = 100

fn testFunc a b =
(
    local result = a + b
    result
)

local localVar = 42
`;

console.log('=== AST Debug ===');
console.log('Code:', code.trim());
console.log();

try {
    // Parse
    const inputStream = CharStream.fromString(code);
    const lexer = new mxsLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new mxsParser(tokenStream);
    
    // Build AST
    const builder = new ASTBuilder();
    const ast = builder.visitProgram(parser.program());
    const references = builder.getAllReferences();
    
    console.log('=== AST Structure ===');
    console.log('Program:');
    console.log(`  statements: ${ast.statements.length}`);
    console.log(`  declarations: ${ast.declarations.size}`);
    console.log();
    
    console.log('Declarations in program scope:');
    for (const [name, decl] of ast.declarations) {
        console.log(`  - ${name} (${decl.scope})`);
        console.log(`    position:`, decl.position);
    }
    console.log();
    
    console.log('Statements:');
    ast.statements.forEach((stmt, i) => {
        const typeName = stmt.constructor.name;
        console.log(`  [${i}] ${typeName}`);
        if (stmt.position) {
            console.log(`      position: line ${stmt.position.start.line}, col ${stmt.position.start.column}`);
        }
    });
    console.log();
    
    console.log('References collected:', references.length);
    references.forEach((ref, i) => {
        console.log(`  [${i}] ${ref.name}`);
        if (ref.position) {
            console.log(`      position: line ${ref.position.start.line}, col ${ref.position.start.column}`);
        }
    });
    
} catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
}
