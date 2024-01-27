import { spawn, Thread, Worker } from 'threads';
import { readFile, writeFile } from 'fs/promises';
//--------------------------------------------------------------------------------
import { reflowOptions } from './lib/mxsReflow';
import { PathLike } from 'fs';
//@ts-ignore
// import workerURL from 'threads-plugin/dist/loader?name=reflow.worker!./workers/reflow.worker.ts';
//--------------------------------------------------------------------------------
/** format code -- threaded
 * @data Parser tree or code text
 */
export async function FormatData(data: unknown[] | string, settings?: Partial<reflowOptions>): Promise<string>
{
	let workerURL
	try {
		workerURL = require('threads-plugin/dist/loader?name=reflow.worker!./workers/reflow.worker.ts');			
	} catch {
		workerURL = 'workers/reflow.worker';
	}
	let worker = await spawn(new Worker(`./${workerURL}`));
	try {
		// let parsings = await parseSourceThreaded(data, {recovery: false});
		return await worker(data, settings);
		// return "";
	} catch (err) {
		throw err;
	} finally {
		await Thread.terminate(worker);
	}
}
//--------------------------------------------------------------------------------
/** Format and save document */
export async function FormatDoc(data: unknown[] | string, dest: PathLike, settings?: Partial<reflowOptions>)
{
	await writeFile(
		dest,
		await FormatData(data, settings)
	);
}
/** Read, format and save document -- threaded*/
export async function FormatFile(src: PathLike, dest: PathLike, settings?: Partial<reflowOptions>)
{
	await writeFile(
		dest,
		await FormatData((await readFile(src)).toString(), settings)
	);
}