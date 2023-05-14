import { spawn, Thread, Worker } from 'threads';
import
	{
		parserOptions,
		parserResult,
		parse,
		parseWithErrors,
		declareParser,
	} from './mxsParserBase';

//-----------------------------------------------------------------------------------
/**
 * Parse MaxScript code
 * @param source source code string
 * @param options recovery; enable the error recovery parser. set attemps to -1 to disable attemps limit
 */
export function parseSource(source: string, options = new parserOptions()): parserResult
{
	try {
		return parse(source, declareParser());
	} catch (err) {
		if (options.recovery) {
			return parseWithErrors(source, declareParser(), options);
		} else {
			throw err;
		}
	}
}

export async function parseSourceThreaded(source: string, options = new parserOptions()): Promise<parserResult>
{
	let parserWorker = await spawn(new Worker('./workers/parser.worker'));
	try {
		return await parserWorker.parseSource(source, options);
	} finally {
		await Thread.terminate(parserWorker);
	}
}