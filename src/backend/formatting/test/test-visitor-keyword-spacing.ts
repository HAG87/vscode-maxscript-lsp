import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '@parser/mxsLexer.js';
import { mxsParser } from '@parser/mxsParser.js';
import { codeBlock, mxsParserVisitorFormatter } from '../mxsParserVisitorFormatter.js';
import { ParseTree } from 'antlr4ng';
import { ICodeFormatSettings, IMinifySettings, IPrettifySettings } from '@backend/types.js';
import { strict as assert } from 'assert';

console.log('=== Visitor Formatter Keyword-ID Spacing Regression Test ===\n');

// Test case from user report: "if objs.count == 0 AND snapMode.node != undefined thenobjs = #( snapMode.node )"
const testCode = 'if objs.count == 0 AND snapMode.node != undefined then objs = #( snapMode.node )';

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

// Minify settings
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

// Prettify settings
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

try {
    // Test minify
    const minifyVisitor = new mxsParserVisitorFormatter(minifySettings);
    const minifyFormatted = minifyVisitor.visit(tree as ParseTree);
    const minifyCode = minifyFormatted instanceof codeBlock ? minifyFormatted.toString(minifySettings) : String(minifyFormatted);
    
    console.log('Minified output:');
    console.log(minifyCode);
    console.log('');
    
    // Regression checks
    assert.ok(!minifyCode.includes('thenobjs'), 'minified: "then objs" should not merge to "thenobjs"');
    assert.ok(!minifyCode.includes('ANDsnapMode'), 'minified: "AND snapMode" should not merge');
    assert.ok(minifyCode.includes('then objs'), 'minified: should have "then objs" with space');
    assert.ok(minifyCode.includes('AND snapMode'), 'minified: should have "AND snapMode" with space');
    
    console.log('✅ Minified format: keyword-to-ID spacing correct');
    console.log('');

    // Test prettify
    const prettifyVisitor = new mxsParserVisitorFormatter(prettifySettings);
    const prettifyFormatted = prettifyVisitor.visit(tree as ParseTree);
    const prettifyCode = prettifyFormatted instanceof codeBlock ? prettifyFormatted.toString(prettifySettings) : String(prettifyFormatted);
    
    console.log('Prettified output:');
    console.log(prettifyCode);
    console.log('');
    
    // Regression checks
    assert.ok(!prettifyCode.includes('thenobjs'), 'prettified: "then objs" should not merge to "thenobjs"');
    assert.ok(!prettifyCode.includes('ANDsnapMode'), 'prettified: "AND snapMode" should not merge');
    // In prettify with newlines, "then" and "objs" will be on different lines with indentation
    assert.ok(prettifyCode.includes('then') && prettifyCode.includes('objs'), 'prettified: should have both "then" and "objs"');
    
    console.log('✅ Prettified format: keyword-to-ID spacing correct');
    console.log('');
    
    console.log('✅ All keyword-to-ID spacing regression tests passed!');
    
} catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
    process.exit(1);
}
