import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '@parser/mxsLexer.js';
import { mxsParser } from '@parser/mxsParser.js';
import { codeBlock, mxsParserVisitorFormatter } from '../mxsParserVisitorFormatter.js';
import { ParseTree } from 'antlr4ng';
import { ICodeFormatSettings, IMinifySettings, IPrettifySettings } from '@backend/types.js';

console.log('=== Keyword-to-ID Spacing Test ===\n');

const testCode = 'if objs.count == 0 then objs = #()\r\nelse objs = #()';

console.log('Input code:');
console.log(JSON.stringify(testCode));
console.log('');

// Parse
const chars = CharStream.fromString(testCode);
const lexer = new mxsLexer(chars);
const stream = new CommonTokenStream(lexer);
stream.fill();
const parser = new mxsParser(stream);
const tree = parser.program();

// Test with minifier settings (condenseWhitespace: true)
const minifySettings: ICodeFormatSettings & IMinifySettings & IPrettifySettings = {
    whitespaceChar: ' ',
    newLineChar: ';',
    indentChar: '',
    exprEndChar: ';',
    lineContinuationChar: '',
    statements: { useLineBreaks: true, optionalWhitespace: false },
    codeblock: { parensInNewLine: false, newlineAllways: false, spaced: false },
    list: { useLineBreaks: false },
    condenseWhitespace: true,
    removeUnnecessaryScopes: true,
    expressionsToBlock: false,
};

const minifyVisitor = new mxsParserVisitorFormatter(minifySettings);
const minifyFormatted = minifyVisitor.visit(tree as ParseTree);
const minifyCode = minifyFormatted instanceof codeBlock ? minifyFormatted.toString(minifySettings) : String(minifyFormatted);

console.log('Minified output:');
console.log(JSON.stringify(minifyCode));
console.log('');

// Test with prettifier settings (condenseWhitespace: false)
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

const prettifyVisitor = new mxsParserVisitorFormatter(prettifySettings);
const prettifyFormatted = prettifyVisitor.visit(tree as ParseTree);
const prettifyCode = prettifyFormatted instanceof codeBlock ? prettifyFormatted.toString(prettifySettings) : String(prettifyFormatted);

console.log('Prettified output:');
console.log(JSON.stringify(prettifyCode));
console.log('');

// Check for the issue: "then objs" should not become "thenobjs"
console.log('=== Analysis ===');

// Check minified 
const hasThenObjsMinify = minifyCode.includes('thenobjs');
const hasThenSpaceObjsMinify = minifyCode.includes('then objs') || minifyCode.includes('then ;objs');

console.log('Minified - contains "thenobjs":', hasThenObjsMinify);
console.log('Minified - contains proper spacing after "then":', hasThenSpaceObjsMinify);

// Check prettified
const hasThenObjsPrettify = prettifyCode.includes('thenobjs');
const hasThenSpaceObjsPrettify = prettifyCode.includes('then ') && prettifyCode.includes('objs');

console.log('Prettified - contains "thenobjs":', hasThenObjsPrettify);
console.log('Prettified - contains proper spacing after "then":', hasThenSpaceObjsPrettify);

if (!hasThenObjsMinify && !hasThenObjsPrettify) {
    console.log('\n✅ Fix verified: No token merging between keywords and identifiers');
} else {
    console.log('\n❌ Issue still present: Keywords being merged with identifiers');
}
