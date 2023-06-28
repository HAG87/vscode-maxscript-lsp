import
{
	FormatDoc,
	FormatFile,
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