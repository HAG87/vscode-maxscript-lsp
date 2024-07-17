import { PathLike } from 'fs';
import
{
	FormatDoc,
	FormatFile,
} from './mxsFormatter';
import { reflowOptions } from './backend/mxsReflow';
//--------------------------------------------------------------------------------
export const minifyOptions: Partial<reflowOptions> = {
	indent: '',
	linebreak: ';',
	spacer: '',
	codeblock:
	{
		newlineAtParens: false,
		spaced: false,
		newlineAllways: false,
	},
	elements: { useLineBreaks: false },
	statements: { optionalWhitespace: true },
}
//--------------------------------------------------------------------------------
/** Minify and save document */
export async function MinifyDoc(data: unknown[] | string, dest: PathLike)
{
	await FormatDoc(data, dest, minifyOptions);
}
/** Open, minify and save document */
export async function MinifyFile(src: PathLike, dest: PathLike)
{
	await FormatFile(src, dest, minifyOptions);
}