/**
 * Test runner script
 * Runs all AST tests in sequence
 */

import { spawn } from 'child_process';
import { join } from 'path';

// Kept in sync with the test:ast:* scripts in package.json.
// Ad-hoc/manual debug scripts (test-ast-debug.ts, POC_Test.ts, etc.) are intentionally excluded.
const tests = [
    'test-simple.ts',
    'test-functions.ts',
    'test-nested.ts',
    'test-performance.ts',
    'test-symboltree.ts',
    'test-control-flow.ts',
    'test-context-handlers.ts',
    'test-definition-blocks.ts',
    'test-query-positions.ts',
];

console.log('========================================');
console.log('Running AST Tests');
console.log('========================================');
console.log();

let passed = 0;
let failed = 0;

async function runTest(testFile: string): Promise<boolean> {
    return new Promise((resolve) => {
        console.log(`Running: ${testFile}`);
        console.log('----------------------------------------');
        
        const testPath = join(__dirname, testFile);
        const proc = spawn('npx', ['tsx', testPath], {
            stdio: 'inherit',
            shell: true
        });
        
        proc.on('close', (code) => {
            console.log('----------------------------------------');
            if (code === 0) {
                console.log(`✅ ${testFile} PASSED`);
                passed++;
                resolve(true);
            } else {
                console.log(`❌ ${testFile} FAILED (exit code ${code})`);
                failed++;
                resolve(false);
            }
            console.log();
        });
    });
}

async function runAll() {
    for (const test of tests) {
        await runTest(test);
    }
    
    console.log('========================================');
    console.log('Test Results');
    console.log('========================================');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total:  ${passed + failed}`);
    
    if (failed > 0) {
        console.log();
        console.log('❌ Some tests failed');
        process.exitCode = 1;
    } else {
        console.log();
        console.log('✅ All tests passed!');
    }
}

runAll();

