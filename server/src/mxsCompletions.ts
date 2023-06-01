import { spawn, Thread, Worker } from 'threads';
import
{
	// SymbolKind,
	CompletionItem,
	CompletionItemKind,
	DocumentSymbol,
	Range,
	Position
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
//------------------------------------------------------------------------------------------
import { maxCompletions } from './schema/mxsSchema';
import { mxClassMembers } from './schema/mxsSchema-clases';
import { mxInterfaceMembers } from './schema/mxsSchema-interfaces';
import { mxStructsMembers } from './schema/mxsSchema-structs';
//@ts-ignore
import { traverse } from 'ast-monkey-traverse';
//------------------------------------------------------------------------------------------
// trigger completion for method call
const dotPattern = /([A-Za-z_][A-Za-z0-9_]+)[.]$/mi;

export enum SymbolKindNames
{
	File          = 1,
	Module        = 2,
	Namespace     = 3,
	Package       = 4,
	Class         = 5,
	Method        = 6,
	Property      = 7,
	Field         = 8,
	Constructor   = 9,
	Enum          = 10,
	Interface     = 11,
	Function      = 12,
	Variable      = 13,
	Constant      = 14,
	String        = 15,
	Number        = 16,
	Boolean       = 17,
	Array         = 18,
	Object        = 19,
	Key           = 20,
	Null          = 21,
	EnumMember    = 22,
	Struct        = 23,
	Event         = 24,
	Operator      = 25,
	TypeParameter = 26,
}

export const KindConversion = {
	18: 21, // Array
	17: 12, // Boolean
	5:  7,  // Class
	14: 21, // Constant
	9:  4,  // Constructor
	10: 13, // Enum
	22: 20, // EnumMember
	24: 23, // Event
	8:  5,  // Field
	1:  17, // File
	12: 3,  // Function
	11: 8,  // Interface
	20: 14, // Key
	6:  2,  // Method
	2:  9,  // Module
	3:  7,  // Namespace
	21: 21, // Null
	16: 12, // Number
	19: 7,  // Object
	25: 24, // Operator
	4:  7,  // Package
	7:  10, // Property
	15: 1,  // String
	23: 22, // Struct
	26: 25, // TypeParameter
	13: 6,  // Variable
}

export function provideSymbolCompletionItems(SymbolsTree: DocumentSymbol[]): CompletionItem[]
{
	const Items: CompletionItem[] = [];
	traverse(SymbolsTree, (key: string, val: string | null, innerObj: { parent: DocumentSymbol }) =>
	{
		// if currently an object is traversed, you get both "key" and "val"
		// if it's array, only "key" is present, "val" is undefined
		let current = val !== undefined ? val : key;
		// console.log(key);
		if (
			// it's object (not array)
			val !== null &&
			// and has the key we need
			key === 'name'
		) {
			// push the path to array in the outer scope
			Items.push({
				label: val,
				kind: (KindConversion[innerObj.parent.kind] ?? 1) as CompletionItemKind,
				detail: SymbolKindNames[innerObj.parent.kind] + ' defined in the current document.'
			});
		}
		return current;
	});
	// console.log(Items);
	let uniqueObjArray = [...new Map(Items.map((item) => [item['label'], item])).values()];
	return uniqueObjArray;
}

export async function provideDocumentCompletionItems(CTS: any): Promise<CompletionItem[]>
{
	let Items: CompletionItem[] = [];	
	traverse(CTS, (key: string, val: string | null, innerObj: { parent: any, parentKey: any }) =>
	{
		// if currently an object is traversed, you get both "key" and "val"
		// if it's array, only "key" is present, "val" is undefined
		let current = val !== undefined ? val : key;
		// console.log(key);
		if (
			// it's object (not array)
			val !== null &&
			// and has the key we need
			key === 'type'
		) {
			// console.log(innerObj.parent);
			if ((val === 'Identifier' && innerObj.parentKey !== 'id') && innerObj.parent.hasOwnProperty('value')) {
				if (innerObj.parent.value.hasOwnProperty('text')) {
					// console.log(innerObj);
					// console.log(innerObj.parent.value.text);
					// push the path to array in the outer scope
					Items.push(
						{
							label: innerObj.parent.value.text,
							kind: CompletionItemKind.Variable,
							detail: 'Identifier' + ' defined in the current document.'
						}
					);
					// console.log(Items);
				}
			}
		}
		return current;
	});
	let uniqueObjArray = [...new Map(Items.map((item) => [item['label'], item])).values()];
	// console.log(uniqueObjArray);
	
	// return [];
	return uniqueObjArray;
}

export async function provideDocumentCompletionItemsThreaded(CTS: any): Promise<CompletionItem[]>
{
	let provideDocumentCompletionItems = await spawn(new Worker('./workers/completions.worker'));
	try {
		return await provideDocumentCompletionItems(CTS);
	} finally {
		await Thread.terminate(provideDocumentCompletionItems);
	}
}
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