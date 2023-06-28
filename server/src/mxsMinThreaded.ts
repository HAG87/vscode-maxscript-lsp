import
	{
		FormatDoc,
		FormatFile
	} from './mxsFormatterThreaded';
import { minifyOptions } from './mxsMin'
//--------------------------------------------------------------------------------
/** Minify and save document - threaded */
export async function MinifyDoc(data: unknown[] | string, dest: string)
{
	await FormatDoc(data, dest, minifyOptions);
}
/** Open, minify and save document - threaded */
export async function MinifyFile(src: string, dest: string)
{
	await FormatFile(src, dest, minifyOptions);
}