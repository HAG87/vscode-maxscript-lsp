import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../parser/mxsLexer.js';
import { mxsParser } from '../../parser/mxsParser.js';
import { ASTBuilder } from './ASTBuilder.js';
import { SymbolResolver } from './SymbolResolver.js';
import {
    FunctionDefinition,
    FunctionArgument,
    ScopeNode,
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

// --- shuffleIndices sample from provider report --------------------------------
const shuffleIndicesCode = `fn shuffleIndices indexArray =
		(
			local current = indexArray.count
			while current > 1 do (
				local rnd = random 1 (current)
				local itm = copy indexArray[current]
				indexArray[current] = indexArray[rnd]
				indexArray[rnd] = itm 
				current -= 1
			)
			indexArray
		)`;

const siInputStream = CharStream.fromString(shuffleIndicesCode);
const siLexer = new mxsLexer(siInputStream);
const siTokenStream = new CommonTokenStream(siLexer);
const siParser = new mxsParser(siTokenStream);
const siAst = new ASTBuilder().visitProgram(siParser.program());
new SymbolResolver(siAst).resolve();

const siProbes: Array<[number, number, string, string]> = [
    [3, 9, 'current', 'declaration name "current"'],
    [4, 9, 'current', 'while condition reference "current"'],
    [5, 27, 'current', 'random argument reference "current"'],
    [6, 32, 'current', 'index accessor reference "current" in copy expression'],
    [7, 15, 'current', 'index accessor reference "current" in assignment target'],
    [7, 38, 'rnd', 'index accessor reference "rnd" in assignment value'],
    [8, 15, 'rnd', 'index accessor reference "rnd" in assignment target'],
];

console.log();
console.log('=== shuffleIndices index accessor regression probes ===');
for (const [line, col, expectedName, label] of siProbes) {
    const result = ASTQuery.findDeclarationAtPosition(siAst, line, col);
    const ok = result?.name === expectedName;
    const status = ok ? `✓  ${result!.name}` : `❌  got ${result?.name ?? 'undefined'}, expected ${expectedName}`;
    console.log(`  (${line}:${col}) ${label}`);
    console.log(`       => ${status}`);
    if (!ok) { errors++; }
}

// --- struct member access regression -----------------------------------------
const structMemberCode = `struct foo (
	fn bar = (print "hello")
)
st = foo()
foo.bar()
st.bar()`;

const structInputStream = CharStream.fromString(structMemberCode);
const structLexer = new mxsLexer(structInputStream);
const structTokenStream = new CommonTokenStream(structLexer);
const structParser = new mxsParser(structTokenStream);
const structAst = new ASTBuilder().visitProgram(structParser.program());
new SymbolResolver(structAst).resolve();

const structProbes: Array<[number, number, string, string]> = [
    [4, 5, 'foo', 'instance variable initializer callee "foo"'],
    [5, 0, 'foo', 'struct name reference in "foo.bar()"'],
    [5, 4, 'bar', 'member method reference in "foo.bar()"'],
    [6, 0, 'st', 'instance variable reference "st" (type inferred from assignment)'],
    [6, 3, 'bar', 'member method reference in "st.bar()"'],
];

console.log();
console.log('=== struct member regression probes ===');
for (const [line, col, expectedName, label] of structProbes) {
    const result = ASTQuery.findDeclarationAtPosition(structAst, line, col);
    const ok = result?.name === expectedName;
    const status = ok ? `✓  ${result!.name}` : `❌  got ${result?.name ?? 'undefined'}, expected ${expectedName}`;
    console.log(`  (${line}:${col}) ${label}`);
    console.log(`       => ${status}`);
    if (!ok) { errors++; }
}

const barDeclaration = ASTQuery.findDeclarationAtPosition(structAst, 5, 4);
const barMemberRefs = barDeclaration
    ? ASTQuery.findMemberReferencesForDeclaration(structAst, barDeclaration)
    : [];
const barMemberRefCountOk = barMemberRefs.length >= 2;
console.log(`  member references for "bar" => ${barMemberRefs.length} (expected >= 2 from foo.bar and st.bar)`);
if (!barMemberRefCountOk) {
    console.log('       => ❌ member references are incomplete');
    errors++;
} else {
    console.log('       => ✓ member references include struct and instance calls');
}

// --- implicit variable declarations regression ---------------------------------
const implicitCode = `f = 10
g = f + 5`;

const implicitInputStream = CharStream.fromString(implicitCode);
const implicitLexer = new mxsLexer(implicitInputStream);
const implicitTokenStream = new CommonTokenStream(implicitLexer);
const implicitParser = new mxsParser(implicitTokenStream);
const implicitAst = new ASTBuilder().visitProgram(implicitParser.program());
new SymbolResolver(implicitAst).resolve();

const implicitProbes: Array<[number, number, string, string]> = [
    [1, 0, 'f', 'implicit declaration assignment "f = 10"'],
    [2, 4, 'f', 'implicit reference "f" in g = f + 5'],
];

console.log();
console.log('=== implicit variable declaration probes ===');
for (const [line, col, expectedName, label] of implicitProbes) {
    const result = ASTQuery.findDeclarationAtPosition(implicitAst, line, col);
    const ok = result?.name === expectedName;
    const status = ok ? `✓  ${result!.name}` : `❌  got ${result?.name ?? 'undefined'}, expected ${expectedName}`;
    console.log(`  (${line}:${col}) ${label}`);
    console.log(`       => ${status}`);
    if (!ok) { errors++; }
}

// --- linear visibility in completions regression -------------------------------
const linearVisibilityCode = `foo
local foo = "hello"`;

const linearInputStream = CharStream.fromString(linearVisibilityCode);
const linearLexer = new mxsLexer(linearInputStream);
const linearTokenStream = new CommonTokenStream(linearLexer);
const linearParser = new mxsParser(linearTokenStream);
const linearAst = new ASTBuilder().visitProgram(linearParser.program());
new SymbolResolver(linearAst).resolve();

console.log();
console.log('=== linear declaration visibility probes ===');

const beforeNode = ASTQuery.findNodeAtPosition(linearAst, 1, 0);
const beforeScope = beforeNode
    ? (beforeNode instanceof ScopeNode ? beforeNode : ASTQuery.getEnclosingScope(beforeNode))
    : undefined;
const beforeVisible = beforeScope
    ? ASTQuery.getVisibleDeclarationsAtPosition(beforeScope, 1, 0)
    : [];
const hasFooBefore = beforeVisible.some(d => d.name === 'foo');
console.log('  completions before declaration (line 1, col 0)');
console.log(`       => ${hasFooBefore ? '❌ contains foo' : '✓ foo not visible before declaration'}`);
if (hasFooBefore) { errors++; }

const afterNode = ASTQuery.findNodeAtPosition(linearAst, 2, 8);
const afterScope = afterNode
    ? (afterNode instanceof ScopeNode ? afterNode : ASTQuery.getEnclosingScope(afterNode))
    : undefined;
const afterVisible = afterScope
    ? ASTQuery.getVisibleDeclarationsAtPosition(afterScope, 2, 8)
    : [];
const hasFooAfter = afterVisible.some(d => d.name === 'foo');
console.log('  completions after declaration start (line 2, col 8)');
console.log(`       => ${hasFooAfter ? '✓ foo visible after declaration' : '❌ foo missing after declaration'}`);
if (!hasFooAfter) { errors++; }

// --- struct member completions regression ---------------------------------
const memberCompletionCode = `struct foo (
	fn bar = (print "hello"),
	fn baz x = x + 1
)
st = foo()`;

const memberInputStream = CharStream.fromString(memberCompletionCode);
const memberLexer = new mxsLexer(memberInputStream);
const memberTokenStream = new CommonTokenStream(memberLexer);
const memberParser = new mxsParser(memberTokenStream);
const memberAst = new ASTBuilder().visitProgram(memberParser.program());
new SymbolResolver(memberAst).resolve();

console.log();
console.log('=== struct member completion probes ===');

// Test 1: Get member completions for st
// st is assigned the result of foo(), which is a struct instance
const stDecl = ASTQuery.findDeclarationAtPosition(memberAst, 5, 0);
if (stDecl) {
    const members = ASTQuery.getMemberCompletions(memberAst, stDecl);
    const memberNames = members.map(m => m.name).filter(Boolean);
    const hasBar = members.some(m => m.name === 'bar');
    const hasBaz = members.some(m => m.name === 'baz');
    const ok = hasBar && hasBaz && members.length >= 2;
    const status = ok ? `✓ Found ${memberNames.length} members [${memberNames.join(', ')}]` : 
                       `❌ Expected [bar, baz], got [${memberNames.join(', ')}] (bar: ${hasBar}, baz: ${hasBaz})`;
    console.log(`  st member completions`);
    console.log(`       => ${status}`);
    if (!ok) { errors++; }
} else {
    console.log(`  st member completions`);
    console.log(`       => ❌ Could not resolve st declaration`);
    errors++;
}

console.log();
if (errors > 0) {
    console.log(`❌ ${errors} total probe(s) failed`);
    process.exit(1);
} else {
    console.log('✅ All mid-identifier and regression probes passed!');
}
