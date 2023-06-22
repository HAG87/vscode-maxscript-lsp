import { expose } from 'threads/worker';
import { parse, declareParser, parseWithErrors } from '../mxsParserBase';

expose(function parseSource(source, options)
{
	try {
		return JSON.stringify(parse(source, declareParser()));
	} catch (err) {
		if (options.recovery) {
			return JSON.stringify(parseWithErrors(source, declareParser(), options));
		} else {
			throw err;
		}
	}
});