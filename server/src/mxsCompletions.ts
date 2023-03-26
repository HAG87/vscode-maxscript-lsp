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
// trigger completion for method call
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

	// if (!(util.isPositionInString(lineTillCurrentPosition))) { return []; }
	const termMatch = dotPattern.exec(lineTillCurrentPosition);
	if (termMatch) {
		// return properties, methods...
		maxCompletions.forEach(item =>
		{
			if (item.label === termMatch![1]) {
				switch (item.kind) {
					case CompletionItemKind.Class:
						return mxClassMembers?.[item.label];
					case CompletionItemKind.Struct:
						return mxStructsMembers?.[item.label];
					case CompletionItemKind.Interface:
						return mxInterfaceMembers?.[item.label];
					default:
						return;
				}
			}
		});
	}
	// return complete list of completions
	return maxCompletions;
}