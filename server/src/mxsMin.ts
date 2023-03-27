import * as mxsFormatter from './mxsFormatter';
//--------------------------------------------------------------------------------
let opts = {
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
/** Minify document */
export async function MinifyData(data: unknown[] | string)
{
	return mxsFormatter.FormatData(data, opts);
}
/** Minify and save document */
export async function MinifyDoc(data: unknown[] | string, dest: string)
{
	await mxsFormatter.FormatDoc(data, dest, opts);
}
/** Open, minify and save document */
export async function MinifyFile(src: string, dest: string)
{
	await mxsFormatter.FormatFile(src, dest, opts);
}
/** Minify document - threaded */
export async function MinifyDataThreaded(data: unknown[] | string)
{
	return await mxsFormatter.FormatDataThreaded(data, opts);
}
/** Minify and save document - threaded */
export async function MinifyDocThreaded(data: unknown[] | string, dest: string)
{
	await mxsFormatter.FormatDocThreaded(data, dest, opts);
}
/** Open, minify and save document - threaded */
export async function MinifyFileThreaded(src: string, dest: string)
{
	await mxsFormatter.FormatFileThreaded(src, dest, opts);
}