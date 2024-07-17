import { Command, RequestType } from 'vscode-languageserver';
//------------------------------------------------------------------------------------------
export namespace Commands {
	export const MXS_MINDOC   = Command.create('Minify open document','mxs.minify');
	export const MXS_MINFILE  = Command.create('Minify file','mxs.minify.file');
	// export const MXS_MINFILES = Command.create('Minify files...','mxs.minify.files');
}
export interface MinifyDocParams
{
	command: string
	uri: string[];
}
export namespace MinifyDocRequest
{
	export const type = new RequestType<MinifyDocParams, string[] | null, void>('MaxScript/minify');
}
export interface PrettifyDocParams
{
	command: string
	uri: string[]
}
export namespace PrettifyDocRequest
{
	export const type = new RequestType<PrettifyDocParams, string[] | null, void>('MaxScript/prettify');
}