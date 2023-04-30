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
	// console.log(termMatch);
	if (termMatch) {
		// return properties, methods...
		// it must be a one-to-one relationship
		const member = maxCompletions.find(item => item.label === termMatch[1]!);
		if (member) {
			switch (member.kind) {
				case CompletionItemKind.Class:
					return mxClassMembers?.[member.label];
				case CompletionItemKind.Struct:
					return mxStructsMembers?.[member.label];
				case CompletionItemKind.Interface:
					return mxInterfaceMembers?.[member.label];
				default:
					return [];
			}
		}
		return [];
	}
	// return complete list of completions
	return maxCompletions;
}