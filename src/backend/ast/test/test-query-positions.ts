import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../../parser/mxsLexer.js';
import { mxsParser } from '../../../parser/mxsParser.js';
import { ASTBuilder } from '../ASTBuilder.js';
import { SymbolResolver } from '../SymbolResolver.js';
import {
    FunctionDefinition,
    FunctionArgument,
    ScopeNode,
    VariableReference,
    VariableDeclaration,
    StructDefinition,
} from '../ASTNodes.js';
import { ASTQuery } from '../ASTQuery.js';

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

// --- nested assignment shadowing regression ---------------------------------
const shadowingCode = `fn pivotToSnapPoint mode:#world = (
    local res = undefined
    if snapMode.active then (
        res = snapMode.worldHitpoint
    )
    res
)`;

const shadowInputStream = CharStream.fromString(shadowingCode);
const shadowLexer = new mxsLexer(shadowInputStream);
const shadowTokenStream = new CommonTokenStream(shadowLexer);
const shadowParser = new mxsParser(shadowTokenStream);
const shadowAst = new ASTBuilder().visitProgram(shadowParser.program());
new SymbolResolver(shadowAst).resolve();

console.log();
console.log('=== nested assignment shadowing probes ===');

const resDeclaration = ASTQuery.findDeclarationAtPosition(shadowAst, 2, 10);
const resInNestedAssignment = ASTQuery.findDeclarationAtPosition(shadowAst, 4, 8);
const resAtTailReference = ASTQuery.findDeclarationAtPosition(shadowAst, 6, 4);

const declarationResolved = !!resDeclaration && resDeclaration.name === 'res';
console.log('  declaration site (line 2, col 10)');
console.log(`       => ${declarationResolved ? `✓ ${resDeclaration!.name}` : '❌ unresolved'}`);
if (!declarationResolved) { errors++; }

const nestedAssignResolved = !!resInNestedAssignment && resInNestedAssignment.name === 'res';
console.log('  nested assignment target (line 4, col 8)');
console.log(`       => ${nestedAssignResolved ? `✓ ${resInNestedAssignment!.name}` : '❌ unresolved'}`);
if (!nestedAssignResolved) { errors++; }

const tailRefResolved = !!resAtTailReference && resAtTailReference.name === 'res';
console.log('  tail reference (line 6, col 4)');
console.log(`       => ${tailRefResolved ? `✓ ${resAtTailReference!.name}` : '❌ unresolved'}`);
if (!tailRefResolved) { errors++; }

const sameDeclarationObject = !!resDeclaration
    && resInNestedAssignment === resDeclaration
    && resAtTailReference === resDeclaration;
console.log('  declaration identity (all usages bind to same declaration object)');
console.log(`       => ${sameDeclarationObject ? '✓ same declaration' : '❌ inconsistent binding'}`);
if (!sameDeclarationObject) { errors++; }

// --- case-insensitive resolution regression ----------------------------------
const caseInsensitiveCode = `fn t = (
    local res = 1
    RES = res + 1
    ReS
)`;

const caseInputStream = CharStream.fromString(caseInsensitiveCode);
const caseLexer = new mxsLexer(caseInputStream);
const caseTokenStream = new CommonTokenStream(caseLexer);
const caseParser = new mxsParser(caseTokenStream);
const caseAst = new ASTBuilder().visitProgram(caseParser.program());
new SymbolResolver(caseAst).resolve();

console.log();
console.log('=== case-insensitive scope probes ===');

const ciDecl = ASTQuery.findDeclarationAtPosition(caseAst, 2, 10);
const ciAssign = ASTQuery.findDeclarationAtPosition(caseAst, 3, 4);
const ciTail = ASTQuery.findDeclarationAtPosition(caseAst, 4, 4);

const ciResolved = !!ciDecl && !!ciAssign && !!ciTail;
console.log(`  declarations resolved => ${ciResolved ? '✓' : '❌'}`);
if (!ciResolved) { errors++; }

const ciIdentity = !!ciDecl && ciAssign === ciDecl && ciTail === ciDecl;
console.log(`  mixed-case binds same declaration => ${ciIdentity ? '✓' : '❌'}`);
if (!ciIdentity) { errors++; }

// --- for-loop variable scope regression --------------------------------------
const forScopeCode = `a = 5
for i=1 to 10 do a += i
i`;

const forScopeInput = CharStream.fromString(forScopeCode);
const forScopeLexer = new mxsLexer(forScopeInput);
const forScopeTokens = new CommonTokenStream(forScopeLexer);
const forScopeParser = new mxsParser(forScopeTokens);
const forScopeAst = new ASTBuilder().visitProgram(forScopeParser.program());
new SymbolResolver(forScopeAst).resolve();

console.log();
console.log('=== for-loop scope probes ===');

const forBodyI = ASTQuery.findDeclarationAtPosition(forScopeAst, 2, 22);
const afterLoopI = ASTQuery.findDeclarationAtPosition(forScopeAst, 3, 0);

const forBodyResolved = !!forBodyI && forBodyI.name?.toLowerCase() === 'i';
console.log(`  i resolves inside loop body => ${forBodyResolved ? '✓' : '❌'}`);
if (!forBodyResolved) { errors++; }

const afterLoopUnresolved = !afterLoopI;
console.log(`  i not visible after loop => ${afterLoopUnresolved ? '✓' : '❌'}`);
if (!afterLoopUnresolved) { errors++; }

// --- resolver idempotency regression -----------------------------------------
const idempotentCode = `local x = 1
y = x + x`;
const idemInput = CharStream.fromString(idempotentCode);
const idemLexer = new mxsLexer(idemInput);
const idemTokens = new CommonTokenStream(idemLexer);
const idemParser = new mxsParser(idemTokens);
const idemAst = new ASTBuilder().visitProgram(idemParser.program());
const idemResolver = new SymbolResolver(idemAst);
idemResolver.resolve();
const idemDecl = ASTQuery.findDeclarationAtPosition(idemAst, 1, 6);
const refsAfterFirst = idemDecl?.references.length ?? -1;
idemResolver.resolve();
const refsAfterSecond = idemDecl?.references.length ?? -1;

const idempotent = refsAfterFirst >= 0 && refsAfterFirst === refsAfterSecond;
console.log();
console.log('=== resolver idempotency probe ===');
console.log(`  references stable across repeated resolve => ${idempotent ? '✓' : `❌ (${refsAfterFirst} -> ${refsAfterSecond})`}`);
if (!idempotent) { errors++; }

// --- non-parenthesized control-flow body scoping regression ------------------
console.log();
console.log('=== control-flow body scope leak probes ===');

type ScopeLeakProbe = {
    label: string;
    code: string;
    probeLine: number;
    probeCol: number;
};

const scopeLeakProbes: ScopeLeakProbe[] = [
    {
        label: 'if/do body local should not leak',
        code: `if true do local x = 1\nx`,
        probeLine: 2,
        probeCol: 0,
    },
    {
        label: 'while/do body local should not leak',
        code: `while true do local x = 1\nx`,
        probeLine: 2,
        probeCol: 0,
    },
    {
        label: 'do/while body local should not leak',
        code: `do local x = 1 while false\nx`,
        probeLine: 2,
        probeCol: 0,
    },
    {
        label: 'try/catch locals should not leak',
        code: `try local x = 1 catch local y = 2\nx\ny`,
        probeLine: 2,
        probeCol: 0,
    },
    {
        label: 'case arm local should not leak',
        code: `case 1 of (\n    1: local x = 1\n)\nx`,
        probeLine: 4,
        probeCol: 0,
    },
];

for (const probe of scopeLeakProbes) {
    const input = CharStream.fromString(probe.code);
    const lexer = new mxsLexer(input);
    const tokens = new CommonTokenStream(lexer);
    const parser = new mxsParser(tokens);
    const ast = new ASTBuilder().visitProgram(parser.program());
    new SymbolResolver(ast).resolve();

    const leaked = ASTQuery.findDeclarationAtPosition(ast, probe.probeLine, probe.probeCol);
    const ok = !leaked;
    console.log(`  ${probe.label}`);
    console.log(`       => ${ok ? '✓ no leak' : `❌ leaked ${leaked?.name ?? '<unknown>'}`}`);
    if (!ok) { errors++; }
}

// --- by-reference out parameter regression -----------------------------------
const byRefOutCode = `fn cloner obj tm: type:#instance =
        (
            if isValidNode obj then (
                maxOps.CloneNodes obj cloneType:type newNodes:&newNodes
                if (tm != unsupplied) AND (isKindOf tm Matrix3) then (
                    newNodes[1].transform = tm
                )
                newNodes[1]
            )
        )`;

const byRefInput = CharStream.fromString(byRefOutCode);
const byRefLexer = new mxsLexer(byRefInput);
const byRefTokens = new CommonTokenStream(byRefLexer);
const byRefParser = new mxsParser(byRefTokens);
const byRefAst = new ASTBuilder().visitProgram(byRefParser.program());
new SymbolResolver(byRefAst).resolve();

console.log();
console.log('=== by-reference out parameter probes ===');

const byRefAssignmentUse = ASTQuery.findDeclarationAtPosition(byRefAst, 6, 20);
const byRefTailUse = ASTQuery.findDeclarationAtPosition(byRefAst, 8, 16);

const byRefAssignmentResolved = byRefAssignmentUse?.name === 'newNodes';
console.log(`  newNodes in assignment target resolves => ${byRefAssignmentResolved ? '✓' : `❌ got ${byRefAssignmentUse?.name ?? 'undefined'}`}`);
if (!byRefAssignmentResolved) { errors++; }

const byRefTailResolved = byRefTailUse?.name === 'newNodes';
console.log(`  newNodes in final expression resolves => ${byRefTailResolved ? '✓' : `❌ got ${byRefTailUse?.name ?? 'undefined'}`}`);
if (!byRefTailResolved) { errors++; }

const byRefSameDeclaration = !!byRefAssignmentUse && byRefAssignmentUse === byRefTailUse;
console.log(`  both uses bind same declaration => ${byRefSameDeclaration ? '✓' : '❌'}`);
if (!byRefSameDeclaration) { errors++; }

const byRefDeclOnByRefLine = byRefTailUse?.position?.start.line === 4;
console.log(`  declaration originates from by-ref argument line => ${byRefDeclOnByRefLine ? '✓' : `❌ line ${byRefTailUse?.position?.start.line ?? 'undefined'}`}`);
if (!byRefDeclOnByRefLine) { errors++; }

console.log();
if (errors > 0) {
    console.log(`❌ ${errors} total probe(s) failed`);
    process.exit(1);
} else {
    console.log('✅ All mid-identifier and regression probes passed!');
}
