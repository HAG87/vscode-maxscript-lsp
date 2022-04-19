import
	{
		CompletionItem,
		CompletionItemKind,
		Range,
		Position
	} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
//------------------------------------------------------------------------------------------
import { maxCompletions } from './schema/mxsSchema';
import { mxClassMembers } from './schema/mxsSchema-clases';
import { mxInterfaceMembers } from './schema/mxsSchema-interfaces';
import { mxStructsMembers } from './schema/mxsSchema-structs';
//------------------------------------------------------------------------------------------
const dotPattern = /([A-Za-z_][A-Za-z0-9_]+)[.]$/mi;

/**
 * Retrieve the completion items, search for descendant completion items.
 * @param document
 * @param position
 */
export function provideCompletionItems(document: TextDocument, position: Position): CompletionItem[]
{
	const lineTillCurrentPosition = document.getText(
		Range.create(
			position.line, 0,
			position.line,
			position.character
		));

	// TODO: Escape strings
	// if (!(util.isPositionInString(lineTillCurrentPosition))) { return []; }

	let result: CompletionItem[] = [];

	const termMatch = dotPattern.exec(lineTillCurrentPosition);
	if (termMatch) {
		// return properties, methods...
		maxCompletions.forEach(item =>
		{
			if (item.label === termMatch![1]) {
				switch (item.kind) {
					case CompletionItemKind.Class:
						result = mxClassMembers?.[item.label];
						break;
					case CompletionItemKind.Struct:
						result = mxStructsMembers?.[item.label];
						break;
					case CompletionItemKind.Interface:
						result = mxInterfaceMembers?.[item.label];
						break;
				}
				return;
			}
		});
	} else {
		// return complete list of completions
		result = maxCompletions;
	}
	return result;
}