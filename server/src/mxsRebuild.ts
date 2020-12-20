'use strict';
// import { spawn, Thread, Worker } from 'threads';
// import * as path from 'path';
// import { Worker } from 'worker_threads';
import { spawn, Thread, Worker } from 'threads';
import { ReflowOptions } from './lib/mxsReflow';
//--------------------------------------------------------------------------------
/*
//@ts-ignore
// import { parseSource } from './mxsParser';
// import { mxsReflow, options } from './lib/mxsReflow';
// import { fileRead, fileWrite } from './lib/utils';
*/
//--------------------------------------------------------------------------------
/*
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
		if (results.result !== undefined) {
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
	let data = await fileRead(src);
	let pretty = await prettyData(data, settings);
	await fileWrite(dest, pretty);
}
*/
/*
export async function prettyData(data: unknown | unknown[] | string, settings?: Partial<ReflowOptions>)
{
	return new Promise<string>((resolve, reject) => {
		let worker = new Worker(path.resolve(__dirname, './workers/reflow.js'), {
			workerData: {
				source: data,
				options: settings
			}
		});
		
		worker.on('message', (data: string) =>
		{
			resolve(data);
		});
		
		worker.on('error', err =>
		{
			console.log(err);
			reject(err);
		});
		
		worker.on('exit', code =>
		{
			if (code != 0) { console.error(`Worker stopped with exit code ${code}`); }
			reject(`Worker stopped with exit code ${code}`);
		});
	});
}
*/
export async function prettyData(data: unknown | unknown[] | string, settings?: Partial<ReflowOptions>)
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