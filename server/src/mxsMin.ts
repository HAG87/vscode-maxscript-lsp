import { spawn, Thread, Worker } from 'threads';
import * as fs from 'fs';
//--------------------------------------------------------------------------------
import { parseSource } from './mxsParser';
import { mxsReflow, options, reflowOptions } from './lib/mxsReflow';
//--------------------------------------------------------------------------------
let opts = {
	indent: '',
	linebreak: ';',
	spacer: '',
	codeblock:
	{
		newlineAtParens: false,
		spaced: false,
		newlineAllways: false,
	},
	elements: { useLineBreaks: false },
	statements: { optionalWhitespace: true },
}

function setOptions(settings?: Partial<reflowOptions>)
{
	options.reset();
	if (settings) {
		Object.assign(options, settings);
	}
}
//--------------------------------------------------------------------------------
export async function MinifyData(data: unknown[] | string)
{
	if (typeof data === 'string') {
		let results = await parseSource(data);
		if (results.result!) {
			return mxsReflow(results.result);
		} else {
			throw new Error('Parser failed.');
		}
	} else {
		return mxsReflow(data);
	}
}

export async function MinifyDoc(data: unknown[] | string, dest: string)
{
	setOptions(opts);
	await fs.promises.writeFile(dest, await MinifyData(data));
}

export async function MinifyDocThreaded(data: unknown[] | string, dest: string)
{
	let minifyData = await spawn(new Worker('./workers/minify.worker'));
	try {
		let minify = await minifyData(data);
		await fs.promises.writeFile(dest, minify);
	} catch (err) {
		throw err;
	} finally {
		await Thread.terminate(minifyData);
	}
}

export async function MinifyFile(src: string, dest: string)
{
	setOptions();
	let data = (await fs.promises.readFile(src)).toString();
	await fs.promises.writeFile(dest, await MinifyData(data));
}

export async function MinifyFileThreaded(src: string, dest: string)
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