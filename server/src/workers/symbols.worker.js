import { expose } from 'threads/worker';
import { deriveSymbolsTree, collectTokens } from '../mxsProvideSymbols';
import {
	provideParserDiagnostic,
	provideTokenDiagnostic,
} from '../mxsDiagnostics';
import { parseSource } from '../mxsParser';
//-----------------------------------------------------------------------------------
expose(
	function documentSymbols(source, range, options = { recovery: true, attemps: 10, memoryLimit: 0.9 })
	{
		let response = {
			symbols: [],
			diagnostics: [],
			cst: []
		};
		try {
			let results = parseSource(source, options);
			if (results.result) {
				response.symbols = deriveSymbolsTree(results.result, range);
				response.diagnostics = provideTokenDiagnostic(collectTokens(results.result, 'type', 'error'));
				// response.cst = results.result;
			}
			if (results.error) {
				response.diagnostics.push(...provideParserDiagnostic(results.error));
			}
			return response;
		} catch (err) {
			if (err.token) {
				response.diagnostics = provideParserDiagnostic(err);
				return response;
			} else {
				throw err;
			}
		}
	}
);