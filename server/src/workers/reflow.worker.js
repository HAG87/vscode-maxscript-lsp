import { expose } from 'threads/worker';
import { parseSource } from '../mxsParser';
import { mxsReflow, options } from '../lib/mxsReflow';
//-----------------------------------------------------------------------------------
expose(
	function formatData(data, settings)
	{
		options.reset();
		if (settings) {
			Object.assign(options, settings);
		}
		if (typeof data === 'string') {
			let results = parseSource(data);
			if (results.result === undefined || results.result === null) {
				throw new Error(`Failed to parse the code. Reason: ${results.error || 'Unexpected error'}`);
			}
			return mxsReflow(results.result);
		} else {
			return mxsReflow(data);
		}
	});
