/**
 * Test for reference (&) and dereference (*) operators
 * 
 * Tests:
 * 1. Simple reference: &variable
 * 2. Reference with accessor: &obj.prop
 * 3. Simple dereference: *ref
 * 4. Dereference with accessor: *ref.prop
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../parser/mxsLexer.js';
import { mxsParser } from '../../parser/mxsParser.js';
import { ASTBuilder } from './ASTBuilder.js';
import {
    Program,
    AssignmentExpression,
    ReferenceExpression,
    DereferenceExpression,
    VariableReference,
    MemberExpression,
} from './ASTNodes.js';

function parseCode(code: string): Program {
    const inputStream = CharStream.fromString(code);
    const lexer = new mxsLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new mxsParser(tokenStream);
    const tree = parser.program();
    
    const builder = new ASTBuilder();
    return builder.visit(tree) as Program;
}

function printAST(node: any, indent = 0): void {
    const prefix = '  '.repeat(indent);
    const nodeType = node.constructor.name;
    
    if (node instanceof ReferenceExpression) {
        console.log(`${prefix}ReferenceExpression (&)`);
        console.log(`${prefix}├─ operand:`);
        printAST(node.operand, indent + 1);
    } else if (node instanceof DereferenceExpression) {
        console.log(`${prefix}DereferenceExpression (*)`);
        console.log(`${prefix}├─ operand:`);
        printAST(node.operand, indent + 1);
    } else if (node instanceof AssignmentExpression) {
        console.log(`${prefix}AssignmentExpression`);
        console.log(`${prefix}├─ target: ${node.target?.name}`);
        console.log(`${prefix}└─ value:`);
        printAST(node.value, indent + 1);
    } else if (node instanceof MemberExpression) {
        console.log(`${prefix}MemberExpression`);
        console.log(`${prefix}├─ object:`);
        printAST(node.object, indent + 1);
        console.log(`${prefix}└─ property: ${node.property}`);
    } else if (node instanceof VariableReference) {
        console.log(`${prefix}VariableReference: ${node.name}`);
    } else {
        console.log(`${prefix}${nodeType}`);
    }
}

// Test 1: Simple reference - &variable
console.log('Test 1: Simple reference - ref = &variable');
console.log('Code: ref = &variable');
const ast1 = parseCode('ref = &variable');
if (ast1.statements.length > 0) {
    printAST(ast1.statements[0]);
    const stmt = ast1.statements[0] as AssignmentExpression;
    if (stmt.value instanceof ReferenceExpression) {
        console.log('✅ Test 1 passed! Simple reference works\n');
    } else {
        console.log('❌ Test 1 failed! Expected ReferenceExpression\n');
    }
} else {
    console.log('❌ Test 1 failed! No statements parsed\n');
}

// Test 2: Reference with accessor - &obj.prop
console.log('Test 2: Reference with accessor - ref = &obj.prop');
console.log('Code: ref = &obj.prop');
const ast2 = parseCode('ref = &obj.prop');
if (ast2.statements.length > 0) {
    printAST(ast2.statements[0]);
    const stmt = ast2.statements[0] as AssignmentExpression;
    if (stmt.value instanceof ReferenceExpression &&
        stmt.value.operand instanceof MemberExpression) {
        console.log('✅ Test 2 passed! Reference with accessor works\n');
    } else {
        console.log('❌ Test 2 failed! Expected ReferenceExpression(MemberExpression)\n');
    }
} else {
    console.log('❌ Test 2 failed! No statements parsed\n');
}

// Test 3: Simple dereference - *ref
console.log('Test 3: Simple dereference - val = *ref');
console.log('Code: val = *ref');
const ast3 = parseCode('val = *ref');
if (ast3.statements.length > 0) {
    printAST(ast3.statements[0]);
    const stmt = ast3.statements[0] as AssignmentExpression;
    if (stmt.value instanceof DereferenceExpression) {
        console.log('✅ Test 3 passed! Simple dereference works\n');
    } else {
        console.log('❌ Test 3 failed! Expected DereferenceExpression\n');
    }
} else {
    console.log('❌ Test 3 failed! No statements parsed\n');
}

// Test 4: Dereference with accessor - *ref.prop
console.log('Test 4: Dereference with accessor - val = *ref.prop');
console.log('Code: val = *ref.prop');
const ast4 = parseCode('val = *ref.prop');
if (ast4.statements.length > 0) {
    printAST(ast4.statements[0]);
    const stmt = ast4.statements[0] as AssignmentExpression;
    if (stmt.value instanceof DereferenceExpression &&
        stmt.value.operand instanceof MemberExpression) {
        console.log('✅ Test 4 passed! Dereference with accessor works\n');
    } else {
        console.log('❌ Test 4 failed! Expected DereferenceExpression(MemberExpression)\n');
    }
} else {
    console.log('❌ Test 4 failed! No statements parsed\n');
}

console.log('All tests completed!');
