import
{
	Range,
	SymbolKind,
	DocumentSymbol,
} from 'vscode-languageserver';

import { Token } from 'moo';
import { SymbolKindMatch } from './schema/mxsSymbolDef';
//@ts-ignore
import { traverse } from 'ast-monkey-traverse';
//-----------------------------------------------------------------------------------
/** Verify that the node is valid */
const isNode = (node: any) => node != null && typeof node === 'object';
/**
 * Ranges produced by moo needs to be adjusted, since it starts at 1:1, and for vscode is 0:0
 * line: the line number of the beginning of the match, starting from 1.
 * col: the column where the match begins, starting from 1.
 */
const rangeRemap = (r: Range): Range =>
({
	start: {
		line: r.start.line - 1,
		character: r.start.character - 1
	},
	end: {
		line: r.end.line - 1,
		character: r.end.character - 1
	}
});
/** Derive Range from token location */
const tokenRange = (t: Token): Range =>
({
	start: {
		line: t.line,
		character: t.col
	},
	end: {
		line: t.line,
		character: t.col + t.text.length
	}
});
//-----------------------------------------------------------------------------------
/**
 * Derive a DocumentSymbol collection from the CSTree
 * Collects only node types in the filter.
 * Only constructs like functions, structs, declarations, etc have an ID property and will form part of the Outline tree
 * @param nodes Abstract Syntax tree source
 * @param documentRange Document START and END ranges
 * @param keyFilter ? Object with keys:[] to be collected.
 */
export function deriveSymbolsTree(nodes: any | any[], documentRange: Range, keyFilter = 'id')
{
	// start with a root dummynode ...
	const stack: DocumentSymbol = {
		//id: '',
		name: '',
		kind: 1,
		range: documentRange,
		selectionRange: documentRange,
		children: []
	};

	function _visit(node: any, parent: any | null)
	{
		// if (!node) { return []; }
		let _node: DocumentSymbol;

		if (isNode(node) && node.hasOwnProperty(keyFilter)) {
			/*
			if (isNode(node)) {
				if (keyFilter in node) {
			*/
			// only constructs like functions, structs and so on have an ID property
			// the node 'id' value is a moo token with the node identifier
			const token: Token = node[keyFilter].value;
			// if node doesnt have a location, infer it from the token AND adjust line and char difference !
			const loc = rangeRemap(node.range || tokenRange(token));
			_node = {
				name: token.text,
				detail: node.type || 'unknown',
				kind: node.type != null ? (SymbolKindMatch[node.type] || SymbolKind.Method) : SymbolKind.Method,
				range: loc,
				selectionRange: loc
			};
			// Push the node in the parent child collection
			parent.children != null ? parent.children.push(_node) : parent.children = [_node];
			/*
			} else if ('value' in node && isNode(node.value)) {
				const token: Token = node.value;
				// if node doesnt have a location, infer it from the token AND adjust line and char difference !
				if (token.hasOwnProperty('text') && token.text) {
					const loc = rangeRemap(node.range || tokenRange(token));
					_node = {
						name: token.text,
						detail: node.type || 'unknown',
						kind: node.type != null ? (SymbolKindMatch[node.type] || SymbolKind.Method) : SymbolKind.Method,
						range: loc,
						selectionRange: loc
					};
					parent.children != null ? parent.children.push(_node) : parent.children = [_node];
				}
				else {
					_node = parent;
				}
			} else {
				// console.log(node);
				_node = parent;
			}
			*/
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
						_visit(child[j], _node);
					}
				}
			} else if (isNode(child)) {
				_visit(child, _node);
			}
		}
	}
	// start visit
	_visit(nodes, stack);
	// return only the root node childrens...
	return stack.children!;
}
//-----------------------------------------------------------------------------------
/**
 * Collect all the tokens that contains the given key and value
 * @param CST the CST
 */
export function collectTokens(CST: any, key: string = 'type', value?: string)
{
	const Tokens: Token[] = [];
	if (value) {
		traverse(CST, (key1: string, val1: string | null, innerObj: { parent: any }) =>
		{
			// const current = val1 ?? key1;
			if (key1 === key && val1 === value) {
				Tokens.push(innerObj.parent);
			}
			return val1 ?? key1; // current
		});
	} else {
		traverse(CST, (key1: string, val1: string | null, innerObj: { parent: any }) =>
		{
			// const current = val1 ?? key1;
			if (key1 === key) {
				Tokens.push(innerObj.parent);
			}
			return val1 ?? key1; // current
		});
	}
	return Tokens;
}
