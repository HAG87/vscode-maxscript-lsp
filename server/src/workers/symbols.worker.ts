import
{
	// Diagnostic,
	// SymbolInformation,
	// DocumentSymbol,
	Range
} from 'vscode-languageserver';
import { expose } from "threads/worker"
// import { expose } from "comlink"
// import nodeEndpoint from 'comlink/dist/umd/node-adapter';
// import { parentPort } from "worker_threads";

import { deriveSymbolsTree, collectTokens } from '../mxsProvideSymbols';
import
{
	provideParserDiagnostic,
	provideTokenDiagnostic,
} from '../mxsDiagnostics';
import { parserOptions } from '../backend/mxsParserBase';
import { parseSource } from '../mxsParser';
import { ParserSymbols } from '../mxsOutline';
//-----------------------------------------------------------------------------------
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
	}
	// const api = {documentSymbols};
	// export type symbolsWorker = typeof api;
	export type symbolsWorker = typeof documentSymbols;
	// expose(api, nodeEndpoint(parentPort!));
	expose(documentSymbols);
