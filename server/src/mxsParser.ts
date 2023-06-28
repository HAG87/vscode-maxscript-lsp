import { spawn, Thread, Worker } from 'threads';
import
	{
		parserOptions,
		parserResult,
		parse,
		parseWithErrors,
		declareParser,
	} from './mxsParserBase';
//@ts-ignore
import workerURL from "threads-plugin/dist/loader?name=parser.worker!./workers/parser.worker.ts"
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
	let parseSource = await spawn(new Worker(`./${workerURL}`));
	try {
		return JSON.parse(await parseSource(source, options));
	} finally {
		await Thread.terminate(parseSource);
	}
}