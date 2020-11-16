'use strict';

import
{
	// Location,
	// Position,
	Range,
	SymbolKind,
	DocumentSymbol
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

//@ts-ignore
import traverse from 'ast-monkey-traverse';
import * as moo from 'moo';
//-----------------------------------------------------------------------------------
/**
 * Generic dictionary Interface
 */
interface Dictionary<T>
{
	[key: string]: T;
}
/**
 * Maps values from type > vcode kind enumeration
 */
const SymbolKindMatch: Dictionary<SymbolKind> = {
	'EntityRcmenu': SymbolKind.Object,
	'EntityRcmenu_submenu': SymbolKind.Constructor,
	'EntityRcmenu_separator': SymbolKind.Object,
	'EntityRcmenu_menuitem': SymbolKind.Constructor,
	'EntityPlugin': SymbolKind.Object,
	'EntityPlugin_params': SymbolKind.Object,
	'PluginParam': SymbolKind.Constructor,
	'EntityTool': SymbolKind.Object,
	'EntityUtility': SymbolKind.Object,
	'EntityRollout': SymbolKind.Object,
	'EntityRolloutGroup': SymbolKind.Object,
	'EntityRolloutControl': SymbolKind.Constructor,
	'EntityMacroscript': SymbolKind.Object,
	'Struct': SymbolKind.Struct,
	'Event': SymbolKind.Event,
	'Function': SymbolKind.Function,
	'AssignmentExpression': SymbolKind.Method,
	'CallExpression': SymbolKind.Method,
	'ParameterAssignment': SymbolKind.Property,
	'AccessorProperty': SymbolKind.Property,
	'AccessorIndex': SymbolKind.Property,
	'Literal': SymbolKind.Constant,
	'Identifier': SymbolKind.Property,
	'Parameter': SymbolKind.TypeParameter,
	'VariableDeclaration': SymbolKind.Variable,
	'Declaration': SymbolKind.Variable,
	'Include': SymbolKind.Module,
};
//-----------------------------------------------------------------------------------
function isNode(node: any | undefined)
{
	return (node != null && typeof node === 'object');
}
//-----------------------------------------------------------------------------------
/**
 * collect Nodes visiting the Tree
 * collects all node types in the filter.
 * I'm retrieving only the paths, because will need to get the parents location later.
 * I will not be using this for now, since vscode only cares about definitions, I can later reference-search that definition
 * @param nodes Abstract Syntax tree source
 * @param document source document
 * @param keyFilter? Object with keys:[] to be collected.
 */
export async function deriveSymbolsTree(nodes: any | any[], document: TextDocument, keyFilter = 'id'): Promise<DocumentSymbol | DocumentSymbol[]>
{
	let loc = {
		start: {
			line: 0,
			character: 0
		},
		end: document.positionAt(document.getText().length - 1)
	};
	/**
	 * Ranges produced by moo needs to be adjusted, since it starts at 1:1, and for vscode is 0:0
	 * line: the line number of the beginning of the match, starting from 1.
	 * col: the column where the match begins, starting from 1.
	 * @param r Range
	 */
	let rangeRemap = (r: Range) =>
	{
		r.start.line -= 1;
		r.start.character -= 1;
		r.end.line -= 1;
		r.end.character -= 1;
	};
	// start with a root dummy...
	let stack = <DocumentSymbol>{
		id: '',
		name: '',
		kind: 1,
		range: loc,
		selectionRange: loc,
		children: []
	};

	async function _visit(node: any, parent: any | null, key: string | null, index: number | null)
	{
		/*
		let loc = getDocumentPositions(<DocumentSymbol>node, 'range');
		let safeRange = equalizeRange(
			loc,
			rangeUtil.getTokenRange(node.id, document)
		);
		*/

		// if (!node) { return []; }
		let _node: DocumentSymbol;

		if (isNode(node) && keyFilter in node) {

			// value is the same as the text, unless you provide a value transform.
			let id: moo.Token = node[keyFilter].value;

			let loc: Range;
			if (node.range) {
				loc = <Range>node.range;
				
			} else {
				// if node doesnt has a location, infer it from the id...
				loc = {
					start: {
						line: id.line,
						character: id.col
					},
					end: {
						line: id.line,
						character: id.col + id.text.length
					}
				};
			}
			// adjust line and char difference !
			rangeRemap(loc);

			// if (node.type === 'Declaration') {
			// 	console.log(document.getText(node.range));
			// }

			// TODO: deal with siblings...
			_node = {
				name: id.text,	//.toString(),
				detail: node.type || 'unknown',
				kind: node.type != null ? (SymbolKindMatch[node.type] || SymbolKind.Method) : SymbolKind.Method,
				range: loc,
				selectionRange: loc
				// children: []
			};
			parent.children != undefined ? parent.children.push(_node) : parent.children = [_node];
		} else {
			_node = parent;
		}

		//--------------------------------------------------------
		// get the node keys
		const keys = Object.keys(node);
		// loop through the keys
		for (let i = 0; i < keys.length; i++) {
			// child is the value of each key
			let key = keys[i];
			const child = node[key];
			// could be an array of nodes or just an object
			if (Array.isArray(child)) {
				// value is an array, visit each item
				for (let j = 0; j < child.length; j++) {

					// visit each node in the array
					if (isNode(child[j])) {
						await _visit(child[j], _node, key, j);
					}
				}
			} else if (isNode(child)) {
				await _visit(child, _node, key, null);
			}
		}
	}
	await _visit(nodes, stack, null, 0);
	// return only the root node childrens...
	return stack.children!;
}
//-----------------------------------------------------------------------------------
/**
 * Return errorSymbol from invalid tokens
 * @param {object} CST the CST
 */
export function collectTokens(CST: any, key: string = 'type', value?: string)
{
	let Tokens: moo.Token[] = [];
	if (value) {
		traverse(CST, (key1: string, val1: string | null, innerObj: { parent: any }) =>
		{
			const current = val1 ?? key1;
			if (key1 === key && val1 === value) {
				Tokens.push(innerObj.parent);
			}
			return current;
		});
	} else {
		traverse(CST, (key1: string, val1: string | null, innerObj: { parent: any }) =>
		{
			const current = val1 ?? key1;
			if (key1 === key) {
				Tokens.push(innerObj.parent);
			}
			return current;
		});
	}
	return Tokens;
}