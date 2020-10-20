import { Command } from 'vscode-languageserver';
//------------------------------------------------------------------------------------------
export namespace Commands {
	export const MXS_MINDOC   = Command.create('Minify open document','mxs.minify');
	export const MXS_MINFILE  = Command.create('Minify file','mxs.minify.file');
	export const MXS_MINFILES = Command.create('Minify files...','mxs.minify.files');
}