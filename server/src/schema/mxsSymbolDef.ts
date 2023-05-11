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
/**
 * Maps values from type > vcode kind enumeration
 * Add token types here to include them in the result
 */
export const SymbolKindMatch: Record<string, SymbolKind> = {
	'EntityAttributes'      : SymbolKind.Object,
	'EntityRcmenu'          : SymbolKind.Object,
	'EntityRcmenu_submenu'  : SymbolKind.Constructor,
	'EntityRcmenu_separator': SymbolKind.Object,
	'EntityRcmenu_menuitem' : SymbolKind.Constructor,
	'EntityPlugin'          : SymbolKind.Object,
	'EntityPlugin_params'   : SymbolKind.Object,
	'PluginParam'           : SymbolKind.Constructor,
	'EntityTool'            : SymbolKind.Object,
	'EntityUtility'         : SymbolKind.Object,
	'EntityRollout'         : SymbolKind.Object,
	'EntityRolloutGroup'    : SymbolKind.Object,
	'EntityRolloutControl'  : SymbolKind.Constructor,
	'EntityMacroscript'     : SymbolKind.Object,
	'Struct'                : SymbolKind.Struct,
	'Event'                 : SymbolKind.Event,
	'Function'              : SymbolKind.Function,
	'AssignmentExpression'  : SymbolKind.Method,
	'CallExpression'        : SymbolKind.Method,
	'ParameterAssignment'   : SymbolKind.Property,
	'AccessorProperty'      : SymbolKind.Property,
	'AccessorIndex'         : SymbolKind.Property,
	'Literal'               : SymbolKind.Constant,
	'Identifier'            : SymbolKind.Property,
	'Parameter'             : SymbolKind.TypeParameter,
	'VariableDeclaration'   : SymbolKind.Variable,
	'Declaration'           : SymbolKind.Variable,
	'Include'               : SymbolKind.Module,
};
//# sourceMappingURL=mxsSymbolDefs.js.map