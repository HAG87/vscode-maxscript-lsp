import { spawn, Thread, Worker } from 'threads';
import * as fs from 'fs';
//--------------------------------------------------------------------------------
import { parseSource } from './mxsParser';
import { mxsReflow, options, reflowOptions } from './lib/mxsReflow';
//--------------------------------------------------------------------------------
function setOptions(settings?: Partial<reflowOptions>)
{
	options.reset();
	if (settings) {
		Object.assign(options, settings);
	}
}
//--------------------------------------------------------------------------------
/** format code.
 * @data Parser tree or code text
 */
export async function FormatData(data: unknown[] | string, settings?: Partial<reflowOptions>)
{
	// console.log(data);
	setOptions(settings);
	// OPTIMIZATION ---> Use the already built parse tree
	// TODO: Using the CST causes a crash when the document is edited and the CST was not updated...
	// parserOptions defaults to { recovery: false, attemps: 1, memoryLimit: 0.9 }
	if (typeof data === 'string') {
		let results = await parseSource(data);
		if (results.result!) {
			return mxsReflow(results.result);
		} else {
			throw new Error('Parser failed------.');
		}
	} else {
		// this will fail if the cst is not plain...
		return mxsReflow(data);
	}
}
/** format code -- threaded
 * @data Parser tree or code text
 */
export async function FormatDataThreaded(data: unknown[] | string, settings?: Partial<reflowOptions>)
{
	let formatDataThreaded = await spawn(new Worker('./workers/formatter.worker'));
	try {
		return await formatDataThreaded(data, settings);
	} catch (err) {
		throw err;
	} finally {
		await Thread.terminate(formatDataThreaded);
	}
}
/** Format and save document -- threaded */
export async function FormatDoc(data: unknown[] | string, dest: string, settings?: Partial<reflowOptions>)
{
	await fs.promises.writeFile(dest, await FormatData(data, settings));
}
/** Format and save document */
export async function FormatDocThreaded(data: unknown[] | string, dest: string, settings?: Partial<reflowOptions>)
{
	await fs.promises.writeFile(dest, (await FormatDataThreaded(data, settings)));
}
/** Read, format and save document */
export async function FormatFile(src: string, dest: string, settings?: Partial<reflowOptions>)
{
	let data = (await fs.promises.readFile(src)).toString();
	await fs.promises.writeFile(dest, await FormatData(data, settings));
}
/** Read, format and save document -- threaded*/
export async function FormatFileThreaded(src: string, dest: string, settings?: Partial<reflowOptions>)
{
	let data = (await fs.promises.readFile(src)).toString();
	await FormatDocThreaded(data, dest, settings);
}