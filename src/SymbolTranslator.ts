import * as vscode from 'vscode';

import { SymbolKind, CompletionKindHint } from '@backend/types';
import { CompletionItemKind, DocumentHighlightKind } from 'vscode';

const symbolCodeTypeMap = new Map<SymbolKind, vscode.SymbolKind>([
	[SymbolKind.Accessor,    vscode.SymbolKind.Key],
	[SymbolKind.Array,       vscode.SymbolKind.Object],
	[SymbolKind.Attributes,  vscode.SymbolKind.Class],
	[SymbolKind.BitArray,    vscode.SymbolKind.Object],
	[SymbolKind.Boolean,     vscode.SymbolKind.Boolean],
	[SymbolKind.Call,        vscode.SymbolKind.Method],
	[SymbolKind.Constant,    vscode.SymbolKind.Constant],
	[SymbolKind.Control,     vscode.SymbolKind.Field],
	[SymbolKind.RcMenuControl, vscode.SymbolKind.Field],
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
	[SymbolKind.RcMenuControl, 'Control'],
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

const symbolCompletionTypeMap = new Map<SymbolKind, CompletionItemKind>([
	[SymbolKind.Plugin,      CompletionItemKind.Class],
	[SymbolKind.MacroScript, CompletionItemKind.Class],
	[SymbolKind.Tool,        CompletionItemKind.Class],
	[SymbolKind.Utility,     CompletionItemKind.Class],
	[SymbolKind.Rollout,     CompletionItemKind.Class],
	[SymbolKind.RcMenu,      CompletionItemKind.Class],
	[SymbolKind.Parameters,  CompletionItemKind.Class],
	[SymbolKind.Control,     CompletionItemKind.Field],
	[SymbolKind.RcMenuControl, CompletionItemKind.Field],
	[SymbolKind.Attributes,  CompletionItemKind.Field],
	[SymbolKind.Event,       CompletionItemKind.Event],
	[SymbolKind.Struct,      CompletionItemKind.Struct],
	[SymbolKind.Function,    CompletionItemKind.Function],
	[SymbolKind.Declaration, CompletionItemKind.Variable],
	//...
	[SymbolKind.Call,        CompletionItemKind.Method],
	[SymbolKind.Property,    CompletionItemKind.Reference],
	[SymbolKind.Accessor,    CompletionItemKind.Reference],
	[SymbolKind.Identifier,  CompletionItemKind.Variable],
	[SymbolKind.Operator,    CompletionItemKind.Operator],
	[SymbolKind.Keyword,     CompletionItemKind.Keyword],
	[SymbolKind.Array,       CompletionItemKind.Value],
	[SymbolKind.BitArray,    CompletionItemKind.Value],
	[SymbolKind.Object,      CompletionItemKind.Value],
	[SymbolKind.Constant,    CompletionItemKind.Constant],
	[SymbolKind.String,      CompletionItemKind.Value],
	[SymbolKind.Number,      CompletionItemKind.Value],
	[SymbolKind.Boolean,     CompletionItemKind.Value],
	[SymbolKind.Null,        CompletionItemKind.Value],

]);

const completionHintKindMap = new Map<CompletionKindHint, CompletionItemKind>([
	['function', CompletionItemKind.Function],
	['class', CompletionItemKind.Class],
	['module', CompletionItemKind.Module],
	['typeParameter', CompletionItemKind.TypeParameter],
	['field', CompletionItemKind.Field],
	['event', CompletionItemKind.Event],
	['variable', CompletionItemKind.Variable],	
]);

const symbolHighlightKindMap = new Map<SymbolKind, DocumentHighlightKind>([
	[SymbolKind.Declaration, DocumentHighlightKind.Write],
	[SymbolKind.Function,    DocumentHighlightKind.Write],
	[SymbolKind.Struct,      DocumentHighlightKind.Write],
	[SymbolKind.Plugin,      DocumentHighlightKind.Write],
	[SymbolKind.MacroScript, DocumentHighlightKind.Write],
	[SymbolKind.Tool,        DocumentHighlightKind.Write],
	[SymbolKind.Utility,     DocumentHighlightKind.Write],
	[SymbolKind.Rollout,     DocumentHighlightKind.Write],
	[SymbolKind.RcMenu,      DocumentHighlightKind.Write],
	[SymbolKind.Attributes,  DocumentHighlightKind.Write],
	[SymbolKind.Event,       DocumentHighlightKind.Write],
	[SymbolKind.Call,        DocumentHighlightKind.Read],
	[SymbolKind.Identifier,  DocumentHighlightKind.Read],
	// everything else is Text	
]);

/**
 * Maps a symbol kind to the most appropriate DocumentHighlightKind.
 * Definitions/declarations are marked as Write, call-sites as Read, everything else as Text.
 */
export const translateHighlightKind = (kind: SymbolKind): vscode.DocumentHighlightKind => {
	return symbolHighlightKindMap.get(kind) || vscode.DocumentHighlightKind.Text;
}
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

export const translateCompletionKindFromHint = (kindHint: CompletionKindHint | undefined): vscode.CompletionItemKind => {
	return completionHintKindMap.get(kindHint || 'variable') || vscode.CompletionItemKind.Text;
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