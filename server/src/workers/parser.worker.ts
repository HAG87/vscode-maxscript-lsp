import { expose } from 'threads/worker';
import { parse, declareParser, parserOptions, parserResult, parseWithErrors } from '../mxsParserBase';

expose(function parseSource(source: string, options: parserOptions): parserResult
{
	try {
		return parse(source, declareParser());
	} catch (err: any) {
		if (options.recovery) {
			return parseWithErrors(source, declareParser(), options);
		} else {
			throw err;
		}
	}
});