import { expose } from "threads/worker"
import { traverse } from 'ast-monkey-traverse';
import
{
	CompletionItem,
	CompletionItemKind,
	DocumentSymbol,
} from 'vscode-languageserver';
// import { KindConversion, SymbolKindNames } from '../mxsCompletions';
//------------------------------------------------------------------------------------------
expose(
	function provideCodeCompletionItems(CTS: DocumentSymbol[]): CompletionItem[]
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
						// push the path to array in the outer scope
						Items.push(
							{
								label: innerObj.parent.value.text,
								kind: CompletionItemKind.Variable,
								detail: 'Identifier' + ' defined in the current document.'
							}
						);
					}
				}
			}
			return current;
		});
		let uniqueObjArray = [...new Map(Items.map((item) => [item['label'], item])).values()];
		return uniqueObjArray;
	});