'use strict';
import { expose } from 'threads/worker';
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
	options.expression.useWhiteSpace = false;
}

expose (
	async function minifyData(data) {
		setOptions();
		if (typeof data === 'string') {
			let results = await parseSource(data,  { recovery: false, attemps: 10, memoryLimit: 0.9 });
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
);