import
	{
		FormatDoc,
		FormatDocThreaded,
		FormatFile,
		FormatFileThreaded
	} from './mxsFormatter';
//--------------------------------------------------------------------------------
export const minifyOptions = {
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
export async function MinifyDoc(data: unknown[] | string, dest: string)
{
	await FormatDoc(data, dest, minifyOptions);
}
/** Open, minify and save document */
export async function MinifyFile(src: string, dest: string)
{
	await FormatFile(src, dest, minifyOptions);
}
/** Minify and save document - threaded */
export async function MinifyDocThreaded(data: unknown[] | string, dest: string)
{
	await FormatDocThreaded(data, dest, minifyOptions);
}
/** Open, minify and save document - threaded */
export async function MinifyFileThreaded(src: string, dest: string)
{
	await FormatFileThreaded(src, dest, minifyOptions);
}