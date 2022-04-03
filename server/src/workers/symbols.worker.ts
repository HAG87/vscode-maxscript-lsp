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
import { parseSource } from '../mxsParser';
//-----------------------------------------------------------------------------------
interface ParserResult
{
	symbols: SymbolInformation[] | DocumentSymbol[]
	diagnostics: Diagnostic[]
}
expose(
	async function documentSymbols(source: string, range: Range, options = { recovery: true, attemps: 10, memoryLimit: 0.9 }): Promise<ParserResult>
	{
		let SymbolInfCol: SymbolInformation[] | DocumentSymbol[] = [];
		let diagnostics: Diagnostic[] = [];
		let results = await parseSource(source, options);

		if (results.result) {
			SymbolInfCol = await deriveSymbolsTree(results.result, range);
			if (!results.error) {
				diagnostics.push(...provideTokenDiagnostic(collectTokens(results.result, 'type', 'error')));
			} else {
				diagnostics.push(...provideTokenDiagnostic(collectTokens(results.result, 'type', 'error')));
				diagnostics.push(...provideParserDiagnostic(results.error));
			}
		} else if (results.error) {
			diagnostics.push(...provideParserDiagnostic(results.error));
		}
		return {
			symbols: SymbolInfCol,
			diagnostics: diagnostics
		};
	});