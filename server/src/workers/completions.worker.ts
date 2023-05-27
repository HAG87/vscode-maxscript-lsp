import { expose } from "threads/worker"
import { traverse } from 'ast-monkey-traverse';
import
{
	CompletionItem,
	CompletionItemKind,
	DocumentSymbol,
} from 'vscode-languageserver';
import { KindConversion, SymbolKindNames } from '../mxsCompletions';
//------------------------------------------------------------------------------------------
expose(
	function provideSymbolCompletionItems(SymbolsTree: DocumentSymbol[]): CompletionItem[]
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
		return Items;
	});