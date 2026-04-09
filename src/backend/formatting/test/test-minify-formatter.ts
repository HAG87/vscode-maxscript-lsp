/// <reference types="node" />

import { strict as assert } from 'assert';
import process from 'node:process';
import { CharStream, CommonTokenStream, ParseTree } from 'antlr4ng';

import { minifySettings } from '../../../settings.js';
import { mxsLexer } from '../../../parser/mxsLexer.js';
import { mxsParser } from '../../../parser/mxsParser.js';
import { codeBlock, mxsParserVisitorFormatter } from '../mxsParserVisitorFormatter.js';
import { ICodeFormatSettings, IMinifySettings, IPrettifySettings } from '../../types.js';

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
    return (formatted as codeBlock).toString(minifySettings);
}

function formatWithFormatter(input: string, settings: ICodeFormatSettings & IMinifySettings & IPrettifySettings): string {
    const stream = CharStream.fromString(input);
    const lexer = new mxsLexer(stream);
    const tokens = new CommonTokenStream(lexer);
    const parser = new mxsParser(tokens);
    const tree = parser.program();

    const visitor = new mxsParserVisitorFormatter(settings);
    const formatted = visitor.visit(tree as ParseTree);

    assert.ok(!Array.isArray(formatted) && formatted instanceof codeBlock, 'Formatter visitor must return a codeBlock');
    return (formatted as codeBlock).toString(settings);
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

    // Operators should not trigger mandatory whitespace around numeric/ID operands.
    const arithmeticMinified = minifyWithFormatter('a=5+5\nb=foo+bar\nif 5+5>0 then c=1');
    assert.ok(arithmeticMinified.includes('a=5+5'), 'Regression: inserted whitespace around "+" for numeric operands');
    assert.ok(arithmeticMinified.includes('b=foo+bar'), 'Regression: inserted whitespace around "+" for identifier operands');
    assert.equal(arithmeticMinified.includes('5 +5'), false, 'Regression: unexpected left-space around "+"');
    assert.equal(arithmeticMinified.includes('5+ 5'), false, 'Regression: unexpected right-space around "+"');
    assert.equal(arithmeticMinified.includes('foo +bar'), false, 'Regression: unexpected left-space around "+" with identifiers');
    assert.equal(arithmeticMinified.includes('foo+ bar'), false, 'Regression: unexpected right-space around "+" with identifiers');

    // Unary minus semantics: avoid collapsing "- -" into "--" (line comment in MXS).
    const minusMinified = minifyWithFormatter('x=1-1\ny=1 -1\nz=1 - -1');
    assert.ok(minusMinified.includes('x=1-1'), 'Regression: binary subtraction should remain compact');
    assert.ok(minusMinified.includes('y=1 -1'), 'Regression: unary minus operand should preserve boundary space');
    assert.ok(minusMinified.includes('z=1- -1'), 'Regression: adjacent minus tokens must not collapse into comment starter');
    assert.equal(minusMinified.includes('z=1--1'), false, 'Regression: "--" created from subtraction and unary minus');

    // Avoid gratuitous spaces after separators and before quoted strings.
    const separatorAndStringMinified = minifyWithFormatter('a=1\nb=2\nrollout r "R" ( button b "B" )');
    assert.equal(separatorAndStringMinified.includes('; b='), false, 'Regression: inserted whitespace after mandatory separator');
    assert.equal(separatorAndStringMinified.includes('b "B"'), false, 'Regression: inserted whitespace between identifier and quoted string');

    const rolloutFnsMinified = minifyWithFormatter('rollout r "R" (\nlocal x=1\nfn a=()\nfn b=()\n)');
    assert.ok(
        rolloutFnsMinified.includes('local x=1;fn a=();fn b=()'),
        'Regression: missing separator between rollout-local declarations/functions in formatter minify output'
    );

    const rolloutComplexFnsMinified = minifyWithFormatter(`rollout r "R" (
        fn get_cam_res cam &width &height &ratio =
        (
            if isValidNode cam then (
                local w = getUserProp cam "w_res", h = getUserProp cam "h_res", r = getUserProp cam "aspect_ratio"
                width = if w != undefined then w as integer
                height = if h != undefined then h as integer
                ratio = if r != undefined then r as float
            )
        )
        fn shutterType2Values cam =
        (
            case drp_ev.selection of (
                1: (spn_sh.value = 1.0 / cam.shutter_length_seconds)
                2: (spn_sh.value = cam.shutter_length_seconds)
            )
        )
        fn shutterValue cam val =
        (
            case drp_ev.selection of (
                1: (cam.shutter_length_seconds = val / 1.0)
                2: (cam.shutter_length_seconds = val)
            )
        )
    )`);
    assert.ok(
        rolloutComplexFnsMinified.includes(')););fn shutterValue'),
        'Regression: case-expression function body must emit one separator before its closing paren'
    );

    // Avoid duplicate mandatory separators around case expressions.
    const caseMinified = minifyWithFormatter('case state of (1:(a=1);2:(a=2))\na=3');
    assert.equal(caseMinified.includes('));;'), false, 'Regression: duplicate separator emitted after case expression');
    assert.ok(caseMinified.includes('));a=3'), 'Regression: case expression should emit exactly one separator before following expression');

    // Preserve parameter-member boundaries in plugin parameters blocks.
    const pluginParamsSource = `plugin simpleObject sample name:#sample (
        parameters main rollout:params (
            width type:#float default:10
            height type:#float default:20
        )
    )`;
    const pluginParamsMinified = minifyWithFormatter(pluginParamsSource);
    assert.ok(
        pluginParamsMinified.includes('width type:#float default:10;height type:#float default:20'),
        'Regression: missing separator between parameter members inside parameters block'
    );

    const pluginClauseBoundarySource = `plugin simpleSpline p remap:#(#(#a),#(#b)) (
        tool create (
            fn f=()
        )
    )`;
    const pluginClauseBoundaryMinified = minifyWithFormatter(pluginClauseBoundarySource);
    assert.ok(
        pluginClauseBoundaryMinified.includes('remap:#(#(#a),#(#b))('),
        'Regression: plugin clause/body boundary should not emit a mandatory separator before opening body scope'
    );

    const utilityEventHandlerSource = `utility u "U" (
        fn beforeFn=()
        on btn pressed do (a=1)
        fn nextFn=()
    )`;
    const utilityEventHandlerMinified = minifyWithFormatter(utilityEventHandlerSource);
    assert.ok(
        utilityEventHandlerMinified.includes('fn beforeFn=();on btn pressed do(a=1)'),
        'Regression: missing mandatory separator before event handler member'
    );
    assert.ok(
        utilityEventHandlerMinified.includes('on btn pressed do(a=1);fn nextFn=()'),
        'Regression: missing mandatory separator after event handler before next member'
    );

    const stream = CharStream.fromString(pluginParamsMinified);
    const lexer = new mxsLexer(stream);
    const tokens = new CommonTokenStream(lexer);
    const parser = new mxsParser(tokens);
    parser.program();
    assert.equal(
        parser.numberOfSyntaxErrors,
        0,
        'Regression: formatter minify output for plugin parameters must remain reparsable'
    );

    const prettifySettings: ICodeFormatSettings & IMinifySettings & IPrettifySettings = {
        ...minifySettings,
        condenseWhitespace: false,
        whitespaceChar: ' ',
        newLineChar: '\r\n',
        exprEndChar: '\r\n',
        indentChar: '\t',
        codeblock: { parensInNewLine: true, newlineAllways: true, spaced: true },
        removeUnnecessaryScopes: false,
        expressionsToBlock: true,
    };
    const casePrettified = formatWithFormatter('case state of (1:(a=1);2:(a=2))\na=3', prettifySettings);
    assert.equal(casePrettified.includes('\r\n\r\n\r\na=3'), false, 'Regression: duplicate mandatory break emitted in prettify mode');

    const singleCasePrettified = formatWithFormatter('fn x=(case state of(1:(a=1)\n2:(a=2)))', prettifySettings);
    assert.ok(singleCasePrettified.endsWith('\r\n)'), 'Regression: final closing paren inherited extra indent from trailing case separator');

    const fnReturnPrettified = formatWithFormatter('fn f=(return 1)', prettifySettings);
    assert.equal(fnReturnPrettified.includes('return\r\n'), false, 'Regression: formatter inserted line break after RETURN in function body');

    const eventReturnPrettified = formatWithFormatter('utility u "U" (\non x return 1\n)', prettifySettings);
    assert.equal(eventReturnPrettified.includes('return\r\n'), false, 'Regression: formatter inserted line break after RETURN in event handler');

    const trailingCaseMinified = minifyWithFormatter(
        'fn getKnotBuilder mode includeBezier:false=(fn addAutoKnot p iv ov=setAutoKnot p iv ov;fn addLineKnot p iv ov=setLineKnot p;fn addFullKnot p iv ov=setSplineKnot p iv ov;case mode of(#line:addLineKnot;#bezier:(if includeBezier then addFullKnot else addAutoKnot);default:addAutoKnot))'
    );
    assert.ok(
        trailingCaseMinified.includes('default:addAutoKnot);)'),
        'Regression: missing mandatory separator after trailing case-expression before closing scope'
    );

    const trailingAssignedCaseMinified = minifyWithFormatter(
        'fn EPOLY_getSubObjSel obj=(if (isValidNode obj) AND (isKindOf obj Editable_poly) then (if so!=undefined then (has_selection=case of((so==1):(true);default:false))))'
    );
    assert.ok(
        trailingAssignedCaseMinified.includes('default:false););'),
        'Regression: missing mandatory separator after trailing assigned case-expression before closing scope'
    );

    console.log('✅ Formatter minify output preserves mandatory whitespace boundaries');
} catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
    process.exitCode = 1;
}
