import
{
	WorkspaceChange,
	Range,
	Connection,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

let workspaceChange = new WorkspaceChange();

export async function replaceText(this: Connection, document: TextDocument, text: string)
{
	let textchange = workspaceChange.getTextEditChange(document.uri);
	textchange.replace(Range.create(0, 0, document.lineCount, document.getText().length - 1), text);
	return await this.workspace.applyEdit(workspaceChange.edit);
}