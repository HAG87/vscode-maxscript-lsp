import { expose } from 'threads/worker';
import { parse, declareParser, parserOptions, parserResult, parseWithErrors } from '../mxsParserBase';

expose(function parseSource(source: string, options: parserOptions)
{
	try {
		return JSON.stringify(parse(source, declareParser()));
	} catch (err: any) {
		if (options.recovery) {
			return JSON.stringify(parseWithErrors(source, declareParser(), options));
		} else {
			throw err;
		}
	}
});