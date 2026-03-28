import { strict as assert } from 'assert';
import process from 'node:process';
import { CharStream, CommonTokenStream, ParseTree } from 'antlr4ng';

import { minifySettings } from '../../../settings.js';
import { mxsLexer } from '../../../parser/mxsLexer.js';
import { mxsParser } from '../../../parser/mxsParser.js';
import { codeBlock, mxsParserVisitorFormatter } from '../mxsParserVisitorFormatter.js';

const source = `
fn pivotToSnapPoint mode: #world =
(
    local res = undefined
    if snapMode.active then
    (
        if snapMode.hit then
        (
            local objs = getcurrentSelection()
            if objs.count == 0 AND snapMode.node != undefined then
                objs = #( snapMode.node )
            if objs.count > 0 then
            (
                if mode == #local then
                (
                    local hitPoint = snapMode.hitPoint
                    if hitPoint != undefined then
                    (
                        ResetPivot objs
                        for obj in objs do
                        (
                            in coordsys obj obj.pivot = hitPoint
                        )
                        res = snapMode.worldHitpoint
                    )
                )
                if mode == #world then
                (
                    local hitPoint = snapMode.worldHitpoint
                    if hitPoint != undefined then
                    (
                        for obj in objs do
                        (
                            in coordsys world obj.pivot = hitPoint
                        )
                        res = hitPoint
                    )
                )
            )
        )
    )
    res
)
`;

function minifyWithFormatter(input: string): string {
    const stream = CharStream.fromString(input);
    const lexer = new mxsLexer(stream);
    const tokens = new CommonTokenStream(lexer);
    const parser = new mxsParser(tokens);
    const tree = parser.program();

    const visitor = new mxsParserVisitorFormatter(minifySettings);
    const formatted = visitor.visit(tree as ParseTree);

    assert.ok(!Array.isArray(formatted) && formatted instanceof codeBlock, 'Formatter visitor must return a codeBlock');
    return formatted.toString(minifySettings);
}

console.log('=== Formatter Minify Regression Test ===');

try {
    const minified = minifyWithFormatter(source);

    // Must preserve mandatory spaces between keywords and identifiers.
    assert.ok(minified.includes('if snapMode.active then('), 'Unexpected spacing in if condition');
    assert.ok(minified.includes('if snapMode.hit then('), 'Unexpected spacing in nested if condition');
    assert.ok(minified.includes('for obj in objs do('), 'Unexpected spacing in for-loop clause');
    assert.ok(minified.includes('in coordsys world obj.pivot=hitPoint'), 'Missing spaces in coordsys clause');

    // Guard against the exact historical regressions.
    assert.equal(minified.includes('ifsnapMode'), false, 'Regression: merged "if" + identifier');
    assert.equal(minified.includes('forobjinobjsdo'), false, 'Regression: merged for-loop tokens');

    console.log('✅ Formatter minify output preserves mandatory whitespace boundaries');
} catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
    process.exitCode = 1;
}
