'use strict';
import { expose } from 'threads/worker';
import { deriveSymbolsTree, collectTokens } from '../mxsProvideSymbols';
import {
	provideParserDiagnostic,
	provideTokenDiagnostic,
} from '../mxsDiagnostics';
import { parseSource } from '../mxsParser';
//-----------------------------------------------------------------------------------
expose(
	async function documentSymbols(source, range, options = { recovery: true, attemps: 10, memoryLimit: 0.9 }) {
		let SymbolInfCol = [];
		let diagnostics = [];
		let results = await parseSource(source, options);

		if (results.result !== undefined) {
			SymbolInfCol = await deriveSymbolsTree(results.result, range);

			if (results.error === undefined) {
				diagnostics.push(...provideTokenDiagnostic(collectTokens(results.result, 'type', 'error')));
			} else {
				diagnostics.push(...provideTokenDiagnostic(collectTokens(results.result, 'type', 'error')));
				diagnostics.push(...provideParserDiagnostic(results.error));
			}
		} else if (results.error !== undefined) {
			diagnostics.push(...provideParserDiagnostic(results.error));
		} else {
			throw new Error('Parser failed to provide results');
		}
		return {
			symbols: SymbolInfCol,
			diagnostics: diagnostics
		};
	}
);