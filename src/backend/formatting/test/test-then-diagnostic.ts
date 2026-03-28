import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../../parser/mxsLexer.js';
import { mxsParser } from '../../../parser/mxsParser.js';
import { codeBlock, mxsParserVisitorFormatter } from '../mxsParserVisitorFormatter.js';
import { ParseTree } from 'antlr4ng';
import { ICodeFormatSettings, IMinifySettings, IPrettifySettings } from '../../types.js';

console.log('=== Diagnostic: THEN followed by ID spacing ===\n');

const testCode = 'if objs.count == 0 then objs = 1';

console.log('Input code:');
console.log(testCode);
console.log('');

// Parse
const chars = CharStream.fromString(testCode);
const lexer = new mxsLexer(chars);
const stream = new CommonTokenStream(lexer);
stream.fill();
const parser = new mxsParser(stream);
const tree = parser.program();

// Prettify settings (where the issue occurs)
const prettifySettings: ICodeFormatSettings & IMinifySettings & IPrettifySettings = {
    whitespaceChar: ' ',
    newLineChar: '\r\n',
    indentChar: '\t',
    exprEndChar: '\r\n',
    lineContinuationChar: '\\',
    codeblock: { newlineAllways: true, parensInNewLine: true, spaced: true },
    statements: { useLineBreaks: false, optionalWhitespace: false },
    list: { useLineBreaks: false },
    removeUnnecessaryScopes: false,
    condenseWhitespace: false,
    expressionsToBlock: true,
};

const visitor = new mxsParserVisitorFormatter(prettifySettings);
const result = visitor.visit(tree as ParseTree);
const formatted = result instanceof codeBlock ? result.toString(prettifySettings) : String(result);

console.log('Formatted output:');
console.log(formatted);
console.log('');
console.log('Formatted (JSON):');
console.log(JSON.stringify(formatted));
console.log('');

// Check for the problem
if (formatted.includes('thenobjs')) {
    console.log('❌ PROBLEM: "then" and "objs" are merged into "thenobjs"');
} else if (formatted.includes('then ') && formatted.includes('objs')) {
    console.log('✅ OK: "then" and "objs" are properly separated');
} else if (formatted.includes('then\r\n') && formatted.includes('objs')) {
    console.log('✅ OK: "then" is followed by newline then "objs"');
} else {
    console.log('⚠️  UNKNOWN: Check formatted output');
}
