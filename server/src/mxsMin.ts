'use strict';
// import { spawn, Thread, Worker } from 'threads';
import { spawn, Thread, Worker } from 'threads';
// import * as path from 'path';
// import { Worker } from 'worker_threads';
import { fileRead, fileWrite } from './lib/utils';
//--------------------------------------------------------------------------------
/*
//@ts-ignore
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
export async function MinifyDoc(data: any | any[] | string, dest: string)
{
	let minify = await MinifyData(data);
	await fileWrite(dest, minify);
}

export async function MinifyFile(src: string, dest: string)
{
	let data = await fileRead(src);
	let minify = await MinifyData(data);
	await fileWrite(dest, minify);
}
*/
/*
export function MinifyDoc(data: string, dest: string)
{
	return new Promise<void>((resolve, reject) =>
	{
		let worker = new Worker(path.resolve(__dirname, './workers/minify.js'), {
			workerData: {
				source: data,
			}
		});

		worker.on('message', (data) =>
		{
			// resolve(data);
			fileWrite(dest, data).then(result =>
			{
				resolve(result);
			});
		});

		worker.on('error', (err) =>
		{
			console.log(err);
			reject(err);
		});

		worker.on('exit', (code) =>
		{
			if (code != 0) { console.error(`Worker stopped with exit code ${code}`); }
			reject(`Worker stopped with exit code ${code}`);
		});
	});
}

export function MinifyFile(src: string, dest: string)
{
	return new Promise<void>((resolve, reject) =>
	{
		fileRead(src)
			.then(result =>
			{
				let worker = new Worker(path.resolve(__dirname, './workers/reflow.js'), {
					workerData: {
						source: result,
					}
				});

				worker.on('message', (data: string) =>
				{
					// resolve(data);
					return fileWrite(dest, data);
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
			})
			.then(result =>
			{
				resolve(result);
			});
	});
}
*/
export async function MinifyFile(src: string, dest: string)
{
	let minifyData = await spawn(new Worker('./workers/minify.worker'));
	try {
		let data = await fileRead(src);
		let minify = await minifyData(data);
		await fileWrite(dest, minify);
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
		await fileWrite(dest, minify);
	} catch (err) {
		console.log(err);
		throw err;
	} finally {
		await Thread.terminate(minifyData);
	}
}