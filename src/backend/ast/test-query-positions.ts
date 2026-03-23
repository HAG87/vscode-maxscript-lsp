import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../parser/mxsLexer.js';
import { mxsParser } from '../../parser/mxsParser.js';
import { ASTBuilder } from './ASTBuilder.js';
import { SymbolResolver } from './SymbolResolver.js';
import {
    FunctionDefinition,
    FunctionArgument,
    VariableReference,
    VariableDeclaration,
    StructDefinition,
} from './ASTNodes.js';
import { ASTQuery } from './ASTQuery.js';

const code = `
fn myFunc x = (
    local y = x * 2
    z = y + 1
    return z
)

local a = 10
b = myFunc a
`;

const inputStream = CharStream.fromString(code);
const lexer = new mxsLexer(inputStream);
const tokenStream = new CommonTokenStream(lexer);
const parser = new mxsParser(tokenStream);
const builder = new ASTBuilder();
const ast = builder.visitProgram(parser.program());
const resolver = new SymbolResolver(ast, builder.getAllReferences());
resolver.resolve();

console.log('=== Direct program children check ===');
console.log(`  ast.statements.length = ${ast.statements.length}`);
for (const stmt of ast.statements) {
    const pos = stmt.position;
    console.log(
        `  ${stmt.constructor.name.padEnd(30)}`,
        (stmt as { name?: string }).name ? `name=${(stmt as { name?: string }).name}` : '',
        pos ? `[${pos.start.line}:${pos.start.column} → ${pos.end.line}:${pos.end.column}]` : '(no position)',
        `parent=${stmt.parent?.constructor.name ?? 'null'}`,
    );
}
console.log();

console.log('=== All nodes in tree ===');
for (const node of ASTQuery.walkAllNodes(ast)) {
    const pos = node.position;
    const name = (node as { name?: string }).name;
    console.log(
        `  ${node.constructor.name.padEnd(28)}`,
        name ? `name=${String(name).padEnd(10)}` : ' '.repeat(15),
        pos ? `[${pos.start.line}:${pos.start.column} → ${pos.end.line}:${pos.end.column}]` : '(no pos)',
    );
}
console.log();

console.log('=== Specific node types ===');
for (const node of ast.walkDescendants()) {
    if (
        node instanceof FunctionDefinition
        || node instanceof FunctionArgument
        || node instanceof VariableDeclaration
        || node instanceof VariableReference
        || node instanceof StructDefinition
    ) {
        const pos = node.position;
        console.log(
            node.constructor.name.padEnd(24),
            (node as { name?: string }).name?.padEnd(12),
            pos ? `[${pos.start.line}:${pos.start.column} → ${pos.end.line}:${pos.end.column}]` : '(no position)',
        );
    }
}

console.log();
console.log('=== ASTQuery.findDeclarationAtPosition probes ===');
const probes: Array<[number, number, string]> = [
    [2, 3, 'fn keyword offset — should resolve to myFunc'],
    [2, 4, 'fn name start — should resolve to myFunc'],
    [2, 10, 'fn arg "x" — should resolve to x'],
    [9, 4, 'call "myFunc" — should resolve to myFunc'],
];
// Mid-identifier cursor probes — the bug: cursor inside "myFunc" was resolving
// to the wrong declaration because end.column == start.column for single-token nodes.
const midIdentifierProbes: Array<[number, number, string, string]> = [
    [2, 5, 'myFunc', 'mid-name col 5 of "myFunc" at declaration site'],
    [2, 9, 'myFunc', 'end-name col 9 of "myFunc" at declaration site'],
    [9, 5, 'myFunc', 'mid-name col 5 of "myFunc" at call site'],
    [9, 9, 'myFunc', 'end-name col 9 of "myFunc" at call site'],
    [2, 10, 'x', 'start of arg "x"'],
    [9, 11, 'a', 'mid-identifier of "a" at call site'],
];
let errors = 0;
for (const [line, col, label] of probes) {
    const result = ASTQuery.findDeclarationAtPosition(ast, line, col);
    const status = result ? `✓  ${result.name}` : '❌  undefined';
    console.log(`  (${line}:${col}) ${label}`);
    console.log(`       => ${status}`);
    if (!result) { errors++; }
}

console.log();
if (errors > 0) {
    console.log(`❌ ${errors} probes returned undefined — lookup needs adjustment`);
    process.exit(1);
} else {
    console.log('✅ All probes passed!');
}

// --- Mid-identifier regression -----------------------------------------------
console.log('=== Mid-identifier cursor probes (regression for reference provider bug) ===');
for (const [line, col, expectedName, label] of midIdentifierProbes) {
    const result = ASTQuery.findDeclarationAtPosition(ast, line, col);
    const ok = result?.name === expectedName;
    const status = ok ? `✓  ${result!.name}` : `❌  got ${result?.name ?? 'undefined'}, expected ${expectedName}`;
    console.log(`  (${line}:${col}) ${label}`);
    console.log(`       => ${status}`);
    if (!ok) { errors++; }
}

// --- sortMax sample from bug report -------------------------------------------
// fn sortMax arr1 arr2 = ( local first = arr1[1], second = arr2[1] case of (...) )
// "first" is a local variable — cursor mid-identifier should NOT resolve to the function.
const sortMaxCode = `fn sortMax arr1 arr2 =
	(
		local first = arr1[1],
		second = arr2[1]
		case of (
			(first < second): 1
			(first > second): -1
			default:0
		)
	)`;

const smInputStream = CharStream.fromString(sortMaxCode);
const smLexer = new mxsLexer(smInputStream);
const smTokenStream = new CommonTokenStream(smLexer);
const smParser = new mxsParser(smTokenStream);
const smAst = new ASTBuilder().visitProgram(smParser.program());
new SymbolResolver(smAst).resolve();

const smProbes: Array<[number, number, string, string]> = [
    [6, 4, 'first', '"first" reference in case condition (col 4 = start)'],
    [6, 6, 'first', '"first" reference in case condition (col 6 = mid)'],
    [7, 4, 'first', '"first" reference in second case arm (col 4 = start)'],
    [7, 6, 'first', '"first" reference in second case arm (col 6 = mid)'],
];

console.log();
console.log('=== sortMax regression probes ===');
for (const [line, col, expectedName, label] of smProbes) {
    const result = ASTQuery.findDeclarationAtPosition(smAst, line, col);
    const ok = result?.name === expectedName;
    const status = ok ? `✓  ${result!.name}` : `❌  got ${result?.name ?? 'undefined'}, expected ${expectedName}`;
    console.log(`  (${line}:${col}) ${label}`);
    console.log(`       => ${status}`);
    if (!ok) { errors++; }
}

console.log();
if (errors > 0) {
    console.log(`❌ ${errors} total probe(s) failed`);
    process.exit(1);
} else {
    console.log('✅ All mid-identifier and regression probes passed!');
}
