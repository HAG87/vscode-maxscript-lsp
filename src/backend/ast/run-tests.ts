/**
 * Test runner script
 * Runs all AST tests in sequence
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';

const tests = [
    'test-simple.js',
    'test-functions.js',
    'test-nested.js',
    'test-performance.js',
    'test-symboltree.js'
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
        const proc = spawn('node', [testPath], {
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
    } else {
        console.log();
        console.log('✅ All tests passed!');
    }
}

runAll();
