import { expose } from 'threads/worker';
import { deriveSymbolsTree, collectTokens } from '../mxsProvideSymbols';
import {
	provideParserDiagnostic,
	provideTokenDiagnostic,
} from '../mxsDiagnostics';
import { parseSource } from '../mxsParser';
//-----------------------------------------------------------------------------------
expose(
	function documentSymbols(source, range, options = { recovery: true, attemps: 10, memoryLimit: 0.9 }) {
		let SymbolInfCol = [];
		let diagnostics = [];
		
		let results = parseSource(source, options);

		// Parser didnt provide results -- abort!
		/* if (!results.result && !results.error) {
			throw new Error('Parser failed to provide results');
		} */
		
		if (results.result) {
			SymbolInfCol = deriveSymbolsTree(results.result, range);
			diagnostics.push(...provideTokenDiagnostic(collectTokens(results.result, 'type', 'error')));
		}
		if (results.error) {
			diagnostics.push(...provideParserDiagnostic(results.error));
		}
		return {
			symbols: SymbolInfCol,
			diagnostics: diagnostics
		};
	}
);