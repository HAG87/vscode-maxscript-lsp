import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../../parser/mxsLexer.js';
import { mxsParser } from '../../../parser/mxsParser.js';
import { mxsSimpleFormatter } from '../simpleCodeFormatter.js';

// Test the simpleCodeFormatter directly with full-range formatting
console.log('=== Simple Formatter Full-Range Test ===\n');

const testCode = 'fn test = (\r\n    a = 1\r\n    b = 2\r\n)';

console.log('Input code:');
console.log(JSON.stringify(testCode));
console.log('Length:', testCode.length);
console.log('Lines:', testCode.split(/\r?\n/).length);
console.log('');

// Create lexer and token stream
const chars = CharStream.fromString(testCode);
const lexer = new mxsLexer(chars);
const stream = new CommonTokenStream(lexer);
stream.fill();

// Create formatter
const formatter = new mxsSimpleFormatter(stream);

// Format the full range: character offsets 0 to (length-1)
const result = formatter.formatRange(0, testCode.length - 1);

console.log('Formatted code:');
console.log(JSON.stringify(result.code));
console.log('Lines:', result.code.split(/\r?\n/).length);
console.log('');

// Check if newlines are preserved
console.log('=== Analysis ===');
console.log('Input has newlines:', testCode.includes('\n'));
console.log('Output has newlines:', result.code.includes('\n'));
console.log('Newlines preserved:', testCode.split(/\r?\n/).length === result.code.split(/\r?\n/).length);

if (!result.code.includes('\n')) {
    console.log('❌ ERROR: Newlines were removed!');
    console.log('Input:', JSON.stringify(testCode));
    console.log('Output:', JSON.stringify(result.code));
} else {
    console.log('✅ Newlines preserved');
}
