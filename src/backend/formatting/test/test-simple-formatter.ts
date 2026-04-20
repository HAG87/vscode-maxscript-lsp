import { strict as assert } from 'assert';
import process from 'node:process';

import { mxsSimpleFormatter } from '../simpleCodeFormatter.js';

console.log('=== Simple Formatter Regression Test ===');

try {
    const source = 'fn foo = (\r\n    -- comment\r\n    a = 1\r\n)';
    const formatter = new mxsSimpleFormatter(source);

    // Regression guard: start=0 must still execute slicing path.
    const full = formatter.formatRange(0, source.length - 1);
    assert.ok(full.code.length > 0, 'formatRange(0, ...) should produce output');
    assert.ok(full.code.includes('fn foo'), 'start=0 range should include first token');
    assert.ok(full.code.trimEnd().endsWith(')'), 'full-range formatting should preserve trailing closing token');

    // Regression guard: empty token window should not throw.
    const empty = formatter.formatTokenRange(2, 1);
    assert.equal(empty.code, '', 'empty token ranges should return empty output');

    // Regression guard: file starting with a line break + comment should still format.
    const commentLeadingSource = '\r\n-- header comment\r\nfn foo = 1\r\n';
    const commentLeadingFormatter = new mxsSimpleFormatter(commentLeadingSource);
    const commentLeading = commentLeadingFormatter.formatTokenRange();
    assert.ok(commentLeading.code.length > 0, 'comment-leading source should still produce formatted output');
    assert.ok(commentLeading.code.includes('fn foo'), 'comment-leading source should keep function statement');

    // Regression guard: file starting with blank lines should still format.
    const blankLeadingSource = '\r\n\r\nfn bar = 2\r\n';
    const blankLeadingFormatter = new mxsSimpleFormatter(blankLeadingSource);
    const blankLeading = blankLeadingFormatter.formatTokenRange();
    assert.ok(blankLeading.code.length > 0, 'blank-leading source should still produce formatted output');
    assert.ok(blankLeading.code.includes('fn bar'), 'blank-leading source should keep function statement');

    // Regression guard: line continuation must survive WS filtering.
    const continuationSource = 'a = 1 + \\\r\n2';
    const continuationFormatter = new mxsSimpleFormatter(continuationSource);
    const continuation = continuationFormatter.formatTokenRange();
    assert.ok(
        continuation.code.includes('\\\r\n') || continuation.code.includes('\\\n'),
        'line continuation marker should be preserved in formatted output'
    );

    // Regression guard: range formatting should preserve base indentation on first selected line
    // and should not add trailing indentation after opening parenthesis lines.
    const rangeIndentSource =
        '\t\t\t\t\tlocal hitPoint = snapMode.hitPoint\r\n' +
        '\t\t\t\t\tif hitPoint != undefined then\r\n' +
        '\t\t\t\t\t(\r\n' +
        '\t\t\t\t\t\tResetPivot objs\r\n' +
        '\t\t\t\t\t\tfor obj in objs do( in coordsys obj obj.pivot = hitPoint )\r\n' +
        '\t\t\t\t\t\tres = snapMode.worldHitpoint\r\n' +
        '\t\t\t\t\t)\r\n';

    const rangeStart = rangeIndentSource.indexOf('if hitPoint != undefined then');
    const rangeStop = rangeIndentSource.lastIndexOf(')');
    const rangeFormatter = new mxsSimpleFormatter(rangeIndentSource);
    const rangeFormatted = rangeFormatter.formatRange(rangeStart, rangeStop);

    assert.ok(
        rangeFormatted.code.startsWith('\t\t\t\t\tif hitPoint != undefined then'),
        'first selected line should preserve original base indentation'
    );
    assert.ok(
        rangeFormatted.code.includes('\r\n(\r\n'),
        'opening parenthesis should stay on its own line without trailing indentation'
    );

    // Regression guard: when selection starts at line start, base indent should not be duplicated on all lines.
    const lineStartSelectionStart = rangeIndentSource.indexOf('\t\t\t\t\tif hitPoint != undefined then');
    const lineStartSelectionStop = rangeIndentSource.lastIndexOf(')');
    const lineStartFormatted = rangeFormatter.formatRange(lineStartSelectionStart, lineStartSelectionStop);

    assert.ok(
        lineStartFormatted.code.startsWith('\t\t\t\t\tif hitPoint != undefined then'),
        'line-start selection should keep original leading indentation'
    );
    assert.ok(
        !lineStartFormatted.code.includes('\r\n\t\t\t\t\t\t\t\t\t\t('),
        'line-start selection should not duplicate base indentation on subsequent lines'
    );

    console.log('✅ Simple formatter handles start=0, empty ranges, leading comment/blank-line inputs, and line continuations safely');
} catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
    process.exitCode = 1;
}
