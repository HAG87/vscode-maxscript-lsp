'use strict';
// import { mxsMinify } from '../lib/mxsCompactCode';
import { expose } from 'threads/worker';
// import { workerData, parentPort } from 'worker_threads';
import { mxsReflow, options } from '../lib/mxsReflow';
import { parseSource } from '../mxsParser';
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
/*
async function minifyData(data) {
	setOptions();
	if (typeof data === 'string') {
		let results = await parseSource(data);
		if (results.result !== undefined) {
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
minifyData(workerData.source)
	.then(result => parentPort.postMessage(result));
	*/
expose (
	async function minifyData(data:string) {
		setOptions();
		if (typeof data === 'string') {
			let results = await parseSource(data);
			if (results.result !== undefined) {
				return <string>mxsReflow(results.result);
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