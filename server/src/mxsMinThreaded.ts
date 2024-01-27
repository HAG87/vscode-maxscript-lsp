import { PathLike } from 'fs';
import
	{
		FormatDoc,
		FormatFile
	} from './mxsFormatterThreaded';
import { minifyOptions } from './mxsMin'
//--------------------------------------------------------------------------------
/** Minify and save document - threaded */
export async function MinifyDoc(data: unknown[] | string, dest: PathLike)
{
	await FormatDoc(data, dest, minifyOptions);
}
/** Open, minify and save document - threaded */
export async function MinifyFile(src: PathLike, dest: PathLike)
{
	await FormatFile(src, dest, minifyOptions);
}