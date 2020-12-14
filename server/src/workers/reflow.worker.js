'use strict';
import { expose } from 'threads/worker';
import { parseSource } from '../mxsParser';
import { mxsReflow, options } from '../lib/mxsReflow';
//-----------------------------------------------------------------------------------
function setOptions(settings) {
	options.reset();
	if (settings) {
		Object.assign(options, settings);
	}
}

expose(
	async function prettyData(data, settings) {
		setOptions(settings);
		if (typeof data === 'string') {
			let results = await parseSource(data, { recovery: false, attemps: 10, memoryLimit: 0.9 });
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
	}
);