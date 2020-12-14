'use strict';
import { expose } from 'threads/worker';
import { parseSource } from '../mxsParser';
import { mxsReflow, options } from '../lib/mxsReflow';
//-----------------------------------------------------------------------------------
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
function setOptions(settings: prettyOptions)
{
	options.reset();
	if (settings) {
		Object.assign(options, settings);
	}
}
expose(
	async function prettyData(data: string, settings: prettyOptions)
	{
		setOptions(settings);
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
