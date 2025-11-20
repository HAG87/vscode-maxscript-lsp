import * as vscode from 'vscode';

import { SymbolKind } from './types.js';

const symbolCodeTypeMap = new Map<SymbolKind, vscode.SymbolKind>([
	[SymbolKind.Accessor,    vscode.SymbolKind.Key],
	[SymbolKind.Array,       vscode.SymbolKind.Object],
	[SymbolKind.Attributes,  vscode.SymbolKind.Class],
	[SymbolKind.BitArray,    vscode.SymbolKind.Object],
	[SymbolKind.Boolean,     vscode.SymbolKind.Boolean],
	[SymbolKind.Call,        vscode.SymbolKind.Method],
	[SymbolKind.Constant,    vscode.SymbolKind.Constant],
	[SymbolKind.Control,     vscode.SymbolKind.Field],
	[SymbolKind.RcMenuControl,     vscode.SymbolKind.Field],
	[SymbolKind.Declaration, vscode.SymbolKind.Variable],
	[SymbolKind.Event,       vscode.SymbolKind.Event],
	[SymbolKind.Field,       vscode.SymbolKind.Field],
	[SymbolKind.Function,    vscode.SymbolKind.Function],
	[SymbolKind.GlobalVar,   vscode.SymbolKind.Variable],
	[SymbolKind.Identifier,  vscode.SymbolKind.Variable],
	[SymbolKind.Keyword,     vscode.SymbolKind.Key],
	[SymbolKind.LocalVar,    vscode.SymbolKind.Variable],
	[SymbolKind.MacroScript, vscode.SymbolKind.Class],
	[SymbolKind.Null,        vscode.SymbolKind.Class],
	[SymbolKind.Number,      vscode.SymbolKind.Number],
	[SymbolKind.Object,      vscode.SymbolKind.Object],
	[SymbolKind.Operator,    vscode.SymbolKind.Operator],
	[SymbolKind.Parameters,  vscode.SymbolKind.Class],
	[SymbolKind.Plugin,      vscode.SymbolKind.Class],
	[SymbolKind.Property,    vscode.SymbolKind.Property],
	[SymbolKind.RcMenu,      vscode.SymbolKind.Class],
	[SymbolKind.Rollout,     vscode.SymbolKind.Class],
	[SymbolKind.String,      vscode.SymbolKind.String],
	[SymbolKind.Struct,      vscode.SymbolKind.Struct],
	[SymbolKind.Tool,        vscode.SymbolKind.Class],
	[SymbolKind.Utility,     vscode.SymbolKind.Class],
	[SymbolKind.Variable,    vscode.SymbolKind.Variable],
]);

const symbolDescriptionMap = new Map<SymbolKind, string>([
	[SymbolKind.Accessor,    'Accessor'],
	[SymbolKind.Argument,    'Function argument'],
	[SymbolKind.Array,       'Array'],
	[SymbolKind.RcMenuControl,     'Control'],
	[SymbolKind.Attributes,  'Attributes def'],
	[SymbolKind.BitArray,    'BitArray'],
	[SymbolKind.Boolean,     'Boolean'],
	[SymbolKind.Call,        'Call'],
	[SymbolKind.Constant,    'Literal'],
	[SymbolKind.Control,     'Control'],
	[SymbolKind.Declaration, 'Declaration'],
	[SymbolKind.Event,       'Event action'],
	[SymbolKind.Field,       'Member Field'],
	[SymbolKind.Function,    'Function'],
	[SymbolKind.GlobalVar,   'Global Declaration'],
	[SymbolKind.Identifier,  'Identifier'],
	[SymbolKind.Keyword,     'Keyword'],
	[SymbolKind.LocalVar,    'Local Declaration'],
	[SymbolKind.MacroScript, 'MacroScript'],
	[SymbolKind.Null,        'Void value'],
	[SymbolKind.Number,      'Number'],
	[SymbolKind.Object,      'Object'],
	[SymbolKind.Operator,    'Operator'],
	[SymbolKind.Parameter,   'Function parameter'],
	[SymbolKind.Parameters,  'Parameters def'],
	[SymbolKind.Plugin,      'Plugin'],
	[SymbolKind.Property,    'Property'],
	[SymbolKind.RcMenu,      'RCmenu'],
	[SymbolKind.Rollout,     'Rollout'],
	[SymbolKind.String,      'String'],
	[SymbolKind.Struct,      'Struct'],
	[SymbolKind.Tool,        'Tool'],
	[SymbolKind.Utility,     'Utility'],
	[SymbolKind.Variable,    'Variable'],
]);

const symbolCompletionTypeMap = new Map<SymbolKind, vscode.CompletionItemKind>([
	[SymbolKind.Plugin,      vscode.CompletionItemKind.Class],
	[SymbolKind.MacroScript, vscode.CompletionItemKind.Class],
	[SymbolKind.Tool,        vscode.CompletionItemKind.Class],
	[SymbolKind.Utility,     vscode.CompletionItemKind.Class],
	[SymbolKind.Rollout,     vscode.CompletionItemKind.Class],
	[SymbolKind.RcMenu,      vscode.CompletionItemKind.Class],
	[SymbolKind.Parameters,  vscode.CompletionItemKind.Class],
	[SymbolKind.Control,     vscode.CompletionItemKind.Field],
	[SymbolKind.RcMenuControl,     vscode.CompletionItemKind.Field],
	[SymbolKind.Attributes,  vscode.CompletionItemKind.Field],
	[SymbolKind.Event,       vscode.CompletionItemKind.Event],
	[SymbolKind.Struct,      vscode.CompletionItemKind.Struct],
	[SymbolKind.Function,    vscode.CompletionItemKind.Function],
	[SymbolKind.Declaration, vscode.CompletionItemKind.Variable],
	//...
	[SymbolKind.Call,        vscode.CompletionItemKind.Method],
	[SymbolKind.Property,    vscode.CompletionItemKind.Reference],
	[SymbolKind.Accessor,    vscode.CompletionItemKind.Reference],
	[SymbolKind.Identifier,  vscode.CompletionItemKind.Variable],
	[SymbolKind.Operator,    vscode.CompletionItemKind.Operator],
	[SymbolKind.Keyword,     vscode.CompletionItemKind.Keyword],
	[SymbolKind.Array,       vscode.CompletionItemKind.Value],
	[SymbolKind.BitArray,    vscode.CompletionItemKind.Value],
	[SymbolKind.Object,      vscode.CompletionItemKind.Value],
	[SymbolKind.Constant,    vscode.CompletionItemKind.Constant],
	[SymbolKind.String,      vscode.CompletionItemKind.Value],
	[SymbolKind.Number,      vscode.CompletionItemKind.Value],
	[SymbolKind.Boolean,     vscode.CompletionItemKind.Value],
	[SymbolKind.Null,        vscode.CompletionItemKind.Value],

]);
/**
 * Converts the native symbol kind to a vscode symbol kind.
 *
 * @param kind The kind of symbol for which the vscode kind is needed.
 *
 * @returns The vscode symbol kind for the given ANTLR4 kind.
 */
export const translateSymbolKind = (kind: SymbolKind): vscode.SymbolKind => {
    return symbolCodeTypeMap.get(kind) || vscode.SymbolKind.Null;
};
/**
 * Converts the native symbol kind to a vscode completion item kind.
 *
 * @param kind The kind of symbol for which return the completion item kind.
 *
 * @returns The vscode completion item kind.
 */
export const translateCompletionKind = (kind: SymbolKind): vscode.CompletionItemKind => {
    return symbolCompletionTypeMap.get(kind) || vscode.CompletionItemKind.Text;
};
/**
 * Provides a textual expression for a native symbol kind.
 *
 * @param kind The kind of symbol for which a description is needed.
 *
 * @returns The description.
 */
export const symbolDescriptionFromEnum = (kind: SymbolKind): string => {
    return symbolDescriptionMap.get(kind) || "Unknown";
};