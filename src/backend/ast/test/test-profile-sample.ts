/**
 * Profiling harness for Phase A.3 — mirrors SourceContext.ensureAstModel()'s pipeline
 * stage-by-stage against a real, large .ms file to get fresh baseline numbers
 * (the old benchmark table in docs/TEST_GUIDE.md predates full node coverage).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { CharStream, CommonTokenStream, ParseTreeWalker } from 'antlr4ng';
import { mxsLexer } from '@parser/mxsLexer.js';
import { mxsParser } from '@parser/mxsParser.js';
import { semanticTokenListener } from '@backend/semantic/semanticTokenListener.js';
import { ASTBuilder } from '../ASTBuilder.js';
import { SymbolResolver } from '../SymbolResolver.js';
import { ASTQuery } from '../ASTQuery.js';
import { NavigationService } from '@backend/navigation/NavigationService.js';
import { ISemanticToken } from '@backend/types.js';

const samplePath = join(__dirname, 'samples', 'sample.ms');
const source = readFileSync(samplePath, 'utf8');
const lineCount = source.split('\n').length;

console.log('=== AST Pipeline Profile (Phase A.3) ===');
console.log(`File: ${samplePath}`);
console.log(`Size: ${source.length} chars, ${lineCount} lines`);
console.log();

const RUNS = 10;
const stageTotals = {
    parse: 0,
    semanticWalk: 0,
    astBuild: 0,
    reset: 0,
    resolve: 0,
    prewarm: 0,
};

function now(): number {
    return performance.now();
}

const navigationService = new NavigationService();

// Matches SourceContext's own very-large-file gate (chars>=100000 || lines>=3000):
// when true, prewarmIndexes() skips the member-reference index in production.
const LARGE_FILE_CHAR_THRESHOLD = 100000;
const LARGE_FILE_LINE_THRESHOLD = 3000;
const isVeryLargeFile = source.length >= LARGE_FILE_CHAR_THRESHOLD || lineCount >= LARGE_FILE_LINE_THRESHOLD;
console.log(`isVeryLargeFile (per SourceContext gate): ${isVeryLargeFile} -> includeMemberReferenceIndex=${!isVeryLargeFile}`);
console.log();

for (let run = 0; run < RUNS; run++) {
    const t0 = now();
    const inputStream = CharStream.fromString(source);
    const lexer = new mxsLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new mxsParser(tokenStream);
    const tree = parser.program();
    const t1 = now();

    const semanticTokens: ISemanticToken[] = [];
    const identifierCandidates = new Map<string, ISemanticToken[]>();
    const listener = new semanticTokenListener(semanticTokens, identifierCandidates);
    ParseTreeWalker.DEFAULT.walk(listener, tree);
    const t2 = now();

    const builder = new ASTBuilder();
    const ast = builder.visitProgram(tree);
    const t3 = now();

    // First resolve() on a fresh AST — no reset walk needed (Phase A.1 optimization).
    const resolver = new SymbolResolver(ast);
    resolver.resolve();
    const t4 = now();

    // Second resolve() on the same instance — exercises the reset-walk path
    // that idempotent re-resolve still requires, isolated from the first-resolve cost.
    resolver.resolve();
    const t5 = now();

    navigationService.prewarmIndexes(ast, { includeMemberReferenceIndex: !isVeryLargeFile });
    const t6 = now();

    const parseMs = t1 - t0;
    const semanticWalkMs = t2 - t1;
    const astBuildMs = t3 - t2;
    const resolveMs = t4 - t3;
    const resetMs = t5 - t4;
    const prewarmMs = t6 - t5;

    console.log(`  run ${run + 1}: parse=${parseMs.toFixed(1)}ms semanticWalk=${semanticWalkMs.toFixed(1)}ms astBuild=${astBuildMs.toFixed(1)}ms resolve=${resolveMs.toFixed(1)}ms 2ndResolve=${resetMs.toFixed(1)}ms prewarm=${prewarmMs.toFixed(1)}ms`);

    stageTotals.parse += parseMs;
    stageTotals.semanticWalk += semanticWalkMs;
    stageTotals.astBuild += astBuildMs;
    stageTotals.resolve += resolveMs;
    stageTotals.reset += resetMs;
    stageTotals.prewarm += prewarmMs;

    ASTQuery.findDeclarationByName(ast, '__profile_noop__'); // touch position index without caching across runs
}
console.log();

console.log(`Runs: ${RUNS}`);
console.log();
for (const [stage, total] of Object.entries(stageTotals)) {
    const avg = total / RUNS;
    console.log(`  ${stage.padEnd(14)} avg=${avg.toFixed(2)}ms total=${total.toFixed(2)}ms`);
}

const totalPerRun = Object.values(stageTotals).reduce((a, b) => a + b, 0) / RUNS;
console.log();
console.log(`  ${'reparse total'.padEnd(14)} avg=${totalPerRun.toFixed(2)}ms (excludes idempotent 2nd resolve() cost)`);
console.log(`  ${'2nd resolve()'.padEnd(14)} avg=${(stageTotals.reset / RUNS).toFixed(2)}ms — only paid on repeated resolve() calls, not on a fresh reparse`);
