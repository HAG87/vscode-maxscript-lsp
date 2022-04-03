import { SymbolKind } from 'vscode-languageserver';

export interface mxsSymbolMatch
{
	type: string;
	match: RegExp;
	kind: SymbolKind;
}

export const mxsSymbols: mxsSymbolMatch[] = [
	{
		type: 'attributes',
		match: /attributes\s+(\b\w+)/ig,
		kind: SymbolKind.Constructor,
	},
	{
		type: 'struct',
		match: /struct\s+(\b\w+)/ig,
		kind: SymbolKind.Struct,
	},
	{
		type: 'function',
		match: /(fn|function)\s+(\b\w+)/ig,
		kind: SymbolKind.Function,
	},
	/*
	{
		type: 'localVar',
		match: /local\s+(\b\w+)/ig,
		kind: SymbolKind.Variable,
	},
	{
		type: 'globalVar',
		match: /global\s+(\b\w+)/ig,
		kind: SymbolKind.Variable,
	},
	{
		type: 'globalTyped',
		match: /(::\w+)/ig,
		kind: SymbolKind.Variable,
	},
	*/
	{
		type: 'plugin',
		match: /plugin\s+(\b\w+)/ig,
		kind: SymbolKind.Module,
	},
	{
		type: 'macroscript',
		match: /macroscript\s+(\b\w+)/ig,
		kind: SymbolKind.Module,
	},
	{
		type: 'rollout',
		match: /rollout\s+(\b\w+)/ig,
		kind: SymbolKind.Object,
	},
	{
		type: 'utility',
		match: /utility\s+(\b\w+)/ig,
		kind: SymbolKind.Object,
	},
	{
		type: 'tool',
		match: /(tool|mousetool)\s+(\b\w+)/ig,
		kind: SymbolKind.Object,
	},
	{
		type: 'event',
		match: /on\s+(\b\w+)\.+(?=do|return)/ig,
		kind: SymbolKind.Event,
	},
	{
		type: 'External file',
		match: /filein\s*\(*(.*)(?=\)|;|\n)/ig,
		kind: SymbolKind.Package,
	}
];