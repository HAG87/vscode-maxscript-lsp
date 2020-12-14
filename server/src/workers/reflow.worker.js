'use strict';
import { expose } from 'threads/worker';
// import { workerData, parentPort } from 'worker_threads';
import { parseSource } from '../mxsParser';
import { mxsReflow, options } from '../lib/mxsReflow';
//-----------------------------------------------------------------------------------
function setOptions(settings) {
	options.reset();
	if (settings) {
		Object.assign(options, settings);
	}
}
/*
async function prettyData(data, settings) {
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
}
//-----------------------------------------------------------------------------------
prettyData(workerData.source, workerData.options)
	.then(result => parentPort.postMessage(result));
*/
expose(
	async function prettyData(data, settings) {
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
	}
);