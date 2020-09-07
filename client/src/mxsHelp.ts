import {commands, Uri, TextEditor, workspace} from 'vscode';
import { getTextSel } from './utils';

/**
 * MaxScript online help launch at current selected word
 * @param help_addr Addess of the help page
 */
export async function mxsHelp(textEditor: TextEditor, ) {

	let help_addr = workspace.getConfiguration('maxscript').get('Help.Provider','http://help.autodesk.com/view/3DSMAX/2021/ENU/');
	let query = getTextSel(textEditor);
	// if (query) {
	let uri = Uri.parse(encodeURI(`${help_addr}?query=${query!}&cg=Scripting%20%26%20Customization`));
	await commands.executeCommand('vscode.open', uri);
	// }
}