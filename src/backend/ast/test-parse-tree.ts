/**
 * Debug parse tree structure
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../parser/mxsLexer.js';
import { mxsParser } from '../../parser/mxsParser.js';

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

console.log('=== Parse Tree Debug ===');
console.log('Code:', code.trim());
console.log();

try {
    const inputStream = CharStream.fromString(code);
    const lexer = new mxsLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new mxsParser(tokenStream);
    
    const tree = parser.program();
    
    // Print tree structure
    function printTree(node: any, indent: string = '', name: string = '') {
        const ruleName = node.constructor.name;
        const text = node.children?.length > 10 ? '' : ` "${node.getText().substring(0, 50).replace(/\n/g, '\\n')}"`;
        console.log(`${indent}${name}${ruleName}${text}`);
        
        if (node.children) {
            node.children.forEach((child: any, i: number) => {
                if (child.constructor.name.endsWith('Context')) {
                    printTree(child, indent + '  ', `[${i}] `);
                } else {
                    const tokenText = child.getText().replace(/\n/g, '\\n').substring(0, 30);
                    console.log(`${indent}  [${i}] Token: "${tokenText}"`);
                }
            });
        }
    }
    
    printTree(tree, '', 'Root: ');
    
} catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
}
