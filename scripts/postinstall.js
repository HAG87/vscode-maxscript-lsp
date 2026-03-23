#!/usr/bin/env node

/**
 * Post-install script to patch @strumenta/tylasu ESM imports
 * 
 * The Tylasu package has a bug where ESM imports don't include .js extensions.
 * This script patches all .js files in the ESM dist to add the missing extensions.
 * Safe to run multiple times — won't double-patch already-patched files.
 */

const { readdir, readFile, writeFile } = require('fs/promises');
const { join } = require('path');

async function patchFile(filePath) {
    try {
        let content = await readFile(filePath, 'utf-8');
        
        // Replace relative imports/exports without .js extension
        // Matches: from "./path" or from "../path" with or without trailing semicolon
        // Uses a replacer function to avoid adding .js.js on repeated runs
        const patched = content.replace(
            /\bfrom\s+(['"])(\.\.?\/[^'"]+?)(\1)/g,
            (match, quote, path, closeQuote) => {
                if (path.endsWith('.js')) return match; // already patched
                return `from ${quote}${path}.js${closeQuote}`;
            }
        );
        
        if (content !== patched) {
            await writeFile(filePath, patched, 'utf-8');
            console.log(`✓ Patched: ${filePath}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`✗ Failed to patch ${filePath}:`, error.message);
        return false;
    }
}

async function patchDirectory(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    let patchedCount = 0;
    
    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
            patchedCount += await patchDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            if (await patchFile(fullPath)) {
                patchedCount++;
            }
        }
    }
    
    return patchedCount;
}

async function main() {
    const tylasuEsmPath = 'node_modules/@strumenta/tylasu/dist/esm';
    
    try {
        console.log('Patching @strumenta/tylasu ESM imports...');
        const count = await patchDirectory(tylasuEsmPath);
        if (count > 0) {
            console.log(`\n✅ Successfully patched ${count} files`);
        } else {
            console.log('\nℹ  No files needed patching (already patched or clean)');
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('ℹ  @strumenta/tylasu not found, skipping patch');
        } else {
            console.error('❌ Patch failed:', error.message);
            process.exit(1);
        }
    }
}

main();
