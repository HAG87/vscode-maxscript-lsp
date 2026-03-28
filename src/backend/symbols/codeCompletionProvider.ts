import { BaseSymbol, CandidatesCollection, CodeCompletionCore, ICandidateRule, ScopedSymbol } from 'antlr4-c3';
import { CommonTokenStream, ParseTree, ParserRuleContext, Token } from 'antlr4ng';

import { mxsLexer } from '../../parser/mxsLexer.js';
import { mxsParser } from '../../parser/mxsParser.js';
import { ISymbolInfo, SymbolKind } from '../types.js';
import { TreeQuery } from '../TreeQuery.js';
import {
    FnDefinitionSymbol, fnArgsSymbol, fnParamsSymbol, IdentifierSymbol,
    StructDefinitionSymbol, StructMemberSymbol,
    VariableDeclSymbol,
} from './symbolTypes.js';
import { SymbolUtils } from './symbolUtils.js';

/**
 * Rollout control type keyword names — mirrors the grammar's rolloutControlType rule.
 * Listed here because RULE_rolloutControl is a preferred rule that suppresses the
 * individual keyword token candidates, so we must emit them manually.
 */
const ROLLOUT_CONTROL_TYPE_NAMES: readonly string[] = [
    'Angle', 'Bitmap', 'Button', 'CheckBox', 'CheckButton', 'ColorPicker',
    'ComboBox', 'CurveControl', 'DotnetControl', 'DropdownList', 'EditText',
    'GroupBox', 'Hyperlink', 'ImgTag', 'Label', 'ListBox', 'MapButton',
    'MaterialButton', 'MultilistBox', 'PickButton', 'PopupBenu', 'Progressbar',
    'RadioButtons', 'Slider', 'Spinner', 'Subrollout', 'Timer',
];

/**
 * Configuration for code completion behavior
 */
interface ICompletionConfig
{
    /** Source URI for symbol attribution */
    sourceUri: string;
    /** Whether to show debug output (default: false) */
    showDebug?: boolean;
    /** Whether to show results (default: false) */
    showResult?: boolean;
}

/**
 * Token types to ignore during code completion.
 * These tokens don't provide meaningful completion candidates.
 */
const IGNORED_TOKENS = new Set([
    mxsParser.BLOCK_COMMENT,
    mxsParser.LINE_COMMENT,
    mxsParser.STRING,
    mxsParser.NUMBER,
    mxsParser.TIMEVAL,
    mxsParser.RESOURCE,
    mxsParser.TRUE,
    mxsParser.FALSE,
    mxsParser.OFF,
    mxsParser.ID,
    mxsParser.QUOTED_ID,
    mxsParser.NL,
    mxsParser.WS,
    mxsParser.COMPARE,
    mxsParser.ASSIGN,
    mxsParser.UNARY_MINUS,
    mxsParser.MINUS,
    mxsParser.PLUS,
    mxsParser.PROD,
    mxsParser.DIV,
    mxsParser.POW,
    mxsParser.SHARP,
    mxsParser.COMMA,
    mxsParser.COLON,
    mxsParser.GLOB,
    mxsParser.AMP,
    mxsParser.QUESTION,
    mxsParser.LPAREN,
    mxsParser.RPAREN,
    mxsParser.LBRACE,
    mxsParser.RBRACE,
    mxsParser.LBRACK,
    mxsParser.RBRACK,
    Token.EOF,
]);

/**
 * Parser rules that should be preferred for completion.
 * These rules provide the most relevant completion contexts.
 */
const PREFERRED_RULES = new Set([
    mxsParser.RULE_accesibleFactor,
    mxsParser.RULE_accessor,
    mxsParser.RULE_basicFactor,
    mxsParser.RULE_factor,
    // mxsParser.RULE_identifier,
    mxsParser.RULE_name,
    mxsParser.RULE_path,
    mxsParser.RULE_postfixExpr,
    mxsParser.RULE_postfixOp,
    mxsParser.RULE_property,
    mxsParser.RULE_rcmenuControl,
    mxsParser.RULE_rolloutControl,
    mxsParser.RULE_structMember,
]);

/**
 * Code completion provider using antlr4-c3 for MaxScript.
 * Provides context-aware code completion candidates based on parser state.
 */
export class CodeCompletionProvider
{

    /**
     * Convert token type name to pretty format.
     * Converts consecutive uppercase characters to lowercase.
     * Example: "STRUCT" -> "struct", "MacroScript" -> "macroscript"
     */
    private static prettyValue(id: string): string
    {
        return id.split('').reduce((acc: string, c: string, i: number) =>
        {
            if (i < id.length - 1) {
                const next = id[i + 1];
                const currentCase = (c === c.toUpperCase() && c !== c.toLowerCase());
                const nextCase = (next === next.toUpperCase() && next !== next.toLowerCase());
                // If current is uppercase and next is also uppercase, lowercase current
                return currentCase && nextCase ? acc + c.toLowerCase() : acc + c;
            }
            return acc + c.toLowerCase();
        }, '');
    }

    /**
     * Find the token index at the given position in the source.
     * @param tokenStream Token stream to search
     * @param row Line number (1-based)
     * @param column Column number (0-based)
     * @returns Token index at the position
     */
    private static findTokenIndex(tokenStream: CommonTokenStream, row: number, column: number): number
    {
        tokenStream.fill();
        
        for (let index = 0; ; ++index) {
            const token = tokenStream.get(index);
            
            if (token.type === Token.EOF || token.line > row) {
                return index;
            }
            
            if (token.line < row) {
                continue;
            }
            
            const length = token.text?.length ?? 0;
            if ((token.column + length) >= column) {
                return index;
            }
        }
    }

    /**
     * Process token candidates and convert to symbol info entries.
     */
    private static processTokenCandidates(
        candidates: Map<number, number[]>,
        parser: mxsParser,
        sourceUri: string
    ): ISymbolInfo[]
    {
        const result: ISymbolInfo[] = [];

        candidates.forEach((following: number[], type: number) =>
        {
            switch (type) {
                case mxsLexer.EQ:
                    result.push({
                        kind: SymbolKind.Operator,
                        name: "=",
                        description: "Variable assignment",
                        source: sourceUri,
                    });
                    break;
                    
                default: {
                    const value = parser.vocabulary.getDisplayName(type) ?? "";
                    result.push({
                        kind: SymbolKind.Keyword,
                        name: CodeCompletionProvider.prettyValue(value),
                        source: sourceUri,
                    });
                    break;
                }
            }
        });

        return result;
    }

    /**
     * Process rule candidates to gather symbol promises.
     * Returns an array of promises that resolve to symbol arrays.
     */
    private static processRuleCandidates(
        candidates: CandidatesCollection['rules'],
        tree: ParserRuleContext,
        symbolTable: any,
        row: number,
        column: number,
        sourceUri: string
    ): { promises: Array<Promise<BaseSymbol[] | undefined>>, keywords: ISymbolInfo[] }
    {
        const promises: Array<Promise<BaseSymbol[] | undefined>> = [];
        const keywords: ISymbolInfo[] = [];

        candidates.forEach((candidateRule: ICandidateRule, key: number) =>
        {
            switch (key) {
                case mxsParser.RULE_rolloutControl:
                    for (const name of ROLLOUT_CONTROL_TYPE_NAMES) {
                        keywords.push({ kind: SymbolKind.Keyword, name, source: sourceUri });
                    }
                    break;

                case mxsParser.RULE_rcmenuControl:
                    keywords.push(
                        { kind: SymbolKind.Keyword, name: 'MenuItem', source: sourceUri },
                        { kind: SymbolKind.Keyword, name: 'Separator', source: sourceUri },
                    );
                    break;

                case mxsParser.RULE_identifier:
                    {
                        const context = TreeQuery.parseTreeFromPosition(tree as ParseTree, row, column);
                        if (!context) { return; }

                        const currentSymbol = symbolTable.symbolContainingContext(context);

                        if (currentSymbol?.parent) {
                            const entrySymbol: ScopedSymbol =
                                currentSymbol instanceof IdentifierSymbol
                                    ? currentSymbol.parent as ScopedSymbol
                                    : currentSymbol as ScopedSymbol;

                            promises.push(
                                symbolTable.getAllSymbolsOfType(entrySymbol, IdentifierSymbol),
                                symbolTable.getAllSymbolsOfType(entrySymbol, VariableDeclSymbol),
                                symbolTable.getAllSymbolsOfType(entrySymbol, FnDefinitionSymbol),
                                symbolTable.getAllSymbolsOfType(entrySymbol, fnArgsSymbol),
                                symbolTable.getAllSymbolsOfType(entrySymbol, fnParamsSymbol),
                                symbolTable.getAllSymbolsOfType(entrySymbol, StructDefinitionSymbol),
                                symbolTable.getAllSymbolsOfType(entrySymbol, StructMemberSymbol)
                            );
                        }
                        break;
                    }

                case mxsParser.RULE_structMember:
                    keywords.push(
                        {
                            kind: SymbolKind.Keyword,
                            name: 'Public',
                            source: sourceUri,
                            definition: undefined,
                            description: undefined,
                        },
                        {
                            kind: SymbolKind.Keyword,
                            name: 'Private',
                            source: sourceUri,
                            definition: undefined,
                            description: undefined,
                        }
                    );
                    break;
            }
        });

        return { promises, keywords };
    }

    /**
     * Filter and convert symbol lists to ISymbolInfo entries.
     * Filters out symbols that are defined after the current position.
     */
    private static processSymbolResults(
        symbolLists: (BaseSymbol[] | undefined)[],
        row: number,
        sourceUri: string
    ): ISymbolInfo[]
    {
        const result: ISymbolInfo[] = [];
        const collectedNames = new Set<string>();

        symbolLists.forEach((symbols) =>
        {
            if (!symbols) { return; }

            symbols.forEach((symbol) =>
            {
                // Skip if already collected or invalid
                if (!symbol.name || symbol.name === "EOF" || collectedNames.has(symbol.name)) {
                    return;
                }

                // Filter out symbols defined after current position
                if (symbol.context) {
                    const symbolLine = (symbol.context as ParserRuleContext).start?.line ?? 0;
                    if (symbolLine > row) {
                        return;
                    }
                }

                result.push({
                    kind: SymbolUtils.getKindFromSymbol(symbol),
                    name: symbol.name,
                    source: sourceUri,
                    definition: undefined,
                    description: undefined,
                });
                
                collectedNames.add(symbol.name);
            });
        });

        return result;
    }

    /**
     * Get code completion candidates at the specified position.
     * 
     * @param parser Parser instance
     * @param tokenStream Token stream
     * @param tree Parse tree root
     * @param symbolTable Symbol table for the document
     * @param row Line number (1-based)
     * @param column Column number (0-based)
     * @param config Completion configuration
     * @returns Array of completion candidates
     */
    public static async getCandidates(
        parser: mxsParser,
        tokenStream: CommonTokenStream,
        tree: ParserRuleContext,
        symbolTable: any,
        row: number,
        column: number,
        config: ICompletionConfig
    ): Promise<ISymbolInfo[]>
    {
        // Initialize code completion core
        const core = new CodeCompletionCore(parser);
        core.showResult = config.showResult ?? false;
        core.showDebugOutput = config.showDebug ?? false;
        core.ignoredTokens = IGNORED_TOKENS;
        core.preferredRules = PREFERRED_RULES;

        // Find token at position
        const tokenIndex = CodeCompletionProvider.findTokenIndex(tokenStream, row, column);

        // Collect candidates — pass tree to bound ATN walk to this rule context (faster)
        const candidates = core.collectCandidates(tokenIndex, tree);

        // Process token candidates
        const tokenResults = CodeCompletionProvider.processTokenCandidates(
            candidates.tokens,
            parser,
            config.sourceUri
        );

        // Process rule candidates
        const ruleResults = CodeCompletionProvider.processRuleCandidates(
            candidates.rules,
            tree,
            symbolTable,
            row,
            column,
            config.sourceUri
        );

        // Await all symbol lookups
        const symbolLists = await Promise.all(ruleResults.promises);

        // Process symbol results
        const symbolResults = CodeCompletionProvider.processSymbolResults(
            symbolLists,
            row,
            config.sourceUri
        );

        // Combine all results
        return [...tokenResults, ...ruleResults.keywords, ...symbolResults];
    }
}
