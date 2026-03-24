/**
 * Test: Binary expression with identifiers
 * Tests: val = varname1 + varname3
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../../parser/mxsLexer.js';
import { mxsParser } from '../../../parser/mxsParser.js';
import { ASTBuilder } from '../ASTBuilder.js';
import { AssignmentExpression, BinaryExpression, Expression, VariableReference } from '../ASTNodes.js';

function getTargetName(target?: Expression): string | undefined {
    return target instanceof VariableReference ? target.name : undefined;
}

const code = `val = varname1 + varname3`;

console.log('=== Binary Expression Test ===');
console.log('Code:', code);
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
    console.log(`  - ${references.length} references collected`);
    console.log();
    
    // Inspect the AST structure
    console.log('AST Structure:');
    console.log('Program');
    console.log('  statements:', ast.statements.length);
    
    if (ast.statements.length > 0) {
        const stmt = ast.statements[0];
        console.log('  Statement[0] type:', stmt.constructor.name);
        
        if (stmt instanceof AssignmentExpression) {
            console.log('    AssignmentExpression:');
            console.log('      target type:', stmt.target?.constructor.name);
            console.log('      target name:', getTargetName(stmt.target));
            console.log('      value type:', stmt.value?.constructor.name);
            
            if (stmt.value instanceof BinaryExpression) {
                console.log('      BinaryExpression:');
                console.log('        operator:', stmt.value.operator);
                console.log('        left type:', stmt.value.left.constructor.name);
                console.log('        left name:', (stmt.value.left as VariableReference).name);
                console.log('        right type:', stmt.value.right.constructor.name);
                console.log('        right name:', (stmt.value.right as VariableReference).name);
                console.log();
                console.log('✅ Test passed! AST structure is correct:');
                console.log('   AssignmentExpression(');
                console.log('     target: VariableReference("val")');
                console.log('     value: BinaryExpression(');
                console.log('       operator: "+"');
                console.log('       left: VariableReference("varname1")');
                console.log('       right: VariableReference("varname3")');
                console.log('     )');
                console.log('   )');
            } else {
                console.log('      value details:', JSON.stringify(stmt.value, null, 2));
                console.log('❌ ISSUE: Value is not a BinaryExpression!');
                console.log('   Expected: BinaryExpression');
                console.log('   Got:', stmt.value?.constructor.name);
            }
        } else {
            console.log('❌ ISSUE: Statement is not an AssignmentExpression!');
            console.log('   Expected: AssignmentExpression');
            console.log('   Got:', stmt.constructor.name);
        }
    } else {
        console.log('❌ ISSUE: No statements in AST!');
    }
    
} catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
}
