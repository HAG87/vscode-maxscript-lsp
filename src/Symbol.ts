import * as vscode from "vscode";
import { SymbolKind } from "./types.js";

const symbolCodeTypeMap = new Map<SymbolKind, vscode.SymbolKind>([
	[SymbolKind.Plugin, vscode.SymbolKind.Class],
	[SymbolKind.MacroScript, vscode.SymbolKind.Class],
	[SymbolKind.Tool, vscode.SymbolKind.Class],
	[SymbolKind.Utility, vscode.SymbolKind.Class],
	[SymbolKind.Rollout, vscode.SymbolKind.Class],
	[SymbolKind.RcMenu, vscode.SymbolKind.Class],
	[SymbolKind.Parameters, vscode.SymbolKind.Class],
	[SymbolKind.Control, vscode.SymbolKind.Field],
	[SymbolKind.Attributes, vscode.SymbolKind.Class],
	[SymbolKind.Event, vscode.SymbolKind.Event],

	[SymbolKind.Struct, vscode.SymbolKind.Struct],
	[SymbolKind.Function, vscode.SymbolKind.Function],

	[SymbolKind.Declaration, vscode.SymbolKind.Variable],
	[SymbolKind.Call, vscode.SymbolKind.Method],
	[SymbolKind.Property, vscode.SymbolKind.Property],
	[SymbolKind.Accessor, vscode.SymbolKind.Key],

	[SymbolKind.Identifier, vscode.SymbolKind.Variable],

	[SymbolKind.Operator, vscode.SymbolKind.Operator],
	[SymbolKind.Array, vscode.SymbolKind.Object],
	[SymbolKind.BitArray, vscode.SymbolKind.Object],
	[SymbolKind.Object, vscode.SymbolKind.Object],
	[SymbolKind.Constant, vscode.SymbolKind.Constant],
	[SymbolKind.String, vscode.SymbolKind.String],
	[SymbolKind.Number, vscode.SymbolKind.Number],
	[SymbolKind.Boolean, vscode.SymbolKind.Boolean],
	[SymbolKind.Null, vscode.SymbolKind.Class],
]);

const symbolDescriptionMap = new Map<SymbolKind, string>([
	[SymbolKind.Plugin, 'Plugin'],
	[SymbolKind.MacroScript, 'MacroScript'],
	[SymbolKind.Tool, 'Tool'],
	[SymbolKind.Utility, 'Utiility'],
	[SymbolKind.Rollout, 'Rollout'],
	[SymbolKind.RcMenu, 'RCmenu'],
	[SymbolKind.Parameters, 'Parameters def'],
	[SymbolKind.Control, 'Control'],
	[SymbolKind.Attributes, 'Attributes def'],
	[SymbolKind.Event, 'Event action'],

	[SymbolKind.Struct, 'Struct'],
	[SymbolKind.Function, 'Function'],

	[SymbolKind.Declaration, 'Declaration'],
	[SymbolKind.Call, 'Call'],
	[SymbolKind.Property, 'Property'],
	[SymbolKind.Accessor, 'Accessor'],

	[SymbolKind.Identifier, 'Identifier'],
	[SymbolKind.Operator, 'Operator'],

	[SymbolKind.Array, 'Array'],
	[SymbolKind.BitArray, 'BitArray'],
	[SymbolKind.Object, 'Object'],
	[SymbolKind.Constant, 'Literal'],
	[SymbolKind.String, 'String'],
	[SymbolKind.Number, 'Number'],
	[SymbolKind.Boolean, 'Boolean'],
	[SymbolKind.Null, 'Void value'],
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
 * Provides a textual expression for a native symbol kind.
 *
 * @param kind The kind of symbol for which a description is needed.
 *
 * @returns The description.
 */
export const symbolDescriptionFromEnum = (kind: SymbolKind): string => {
    return symbolDescriptionMap.get(kind) || "Unknown";
};