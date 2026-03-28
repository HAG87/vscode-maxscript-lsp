/**
 * Test: Chained assignment
 * Tests: var1 = var2 = var3 = var4
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../../parser/mxsLexer.js';
import { mxsParser } from '../../../parser/mxsParser.js';
import { ASTBuilder } from '../ASTBuilder.js';
import { AssignmentExpression, Expression, NumberLiteral, VariableReference } from '../ASTNodes.js';

function getTargetName(target?: Expression): string | undefined {
    return target instanceof VariableReference ? target.name : undefined;
}

const code = `var1 = var2 = var3 = 10`;

console.log('=== Chained Assignment Test ===');
console.log('Code:', code);
console.log();
console.log('Expected structure:');
console.log('  var1 = (var2 = (var3 = 10))');
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
    
    console.log('✓ AST built');
    console.log(`  - ${ast.statements.length} statements`);
    console.log();
    
    // Inspect the AST structure
    console.log('AST Structure:');
    
    if (ast.statements.length > 0) {
        const stmt = ast.statements[0];
        console.log('Statement[0]:', stmt.constructor.name);
        
        if (stmt instanceof AssignmentExpression) {
            console.log('  ├─ target:', getTargetName(stmt.target));
            console.log('  └─ value:', stmt.value?.constructor.name);
            
            if (stmt.value instanceof AssignmentExpression) {
                console.log('      ├─ target:', getTargetName(stmt.value.target));
                console.log('      └─ value:', stmt.value.value?.constructor.name);
                
                if (stmt.value.value instanceof AssignmentExpression) {
                    console.log('          ├─ target:', getTargetName(stmt.value.value.target));
                    console.log('          └─ value:', stmt.value.value.value?.constructor.name);
                    
                    if (stmt.value.value.value instanceof NumberLiteral) {
                        console.log('              └─ number:', (stmt.value.value.value as NumberLiteral).value);
                        console.log();
                        console.log('✅ Test passed! Chained assignment parsed correctly as right-associative:');
                        console.log('   var1 = (var2 = (var3 = 10))');
                    } else {
                        console.log();
                        console.log('❌ ISSUE: Innermost value is not NumberLiteral');
                        console.log('   Got:', stmt.value.value.value?.constructor.name);
                    }
                } else {
                    console.log();
                    console.log('❌ ISSUE: Second value is not an AssignmentExpression');
                    console.log('   Got:', stmt.value.value?.constructor.name);
                    console.log('   This suggests only 2 levels were parsed, not 3');
                }
            } else {
                console.log();
                console.log('❌ ISSUE: First value is not an AssignmentExpression');
                console.log('   Got:', stmt.value?.constructor.name);
                console.log('   This suggests chained assignment is not working at all');
            }
        } else {
            console.log('❌ ISSUE: Statement is not an AssignmentExpression');
            console.log('   Got:', stmt.constructor.name);
        }
    } else {
        console.log('❌ ISSUE: No statements in AST');
    }
    
} catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
}
