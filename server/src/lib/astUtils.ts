'use strict';

import objectPath from 'object-path';
//@ts-ignore
import { pathUp } from 'ast-monkey-util';
//@ts-ignore
import getObj from 'ast-get-object';
//@ts-ignore
import getAllValuesByKey from 'ast-get-values-by-key';
//@ts-ignore
import traverse from 'ast-monkey-traverse';

import { Range, Position} from 'vscode-languageserver';
import { TextDocument} from 'vscode-languageserver-textdocument';
//-----------------------------------------------------------------------------------
export interface Dictionary<T>
{
	[key: string]: T;
}
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

export const objFromKeys = (arr: any[], def: any) => arr.reduce((ac: any, a: any) => ({ ...ac, [a]: def }), {});

/**
 * Check if value is node
 * @param {any} node CST node
 */
export const isNode = (node: any) => typeof node === 'object' && node != null;

/**
 * filter nodes by type property
 * @param {any} node CST node
 */
export const getNodeType = (node: any, key = 'type') => node !== undefined && (key in node) ? node.type : undefined;

export function hasKey<O>(obj: O, key: keyof any): key is keyof O
{
	return key in obj;
}
//-----------------------------------------------------------------------------------

/**
 * Retrieve an object-path notation pruning n branches/leafs
 * Partially extracted from ast-monkey-util
 * @param {string} path The path of the current node/key
 * @param {number} [level] Level to retrieve
 */
export function parentPath(path: string, level: number = 1)
{
	let res = path;
	for (let i = 1; i < level; i++) {
		res = pathUp(res);
	}
	return res;
}

/**
 * Looks for a key in the inmediate parent, going up the tree, returns the value of the first match, if any.
 * @param {any} CST The CST
 * @param {string} path The path of the current node/leaf
 * @param {string} [key] Key value to search for
 */
export function findParentName(CST: any, path: string, key: string = 'id.value.text')
{
	// this is faster than using ats-money find method
	let roots = path.split('.');
	// no parent!
	if (roots.length < 2) { return; }
	// GET THE FIRST NODE WITH AN ID KEY
	while (roots.length > 0) {
		let thePath = roots.join('.');
		let theNode = objectPath.get(CST, thePath);
		if (theNode && 'id' in theNode) {
			return objectPath.get(CST, thePath.concat('.', key));
		}
		roots.pop();
	}
	/*
	let i = roots.length;
	do {
		let thePath = roots.slice(0, i).concat(key).join('.');
		let theNode = objectPath.get(CST, thePath);
		if (theNode != null) return theNode;
		i = i - 1;
	} while (i > 0);
	*/
	return;
}

//-----------------------------------------------------------------------------------
export interface charRange
{
	start: number,
	end: number
}
/**
 * Functions for getting the range of a statement. Grouped in a static class for coherency
 */
export abstract class rangeUtil
{
	static offsetFromLineCol(src: string | string[], node: moo.Token)
	{
		let lines = Array.isArray(src) ? src : src.split('\n');
		let charcount = lines.slice(0, node.line - 1).reduce((prev, next) =>
		{
			return prev + next.length + 1;
		}, 0);
		return (charcount += node.col - 1);
	}
	static LineCol2charRange(src: string | string[], node: moo.Token): charRange
	{
		let offset = rangeUtil.offsetFromLineCol(src, node);
		return {
			start: offset,
			end: offset + node.text.length
		};
	}
	/**
	 * Get the range of the statement from the offset of the first and last child of the node
	 * @param node CST node
	 */
	static nodeLength(node: any): charRange
	{
		let childs: moo.Token[] = [];
		// traverse the node to collect first and last child offset
		traverse(node, (key1: string, val1: null, innerObj: any, stop: any) =>
		{
			const current = val1 ?? key1;
			if (key1 === 'offset') {
				childs.push(innerObj.parent);
			}
			return current;
		});
		// Childs
		let start = childs[0].offset;
		let last = childs[childs.length - 1];

		return {
			start: start,
			end: (last.offset + last.text.length)
		};
	}
	/**
	 *  Get the range of the statement from the line-column of the first and last child of the node
	 * @param source Reference, the original string.
	 * @param node CST node
	 */
	static fromChildsLC(node: any): Range
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

		let start = { line: childs[0].line, character: childs[0].col };
		let end = { line: last.line, character: last.col };
		return { start: start, end: end };
	}
	/**
	 * Get the position of the last child
	 * @param node CST node
	 */
	static lastChildPos(node: any): Position
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
		return { line: last.line, character: last.col };
	}
	/**
	 * Ensures that the target range is included in an given Reference Range
	 * @param ref 
	 * @param rec 
	 */
	static equalize(ref: Range, rec: Range/*, document: TextDocument*/)
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

		return {
			start: compare(ref.start, rec.start),
			end: compare(ref.end, rec.end)
		};
	}
	/**
	 * Get Range from token line & col
	 * @param token 
	 * @param document 
	 */
	static getTokenRange(token: moo.Token, document?: TextDocument)
	{
		let tokenRange =
			Range.create(
				Position.create(token.line - 1, token.col - 1),
				Position.create(
					token.line + token.lineBreaks - 1,
					token.col + (token.text.length || token.value.length) - 1
				)
			);
		if (document) {
			// let sel = document.getText(tokenRange); console.log({ text: sel, range: tokenRange });
		}
		return tokenRange;
	}

	static rangeFromWord(word: string, pos:Position) {
		let res:Range = {
			start: pos,
			end: {
				line: pos.line,
				character: pos.character + word.length - 1
			}
		};
		return res;
	}
}
//-----------------------------------------------------------------------------------
/**
 * Generic vistor with callback for the CST
 * @param node 
 * @param callback 
 */
export function CSTvisitor(node: any, callback: any)
{
	function _visit(node: any, parent: any, key: string, level = 0)
	{
		if ('id' in node || 'type' in node) {
			const nodeType = getNodeType(node);
			callback[nodeType](node, parent, level);
		}
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
						// _visit(child[j], node, key, j);
						_visit(child[j], node, key, level + 1);
					}
				}
			} else if (isNode(child)) {
				_visit(child, node, key, level + 1);
			}
		}
	}
	_visit(node, null, '', 0);
}