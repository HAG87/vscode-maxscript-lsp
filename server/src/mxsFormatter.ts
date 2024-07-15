import { readFile, writeFile } from 'fs/promises';
import { PathLike } from 'fs';
//--------------------------------------------------------------------------------
import { parseSource } from './mxsParser';
import { mxsReflow, options, reflowOptions } from './backend/mxsReflow';
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
export function FormatData(data: unknown[] | string, settings?: Partial<reflowOptions>)
{
	// console.log(data);
	setOptions(settings);
	// OPTIMIZATION ---> Use the already built parse tree
	// TODO: Using the CST causes a crash when the document is edited and the CST was not updated...
	// parserOptions defaults to { recovery: false, attemps: 1, memoryLimit: 0.9 }
	if (typeof data === 'string') {
		let results = parseSource(data);
		if (results.result!) {
			return mxsReflow(results.result);
		} else {
			throw new Error(`Failed to parse the code. Reason: ${results.error!.message || 'Unexpected error'}`);
		}
	} else {
		// this will fail if the cst is not plain...
		return mxsReflow(data);
	}
}
//--------------------------------------------------------------------------------
/** Format and save document */
export async function FormatDoc(data: unknown[] | string, dest: PathLike, settings?: Partial<reflowOptions>)
{
	await writeFile(
		dest,
		FormatData(data, settings)
	);
}
/** Read, format and save document */
export async function FormatFile(src: PathLike, dest: PathLike, settings?: Partial<reflowOptions>)
{
	await writeFile(
		dest,
		FormatData((await readFile(src)).toString(), settings)
	);
}