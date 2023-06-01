import
{
	Diagnostic,
	SymbolInformation,
	DocumentSymbol,
	Range
} from 'vscode-languageserver';
import { expose } from "threads/worker"
import { deriveSymbolsTree, collectTokens } from '../mxsProvideSymbols';
import
{
	provideParserDiagnostic,
	provideTokenDiagnostic,
} from '../mxsDiagnostics';
import { parserOptions } from '../mxsParserBase';
import { parseSource } from '../mxsParser';
import { ParserSymbols } from '../mxsOutline';
//-----------------------------------------------------------------------------------
expose(
	function documentSymbols(source: string, range: Range, options?: parserOptions)
	{
		let response: ParserSymbols = {
			symbols: [],
			diagnostics: [],
			cst: '' // NOTE: parser completions will not be available!, I can't figure out why is not syncing results...
		};
		try {
			// feed the parser
			let results = parseSource(source, options);
			//COLLECT SYMBOLDEFINITIONS
			if (results!.result) {
				response.symbols = deriveSymbolsTree(results.result, range);
				response.diagnostics = provideTokenDiagnostic(collectTokens(results.result, 'type', 'error'));
				// response.cst = structuredClone(results.result);
				response.cst = JSON.stringify(results.result);
			}
			// check for trivial errors
			if (results!.error) {
				response.diagnostics.push(...provideParserDiagnostic(results.error));
			}
			return response;
		} catch (err: any) {
			if (err.tokens) {
				response.diagnostics = provideParserDiagnostic(err);
				return response;
			} else {
				throw err;
			}
		}
	});