'use strict';
import {
	CompletionItem,
	CompletionItemKind,
	Range,
	Position
} from 'vscode-languageserver';
import { TextDocument, } from 'vscode-languageserver-textdocument';
//------------------------------------------------------------------------------------------
import { maxCompletions } from './schema/mxsSchema';
import { mxClassMembers } from './schema/mxsSchema-clases';
import { mxInterfaceMembers } from './schema/mxsSchema-interfaces';
import { mxStructsMembers } from './schema/mxsSchema-structs';
//------------------------------------------------------------------------------------------
/** A static collection of completion items*/
const mxCompletions = new Array<CompletionItem>(...maxCompletions);
const dotPattern = /([A-Za-z_][A-Za-z0-9_]+)[.]$/mi;

/**
 * Retrieve the completion items, search for descendant completion items.
 * @param document
 * @param position
 */
export function provideCompletionItems(document: TextDocument, position: Position): CompletionItem[]
{

	let lineTillCurrentPosition =
		document.getText(Range.create(position.line, -1, position.line, position.character));

	// escape strings - NOT WORKING RIGHT
	// if (!(util.isPositionInString(lineTillCurrentPosition))) {
	// 	return [];
	// }

	let termMatch = dotPattern.exec(lineTillCurrentPosition);
	let result: CompletionItem[] = [];

	if (termMatch) {
		let theFoundItem = mxCompletions.find(item => item.label === termMatch![1]);
		switch (theFoundItem?.kind) {
			case CompletionItemKind.Class:
				result = mxClassMembers?.[theFoundItem.label];
				break;
			case CompletionItemKind.Struct:
				result = mxStructsMembers?.[theFoundItem.label];
				break;
			case CompletionItemKind.Interface:
				result = mxInterfaceMembers?.[theFoundItem.label];
				break;
		}
	} else {
		// Im not sure about this....
		result = mxCompletions;
	}
	return result;
}