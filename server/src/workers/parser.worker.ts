import {Parser} from 'nearley';
import { expose } from 'threads/worker';
import * as mxsParserBase from '../mxsParserBase';

expose({
	parse(src: string, parserInstance:Parser) { return mxsParserBase.parse(src, parserInstance) },
	parseWithErrors(src:string, parserInstance:Parser, options: mxsParserBase.parserOptions) { return mxsParserBase.parseWithErrors(src, parserInstance, options) }
});