/**
 * Profiling harness for Phase A.3 (follow-up) — drives the real SourceContext
 * pipeline (two-stage SLL->LL parse, ensureAstModel) instead of a bare
 * mxsParser call, since production never parses without that strategy.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { SourceContext } from '@backend/SourceContext.js';

const samplePath = join(__dirname, 'samples', 'sample.ms');
const source = readFileSync(samplePath, 'utf8');
const lineCount = source.split('\n').length;

console.log('=== Real SourceContext Pipeline Profile (Phase A.3 follow-up) ===');
console.log(`File: ${samplePath}`);
console.log(`Size: ${source.length} chars, ${lineCount} lines`);
console.log();

const RUNS = 10;

// Single long-lived context, reparsed repeatedly — mirrors real editing sessions
// where parseInvocationCount > 0 lets the SLL-first strategy kick in (vs. the
// isVeryLargeFile + parseInvocationCount===0 heuristic that forces LL-direct
// on a document's very first parse).
const context = new SourceContext('file:///sample.ms');
context.updateTraceSettings({ tracePerformance: true, traceParserDecisions: false, traceRouting: false });
context.setText(source);

for (let run = 0; run < RUNS; run++) {
    const t0 = performance.now();
    context.parse();
    const t1 = performance.now();

    context.getResolvedAST();
    const t2 = performance.now();

    console.log(`  run ${run + 1}: parse=${(t1 - t0).toFixed(1)}ms ensureAstModel=${(t2 - t1).toFixed(1)}ms`);
}
