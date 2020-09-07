import {
	Command,
	// TextDocuments,
	// Range,
	// ShowMessageNotification
} from 'vscode-languageserver';
// import {
// 	TextDocument
// } from 'vscode-languageserver-textdocument';
// import * as Path from 'path';
// import * as utils from './utils';
// import mxsMinifier from './mxsMin';
import {mxsDocumentSymbols} from './mxsOutline';
// import {connection} from './server';
//------------------------------------------------------------------------------------------
export namespace Commands {
	export const MXS_MINDOC = Command.create('Minify open document','mxs.minify');
	export const MXS_MINFILE = Command.create('Minify file','mxs.minify.file');
	export const MXS_MINFILES = Command.create('Minify files...','mxs.minify.files');
}
//------------------------------------------------------------------------------------------
/*
async function MinifyDocExec(args: ExecuteCommandParams, document: TextDocument) {
	let settings = await getDocumentSettings(document.uri);
	try {
		let path = utils.uriToPath(document.uri)!;
		let newPath = utils.prefixFile(path, settings.MinifyFilePrefix);
		// connection.console.log(utils.uriToPath(currentTextDocument.uri)!);
		await mxsMinifier.MinifyDoc(mxsDocumentSymbols.msxParser.parsedCST || document.getText(), newPath);
		
		connection.window.showInformationMessage(`MaxScript minify: Document saved as ${Path.basename(newPath)}`);
	} catch (err) {
		connection.window.showErrorMessage(`MaxScript minify: Failed. Reason: ${err.message}`);
	}
}
*/