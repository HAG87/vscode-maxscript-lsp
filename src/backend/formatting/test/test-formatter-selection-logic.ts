import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../../parser/mxsLexer.js';
import { mxsParser } from '../../../parser/mxsParser.js';

console.log('=== Formatter Selection Logic Test ===\n');

const testCode = 'fn test = (\r\n    a = 1\r\n    b = 2\r\n)';

console.log('Input code:');
console.log(JSON.stringify(testCode));
console.log('Length:', testCode.length);
console.log('');

// Parse to get tree
const chars = CharStream.fromString(testCode);
const lexer = new mxsLexer(chars);
const stream = new CommonTokenStream(lexer);
stream.fill();
const parser = new mxsParser(stream);
const tree = parser.program();

// Calculate what SourceContext would calculate
const sourceText = testCode;
const sourceSize = stream.getTokens()[0]?.inputStream?.size ?? 0;
const sourceLines = sourceText.split(/\r?\n/);
const sourceEndRow = sourceLines.length;
const sourceEndColumn = sourceLines[sourceLines.length - 1]?.length ?? 0;
const sourceEndOffset = Math.max(0, sourceText.length - 1);

console.log('SourceContext derived values:');
console.log('  sourceSize:', sourceSize);
console.log('  sourceEndOffset:', sourceEndOffset);
console.log('  sourceEndRow:', sourceEndRow);
console.log('  sourceEndColumn:', sourceEndColumn);
console.log('');

// Test the canUseVisitorFormatter logic with int-offset range
const range1 = { start: 0, stop: sourceEndOffset };
const wouldUseVisitor1 = range1.start <= 0 && range1.stop >= sourceEndOffset;
console.log(`Range ${JSON.stringify(range1)}:`);
console.log('  Would use visitor formatter:', wouldUseVisitor1);
console.log('');

// Test with slightly shorter range
const range2 = { start: 0, stop: sourceEndOffset - 1 };
const wouldUseVisitor2 = range2.start <= 0 && range2.stop >= sourceEndOffset;
console.log(`Range ${JSON.stringify(range2)}:`);
console.log('  Would use visitor formatter:', wouldUseVisitor2);
console.log('');

// What does Range Provider send?
// document.offsetAt(range.end) - 1 where range.end is position at end
console.log('What Range Provider would send:');
console.log('  Full doc range start:', 0);
console.log('  Full doc range stop (length-1):', testCode.length - 1);
console.log('  Would use visitor formatter:', true && (0 <= 0 && (testCode.length - 1) >= sourceEndOffset));
