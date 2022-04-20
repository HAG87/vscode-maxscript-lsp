import
{
	Range,
	// Position,
	SymbolKind,
	DocumentSymbol
} from 'vscode-languageserver';
//@ts-ignore
import { traverse } from 'ast-monkey-traverse';
import { Token } from 'moo';
import { SymbolKindMatch } from './schema/mxsSymbolDef';
//-----------------------------------------------------------------------------------
/** Verify that the node is valid */
const isNode = (node: any) => typeof node === 'object' && node != null;
/**
 * Ranges produced by moo needs to be adjusted, since it starts at 1:1, and for vscode is 0:0
 * line: the line number of the beginning of the match, starting from 1.
 * col: the column where the match begins, starting from 1.
 * @param r Range
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
/* const rangeRemap = (r: Range) =>
	Object.fromEntries(
		Object.entries(r).map(
			([key, pos]): [string, Position] => [key, <Position>positionMap(pos)]
		));
const positionMap = (p: Position) => Object.fromEntries(
	Object.entries(p).map(
		([key, value]): [string, number] => [key, value - 1]
	)
);*/
/* const rangeRemap = (r: Range) => {
	let k: keyof typeof r;
	for (k in r) {
		let pos = r[k];
		let v: keyof typeof pos;
		for (v in pos) {
			pos[v] -= 1;
		}
	}
}; */
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
 * @param {any | any[]} nodes Abstract Syntax tree source
 * @param {Range} documentRange Document START and END ranges
 * @param {string} keyFilter ? Object with keys:[] to be collected.
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

		if (isNode(node) && keyFilter in node) {

			// only constructs like functions, strutcts and so on have an ID property
			// the node 'id' value is a moo token with the node identifier
			const token: Token = node[keyFilter].value;
			// if node doesnt have a location, infer it from the token AND adjust line and char difference !
			const loc = <Range>rangeRemap(node.range || tokenRange(token));

			_node = {
				name: token.text,
				detail: node.type || 'unknown',
				kind: node.type != null ? (SymbolKindMatch[node.type] || SymbolKind.Method) : SymbolKind.Method,
				range: loc,
				selectionRange: loc
			};
			// Push the node in the parent child collection
			parent.children != null ? parent.children.push(_node) : parent.children = [_node];
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
 * Return errorSymbol from invalid tokens
 * @param {object} CST the CST
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