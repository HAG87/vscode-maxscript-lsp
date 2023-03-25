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
import { parseSource, parserOptions } from '../mxsParser';
import { ParserSymbols } from '../mxsOutline';
//-----------------------------------------------------------------------------------
expose(
	async function documentSymbols(source: string, range: Range, options?: parserOptions): Promise<ParserSymbols>
	{
		let SymbolInfCol: SymbolInformation[] | DocumentSymbol[] = [];
		let diagnostics: Diagnostic[] = [];
		let results = await parseSource(source, options);

		if (results.result) {
			SymbolInfCol = deriveSymbolsTree(results.result, range);
			diagnostics.push(...provideTokenDiagnostic(collectTokens(results.result, 'type', 'error')));
		}
		if (results.error) { diagnostics.push(...provideParserDiagnostic(results.error)); }
		return {
			symbols: SymbolInfCol,
			diagnostics: diagnostics
		};
	});