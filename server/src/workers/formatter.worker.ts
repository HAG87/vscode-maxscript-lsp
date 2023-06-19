import { expose } from 'threads/worker';
import { parseSource } from '../mxsParser';
import { mxsReflow, options, reflowOptions } from '../lib/mxsReflow';
//-----------------------------------------------------------------------------------
expose(
	function formatData(data: string, settings: Partial<reflowOptions>)
	{
		options.reset();
		if (settings) {
			Object.assign(options, settings);
		}
		if (typeof data === 'string') {
			let results = parseSource(data);
			// console.log(results);
			if (results.result === undefined || results.result === null) {
				throw new Error(`Failed to parse the code. Reason: ${results.error!.message || 'Unexpected error'}`);
			}
			return mxsReflow(results.result);
		} else {
			// throw new Error('Invalid document');
			return mxsReflow(data);
		}
	});
