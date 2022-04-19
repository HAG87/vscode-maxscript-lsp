import { expose } from 'threads/worker';
import { parseSource } from '../mxsParser';
import { mxsReflow, options, reflowOptions } from '../lib/mxsReflow';
//-----------------------------------------------------------------------------------
expose(
	async function prettyData(data: string, settings: Partial<reflowOptions>)
	{
		options.reset();
		if (settings) {
			Object.assign(options, settings);
		}

		// OPTIMIZATION ---> Use the already bilt parse tree
		if (typeof data === 'string') {
			let results = await parseSource(data);
			if (results.result!) {
				throw new Error('Parser failed.');
			}
			return mxsReflow(results.result);
		} else {
			// this will fail if the cst is not plain...
			// return mxsReflow(data);
			throw new Error('Invalid document');
		}
	});
