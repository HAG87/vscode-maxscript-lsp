'use strict';
import { expose } from 'threads/worker';
// import { workerData, parentPort } from 'worker_threads';
import { deriveSymbolsTree, collectTokens } from '../mxsProvideSymbols';
import {
	provideParserDiagnostic,
	provideTokenDiagnostic,
} from '../mxsDiagnostics';
import { parseSource } from '../mxsParser';
//-----------------------------------------------------------------------------------
/*
async function documentSymbols( source, range, options )
{
	let SymbolInfCol = [];
	let diagnostics = [];
	let results = await parseSource(source, options);

	if (results.result !== undefined) {
		SymbolInfCol =  await deriveSymbolsTree(results.result, range);

		if (results.error === undefined) {
			diagnostics.push(...provideTokenDiagnostic(collectTokens(results.result, 'type', 'error')));
		} else {
			diagnostics.push(...provideTokenDiagnostic(collectTokens(results.result, 'type', 'error')));
			diagnostics.push(...provideParserDiagnostic(results.error));
		}
	} else if (results.error !== undefined) {
		diagnostics.push(...provideParserDiagnostic(results.error));
	}
	return {
		symbols: SymbolInfCol,
		diagnostics: diagnostics
	};
}

documentSymbols(workerData.source, workerData.range, workerData.options)
	.then(result => parentPort.postMessage(result));
*/
//-----------------------------------------------------------------------------------
// /*
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
		}
		return {
			symbols: SymbolInfCol,
			diagnostics: diagnostics
		};
	}
);
// */
