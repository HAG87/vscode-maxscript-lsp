/**
 * Test: Control flow AST nodes
 * Ensures control-flow parser rules are converted into dedicated AST nodes.
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../parser/mxsLexer.js';
import { mxsParser } from '../../parser/mxsParser.js';
import { ASTBuilder } from './ASTBuilder.js';
import {
    CaseStatement,
    DoWhileStatement,
    ExitStatement,
    ForStatement,
    IfStatement,
    ReturnStatement,
    TryStatement,
    WhileStatement,
} from './ASTNodes.js';

const code = `
if a > 0 then b = 1 else b = 2
while i < 10 do i = i + 1
do i = i - 1 while i > 0
for k = 1 to 10 by 2 where k > 2 do sum = sum + k
try x = 1 catch x = 2
case x of (
    1: y = 10
    2: y = 20
)
return y
exit with y
`;

console.log('=== Control Flow Test ===');
console.log('Code:');
console.log(code.trim());
console.log();

try {
    const inputStream = CharStream.fromString(code);
    const lexer = new mxsLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new mxsParser(tokenStream);

    const builder = new ASTBuilder();
    const ast = builder.visitProgram(parser.program());

    console.log(`✓ AST built: ${ast.statements.length} statements`);

    const hasIf = ast.statements.some(s => s instanceof IfStatement);
    const hasWhile = ast.statements.some(s => s instanceof WhileStatement);
    const hasDoWhile = ast.statements.some(s => s instanceof DoWhileStatement);
    const hasFor = ast.statements.some(s => s instanceof ForStatement);
    const hasTry = ast.statements.some(s => s instanceof TryStatement);
    const hasCase = ast.statements.some(s => s instanceof CaseStatement);
    const hasReturn = ast.statements.some(s => s instanceof ReturnStatement);
    const hasExit = ast.statements.some(s => s instanceof ExitStatement);

    console.log(`  - IfStatement: ${hasIf}`);
    console.log(`  - WhileStatement: ${hasWhile}`);
    console.log(`  - DoWhileStatement: ${hasDoWhile}`);
    console.log(`  - ForStatement: ${hasFor}`);
    console.log(`  - TryStatement: ${hasTry}`);
    console.log(`  - CaseStatement: ${hasCase}`);
    console.log(`  - ReturnStatement: ${hasReturn}`);
    console.log(`  - ExitStatement: ${hasExit}`);

    if (hasIf && hasWhile && hasDoWhile && hasFor && hasTry && hasCase && hasReturn && hasExit) {
        console.log();
        console.log('✅ Control flow AST node construction works');
    } else {
        console.log();
        console.log('❌ Missing one or more control flow AST node types');
        process.exitCode = 1;
    }
} catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
    process.exitCode = 1;
}
