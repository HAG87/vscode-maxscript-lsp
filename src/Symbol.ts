import * as vscode from 'vscode';

import { SymbolKind as mxsSymbolKind } from './types.js';
import { SymbolKind, CompletionItemKind, DocumentHighlightKind } from 'vscode';

const symbolCodeTypeMap = new Map<mxsSymbolKind, SymbolKind>([
	[mxsSymbolKind.Plugin,      SymbolKind.Class],
	[mxsSymbolKind.MacroScript, SymbolKind.Class],
	[mxsSymbolKind.Tool,        SymbolKind.Class],
	[mxsSymbolKind.Utility,     SymbolKind.Class],
	[mxsSymbolKind.Rollout,     SymbolKind.Class],
	[mxsSymbolKind.RcMenu,      SymbolKind.Class],
	[mxsSymbolKind.Parameters,  SymbolKind.Class],
	[mxsSymbolKind.Control,     SymbolKind.Field],
	[mxsSymbolKind.RcMenuControl,     SymbolKind.Field],
	[mxsSymbolKind.Attributes,  SymbolKind.Class],
	[mxsSymbolKind.Event,       SymbolKind.Event],
	[mxsSymbolKind.Struct,      SymbolKind.Struct],
	[mxsSymbolKind.Function,    SymbolKind.Function],
	[mxsSymbolKind.Declaration, SymbolKind.Variable],
	[mxsSymbolKind.Call,        SymbolKind.Method],
	[mxsSymbolKind.Property,    SymbolKind.Property],
	[mxsSymbolKind.Accessor,    SymbolKind.Key],
	[mxsSymbolKind.Identifier,  SymbolKind.Variable],
	[mxsSymbolKind.Operator,    SymbolKind.Operator],
	[mxsSymbolKind.Keyword,     SymbolKind.Key],
	[mxsSymbolKind.Array,       SymbolKind.Object],
	[mxsSymbolKind.BitArray,    SymbolKind.Object],
	[mxsSymbolKind.Object,      SymbolKind.Object],
	[mxsSymbolKind.Constant,    SymbolKind.Constant],
	[mxsSymbolKind.String,      SymbolKind.String],
	[mxsSymbolKind.Number,      SymbolKind.Number],
	[mxsSymbolKind.Boolean,     SymbolKind.Boolean],
	[mxsSymbolKind.Null,        SymbolKind.Class],
]);

const symbolDescriptionMap = new Map<mxsSymbolKind, string>([
	[mxsSymbolKind.Plugin,      'Plugin'],
	[mxsSymbolKind.MacroScript, 'MacroScript'],
	[mxsSymbolKind.Tool,        'Tool'],
	[mxsSymbolKind.Utility,     'Utiility'],
	[mxsSymbolKind.Rollout,     'Rollout'],
	[mxsSymbolKind.RcMenu,      'RCmenu'],
	[mxsSymbolKind.Parameters,  'Parameters def'],
	[mxsSymbolKind.Control,     'Control'],
	[mxsSymbolKind.RcMenuControl,     'Control'],
	[mxsSymbolKind.Attributes,  'Attributes def'],
	[mxsSymbolKind.Event,       'Event action'],
	[mxsSymbolKind.Struct,      'Struct'],
	[mxsSymbolKind.Function,    'Function'],
	[mxsSymbolKind.Declaration, 'Declaration'],
	[mxsSymbolKind.Call,        'Call'],
	[mxsSymbolKind.Property,    'Property'],
	[mxsSymbolKind.Accessor,    'Accessor'],
	[mxsSymbolKind.Argument,    'Function argument'],
	[mxsSymbolKind.Parameter,   'Function parameter'],
	[mxsSymbolKind.Identifier,  'Identifier'],
	[mxsSymbolKind.Operator,    'Operator'],
	[mxsSymbolKind.Keyword,     'Keyword'],
	[mxsSymbolKind.Array,       'Array'],
	[mxsSymbolKind.BitArray,    'BitArray'],
	[mxsSymbolKind.Object,      'Object'],
	[mxsSymbolKind.Constant,    'Literal'],
	[mxsSymbolKind.String,      'String'],
	[mxsSymbolKind.Number,      'Number'],
	[mxsSymbolKind.Boolean,     'Boolean'],
	[mxsSymbolKind.Null,        'Void value'],
]);

const symbolCompletionTypeMap = new Map<mxsSymbolKind, CompletionItemKind>([
	[mxsSymbolKind.Plugin,      CompletionItemKind.Class],
	[mxsSymbolKind.MacroScript, CompletionItemKind.Class],
	[mxsSymbolKind.Tool,        CompletionItemKind.Class],
	[mxsSymbolKind.Utility,     CompletionItemKind.Class],
	[mxsSymbolKind.Rollout,     CompletionItemKind.Class],
	[mxsSymbolKind.RcMenu,      CompletionItemKind.Class],
	[mxsSymbolKind.Parameters,  CompletionItemKind.Class],
	[mxsSymbolKind.Control,     CompletionItemKind.Field],
	[mxsSymbolKind.RcMenuControl,     CompletionItemKind.Field],
	[mxsSymbolKind.Attributes,  CompletionItemKind.Field],
	[mxsSymbolKind.Event,       CompletionItemKind.Event],
	[mxsSymbolKind.Struct,      CompletionItemKind.Struct],
	[mxsSymbolKind.Function,    CompletionItemKind.Function],
	[mxsSymbolKind.Declaration, CompletionItemKind.Variable],
	[mxsSymbolKind.Call,        CompletionItemKind.Method],
	[mxsSymbolKind.Property,    CompletionItemKind.Reference],
	[mxsSymbolKind.Accessor,    CompletionItemKind.Reference],
	[mxsSymbolKind.Identifier,  CompletionItemKind.Variable],
	[mxsSymbolKind.Operator,    CompletionItemKind.Operator],
	[mxsSymbolKind.Keyword,     CompletionItemKind.Keyword],
	[mxsSymbolKind.Array,       CompletionItemKind.Value],
	[mxsSymbolKind.BitArray,    CompletionItemKind.Value],
	[mxsSymbolKind.Object,      CompletionItemKind.Value],
	[mxsSymbolKind.Constant,    CompletionItemKind.Constant],
	[mxsSymbolKind.String,      CompletionItemKind.Value],
	[mxsSymbolKind.Number,      CompletionItemKind.Value],
	[mxsSymbolKind.Boolean,     CompletionItemKind.Value],
	[mxsSymbolKind.Null,        CompletionItemKind.Value],
]);

const symbolHighlightKindMap = new Map<mxsSymbolKind, DocumentHighlightKind>([
	[mxsSymbolKind.Declaration, DocumentHighlightKind.Write],
	[mxsSymbolKind.Function,    DocumentHighlightKind.Write],
	[mxsSymbolKind.Struct,      DocumentHighlightKind.Write],
	[mxsSymbolKind.Plugin,      DocumentHighlightKind.Write],
	[mxsSymbolKind.MacroScript, DocumentHighlightKind.Write],
	[mxsSymbolKind.Tool,        DocumentHighlightKind.Write],
	[mxsSymbolKind.Utility,     DocumentHighlightKind.Write],
	[mxsSymbolKind.Rollout,     DocumentHighlightKind.Write],
	[mxsSymbolKind.RcMenu,      DocumentHighlightKind.Write],
	[mxsSymbolKind.Attributes,  DocumentHighlightKind.Write],
	[mxsSymbolKind.Event,       DocumentHighlightKind.Write],
	[mxsSymbolKind.Call,        DocumentHighlightKind.Read],
	[mxsSymbolKind.Identifier,  DocumentHighlightKind.Read],
	// everything else is Text	
]);

/**
 * Maps a symbol kind to the most appropriate DocumentHighlightKind.
 * Definitions/declarations are marked as Write, call-sites as Read, everything else as Text.
 */
export const translateHighlightKind = (kind: mxsSymbolKind): vscode.DocumentHighlightKind => {
	return symbolHighlightKindMap.get(kind) || vscode.DocumentHighlightKind.Text;
}

/**
 * Converts the native symbol kind to a vscode symbol kind.
 *
 * @param kind The kind of symbol for which the vscode kind is needed.
 *
 * @returns The vscode symbol kind for the given ANTLR4 kind.
 */
export const translateSymbolKind = (kind: mxsSymbolKind): vscode.SymbolKind => {
    return symbolCodeTypeMap.get(kind) || vscode.SymbolKind.Null;
};
/**
 * Converts the native symbol kind to a vscode completion item kind.
 *
 * @param kind The kind of symbol for which return the completion item kind.
 *
 * @returns The vscode completion item kind.
 */
export const translateCompletionKind = (kind: mxsSymbolKind): vscode.CompletionItemKind => {
    return symbolCompletionTypeMap.get(kind) || vscode.CompletionItemKind.Text;
};
/**
 * Provides a textual expression for a native symbol kind.
 *
 * @param kind The kind of symbol for which a description is needed.
 *
 * @returns The description.
 */
export const symbolDescriptionFromEnum = (kind: mxsSymbolKind): string => {
    return symbolDescriptionMap.get(kind) || "Unknown";
};