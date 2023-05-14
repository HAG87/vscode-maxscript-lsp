import { expose } from 'threads/worker';
import { parse, declareParser, parseWithErrors } from '../mxsParserBase';

expose(function parseSource(source, options)
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
});