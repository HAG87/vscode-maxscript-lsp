import * as vscode from 'vscode';

import { SymbolKind } from './types.js';

const symbolCodeTypeMap = new Map<SymbolKind, vscode.SymbolKind>([
	[SymbolKind.Plugin,      vscode.SymbolKind.Class],
	[SymbolKind.MacroScript, vscode.SymbolKind.Class],
	[SymbolKind.Tool,        vscode.SymbolKind.Class],
	[SymbolKind.Utility,     vscode.SymbolKind.Class],
	[SymbolKind.Rollout,     vscode.SymbolKind.Class],
	[SymbolKind.RcMenu,      vscode.SymbolKind.Class],
	[SymbolKind.Parameters,  vscode.SymbolKind.Class],
	[SymbolKind.Control,     vscode.SymbolKind.Field],
	[SymbolKind.RcMenuControl,     vscode.SymbolKind.Field],
	[SymbolKind.Attributes,  vscode.SymbolKind.Class],
	[SymbolKind.Event,       vscode.SymbolKind.Event],
	[SymbolKind.Struct,      vscode.SymbolKind.Struct],
	[SymbolKind.Function,    vscode.SymbolKind.Function],
	[SymbolKind.Declaration, vscode.SymbolKind.Variable],
	[SymbolKind.Call,        vscode.SymbolKind.Method],
	[SymbolKind.Property,    vscode.SymbolKind.Property],
	[SymbolKind.Accessor,    vscode.SymbolKind.Key],
	[SymbolKind.Identifier,  vscode.SymbolKind.Variable],
	[SymbolKind.Operator,    vscode.SymbolKind.Operator],
	[SymbolKind.Keyword,     vscode.SymbolKind.Key],
	[SymbolKind.Array,       vscode.SymbolKind.Object],
	[SymbolKind.BitArray,    vscode.SymbolKind.Object],
	[SymbolKind.Object,      vscode.SymbolKind.Object],
	[SymbolKind.Constant,    vscode.SymbolKind.Constant],
	[SymbolKind.String,      vscode.SymbolKind.String],
	[SymbolKind.Number,      vscode.SymbolKind.Number],
	[SymbolKind.Boolean,     vscode.SymbolKind.Boolean],
	[SymbolKind.Null,        vscode.SymbolKind.Class],
]);

const symbolDescriptionMap = new Map<SymbolKind, string>([
	[SymbolKind.Plugin,      'Plugin'],
	[SymbolKind.MacroScript, 'MacroScript'],
	[SymbolKind.Tool,        'Tool'],
	[SymbolKind.Utility,     'Utiility'],
	[SymbolKind.Rollout,     'Rollout'],
	[SymbolKind.RcMenu,      'RCmenu'],
	[SymbolKind.Parameters,  'Parameters def'],
	[SymbolKind.Control,     'Control'],
	[SymbolKind.RcMenuControl,     'Control'],
	[SymbolKind.Attributes,  'Attributes def'],
	[SymbolKind.Event,       'Event action'],
	[SymbolKind.Struct,      'Struct'],
	[SymbolKind.Function,    'Function'],
	[SymbolKind.Declaration, 'Declaration'],
	[SymbolKind.Call,        'Call'],
	[SymbolKind.Property,    'Property'],
	[SymbolKind.Accessor,    'Accessor'],
	[SymbolKind.Argument,    'Function argument'],
	[SymbolKind.Parameter,   'Function parameter'],
	[SymbolKind.Identifier,  'Identifier'],
	[SymbolKind.Operator,    'Operator'],
	[SymbolKind.Keyword,     'Keyword'],
	[SymbolKind.Array,       'Array'],
	[SymbolKind.BitArray,    'BitArray'],
	[SymbolKind.Object,      'Object'],
	[SymbolKind.Constant,    'Literal'],
	[SymbolKind.String,      'String'],
	[SymbolKind.Number,      'Number'],
	[SymbolKind.Boolean,     'Boolean'],
	[SymbolKind.Null,        'Void value'],
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