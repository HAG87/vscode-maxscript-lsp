'use strict';
import
{
	Location,
	Range,
	Position,
	SymbolInformation,
	SymbolKind,
	DocumentSymbol
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

//@ts-ignore
import getObj from 'ast-get-object';
//@ts-ignore
import getAllValuesByKey from 'ast-get-values-by-key';
//@ts-ignore
import traverse from 'ast-monkey-traverse';
//@ts-ignore
import objectPath from 'object-path';

import * as moo from 'moo';
// const astMonkeyTraverse = require('ast-monkey-traverse');
// const getObj = require('ast-get-object');
// const getAllValuesByKey = require('ast-get-values-by-key');
//-----------------------------------------------------------------------------------
//@ts-ignore
import { parentPath, findParentName } from './lib/astUtils';
//-----------------------------------------------------------------------------------
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
	'VariableDeclaration': SymbolKind.Variable,
	'Declaration': SymbolKind.Variable,
	'Include': SymbolKind.Module,
};
//-----------------------------------------------------------------------------------
/**
 * Generic dictionary Interface
 */
interface Dictionary<T>
{
	[key: string]: T;
}
/**
 * Interface that defines a range in a string with a start and an end offset
 */
interface iRange<T>
{
	start: T;
	end: T;
}
/**
 * Interface that defines a position in a string with a line and offset number
 */
interface iPos
{
	line: number;
	col: number;
}

interface NodeMap
{
	type: string;
	id: any;
	loc: any;
	children: NodeMap[];
}

interface nodeSymbol
{
	/**
	 * The name of this symbol. Will be displayed in the user interface and therefore must not be
	 * an empty string or a string only consisting of white spaces.
	 */
	name: string;
	/**
	 * More detail for this symbol, e.g the signature of a function.
	 */
	detail?: string;
	/**
	 * The kind of this symbol.
	 */
	kind: SymbolKind;
	/**
	 * Indicates if this symbol is deprecated.
	 */
	deprecated?: boolean;
	/**
	 * The range enclosing this symbol not including leading/trailing whitespace but everything else
	 * like comments. This information is typically used to determine if the the clients cursor is
	 * inside the symbol to reveal in the symbol in the UI.
	 */
	range: Range;
	/**
	 * The range that should be selected and revealed when this symbol is being picked, e.g the name of a function.
	 * Must be contained by the the `range`.
	 */
	selectionRange: Range;
	/**
	 * Children of this symbol, e.g. properties of a class.
	 */
	children?: DocumentSymbol[] | NodeMap[];
}
//-----------------------------------------------------------------------------------
function hasKey<O>(obj: O, key: keyof any): key is keyof O
{
	return key in obj;
}
function isNode(node: any | undefined)
{
	return (node != null && typeof node === 'object');
}
//-----------------------------------------------------------------------------------
/**
 * Functions for getting the range of a statement. Grouped in a static class for coherency
 */
export abstract class range
{
	static fromStartEndOffsets(startOff: number, endOff: number, value1: string): iRange<number>
	{
		return {
			start: startOff,
			end: (endOff + value1.length)
		};
	}
	static fromOffset(offset: number, value: string): iRange<number>
	{
		return {
			start: offset,
			end: (offset + value.length)
		};
	}
	static offsetFromTokenLineCol(src: string | string[], node: any)
	{

		let lines = Array.isArray(src) ? src : src.split('\n');

		let charcount = lines.slice(0, node.line - 1).reduce((prev, next) =>
		{
			return prev + next.length + 1;
		}, 0);
		return (charcount += node.col - 1);
	}
	static fromLineCol(src: string | string[], node: any)
	{
		let offset = range.offsetFromTokenLineCol(src, node);
		return {
			start: offset,
			end: offset + node.text.length
		};
	}
	/**
	 * Get the range of the statement from the offset of the first and last child of the node
	 * @param node CST node
	 */
	static fromChilds(node: any): iRange<number>
	{
		// let paths: any[] = [];
		let childs: any[] = [];
		// traverse the node to collect first and last child offset
		traverse(node, (key1: string, val1: null, innerObj: any, stop: any) =>
		{
			const current = val1 ?? key1;
			if (key1 === 'offset') {
				// paths.push(parentPath(innerObj.path));
				childs.push(innerObj.parent);
			}
			return current;
		});
		// Childs
		// let start = objectPath.get(node, paths[0]).offset;
		// let last = objectPath.get(node, paths[paths.length - 1]);
		let start = childs[0].offset;
		let last = childs[childs.length - 1];

		return range.fromStartEndOffsets(start, last.offset, last.text);
	}
	/**
	 *  Get the range of the statement from the line-column of the first and last child of the node
	 * @param source Reference, the original string.
	 * @param node CST node
	 */
	static fromChildsLC(node: any): iRange<iPos>
	{
		let childs: any[] = [];
		// traverse the node to collect first and last child offset
		traverse(node, (key1: string, val1: null, innerObj: any, stop: any) =>
		{
			const current = val1 ?? key1;
			if (key1 === 'line') {
				childs.push(innerObj.parent);
			}
			return current;
		});
		let last = childs[childs.length - 1];

		let start = { line: childs[0].line, col: childs[0].col };
		let end = { line: last.line, col: last.col };
		return { start: start, end: end };
	}
	/**
	 * Get the position of the last child
	 * @param node CST node
	 */
	static lastChildPos(node: any): iPos
	{
		let childs: any[] = [];
		// traverse the node to collect first and last child offset
		traverse(node, (key1: string, val1: null, innerObj: any, stop: any) =>
		{
			const current = val1 ?? key1;
			if (key1 === 'line') {
				childs.push(innerObj.parent);
			}
			return current;
		});
		let last = childs[childs.length - 1];
		return { line: last.line, col: last.col };
	}
}
//-----------------------------------------------------------------------------------
function equalizeRange(ref: Range, rec: Range/*, document: TextDocument*/)
{
	let compare = (a: Position, b: Position) =>
	{
		let res = Position.create(0, 0);

		// line position of B can be less or eq
		if (a.line > b.line) {
			res.line = b.line;
			// char of B can be more if line is less
			res.character = b.character;

		} else {
			// line of B is more than line of A
			res.line = a.line;
			// also, character must not be more than A
			res.character = b.character > a.character ? a.character : b.character;

			/*
			let ext = document.getText(
				{
					start:
					{
						line: a.line,
						character: 0
					},
					end:
					{
						line: a.line,
						character: Number.MAX_SAFE_INTEGER
					}
				}
			);

			// here B character must be less or eq than A line length.
			res.character = b.character > ext.length ?  ext.length : b.character;
			*/
		}
		return res;
	};

	return <Range>{
		start: compare(ref.start, rec.start),
		end: compare(ref.end, rec.end)
	};
}
//TODO: Check document ranges...
export function getTokenRange(token: moo.Token, document?: TextDocument)
{
	let startPosition = Position.create(token.line - 1, token.col - 1);
	let endOffset = token.col + (token.text.length || token.value.length) - 1;
	let endPosition = Position.create(token.line - 1, endOffset);

	let tokenRange = Range.create(startPosition, endPosition);

	if (document) {
		let sel = document.getText(tokenRange);
		// console.log({ text: sel, range: tokenRange });
	}
	return tokenRange;
}

function getDocumentPositions(node: NodeMap)
{
	let defaultPos = Position.create(0, 0);

	let startPosition: Position = defaultPos;
	let endPosition: Position = defaultPos;

	/*
	let startPosition: Position;
	let endPosition: Position;
	*/

	let startPosFromNode = (node: any) =>
	{
		if (!node) { return; }
		// if (!node.loc) { return; }

		if (node.loc && node.loc.start) {
			return Position.create(
				node.loc.start.line - 1,
				node.loc.start.col - 1
			);
		} else if (node.id) {
			let token: moo.Token = node.id.value;
			return Position.create(
				token.line - 1,
				token.col - 1
			);
		}
		return;
	};

	let endPosFromNode = (node: any) =>
	{
		if (!node) { return; }
		// if (!node.loc) { return; }

		if (node.loc && node.loc.end) {
			return Position.create(
				node.loc.end.line - 1,
				node.loc.end.col - 1
			);
		} else if (node.id) {
			let token: moo.Token = node.id.value;
			return Position.create(
				token.line - 1,
				token.col + (token.toString()).length - 1
			);
		}
		return;
	};

	if (node.loc) {
		startPosition = Position.create(
			node.loc.start.line - 1,
			node.loc.start.col - 1
		);

		if (node.loc.end) {
			endPosition = Position.create(
				node.loc.end.line - 1,
				node.loc.end.col - 1
			);
			// get position of last child
		} else {
			// children should have a location.or an id..
			endPosition =
				endPosFromNode(node.children[node.children.length - 1]) || startPosition || defaultPos;
		}
	} else {
		// node should have an id..
		// or use the first child
		startPosition =
			startPosFromNode(node) || startPosFromNode(node.children[0]) || defaultPos;
		endPosition =
			endPosFromNode(node.children[node.children.length - 1]) || endPosFromNode(node) || startPosition || defaultPos;
	}

	return <Range>{
		start: startPosition,
		end: endPosition
	};
	/*
	Location.create(
		document.uri,
		Range.create(startPosition, endPosition)
	);
	*/
}
//-----------------------------------------------------------------------------------
//DECLARATIONS
//-----------------------------------------------------------------------------------

export function getFromCST(CST: any | any[], keyValPair: object)
{
	return getObj(CST, keyValPair);
}

export function getNodesByKeyFromCST(CST: any | any[], key: string | string[])
{
	let st = getAllValuesByKey(CST, key);
	return st;
}
//-----------------------------------------------------------------------------------
/**
 * collect Nodes visiting the Tree
 * collects all node types in the filter.
 * I'm retrieving only the paths, because will need to get the parents location later.
 * I will not be using this for now, since vscode only cares about definitions, I can later reference-search that definition
 * @param {any[]} nodes Abstract Syntax tree source
 * @param {string} keyFilter Object with keys:[] to be collected.
 */
export async function deriveSymbolsTree(nodes: any | any[], keyFilter: string = 'id')
{
	// start with a root dummy...
	let stack = <NodeMap>{
		type: 'main',
		id: null,
		loc: {
			start: {
				line: 0,
				col: 0
			},
			end: null
		},
		children: []
	};

	async function _visit(node: any, parent: any | null, key: string | null, index: number | null)
	{
		// if (!node) { return []; }
		let _node: NodeMap;
		if (isNode(node) && keyFilter in node) {
			// TODO: deal with siblings...
			_node = {
				type: node.type,
				id: node[keyFilter],
				loc: node.loc || null,
				children: []
			};
			parent.children.push(_node);
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
	return stack;
}


/**
 * For each element of the collection, return a valid DocumentSymbol node. 
 * @param nodes the CST
 * @param filterKey 
 */
export async function transformSymbolsTree(nodes: any, filterKey = 'id', document?: TextDocument)
{
	// console.log('transform the treee!!');
	// /*
	async function _visit(node: any, parent: any | null, key: string | null, index: number | null)
	{
		if (!Array.isArray(node) && filterKey in node) {

			let loc = getDocumentPositions(<NodeMap>node);
			let safeRange = equalizeRange(
				loc,
				getTokenRange(node.id.value, document)
			);
			/*
			let safeRange = loc;
			if (document) {
				let sel = getTokenRange(node.id.value, document);
				safeRange = equalizeRange(loc, sel, document);
			}
			*/
			let _node: nodeSymbol = {
				name: node.id != null ? node.id.value.toString() : 'anonymous',
				detail: node.type || 'unknown',
				kind: node.type != null ? (SymbolKindMatch[node.type] || SymbolKind.Method) : SymbolKind.Method,
				range: loc,
				selectionRange: safeRange || loc,
				// selectionRange: loc,
				// children: node.children
			};

			if (node.children.length > 0) {
				_node.children = node.children;
			}

			// if (node.type === 'Declaration') {
			// 	console.log(_node);
			// }

			if (parent != null && key != null && key !== '') {
				if (index != null) {
					parent[key][index] = _node;
				} else {
					parent[key] = _node;
				}
			}
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
						await _visit(child[j], node, key, j);
					}
				}
			} else if (isNode(child)) {
				await _visit(child, node, key, null);
			}
		}
	}


	await _visit(nodes, null, null, 0);

	// console.log(nodes);

	// console.log('-----EXIT------');

	if (Array.isArray(nodes)) {
		return <DocumentSymbol[]>nodes;
	} else {
		return <DocumentSymbol[]>[nodes];
	}
	/*
	return new Promise<DocumentSymbol | DocumentSymbol[]>((resolve, reject) =>
	{
		// _transformStatements(Array.isArray(nodes) ? nodes : [nodes])
		_visit(nodes, null, null, 0)
			.then(
				() => {
					console.log(nodes);
					resolve(nodes);
				},
				() => reject()
			);
	});
	// */



	/*
	let _transformStatements = (_nodes: NodeMap[]):Promise<DocumentSymbol[]> => {
		return new Promise((resolve, reject) =>
		{
			let SymbolCollection: DocumentSymbol[] = [];
			for (let node of _nodes) {
				try {
					let symbolLoc = getDocumentPositions(document, node);
					// let symbolName = node.id.value.toString();
					// let symbolKind = SymbolKindMatch[node.type] || SymbolKind.Method;
	
					let theSymbol = DocumentSymbol.create(
						node.id.value.toString(),
						node.type,
						SymbolKindMatch[node.type] || SymbolKind.Method,
						symbolLoc.range,
						symbolLoc.range
					);
					if (node.childs.length > 0) {
						_transformStatements(node.childs)
							.then ((result) => {
								theSymbol.children = result;
							});
					}
					SymbolCollection.push(theSymbol);
				} catch (err) {
					reject(err);
				}
			}
			resolve(SymbolCollection);
		});
	};
	
	return new Promise((resolve, reject) => {
		_transformStatements(Array.isArray(nodes) ? nodes : [nodes])
			.then(
				(result) => resolve(result),
				(err) => reject(err)
			);
	});
	*/
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
//-----------------------------------------------------------------------------------
// IMPLEMENTATIONS - TODO
//-----------------------------------------------------------------------------------