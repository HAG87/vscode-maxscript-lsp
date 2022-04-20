import { expose } from 'threads/worker';
import { parseSource } from '../mxsParser';
import { mxsReflow, options } from '../lib/mxsReflow';
//--------------------------------------------------------------------------------
// declare const self: Worker;

function setOptions()
{
	options.indent = '';
	options.linebreak = ';';
	options.spacer = '';
	options.codeblock.newlineAtParens = false;
	options.codeblock.spaced = false;
	options.codeblock.newlineAllways = false;
	options.elements.useLineBreaks = false;
	options.statements.optionalWhitespace = true;
}
expose(
	async function minifyData(data: string)
	{
		setOptions();
		if (typeof data === 'string') {
			let results = await parseSource(data);
			if (results.result) {
				return mxsReflow(results.result);
			} else {
				throw new Error('Parser failed.');
			}
		} else {
			// this will fail if the cst is not plain...
			// return mxsReflow(data);
			throw new Error('Invalid document');
		}
	});