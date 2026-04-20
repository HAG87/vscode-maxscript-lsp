import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '@parser/mxsLexer.js';
import { mxsParser } from '@parser/mxsParser.js';
import { codeBlock, mxsParserVisitorFormatter } from '../mxsParserVisitorFormatter.js';
import { ParseTree } from 'antlr4ng';
import { ICodeFormatSettings, IMinifySettings, IPrettifySettings } from '@backend/types.js';
import { strict as assert } from 'assert';

console.log('=== FINAL VERIFICATION: User-Reported Issue ===\n');

// User's problematic line
const snippet = 'if objs.count==0 AND snapMode.node!=undefined then objs=#(snapMode.node)';

console.log('Input snippet:');
console.log(snippet);
console.log('');

// Parse
const chars = CharStream.fromString(snippet);
const lexer = new mxsLexer(chars);
const stream = new CommonTokenStream(lexer);
stream.fill();
const parser = new mxsParser(stream);
const tree = parser.program();

// Prettifier settings
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

// Minifier settings
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

try {
    // Test prettifier
    console.log('=== PRETTIFIER (condenseWhitespace: false) ===');
    const prettifyVisitor = new mxsParserVisitorFormatter(prettifySettings);
    const prettifyResult = prettifyVisitor.visit(tree as ParseTree);
    const prettifyCode = prettifyResult instanceof codeBlock ? prettifyResult.toString(prettifySettings) : String(prettifyResult);
    
    console.log('Output:');
    console.log(prettifyCode);
    console.log('');
    
    assert.ok(!prettifyCode.includes('thenobjs'), 'Prettifier: should not merge "then" and "objs"');
    assert.ok(prettifyCode.includes('then'), 'Prettifier: should contain "then"');
    assert.ok(prettifyCode.includes('objs'), 'Prettifier: should contain "objs"');
    console.log('✅ Prettifier: PASS - proper spacing after "then" keyword\n');

    // Test minifier
    console.log('=== MINIFIER (condenseWhitespace: true) ===');
    const minifyVisitor = new mxsParserVisitorFormatter(minifySettings);
    const minifyResult = minifyVisitor.visit(tree as ParseTree);
    const minifyCode = minifyResult instanceof codeBlock ? minifyResult.toString(minifySettings) : String(minifyResult);
    
    console.log('Output:');
    console.log(minifyCode);
    console.log('');
    
    assert.ok(!minifyCode.includes('thenobjs'), 'Minifier: should not merge "then" and "objs"');
    assert.ok(minifyCode.includes('then objs'), 'Minifier: should have "then objs" with space');
    console.log('✅ Minifier: PASS - proper spacing after "then" keyword\n');

    console.log('✅✅✅ ALL TESTS PASSED - Issue is RESOLVED ✅✅✅');
    console.log('');
    console.log('Summary:');
    console.log('- Keywords are properly separated from following identifiers');
    console.log('- Works for both prettifier and minifier formatter settings');
    console.log('- No "thenobjs" token merging in either format');
    
} catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
    process.exit(1);
}
