'use strict';

import objectPath from 'object-path';
//@ts-ignore
import { pathUp } from 'ast-monkey-util';
//@ts-ignore
import { getObj } from 'ast-get-object';
//@ts-ignore
import { getByKey } from 'ast-get-values-by-key';
//@ts-ignore
import { traverse } from 'ast-monkey-traverse';

import { Range, Position } from 'vscode-languageserver';
//-----------------------------------------------------------------------------------
export interface Dictionary<T>
{
	[key: string]: T;
}
//-----------------------------------------------------------------------------------

export const getFromCST = (CST: any | any[], keyValPair: object) => getObj(CST, keyValPair);
/**
 * Get CST all nodes with key
 * @param CST 
 * @param key 
 */
export const getNodesByKeyFromCST = (CST: any | any[], key: string | string[]) => getByKey(CST, key);

export const hasKey = <O>(obj: O, key: keyof any): key is keyof O => key in obj;
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
/*
type traverseCallback = (key: string, val: any, innerObj?: any, stop?: any) => string;
type traverse = (n:any, fn: traverseCallback) => void;
*/
/**
 * Functions for getting the range of a statement. Grouped in a static class for coherency
 */
export abstract class rangeUtil
{
	static offsetFromLineCol(src: string | string[], node: moo.Token)
	{
		const lines = Array.isArray(src) ? src : src.split('\n');
		let charcount = lines.slice(0, node.line - 1).reduce((prev, next) =>
		{
			return prev + next.length + 1;
		}, 0);
		return (charcount += node.col - 1);
	}
	static LineCol2charRange(src: string | string[], node: moo.Token): charRange
	{
		const offset = rangeUtil.offsetFromLineCol(src, node);
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
		traverse(node, (key: string, val: any, innerObj: any) =>
		{
			const current = val ?? key;
			if (key === 'offset') { childs.push(innerObj.parent); }
			// if you are traversing and "stumbled" upon an object, it will have both "key" and "val"
			// if you are traversing and "stumbled" upon an array, it will have only "key"
			// you can detect either using the principle above.
			// you can also now change "current" - what you return will be overwritten.
			// return `NaN` to give instruction to delete currently traversed piece of AST.
			// stop - set stop.now = true; to stop the traversal
			return current;
		});
		// Childs
		const start = childs[0].offset;
		const last = childs[childs.length - 1];

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
		traverse(node, (key: string, val: any, innerObj: any) =>
		{
			const current = val ?? key;
			if (key === 'line') { childs.push(innerObj.parent); }
			return current;
		});

		const last = childs[childs.length - 1];

		return {
			start: {
				line: childs[0].line,
				character: childs[0].col
			},
			end: {
				line: last.line,
				character: last.col
			}
		};
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
		const compare = (a: Position, b: Position) =>
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
	static getTokenRange(token: moo.Token/* , document?: TextDocument */)
	{
		// let tokenRange =
		return Range.create(
			Position.create(token.line - 1, token.col - 1),
			Position.create(
				token.line + token.lineBreaks - 1,
				token.col + (token.text.length || token.value.length) - 1
			)
		);
		/*
		if (document) {
			let sel = document.getText(tokenRange); console.log({ text: sel, range: tokenRange });
		}
		return tokenRange;
		*/
	}

	static rangeFromWord(word: string, pos: Position)
	{
		return <Range>{
			start: pos,
			end: {
				line: pos.line,
				character: pos.character + word.length - 1
			}
		};
	}
}
//-----------------------------------------------------------------------------------