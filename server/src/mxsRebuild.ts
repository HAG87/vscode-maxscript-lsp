'use strict';
// import { spawn, Thread, Worker } from 'threads';
//--------------------------------------------------------------------------------
//@ts-ignore
import { parseSource } from './mxsParser';
import { mxsReflow, options } from './lib/mxsReflow';
import { fileRead, fileWrite } from './lib/utils';
import * as path from 'path';
//--------------------------------------------------------------------------------
interface prettyOptions
{
	elements: {
		useLineBreaks: boolean
	}
	statements: {
		optionalWhitespace: boolean
	}
	codeblock: {
		newlineAtParens: boolean,
		newlineAllways: boolean,
		spaced: boolean
	}
}

function setOptions(settings?: prettyOptions)
{
	options.reset();
	if (settings) {
		Object.assign(options, settings);
	}
}
//--------------------------------------------------------------------------------
// make this async...
function prettyCode(parserTree: any[], settings?: prettyOptions)
{
	setOptions(settings);
	// options.wrapIdentities = true;
	return mxsReflow(parserTree);
	// return mxsMinify(parserTree);
}

export async function prettyData(data: any | any[] | string, settings?: prettyOptions)
{
	// console.log(path.resolve(__dirname));
	if (typeof data === 'string') {		
		//---------------------------------------------------------------
		let results = await parseSource(data);
		if (results.result !== undefined) {
			return prettyCode(results.result);
		} else {
			throw new Error('Parser failed.');
		}
	} else {
		return prettyCode(data, settings);
	}
}

// export async function prettyDoc(data: any | any[] | string, savePath: string)
// {
// 	return await prettyData(data);
// }

export async function prettyFile(src: string, dest: string, settings?: prettyOptions)
{
	let data = await fileRead(src);
	let minify = await prettyData(data, settings);
	await fileWrite(dest, minify);
}