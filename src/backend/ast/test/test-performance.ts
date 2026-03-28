/**
 * Performance benchmark: Symbol resolution speed
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../../parser/mxsLexer.js';
import { mxsParser } from '../../../parser/mxsParser.js';
import { ASTBuilder } from '../ASTBuilder.js';
import { SymbolResolver } from '../SymbolResolver.js';
import { VariableReference } from '../ASTNodes.js';

// Generate code with many variables
function generateCode(numVars: number): string {
    let code = '';
    
    // Declare variables
    for (let i = 0; i < numVars; i++) {
        code += `local var${i} = ${i}\n`;
    }
    
    // Reference variables
    for (let i = 0; i < numVars; i++) {
        const target = Math.floor(Math.random() * numVars);
        code += `x${i} = var${target} + ${i}\n`;
    }
    
    return code;
}

const sizes = [10, 50, 100, 500];

console.log('=== Performance Benchmark ===');
console.log();

for (const size of sizes) {
    const code = generateCode(size);
    
    console.log(`Testing with ${size} variables...`);
    
    try {
        // Parsing
        const parseStart = performance.now();
        const inputStream = CharStream.fromString(code);
        const lexer = new mxsLexer(inputStream);
        const tokenStream = new CommonTokenStream(lexer);
        const parser = new mxsParser(tokenStream);
        const tree = parser.program();
        const parseTime = performance.now() - parseStart;
        
        // AST Building
        const buildStart = performance.now();
        const builder = new ASTBuilder();
        const ast = builder.visitProgram(tree);
        const allRefsFromBuilder = builder.getAllReferences();
        const buildTime = performance.now() - buildStart;
        
        // Symbol Resolution
        const resolveStart = performance.now();
        const resolver = new SymbolResolver(ast, allRefsFromBuilder);
        resolver.resolve();
        const resolveTime = performance.now() - resolveStart;
        
        // Stats
        const declarations = ast.declarations.size;
        
        // Collect references by walking the tree
        const allReferences: VariableReference[] = [];
        for (const node of ast.walkDescendants()) {
            if (node instanceof VariableReference) {
                allReferences.push(node);
            }
        }
        
        const referenceCount = allReferences.length;
        const resolved = allReferences.filter(r => r.declaration?.referred).length;
        
        console.log(`  ✓ Parse:   ${parseTime.toFixed(2)}ms`);
        console.log(`  ✓ Build:   ${buildTime.toFixed(2)}ms`);
        console.log(`  ✓ Resolve: ${resolveTime.toFixed(2)}ms`);
        console.log(`  ✓ Total:   ${(parseTime + buildTime + resolveTime).toFixed(2)}ms`);
        console.log(`  - Declarations: ${declarations}`);
        console.log(`  - References: ${referenceCount}`);
        console.log(`  - Resolved: ${resolved} (${((resolved/referenceCount)*100).toFixed(1)}%)`);
        console.log();
        
    } catch (error) {
        console.error(`  ❌ Failed:`, error);
        if (error instanceof Error) {
            console.error(error.stack);
        }
    }
}

console.log('✅ Benchmark complete!');
