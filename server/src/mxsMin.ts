'use strict';
// import { spawn, Thread, Worker } from 'threads';
//--------------------------------------------------------------------------------
//@ts-ignore
// import { mxsMinify } from './lib/mxsCompactCode';
import { parseSource } from './mxsParser';
import { mxsReflow, options } from './lib/mxsReflow';
import { fileRead, fileWrite } from './lib/utils';
//--------------------------------------------------------------------------------
function setOptions() {
	options.indent = '';
	options.linebreak = ';';
	options.spacer = '';
	options.codeblock.newlineAtParens = false;
	options.codeblock.spaced = false;
	options.codeblock.newlineAllways = false;
	options.elements.useLineBreaks = false;
	options.statements.optionalWhitespace = true;
}
//--------------------------------------------------------------------------------
//TODO: REPLACE FILE OPERATIOSN WITH WORKSPACE MANAGER...
// make this async...
function minCode(parserTree: any[])
{
	setOptions();
	// options.wrapIdentities = true;
	return mxsReflow(parserTree);	
	// return mxsMinify(parserTree);
}

export async function MinifyData(data: any | any[] | string)
{
	if (typeof data === 'string') {
		let results = await parseSource(data);
		if (results.result !== undefined) {
			return minCode(results.result);
		} else {
			throw new Error('Parser failed.');
		}
	} else {
		return minCode(data);
	}
}

export async function MinifyDoc(data: any | any[] | string, savePath: string)
{
	let minify = await MinifyData(data);
	await fileWrite(savePath, minify);
}

export async function MinifyFile(src: string, dest: string)
{
	let data = await fileRead(src);
	let minify = await MinifyData(data);
	await fileWrite(dest, minify);
}