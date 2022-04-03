import { spawn, Thread, Worker } from 'threads';
import { reflowOptions } from './lib/mxsReflow';
//--------------------------------------------------------------------------------
// /*
import { parseSource } from './mxsParser';
import { mxsReflow, options } from './lib/mxsReflow';
// import * as fs from 'fs';
//--------------------------------------------------------------------------------
function setOptions(settings?: Partial<reflowOptions>)
{
	options.reset();
	if (settings) {
		Object.assign(options, settings);
	}
}
//--------------------------------------------------------------------------------
function prettyCode(parserTree: unknown[], settings?: Partial<reflowOptions>)
{
	setOptions(settings);
	// options.wrapIdentities = true;
	return mxsReflow(parserTree);
	// return mxsMinify(parserTree);
}

export async function prettyData(data: unknown[] | string, settings?: Partial<reflowOptions>, threading = false)
{
	if (threading) {
		let prettyData = await spawn(new Worker('./workers/reflow.worker'));
		try {
			return await prettyData(data, settings);
		} catch (err) {
			throw err;
		} finally {
			await Thread.terminate(prettyData);
		}
	} else {
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
}
/*
export async function prettyFile(src: string, dest: string, settings?: Partial<reflowOptions>)
{
	let data = (await fs.promises.readFile(src)).toString();
	let pretty = await prettyData(data, settings);
	await fs.promises.writeFile(dest, pretty);
}
*/