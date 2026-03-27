import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from './src/parser/mxsLexer.js';
import { mxsParser } from './src/parser/mxsParser.js';
import { SourceContext } from './src/backend/SourceContext.js';

const code = 'fn test = (\r\n    a = 1\r\n    b = 2\r\n)';

console.log('Input code:');
console.log(JSON.stringify(code));
console.log('Length:', code.length);
console.log('');

// Create context
const chars = CharStream.fromString(code);
const lexer = new mxsLexer(chars);
const stream = new CommonTokenStream(lexer);
const parser = new mxsParser(stream);
const tree = parser.program();
const ctx = new SourceContext(code, tree, stream, 'test.mxs');

// Format as full-doc range (simulating Format Selection with full-doc selected)
const result = ctx.formatCode({ start: 0, stop: code.length - 1 }, {
    condenseWhitespace: false,
    removeUnnecessaryScopes: false,
    expressionsToBlock: false,
});

console.log('Formatted code:');
console.log(JSON.stringify(result.code));
console.log('');
console.log('Output lines:', result.code.split(/\r?\n/).length);
console.log('Input lines:', code.split(/\r?\n/).length);
console.log('Has newlines:', result.code.includes('\n'));
