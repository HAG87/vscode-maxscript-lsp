import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '@parser/mxsLexer.js';
import { mxsSimpleFormatter } from '../simpleCodeFormatter.js';

console.log('=== Range Selection Newline Preservation Test ===\n');

const testCode = 'fn test = (\r\n    a = 1\r\n    b = 2\r\n)';

console.log('Input code:');
console.log(JSON.stringify(testCode));
console.log('Length:', testCode.length);
console.log('Lines:', testCode.split(/\r?\n/).length);
console.log('');

// Create lexer and token stream for formatting
const chars = CharStream.fromString(testCode);
const lexer = new mxsLexer(chars);
const stream = new CommonTokenStream(lexer);
stream.fill();

// Create formatter (what Range Selection uses after the fix)
const formatter = new mxsSimpleFormatter(stream);

// Format with full range (what Range Selection Provider sends)
const result = formatter.formatRange(0, testCode.length - 1);

console.log('Formatted code:');
console.log(JSON.stringify(result.code));
console.log('Lines:', result.code.split(/\r?\n/).length);
console.log('');

console.log('=== Analysis ===');
console.log('Input lines:', testCode.split(/\r?\n/).length);
console.log('Output lines:', result.code.split(/\r?\n/).length);
console.log('Newlines preserved:', result.code.includes('\n'));

// Key check: newlines should be present (might not be same count due to reformatting, but should have some)
if (result.code.includes('\n')) {
    console.log('✅ Format Selection preserves newlines (fix verified)');
} else {
    console.log('❌ Format Selection removed all newlines!');
}
