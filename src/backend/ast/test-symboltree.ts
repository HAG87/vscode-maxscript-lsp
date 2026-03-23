/**
 * SymbolTreeBuilder Test
 * Tests the hierarchical symbol tree generation for VS Code outline
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../parser/mxsLexer.js';
import { mxsParser } from '../../parser/mxsParser.js';
import { ASTBuilder } from './ASTBuilder.js';
import { SymbolResolver } from './SymbolResolver.js';
import { SymbolTreeBuilder } from './SymbolTreeBuilder.js';
import { SymbolKind } from '../../types.js';
import process from 'process';

const code = `
-- Global variable
global myGlobal = 100

-- Simple function with parameters and local variables
fn calculateSum a b =
(
    local result = a + b
    local temp = result * 2
    result
)

-- Nested function
fn outerFunc x =
(
    local outerVar = x * 2
    
    fn innerFunc y =
    (
        local innerVar = y + outerVar
        innerVar
    )
    
    innerFunc(outerVar)
)

-- Struct with members and methods
struct MyStruct
(
    fieldA,
    fieldB = 0,
    
    fn getSum =
    (
        local sum = fieldA + fieldB
        sum
    ),
    
    fn setValues a b =
    (
        fieldA = a
        fieldB = b
    )
)

-- Local variable
local localVar = 42

-- Top-level isolated scope block
(
    local wrappedLocal = 7

    fn wrappedFn a =
    (
        local wrappedInner = a + wrappedLocal
        wrappedInner
    )
)
`;

console.log('=== SymbolTreeBuilder Test ===');
console.log('Code:', code.trim());
console.log();

try {
    // Parse
    const inputStream = CharStream.fromString(code);
    const lexer = new mxsLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new mxsParser(tokenStream);
    
    console.log('✓ Parsing complete');
    
    // Build AST
    const builder = new ASTBuilder();
    const ast = builder.visitProgram(parser.program());
    const references = builder.getAllReferences();
    
    console.log('✓ AST built');
    console.log(`  - ${ast.statements.length} statements`);
    console.log(`  - ${ast.declarations.size} declarations in program scope`);
    console.log(`  - ${references.length} references collected`);
    
    // Resolve symbols
    const resolver = new SymbolResolver(ast, references);
    resolver.resolve();
    
    console.log('✓ Symbols resolved');
    console.log();
    
    // Build symbol tree
    const symbolTree = SymbolTreeBuilder.buildSymbolTree(ast, 'test://test.ms');
    
    console.log('✓ Symbol tree built');
    console.log(`  - ${symbolTree.length} top-level symbols`);
    console.log();
    
    // Display symbol tree
    console.log('=== Symbol Tree Structure ===');
    console.log();
    
    function printSymbol(symbol: any, indent: string = '') {
        const kindStr = SymbolKind[symbol.kind] || `Unknown(${symbol.kind})`;
        console.log(`${indent}${symbol.name} [${kindStr}]`);
        
        if (symbol.definition?.range) {
            const range = symbol.definition.range;
            console.log(`${indent}  └─ Position: line ${range.start.row + 1}, col ${range.start.column + 1}`);
        }
        
        if (symbol.children && symbol.children.length > 0) {
            symbol.children.forEach((child: any, index: number) => {
                const isLast = index === symbol.children.length - 1;
                const childIndent = indent + (isLast ? '  └─ ' : '  ├─ ');
                const continueIndent = indent + (isLast ? '     ' : '  │  ');
                
                printSymbol(child, childIndent);
                
                // Print children's children with proper indentation
                if (child.children && child.children.length > 0) {
                    child.children.forEach((grandchild: any, gIndex: number) => {
                        const gIsLast = gIndex === child.children.length - 1;
                        const gChildIndent = continueIndent + (gIsLast ? '  └─ ' : '  ├─ ');
                        printSymbol(grandchild, gChildIndent);
                    });
                }
            });
        }
    }
    
    symbolTree.forEach((symbol, index) => {
        printSymbol(symbol);
        if (index < symbolTree.length - 1) {
            console.log();
        }
    });
    
    console.log();
    console.log('=== Validation ===');
    console.log();
    
    // Validate expected symbols
    let errors = 0;
    
    // Check for global variable
    const globalVar = symbolTree.find(s => s.name === 'myGlobal');
    if (globalVar) {
        console.log('✓ Found global variable "myGlobal"');
        if (globalVar.kind === SymbolKind.GlobalVar) {
            console.log('  ✓ Correct kind: GlobalVar');
        } else {
            console.log(`  ❌ Wrong kind: expected GlobalVar, got ${SymbolKind[globalVar.kind]}`);
            errors++;
        }
    } else {
        console.log('❌ Global variable "myGlobal" not found');
        errors++;
    }
    
    // Check for calculateSum function
    const calcSum = symbolTree.find(s => s.name === 'calculateSum');
    if (calcSum) {
        console.log('✓ Found function "calculateSum"');
        if (calcSum.kind === SymbolKind.Function) {
            console.log('  ✓ Correct kind: Function');
        } else {
            console.log(`  ❌ Wrong kind: expected Function, got ${SymbolKind[calcSum.kind]}`);
            errors++;
        }
        
        // Check parameters
        const params = calcSum.children?.filter(c => c.kind === SymbolKind.Parameter) || [];
        if (params.length === 2) {
            console.log(`  ✓ Has 2 parameters: ${params.map(p => p.name).join(', ')}`);
        } else {
            console.log(`  ❌ Expected 2 parameters, got ${params.length}`);
            errors++;
        }
        
        // Check local variables
        const locals = calcSum.children?.filter(c => c.kind === SymbolKind.LocalVar) || [];
        if (locals.length >= 2) {
            console.log(`  ✓ Has ${locals.length} local variables`);
        } else {
            console.log(`  ❌ Expected at least 2 local variables, got ${locals.length}`);
            errors++;
        }
    } else {
        console.log('❌ Function "calculateSum" not found');
        errors++;
    }
    
    // Check for outerFunc with nested function
    const outerFunc = symbolTree.find(s => s.name === 'outerFunc');
    if (outerFunc) {
        console.log('✓ Found function "outerFunc"');
        
        // Check for nested function
        const innerFunc = outerFunc.children?.find(c => c.name === 'innerFunc' && c.kind === SymbolKind.Function);
        if (innerFunc) {
            console.log('  ✓ Contains nested function "innerFunc"');
            
            // Check nested function's children
            if (innerFunc.children && innerFunc.children.length > 0) {
                console.log(`    ✓ Nested function has ${innerFunc.children.length} children`);
            } else {
                console.log('    ❌ Nested function has no children');
                errors++;
            }
        } else {
            console.log('  ❌ Nested function "innerFunc" not found');
            errors++;
        }
    } else {
        console.log('❌ Function "outerFunc" not found');
        errors++;
    }
    
    // Check for struct
    const myStruct = symbolTree.find(s => s.name === 'MyStruct');
    if (myStruct) {
        console.log('✓ Found struct "MyStruct"');
        if (myStruct.kind === SymbolKind.Struct) {
            console.log('  ✓ Correct kind: Struct');
        } else {
            console.log(`  ❌ Wrong kind: expected Struct, got ${SymbolKind[myStruct.kind]}`);
            errors++;
        }
        
        // Check fields
        const fields = myStruct.children?.filter(c => c.kind === SymbolKind.Field) || [];
        if (fields.length >= 2) {
            console.log(`  ✓ Has ${fields.length} fields: ${fields.map(f => f.name).join(', ')}`);
        } else {
            console.log(`  ❌ Expected at least 2 fields, got ${fields.length}`);
            errors++;
        }
        
        // Check methods
        const methods = myStruct.children?.filter(c => c.kind === SymbolKind.Function) || [];
        if (methods.length >= 2) {
            console.log(`  ✓ Has ${methods.length} methods: ${methods.map(m => m.name).join(', ')}`);
        } else {
            console.log(`  ❌ Expected at least 2 methods, got ${methods.length}`);
            errors++;
        }
    } else {
        console.log('❌ Struct "MyStruct" not found');
        errors++;
    }
    
    // Check for local variable
    const localVar = symbolTree.find(s => s.name === 'localVar');
    if (localVar) {
        console.log('✓ Found local variable "localVar"');
        if (localVar.kind === SymbolKind.LocalVar) {
            console.log('  ✓ Correct kind: LocalVar');
        } else {
            console.log(`  ❌ Wrong kind: expected LocalVar, got ${SymbolKind[localVar.kind]}`);
            errors++;
        }
    } else {
        console.log('❌ Local variable "localVar" not found');
        errors++;
    }

    const wrappedLocal = symbolTree.find(s => s.name === 'wrappedLocal');
    if (wrappedLocal) {
        console.log('✓ Found wrapped local variable "wrappedLocal"');
        if (wrappedLocal.kind === SymbolKind.LocalVar) {
            console.log('  ✓ Correct kind: LocalVar');
        } else {
            console.log(`  ❌ Wrong kind: expected LocalVar, got ${SymbolKind[wrappedLocal.kind]}`);
            errors++;
        }
    } else {
        console.log('❌ Wrapped local variable "wrappedLocal" not found');
        errors++;
    }

    const wrappedFn = symbolTree.find(s => s.name === 'wrappedFn');
    if (wrappedFn) {
        console.log('✓ Found wrapped function "wrappedFn"');
        if (wrappedFn.kind === SymbolKind.Function) {
            console.log('  ✓ Correct kind: Function');
        } else {
            console.log(`  ❌ Wrong kind: expected Function, got ${SymbolKind[wrappedFn.kind]}`);
            errors++;
        }
    } else {
        console.log('❌ Wrapped function "wrappedFn" not found');
        errors++;
    }
    
    console.log();
    
    if (errors === 0) {
        console.log('✅ All validations passed!');
        process.exit(0);
    } else {
        console.log(`❌ ${errors} validation error(s) found`);
        process.exit(1);
    }
    
} catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
    process.exit(1);
}
