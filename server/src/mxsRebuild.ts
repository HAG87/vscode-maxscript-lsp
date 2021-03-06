'use strict';
import { spawn, Thread, Worker } from 'threads';
import { reflowOptions } from './lib/mxsReflow';
//--------------------------------------------------------------------------------
/*
import { parseSource } from './mxsParser';
import { mxsReflow, options } from './lib/mxsReflow';
import {readFile, writeFile} from 'fs/promises'
//--------------------------------------------------------------------------------
function setOptions(settings?: Partial<ReflowOptions>)
{
	options.reset();
	if (settings) {
		Object.assign(options, settings);
	}
}
//--------------------------------------------------------------------------------
function prettyCode(parserTree: unknown[], settings?: Partial<ReflowOptions>)
{
	setOptions(settings);
	// options.wrapIdentities = true;
	return mxsReflow(parserTree);
	// return mxsMinify(parserTree);
}

export async function prettyData(data: unknown | unknown[] | string, settings?: Partial<ReflowOptions>)
{
	if (typeof data === 'string') {
		let results = await parseSource(data);
		if (results.result) {
			return prettyCode(results.result);
		} else {
			throw new Error('Parser failed.');
		}
	} else {
		// throw new Error('Invalid document');
		return prettyCode(data);
	}
}

// export async function prettyDoc(data: unknown | unknown[] | string, savePath: string)
// {
// 	return await prettyData(data);
// }

export async function prettyFile(src: string, dest: string, settings?: Partial<ReflowOptions>)
{
	let data = await readFile(src);
	let pretty = await prettyData(data, settings);
	await writeFile(dest, pretty);
}
*/

export async function prettyData(data: unknown | unknown[] | string, settings?: Partial<reflowOptions>)
{
	let prettyData = await spawn(new Worker('./workers/reflow.worker'));
	try {
		return await prettyData(data, settings);
	} catch (err) {
		throw err;
	} finally {
		await Thread.terminate(prettyData);
	}
}