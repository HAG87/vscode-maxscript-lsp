/**
 * Test: Context, when, and event handler AST nodes
 * Ensures these parser rules are converted into dedicated AST nodes.
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../../parser/mxsLexer.js';
import { mxsParser } from '../../../parser/mxsParser.js';
import { ASTBuilder } from '../ASTBuilder.js';
import {
    ContextStatement,
    EventHandlerStatement,
    StructDefinition,
    VariableReference,
    WhenStatement,
} from '../ASTNodes.js';

const code = `
at time t print t
with undo on x = 1
set animate on
when transform obj deleted id:#foo handlerObj do obj = target
struct EventHost (
    on btn pressed do print btn,
    on spinner changed val return val
)
`;

console.log('=== Context and Handlers Test ===');
console.log('Code:');
console.log(code.trim());
console.log();

try {
    const inputStream = CharStream.fromString(code);
    const lexer = new mxsLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new mxsParser(tokenStream);

    const builder = new ASTBuilder();
    const ast = builder.visitProgram(parser.program());

    console.log(`✓ AST built: ${ast.statements.length} statements`);

    const contexts = ast.statements.filter(s => s instanceof ContextStatement) as ContextStatement[];
    const whenStatements = ast.statements.filter(s => s instanceof WhenStatement) as WhenStatement[];
    const structDef = ast.statements.find(s => s instanceof StructDefinition) as StructDefinition | undefined;
    const eventHandlers = structDef?.members
        .map(member => member.value)
        .filter((value): value is EventHandlerStatement => value instanceof EventHandlerStatement) ?? [];

    const hasCascadingContext = contexts.some(stmt => stmt.mode === 'cascading' && stmt.body);
    const hasSetContext = contexts.some(stmt => stmt.mode === 'set' && stmt.clauses[0]?.label === 'animate');

    const whenStmt = whenStatements[0];
    const hasWhenTargetType = whenStmt?.targetType instanceof VariableReference && whenStmt.targetType.name === 'transform';
    const hasWhenDeleted = whenStmt?.event === 'deleted';
    const hasWhenParameters = (whenStmt?.parameters.length ?? 0) === 1;
    const hasWhenHandler = whenStmt?.handler instanceof VariableReference && whenStmt.handler.name === 'handlerObj';

    const firstHandler = eventHandlers[0];
    const secondHandler = eventHandlers[1];
    const hasTargetedEvent = firstHandler?.target?.name === 'btn' && firstHandler.eventType.name === 'pressed';
    const hasReturnEvent = secondHandler?.target?.name === 'spinner'
        && secondHandler.eventType.name === 'changed'
        && secondHandler.action === 'return'
        && secondHandler.eventArgs.length === 1
        && secondHandler.eventArgs[0]?.name === 'val';

    console.log(`  - ContextStatement (cascading): ${hasCascadingContext}`);
    console.log(`  - ContextStatement (set): ${hasSetContext}`);
    console.log(`  - WhenStatement target type: ${hasWhenTargetType}`);
    console.log(`  - WhenStatement deleted event: ${hasWhenDeleted}`);
    console.log(`  - WhenStatement parameters: ${hasWhenParameters}`);
    console.log(`  - WhenStatement handler: ${hasWhenHandler}`);
    console.log(`  - EventHandler target/event: ${hasTargetedEvent}`);
    console.log(`  - EventHandler return args: ${hasReturnEvent}`);

    if (
        hasCascadingContext
        && hasSetContext
        && hasWhenTargetType
        && hasWhenDeleted
        && hasWhenParameters
        && hasWhenHandler
        && hasTargetedEvent
        && hasReturnEvent
    ) {
        console.log();
        console.log('✅ Context and handler AST node construction works');
    } else {
        console.log();
        console.log('❌ Missing one or more context/handler AST expectations');
        process.exitCode = 1;
    }
} catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
    process.exitCode = 1;
}