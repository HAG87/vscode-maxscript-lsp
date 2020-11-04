'use strict';

// const objectPath = require('object-path');
import objectPath from 'object-path';
//-----------------------------------------------------------------------------------
/**
 * Retrieve an object-path notation pruning n branches/leafs
 * Partially extracted from ast-monkey-util
 * @param {string} path The path of the current node/key
 * @param {number} [level] Level to retrieve
 */
export function parentPath(path: string, level: number = 1)
{
	if (typeof path === 'string') {
		if (!path.includes('.')) {
			return path;
		} else {
			let pathTree = path.split('.');
			// will fail if level is greater than the path depth.
			if (level <= pathTree.length) {
				return pathTree.slice(0, -level).join('.');
			} else {
				return;
			}
		}
	}
}
//-----------------------------------------------------------------------------------
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
export const objFromKeys = (arr: any[], def: any) => arr.reduce((ac: any, a: any) => ({ ...ac, [a]: def }), {});
//-----------------------------------------------------------------------------------
interface Dictionary<T>
{
	[key: string]: T;
}
/**
 * Check if value is node
 * @param {any} node CST node
 */
const isNode = (node: any) => typeof node === 'object' && node != null;
/**
 * filter nodes by type property
 * @param {any} node CST node
 */
const getNodeType = (node: any) => node !== undefined && ('type' in node) ? node.type : undefined;


export function visitor(node: any, callback: any)
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

/**
 * 	Visitor pattern function to transform MaxScript CST to minified code 
 * @param {any} node CST
 * @param {any} callbackMap rules
 */
//-----------------------------------------------------------------------------------
export function visitorAcc(node: any, callbackMap: any)
{
	return _visit(node, null, null, 0);
	function _visit(node: any, parent: any, key: string | null, branch = 0)
	{
		const nodeType = getNodeType(node);
		// captured values
		let stack: Dictionary<any> = {};
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
				let collection = [];
				for (let j = 0; j < child.length; j++) {
					if (isNode(child[j])) {
						collection.push(
							_visit(child[j], node, key, branch + 1)
						);
					}
					// else {
					// not object array items. i.e. null values
					// }
				}
				stack[key] = collection;
			}
			else if (isNode(child)) {
				// value is an object, visit it
				stack[key] = _visit(child, node, key, branch + 1);
			}
			// else if (child === String || child === Number) {
			// eslint-disable-next-line no-empty
			//...
			// }
		}
		let res;
		if (nodeType !== undefined && nodeType in callbackMap) {
			res = callbackMap[nodeType](node, stack);
		}
		else if (nodeType) {
			res = node;
		}
		else if (Array.isArray(node)) {
			res = keys.map(x => stack[x]).join(';');
		}
		//--------------------------------
		return res;
	}
}