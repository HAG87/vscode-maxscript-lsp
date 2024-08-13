/*
 * Copyright (c) Mike Lischke. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
*/


/**
 * A symbol kind.
 */
export enum SymbolKind
{
	Plugin,
	MacroScript,
	Tool,
	Utility,
	Rollout,
	RcMenu,
	Parameters,
	Control,
	Attributes,
	Event,
	Struct,
	Function,
	
	Declaration,	
	Call,
	Property,
	Accessor,

	Identifier,
	Operator,
	Keyword,
	Array,
	BitArray,

	Object,
	Constant,
	String,
	Number,
	Boolean,
	Null,
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
