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
function parentPath(path: string, level: number = 1)
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
function findParentName(CST: any, path: string, key: string = 'id.value.text')
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
/** @type {any} */
const objFromKeys = (arr: any[], def: any) => arr.reduce((ac: any, a: any) => ({ ...ac, [a]: def }), {});
//-----------------------------------------------------------------------------------
export
{
	parentPath,
	findParentName,
	objFromKeys
};