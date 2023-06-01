import
{
	Diagnostic,
	SymbolInformation,
	// DocumentSymbol,
	Range,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { mxsSymbols } from './schema/mxsSymbolDef';
import { ParserSymbols } from './mxsOutline';
//-----------------------------------------------------------------------------------
let exp = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/ig;
let escapeRegex = (str: string) => str.replace(exp, '\\$&');
// skip comments
let blockComments = (x: string) => new RegExp('\\/\\*[^\\*\\/]*' + x, 'i');
let singleComments = (x: string) => new RegExp('--.*(' + x + ').*$', 'im');
let strings = (x: string) => new RegExp('"([^"]|[\\"])*(' + x + ')([^"]|[\\"])*$"', 'im');

export default function getDocumentSymbolsLegacy(document: TextDocument, diagnostics: Diagnostic[] = []): ParserSymbols
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
					),
					document.uri
				)
			);
		}
	});

	return {
		symbols: SymbolInfCol.length ? SymbolInfCol : [],
		diagnostics: diagnostics
	};
}