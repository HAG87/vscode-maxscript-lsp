import { strict as assert } from 'assert';
import process from 'node:process';
import { CharStream, CommonTokenStream, ParseTree } from 'antlr4ng';

import { mxsLexer } from '@parser/mxsLexer.js';
import { mxsParser } from '@parser/mxsParser.js';
import { mxsParserVisitorMinifier } from '../mxsParserVisitorMinifier.js';
import { ICodeFormatSettings, IMinifySettings } from '@backend/types.js';

const minifySettings: ICodeFormatSettings & IMinifySettings = {
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
};

function minifyWithFallback(input: string): string {
    const stream = CharStream.fromString(input);
    const lexer = new mxsLexer(stream);
    const tokens = new CommonTokenStream(lexer);
    const parser = new mxsParser(tokens);
    const tree = parser.program();

    const visitor = new mxsParserVisitorMinifier(minifySettings);
    return visitor.visit(tree as ParseTree) ?? '';
}

console.log('=== Fallback Minifier Regression Test ===');

try {
    // 1) Keep statement separators in rollout/control blocks.
    const rolloutMinified = minifyWithFallback(
        'rollout r "R" (\nbutton b "B"\ncheckbox c "C"\n)'
    );
    assert.ok(
        rolloutMinified.includes('button b "B";checkbox c "C"') || rolloutMinified.includes('button b"B";checkbox c"C"'),
        'Regression: missing mandatory separator between rollout controls in fallback minifier'
    );

    const rolloutFnsMinified = minifyWithFallback(
        'rollout r "R" (\nlocal x=1\nfn a=()\nfn b=()\n)'
    );
    assert.ok(
        rolloutFnsMinified.includes('local x=1;fn a=();fn b=()'),
        'Regression: missing mandatory separator between rollout declarations/functions in fallback minifier'
    );

    // 2) Keep mandatory boundaries between alnum/keyword tokens.
    const spacingMinified = minifyWithFallback('if objs.count==0 then objs=#()');
    assert.equal(spacingMinified.includes('thenobjs'), false, 'Regression: merged keyword and identifier');
    assert.ok(spacingMinified.includes('then objs'), 'Regression: missing space between keyword and identifier');

    // 3) Do not inject spaces around binary operators like plus.
    const plusMinified = minifyWithFallback('a=5+5\nb=foo+bar');
    assert.ok(plusMinified.includes('a=5+5'), 'Regression: inserted whitespace around binary plus for numbers');
    assert.ok(plusMinified.includes('b=foo+bar'), 'Regression: inserted whitespace around binary plus for identifiers');

    // 4) Preserve unary-minus semantics and avoid producing "--" comment starter.
    const minusMinified = minifyWithFallback('x=1-1\ny=1 -1\nz=1 - -1');
    assert.ok(minusMinified.includes('x=1-1'), 'Regression: binary subtraction should remain compact');
    assert.ok(minusMinified.includes('y=1 -1'), 'Regression: unary minus boundary lost');
    assert.ok(minusMinified.includes('z=1- -1'), 'Regression: subtraction + unary minus should remain separated');
    assert.equal(minusMinified.includes('z=1--1'), false, 'Regression: collapsed into comment starter "--"');

    console.log('✅ Fallback minifier preserves separators and token boundaries');
} catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
    process.exitCode = 1;
}
