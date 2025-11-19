/**
 * Debug nested function structure
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../parser/mxsLexer.js';
import { mxsParser } from '../../parser/mxsParser.js';
import { ASTBuilder } from './ASTBuilder.js';
import { FunctionDefinition } from './ASTNodes.js';

const code = `
fn outerFunc x =
(
    local outerVar = x * 2
    
    fn innerFunc y =
    (
        local innerVar = y + outerVar
        innerVar
    )
    
    innerFunc(outerVar)
)
`;

console.log('=== Nested Function Debug ===');

try {
    const inputStream = CharStream.fromString(code);
    const lexer = new mxsLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new mxsParser(tokenStream);
    
    const builder = new ASTBuilder();
    const ast = builder.visitProgram(parser.program());
    
    console.log('Statements:', ast.statements.length);
    
    const outerFunc = ast.statements[0] as FunctionDefinition;
    console.log('\\nOuter function:', outerFunc.name);
    console.log('Parameters:', outerFunc.parameters.map(p => p.name));
    console.log('Body:', outerFunc.body);
    console.log('Body expressions:', outerFunc.body?.expressions.length);
    
    if (outerFunc.body) {
        console.log('\\nBody expressions:');
        outerFunc.body.expressions.forEach((expr, i) => {
            const typeName = expr.constructor.name;
            console.log(`  [${i}] ${typeName}`);
            if (expr instanceof FunctionDefinition) {
                console.log(`      -> Function: ${expr.name}`);
            }
        });
        
        console.log('\\nBody declarations:', outerFunc.body.declarations.size);
        for (const [name, decl] of outerFunc.body.declarations) {
            console.log(`  - ${name} (${decl.scope})`);
        }
        
        console.log('\\nBody child scopes:', outerFunc.body.getChildScopes().length);
        outerFunc.body.getChildScopes().forEach((scope, i) => {
            const typeName = scope.constructor.name;
            console.log(`  [${i}] ${typeName}`);
            if (scope instanceof FunctionDefinition) {
                console.log(`      -> Name: ${scope.name}`);
            }
        });
    }
    
    console.log('\\nFunction declarations:', outerFunc.declarations.size);
    for (const [name, decl] of outerFunc.declarations) {
        console.log(`  - ${name} (${decl.scope})`);
    }
    
    console.log('\\nFunction child scopes:', outerFunc.getChildScopes().length);
    outerFunc.getChildScopes().forEach((scope, i) => {
        console.log(`  [${i}] ${scope.constructor.name}`);
    });
    
} catch (error) {
    console.error('Error:', error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
}
