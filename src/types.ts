/*
 * Copyright (c) Mike Lischke. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
*/

export interface ICodeFormatSettings
{
    indentChar: string,
    newLineChar: string,
    exprEndChar: string,
    lineContinuationChar: string,
    whitespaceChar: string,
    codeblock: {
        /**
         * If true, the formatter will add a line break after the opening and closing braces of a code block. when the code block contains multiple expressions
         */
        parensInNewLine: boolean,
        /**
         * If true, the formatter will add a line break after the opening and closing braces of a code block whenever is possible, regarding the number of expressions in the block.
         */
        newlineAllways: boolean,
        /**
         * If true, the formatter will add witespace after the opening and before the closing braces of a code block whenever the block contains a single expression.
         */
        spaced: boolean,
    },
    statements: {
        /**
		 * if true, the formatter will add a line break after keywords like `do`, `else`, `try`, `catch`, `then`, `where`, `while`
		 */
        useLineBreaks: boolean,
        /**
         * If true, the formatter will add optional whitespaces in statements.
         */
        optionalWhitespace: boolean
    },
    list: {
        /**
         * Add line breaks after each list item in an array or point structure.
         */
        useLineBreaks: boolean
    }
}

export interface IPrettifySettings
{
    filePrefix?: string,
    keepComments?: boolean,
    keepEmptyLines?: boolean,
    expressionsToBlock: boolean,
}

export interface IMinifySettings
{
    filePrefix?: string,
    condenseWhitespace: boolean,
    removeUnnecessaryScopes: boolean,
}

export interface IMaxScriptSettings
{
    language?: {
        SemanticTokens: boolean,
        GoToSymbol: boolean,
        GoToDefinition: boolean,
        GoToReferences: boolean,
        Diagnostics: boolean,
    },
    parser?: {
        /** Debounce delay in milliseconds before reparsing after text changes (default: 300ms) */
        reparseDelay: number,
    },
    completions: {
        dataBaseCompletion: boolean,
        codeCompletion: boolean
    };
    // parser: {
    // 	multiThreading: boolean,
    // }
    formatter: ICodeFormatSettings;
    prettifier: Partial<IPrettifySettings>;
    minifier: Partial<IMinifySettings>;
}

export const semTokenTypes =
    [
		'method',
        'class',
        'function',
        'interface',
        'keyword',
        'namespace',
        'struct',
        'type',
        'variable',
        'parameter',
        'property',
        'accessor',
        // 'enumMember',
        // 'string',
        // 'number',
        // 'member',
    ];

export const semTokenModifiers =
    [
		'defaultLibrary',
        'declaration',
        'modification',
        'readonly',
        'static',
        // 'documentation',
        // 'abstract',
        // 'deprecated',
    ];

export interface ISemanticToken
{
	line: number;
	startCharacter: number;
	length: number;
	tokenType: number | string;
	tokenModifiers: number | string[];
}

/**
 * A symbol kind.
 */
export enum SymbolKind
{
	Accessor,
	Array,
	RcMenuControl,
	Attributes,
	BitArray,
	Boolean,
	Call,
	Constant,
	Control,
	Declaration,	
	Event,
	Field,
	Function,
	Identifier,
	Keyword,
	MacroScript,
	Null,
	Number,
	Object,
	Operator,
	Parameters,
	Plugin,
	Property,
	RcMenu,
	Rollout,
	String,
	Struct,
	Tool,
	Utility,
    Argument,
    GlobalVar,
    LocalVar,
    Parameter,
    Variable,
}


/**
 * A range within a text. Just like the range object in vscode the end position is not included in the range.
 * Hence when start and end position are equal the range is empty.
 */
export interface ILexicalRange
{
	start: {
		row: number;
		column: number;
	};
	end: {
		row: number;
		column: number;
	};
}

export interface IDefinition
{
	text: string;
	range: ILexicalRange;
}

export interface ISymbolInfo
{
	name: string;
	kind: SymbolKind;
	source: string;
	definition?: IDefinition;
	/** Used for code completion. Provides a small description for certain symbols. */
	description?: string;
	children?: ISymbolInfo[];
}

export enum DiagnosticType
{
	Hint,
	Info,
	Warning,
	Error,
}

export interface IDiagnosticEntry
{
	type: DiagnosticType;
	message: string;
	range: ILexicalRange;
}