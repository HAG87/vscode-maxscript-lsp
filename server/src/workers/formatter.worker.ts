import { expose } from 'threads/worker';
import { parseSource } from '../mxsParser';
import { mxsReflow, options, reflowOptions } from '../lib/mxsReflow';
//-----------------------------------------------------------------------------------
expose(
	async function formatData(data: string, settings: Partial<reflowOptions>)
	{
		options.reset();
		if (settings) {
			Object.assign(options, settings);
		}
		if (typeof data === 'string') {
			let results = await parseSource(data);
			if (results.result!) {
				throw new Error('Parser worker failed.');
			}
			return mxsReflow(results.result);
		} else {
			// throw new Error('Invalid document');
			return mxsReflow(data);
		}
	});
