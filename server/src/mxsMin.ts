'use strict';
// import { spawn, Thread, Worker } from 'threads';
import * as fs from 'fs';
//--------------------------------------------------------------------------------
// /*
import { parseSource } from './mxsParser';
import { mxsReflow, options } from './lib/mxsReflow';
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
function minCode(parserTree: unknown[])
{
	setOptions();
	// options.wrapIdentities = true;
	return mxsReflow(parserTree);	
	// return mxsMinify(parserTree);
}

export async function MinifyData(data: unknown[] | string)
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
export async function MinifyDoc(data: unknown[] | string, dest: string)
{
	let minify = await MinifyData(data);
	await fs.promises.writeFile(dest, minify);
}

export async function MinifyFile(src: string, dest: string)
{
	let data = (await fs.promises.readFile(src)).toString();
	let minify = await MinifyData(data);
	await fs.promises.writeFile(dest, minify);
}
// */
/*
export async function MinifyFile(src: string, dest: string)
{
	let minifyData = await spawn(new Worker('./workers/minify.worker'));
	try {
		let data = await fs.promises.readFile(src);
		let minify = await minifyData(data.toString());
		await fs.promises.writeFile(dest, minify);
	} catch (err) {
		throw err;
	} finally {
		await Thread.terminate(minifyData);
	}
}

export async function MinifyDoc(src: string, dest: string)
{
	let minifyData = await spawn(new Worker('./workers/minify.worker'));
	try {
		let minify = await minifyData(src);
		await fs.promises.writeFile(dest, minify);
	} catch (err) {
		throw err;
	} finally {
		await Thread.terminate(minifyData);
	}
}
*/