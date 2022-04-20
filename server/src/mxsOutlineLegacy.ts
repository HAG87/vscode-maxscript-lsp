import
{
	Diagnostic,
	SymbolInformation,
	DocumentSymbol,
	Range,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { mxsSymbols } from './schema/mxsSymbolDef';

let exp = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/ig;
let escapeRegex = (str: string) => str.replace(exp, '\\$&');

// skip comments
let blockComments = (x: string): RegExp => new RegExp('\\/\\*[^\\*\\/]*' + x, 'i');
let singleComments = (x: string): RegExp => new RegExp('--.*(' + x + ').*$', 'im');
let strings = (x: string): RegExp => new RegExp('"([^"]|[\\"])*(' + x + ')([^"]|[\\"])*$"', 'im');

interface ParserResult
{
	symbols: SymbolInformation[] | DocumentSymbol[]
	diagnostics: Diagnostic[]
}

export default function getDocumentSymbolsLegacy(document: TextDocument): Promise<ParserResult>
{
	return new Promise((resolve, reject) =>
	{
		let SymbolInfCol: SymbolInformation[] = [];
		const docTxt = document.getText();

		mxsSymbols.forEach(type =>
		{
			// token[type.match] contains a regex for matching
			// type.decl is a workaround for regexpExecArray index match
			let matchSymbols;
			while (matchSymbols = type.match.exec(docTxt)) {

				let scomment = singleComments(escapeRegex(matchSymbols[0])).test(docTxt);
				let bcomment = blockComments(escapeRegex(matchSymbols[0])).test(docTxt);
				let _string = strings(escapeRegex(matchSymbols[0])).test(docTxt);
				if (scomment || bcomment || _string) { continue; }

				SymbolInfCol.push(
					SymbolInformation.create(
						matchSymbols[0],
						type.kind,
						Range.create(
							document.positionAt(matchSymbols.index),
							document.positionAt(matchSymbols.index + matchSymbols[0].length)
						)
					)
				);
			}
		});

		if (SymbolInfCol.length) {
			resolve({
				symbols: SymbolInfCol,
				diagnostics: []
			});
		} else {
			reject('Symbols unavailable');
		}
	});
}