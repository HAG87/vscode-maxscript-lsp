'use strict';
//-----------------------------------------------------------------------------------
import { workerData, parentPort }  from 'worker_threads';
// import { expose } from 'threads/worker';		
//-----------------------------------------------------------------------------------
import
{
	Diagnostic,
	SymbolInformation,
	DocumentSymbol,
	Range
} from 'vscode-languageserver';
//-----------------------------------------------------------------------------------
import { deriveSymbolsTree, collectTokens } from '../mxsProvideSymbols';
import { provideParserDiagnostic, provideTokenDiagnostic, } from '../mxsDiagnostics';
import { parseSource } from '../mxsParser';
//-----------------------------------------------------------------------------------
interface ParserResult
{
	symbols: SymbolInformation[] | DocumentSymbol[]
	diagnostics: Diagnostic[]
}

async function documentSymbolsFromCST(
	source: string,
	sourceRange: Range,
	options:{ recovery: boolean, attemps: number, memoryLimit: number}
): Promise<ParserResult>
{
	let SymbolInfCol: SymbolInformation[] | DocumentSymbol[] = [];
	let diagnostics: Diagnostic[] = [];

	let results = await parseSource(source, options);

	if (results.result !== undefined) {
		let deriv = await deriveSymbolsTree(results.result, sourceRange);
		SymbolInfCol = <DocumentSymbol[]>deriv;

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
//-----------------------------------------------------------------------------------
parentPort?.postMessage(
	documentSymbolsFromCST(workerData.source, workerData.range, workerData.options)
);
/*
expose(
	async function documentSymbols(source, sourceRange, options = { recovery: true, attemps: 10, memoryLimit: 0.9})
	{
		return await documentSymbolsFromCST(source, sourceRange, options);
	}
);
*/