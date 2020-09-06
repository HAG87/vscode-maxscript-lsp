'use strict';
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	Range
} from 'vscode-languageserver';

import {
	TextDocument,
	Position
} from 'vscode-languageserver-textdocument';

import { maxCompletions } from './schema/mxsSchema';
import { mxClassMembers } from './schema/mxsSchema-clases';
import { mxInterfaceMembers } from './schema/mxsSchema-interfaces';
import { mxStructsMembers } from './schema/msxSchema-structs';

/** A static collection of completion items*/
const mxCompletions = new Array<CompletionItem>(...maxCompletions);
/**
 * ItemProvider class
 */
export default class mxsCompletion {
	/** A static collection of completion items*/
	// private mxCompletions = new Array<CompletionItem>(...maxCompletions);
	/**
	 * Retrieve the completion items, search for descendant completion items.
	 * @param document
	 * @param position
	 */
	static provideCompletionItems(document: TextDocument, position: Position): CompletionItem[] {

		let lineText = document.getText(Range.create(position.line, -1, position.line, Number.MAX_VALUE));
		let lineTillCurrentPosition = document.getText(Range.create(position.line, -1, position.line, position.character));

		// escape strings - NOT WORKING RIGHT
		// if (!(util.isPositionInString(lineTillCurrentPosition))) {
		// 	return [];
		// }
	
		let dotPattern = /([A-Za-z_][A-Za-z0-9_]+)[.]$/mi;
		let termMatch = dotPattern.exec(lineTillCurrentPosition);
		let result: CompletionItem[] = [];

		if (termMatch) {
			let theFoundItem = mxCompletions.find(item => item.label === termMatch![1]);
			switch (theFoundItem?.kind) {
				case CompletionItemKind.Class:
					//console.log(mxClassMembers[theFoundItem.label]);
					result = mxClassMembers?.[theFoundItem.label];
					break;
				case CompletionItemKind.Struct:
					//console.log(mxStructsMembers[theFoundItem.label]);
					result = mxStructsMembers?.[theFoundItem.label];
					break;
				case CompletionItemKind.Interface:
					//console.log(mxInterfaceMembers[theFoundItem.label]);
					result = mxInterfaceMembers?.[theFoundItem.label];
					break;
			}
		} else {
			result = mxCompletions;
		}
		return result;
	}
}