import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '@parser/mxsLexer.js';
import { mxsParser } from '@parser/mxsParser.js';
import { codeBlock, mxsParserVisitorFormatter } from '../mxsParserVisitorFormatter.js';
import { ParseTree } from 'antlr4ng';
import { ICodeFormatSettings, IMinifySettings, IPrettifySettings } from '@backend/types.js';

console.log('=== Testing User Reported Code ===\n');

// User's exact code
const userCode = `fn pivotToSnapPoint mode:#world=(local res=undefined;if snapMode.active then(if snapMode.hit then(local objs=getcurrentSelection();if objs.count==0 AND snapMode.node!=undefined then objs=#(snapMode.node);if objs.count>0 then(if mode==#local then(local hitPoint=snapMode.hitPoint;if hitPoint!=undefined then(ResetPivot objs;for obj in objs do(in coordsys obj obj.pivot=hitPoint);res=snapMode.worldHitpoint));if mode==#world then(local hitPoint=snapMode.worldHitpoint;if hitPoint!=undefined then(for obj in objs do(in coordsys world obj.pivot=hitPoint);res=hitPoint)))));res)`;

console.log('Input length:', userCode.length);
console.log('');

// Parse
const chars = CharStream.fromString(userCode);
const lexer = new mxsLexer(chars);
const stream = new CommonTokenStream(lexer);
stream.fill();
const parser = new mxsParser(stream);
const tree = parser.program();

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

const visitor = new mxsParserVisitorFormatter(prettifySettings);
const result = visitor.visit(tree as ParseTree);
const formatted = result instanceof codeBlock ? result.toString(prettifySettings) : String(result);

console.log('Formatted output:');
console.log(formatted);
console.log('');

// Check for the problem
if (formatted.includes('thenobjs')) {
    console.log('❌ FOUND PROBLEM: "thenobjs" token merging detected!');
    // Find and show context
    const idx = formatted.indexOf('thenobjs');
    const start = Math.max(0, idx - 50);
    const end = Math.min(formatted.length, idx + 50);
    console.log('\nContext around "thenobjs":');
    console.log(formatted.substring(start, end));
} else {
    console.log('✅ No "thenobjs" token merging detected');
}
