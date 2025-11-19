/**
 * Debug parse tree structure
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../parser/mxsLexer.js';
import { mxsParser } from '../../parser/mxsParser.js';
import { ParseTree } from 'antlr4ng';

const code = `
fn outerFunc x =
(
    local outerVar = x * 2
    
    fn innerFunc y =
    (
        local innerVar = y
        innerVar
    )
    
    innerFunc(outerVar)
)
`;

console.log('=== Parse Tree Debug ===');

try {
    const inputStream = CharStream.fromString(code);
    const lexer = new mxsLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new mxsParser(tokenStream);
    const tree = parser.program();
    
    function printTree(node: ParseTree, indent: string = '') {
        const ruleName = node.constructor.name.replace('Context', '');
        const text = node.getChildCount() === 0 ? ` "${node.getText()}"` : '';
        console.log(`${indent}${ruleName}${text}`);
        
        for (let i = 0; i < node.getChildCount(); i++) {
            const child = node.getChild(i);
            if (child) {
                printTree(child, indent + '  ');
            }
        }
    }
    
    printTree(tree);
    
} catch (error) {
    console.error('Error:', error);
}
