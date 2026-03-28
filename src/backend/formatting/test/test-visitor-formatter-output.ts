import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../../parser/mxsLexer.js';
import { mxsParser } from '../../../parser/mxsParser.js';
import { codeBlock, mxsParserVisitorFormatter } from '../mxsParserVisitorFormatter.js';
import { ParseTree } from 'antlr4ng';
import { ICodeFormatSettings, IMinifySettings, IPrettifySettings } from '../../types.js';

console.log('=== Visitor Formatter Test ===\n');

const testCode = 'fn test = (\r\n    a = 1\r\n    b = 2\r\n)';

console.log('Input code:');
console.log(JSON.stringify(testCode));
console.log('Length:', testCode.length);
console.log('Lines:', testCode.split(/\r?\n/).length);
console.log('');

// Parse
const chars = CharStream.fromString(testCode);
const lexer = new mxsLexer(chars);
const stream = new CommonTokenStream(lexer);
stream.fill();
const parser = new mxsParser(stream);
const tree = parser.program();

// Use visitor formatter with full default options (what SourceContext passes for full-doc)
const visitorOptions: ICodeFormatSettings & IMinifySettings & IPrettifySettings = {
    whitespaceChar: ' ',
    newLineChar: '\r\n',
    indentChar: '\t',
    exprEndChar: '\r\n',
    lineContinuationChar: '\\',
    codeblock: {
        newlineAllways: false,
        parensInNewLine: false,
        spaced: false,
    },
    statements: {
        useLineBreaks: true,
        optionalWhitespace: false
    },
    list: {
        useLineBreaks: false
    },
    condenseWhitespace: false,
    removeUnnecessaryScopes: false,
    expressionsToBlock: true,
};

const visitor = new mxsParserVisitorFormatter(visitorOptions);
const formatted = visitor.visit(tree as ParseTree);

const code = formatted instanceof codeBlock ? formatted.toString(visitorOptions) : String(formatted);

console.log('Formatted code:');
console.log(JSON.stringify(code));
console.log('Lines:', code.split(/\r?\n/).length);
console.log('');

console.log('=== Analysis ===');
console.log('Input has newlines:', testCode.includes('\n'));
console.log('Output has newlines:', code.includes('\n'));
console.log('Lines match:', testCode.split(/\r?\n/).length === code.split(/\r?\n/).length);

if (!code.includes('\n')) {
    console.log('❌ ERROR: Newlines were removed!');
} else {
    console.log('✅ Newlines present');
}
