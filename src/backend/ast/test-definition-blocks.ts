/**
 * Test: Definition block AST and symbol nodes
 * Ensures major MaxScript definition blocks are converted into DefinitionBlock AST nodes
 * and exposed through the symbol tree.
 */

import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../parser/mxsLexer.js';
import { mxsParser } from '../../parser/mxsParser.js';
import { SymbolKind } from '../../types.js';
import { ASTBuilder } from './ASTBuilder.js';
import { SymbolTreeBuilder } from './SymbolTreeBuilder.js';
import {
    DefinitionBlock,
    EventHandlerStatement,
    FunctionDefinition,
    ParameterDefinition,
    RcMenuItem,
    RolloutControl,
    StructDefinition,
    VariableDeclaration,
} from './ASTNodes.js';

const code = `
macroscript MyMacro category:"Demo" (
    local mx = 1
    fn runMacro arg = arg + mx
    on execute do runMacro mx
)

utility MyUtility "Util" (
    local ux = 1
)

rollout MyRollout "Roll" (
    local rx = 1
    button btn "Run" width:120
    group "Advanced" (
        spinner spinAmount "Amount" range:[0,100,10]
    )
    fn refresh = rx
    on btn pressed do refresh()
)

tool MyTool (
    local tx = 1
)

rcmenu MyMenu (
    local rcx = 1
    submenu "Tools" (
        menuitem runItem "Run"
        separator sep
    )
)

plugin geometry MyPlugin (
    local px = 1
    parameters main rollout:MyRollout (
        width type:#float default:10
        on width set val do print val
    )
    tool NestedTool (
        local ntx = 2
    )
)

attributes MyAttr (
    local ax = 1
    parameters attrs (
        enabled type:#boolean default:true
    )
)
`;

console.log('=== Definition Blocks Test ===');
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

    const definitionBlocks = ast.statements.filter(stmt => stmt instanceof DefinitionBlock) as DefinitionBlock[];
    console.log(`✓ AST built: ${ast.statements.length} statements`);
    console.log(`✓ Definition blocks: ${definitionBlocks.length}`);

    const byKind = new Map(definitionBlocks.map(block => [block.kind, block]));
    const plugin = byKind.get('plugin');
    const rollout = byKind.get('rollout');
    const macroscript = byKind.get('macroscript');
    const menu = byKind.get('rcmenu');
    const attributes = byKind.get('attributes');

    const hasAllTopLevelKinds = ['macroscript', 'utility', 'rollout', 'tool', 'rcmenu', 'plugin', 'attributes']
        .every(kind => byKind.has(kind as DefinitionBlock['kind']));
    const hasPluginKind = plugin?.pluginKind === 'geometry';
    const hasNestedTool = plugin?.clauses.some(clause => clause instanceof DefinitionBlock && clause.name === 'NestedTool');
    const hasPluginParams = plugin?.clauses.some(clause => clause instanceof DefinitionBlock && clause.kind === 'parameters' && clause.name === 'main');
    const hasMacroFunction = macroscript?.clauses.some(clause => clause instanceof FunctionDefinition && clause.name === 'runMacro');
    const hasMacroEvent = macroscript?.clauses.some(clause => clause instanceof EventHandlerStatement);
    const hasRolloutLocal = rollout?.clauses.some(clause => clause instanceof VariableDeclaration && clause.name === 'rx');
    const hasRolloutEvent = rollout?.clauses.some(clause => clause instanceof EventHandlerStatement);
    const rolloutControl = rollout?.clauses.find(clause => clause instanceof RolloutControl && clause.name === 'btn') as RolloutControl | undefined;
    const rolloutGroup = rollout?.clauses.find(clause => clause instanceof DefinitionBlock && clause.kind === 'rolloutGroup') as DefinitionBlock | undefined;
    const submenu = menu?.clauses.find(clause => clause instanceof DefinitionBlock && clause.kind === 'submenu') as DefinitionBlock | undefined;
    const pluginParams = plugin?.clauses.find(clause => clause instanceof DefinitionBlock && clause.kind === 'parameters' && clause.name === 'main') as DefinitionBlock | undefined;
    const hasRolloutControl = rolloutControl?.controlType === 'button';
    const hasRolloutGroupControl = rolloutGroup?.clauses.some(clause => clause instanceof RolloutControl && clause.name === 'spinAmount');
    const hasSubmenuControl = submenu?.clauses.some(clause => clause instanceof RcMenuItem && clause.name === 'runItem');
    const hasParameterDefinition = pluginParams?.clauses.some(clause => clause instanceof ParameterDefinition && clause.name === 'width');
    const hasAttributesParams = attributes?.clauses.some(clause => clause instanceof DefinitionBlock && clause.kind === 'parameters' && clause.name === 'attrs');

    const symbols = SymbolTreeBuilder.buildSymbolTree(ast, 'test://definition-blocks.ms');
    const symbolKinds = new Map(symbols.map(symbol => [symbol.name, symbol.kind]));
    const rolloutSymbol = symbols.find(symbol => symbol.name === 'MyRollout');
    const pluginSymbol = symbols.find(symbol => symbol.name === 'MyPlugin');
    const menuSymbol = symbols.find(symbol => symbol.name === 'MyMenu');
    const attributesSymbol = symbols.find(symbol => symbol.name === 'MyAttr');

    const hasTopLevelSymbols = symbolKinds.get('MyMacro') === SymbolKind.MacroScript
        && symbolKinds.get('MyUtility') === SymbolKind.Utility
        && symbolKinds.get('MyRollout') === SymbolKind.Rollout
        && symbolKinds.get('MyTool') === SymbolKind.Tool
        && symbolKinds.get('MyMenu') === SymbolKind.RcMenu
        && symbolKinds.get('MyPlugin') === SymbolKind.Plugin
        && symbolKinds.get('MyAttr') === SymbolKind.Attributes;
    const hasRolloutEventSymbol = rolloutSymbol?.children?.some(child => child.kind === SymbolKind.Event && child.name === 'btn.pressed');
    const hasNestedToolSymbol = pluginSymbol?.children?.some(child => child.kind === SymbolKind.Tool && child.name === 'NestedTool');
    const hasRolloutControlSymbol = rolloutSymbol?.children?.some(child => child.kind === SymbolKind.Control && child.name === 'btn' && child.description === 'button');
    const hasRolloutGroupSymbol = rolloutSymbol?.children?.some(child => child.kind === SymbolKind.Object && child.name === 'Advanced');
    const rolloutGroupSymbol = rolloutSymbol?.children?.find(child => child.kind === SymbolKind.Object && child.name === 'Advanced');
    const hasNestedRolloutControlSymbol = rolloutGroupSymbol?.children?.some(child => child.kind === SymbolKind.Control && child.name === 'spinAmount');
    const hasSubmenuSymbol = menuSymbol?.children?.some(child => child.kind === SymbolKind.Object && child.name === 'Tools');
    const submenuSymbol = menuSymbol?.children?.find(child => child.kind === SymbolKind.Object && child.name === 'Tools');
    const hasRcMenuItemSymbol = submenuSymbol?.children?.some(child => child.kind === SymbolKind.RcMenuControl && child.name === 'runItem' && child.description === 'menuitem');
    const hasParamsBlockSymbol = pluginSymbol?.children?.some(child => child.kind === SymbolKind.Parameters && child.name === 'main');
    const paramsSymbol = pluginSymbol?.children?.find(child => child.kind === SymbolKind.Parameters && child.name === 'main');
    const hasParamEntrySymbol = paramsSymbol?.children?.some(child => child.kind === SymbolKind.Parameter && child.name === 'width');
    const hasAttrParamsSymbol = attributesSymbol?.children?.some(child => child.kind === SymbolKind.Parameters && child.name === 'attrs');

    console.log(`  - All definition kinds present: ${hasAllTopLevelKinds}`);
    console.log(`  - Plugin kind captured: ${hasPluginKind}`);
    console.log(`  - Plugin nested tool: ${hasNestedTool}`);
    console.log(`  - Plugin params block: ${hasPluginParams}`);
    console.log(`  - Macro function clause: ${hasMacroFunction}`);
    console.log(`  - Macro event clause: ${hasMacroEvent}`);
    console.log(`  - Rollout local clause: ${hasRolloutLocal}`);
    console.log(`  - Rollout event clause: ${hasRolloutEvent}`);
    console.log(`  - Rollout control clause: ${hasRolloutControl}`);
    console.log(`  - Rollout group control clause: ${hasRolloutGroupControl}`);
    console.log(`  - RC submenu control clause: ${hasSubmenuControl}`);
    console.log(`  - Parameter definition clause: ${hasParameterDefinition}`);
    console.log(`  - Attributes params block: ${hasAttributesParams}`);
    console.log(`  - Top-level symbol kinds: ${hasTopLevelSymbols}`);
    console.log(`  - Rollout event symbol: ${hasRolloutEventSymbol}`);
    console.log(`  - Plugin nested tool symbol: ${hasNestedToolSymbol}`);
    console.log(`  - Rollout control symbol: ${hasRolloutControlSymbol}`);
    console.log(`  - Rollout group symbol: ${hasRolloutGroupSymbol}`);
    console.log(`  - Nested rollout control symbol: ${hasNestedRolloutControlSymbol}`);
    console.log(`  - RC submenu symbol: ${hasSubmenuSymbol}`);
    console.log(`  - RC menu item symbol: ${hasRcMenuItemSymbol}`);
    console.log(`  - Params block symbol: ${hasParamsBlockSymbol}`);
    console.log(`  - Param entry symbol: ${hasParamEntrySymbol}`);
    console.log(`  - Attributes params symbol: ${hasAttrParamsSymbol}`);

    if (
        hasAllTopLevelKinds
        && hasPluginKind
        && hasNestedTool
        && hasPluginParams
        && hasMacroFunction
        && hasMacroEvent
        && hasRolloutLocal
        && hasRolloutEvent
        && hasRolloutControl
        && hasRolloutGroupControl
        && hasSubmenuControl
        && hasParameterDefinition
        && hasAttributesParams
        && hasTopLevelSymbols
        && hasRolloutEventSymbol
        && hasNestedToolSymbol
        && hasRolloutControlSymbol
        && hasRolloutGroupSymbol
        && hasNestedRolloutControlSymbol
        && hasSubmenuSymbol
        && hasRcMenuItemSymbol
        && hasParamsBlockSymbol
        && hasParamEntrySymbol
        && hasAttrParamsSymbol
    ) {
        console.log();
        console.log('✅ Definition block AST and symbol construction works');
    } else {
        console.log();
        console.log('❌ Missing one or more definition block expectations');
        process.exitCode = 1;
    }
} catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
    process.exitCode = 1;
}