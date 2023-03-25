/**
 * Provide document symbols via parse tree.
 */
import { spawn, Thread, Worker } from "threads"
import
{
	// CancellationToken,
	// CancellationTokenSource,
	// Range,
	Diagnostic,
	SymbolInformation,
	DocumentSymbol,
	Connection,
} from 'vscode-languageserver';
import { TextDocument, } from 'vscode-languageserver-textdocument';
import
{
	
	provideParserDiagnostic,
	provideTokenDiagnostic,
	provideParserErrorInformation
} from './mxsDiagnostics';
import
{
	deriveSymbolsTree,
	collectTokens
} from './mxsProvideSymbols';
import {
	parserResult,
	ParserError,
	parserOptions,
	parseSource
} from './mxsParser';
import getDocumentSymbolsLegacy from './mxsOutlineLegacy';
//--------------------------------------------------------------------------------
export interface ParserSymbols
{
	symbols: SymbolInformation[] | DocumentSymbol[]
	diagnostics: Diagnostic[]
}

export class DocumentSymbolProvider
{
	private documentSymbolsFromCST(CST: any, document: TextDocument): DocumentSymbol[]
	{
		const loc = {
			start: { line: 0, character: 0 },
			end: document.positionAt(document.getText().length - 1)
		};
		return deriveSymbolsTree(CST, loc);
	}

	private async _parseTextDocument(document: TextDocument, options?: parserOptions): Promise<ParserSymbols>
	{
		let SymbolInfCol: SymbolInformation[] | DocumentSymbol[] = [];
		let diagnostics: Diagnostic[] = [];
		// feed the parser
		let results: parserResult = await parseSource(document.getText(), options);
		//COLLECT SYMBOLDEFINITIONS
		if (results!.result) {
			SymbolInfCol = this.documentSymbolsFromCST(results.result, document);
			diagnostics.push(...provideTokenDiagnostic(collectTokens(results.result, 'type', 'error')));
		}
		// check for trivial errors
		if (results!.error) {diagnostics.push(...provideParserDiagnostic(results.error));}

		return {
			symbols: SymbolInfCol,
			diagnostics: diagnostics
		};	
	}

	private async _parseTextDocumentThreaded(document: TextDocument, options?: parserOptions): Promise<ParserSymbols>
	{
		const documentSymbols = await spawn(new Worker('./workers/symbols.worker'));
		try {
			const source = document.getText();
			const loc = {
				start: {
					line: 0,
					character: 0
				},
				end: document.positionAt(source.length - 1)
			};
			return await documentSymbols(source, loc, options);
		} catch (e) {
			throw e;
		} finally {
			await Thread.terminate(documentSymbols);
		}
	}

	/** MXS document parser */
	async parseDocument(
		document: TextDocument,
		connection: Connection,
		threading = true,
		options: parserOptions = { recovery: true, attemps: 15, memoryLimit: 0.9 }
	): Promise<ParserSymbols>
	{
		try {
			let res = threading
				? await this._parseTextDocumentThreaded(document, options)
				: await this._parseTextDocument(document, options);
				// console.log(res);
			return res;
		} catch (e: any) {
			connection.window.showWarningMessage( `MaxScript: can't parse the code.\nCode minifier, beautifier, diagnostics and hierarchical symbols will be unavailable.\nReason: ${e.message}` );
			// console.log(e.description);
			return getDocumentSymbolsLegacy(document, new Array(provideParserErrorInformation(<ParserError>e)));
		} /*finally {
			console.log('legacy symbols');
			return getDocumentSymbolsLegacy(document);
		}*/
	}
}

/**
 * Initialized mxsDocumentSymbolProvider. Intended to be consumed by the SymbolProviders and be persistent for the current editor
 */
export const mxsDocumentSymbols = new DocumentSymbolProvider();