import { expose } from 'threads/worker';
import * as mxsParserBase from '../mxsParserBase';

expose({
	parse(src, parserInstance) { return mxsParserBase.parse(src, parserInstance) },
	parseWithErrors(src, parserInstance) { return mxsParserBase.parseWithErrors(src, parserInstance) }
});