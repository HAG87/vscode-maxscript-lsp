'use strict';
import { spawn, Thread, Worker } from 'threads';
import
{
	CancellationToken,
	// CancellationTokenSource,
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
} from './mxsDiagnostics';
import
{
	deriveSymbolsTree,
	collectTokens
} from './mxsProvideSymbols';
import { parseSource } from './mxsParser';
import getDocumentSymbolsLegacy from './mxsOutlineLegacy';
//--------------------------------------------------------------------------------
export interface ParserResult
{
	symbols: SymbolInformation[] | DocumentSymbol[]
	diagnostics: Diagnostic[]
}

// type cancellationToken = { cancel: () => void};
/**
 * Provide document symbols. Impements the parser.
 * TODO:
 *  - fallback to safe regex match
 *  - implement async version
 * 	- implement child_process
 */
export class DocumentSymbolProvider
{
	private async documentSymbolsFromCST(
		CST: any,
		document: TextDocument
	): Promise<SymbolInformation[] | DocumentSymbol[]>
	{
		let loc = {
			start: { line: 0, character: 0 },
			end: document.positionAt(document.getText().length - 1)
		};
		let deriv = await deriveSymbolsTree(CST, loc);
		return <DocumentSymbol[]>deriv;
	}

	private async _getDocumentSymbols(document: TextDocument): Promise<ParserResult>
	{
		let SymbolInfCol: SymbolInformation[] | DocumentSymbol[] = [];
		let diagnostics: Diagnostic[] = [];

		// feed the parser
		let results = await parseSource(document.getText());
		// the parser either finished at the first run, or recovered from an error, we have a CST...
		if (results.result !== undefined) {
			SymbolInfCol = await this.documentSymbolsFromCST(results.result, document);
			if (results.error === undefined) {
				// no problems so far...
				// check for trivial errors
				diagnostics.push(...provideTokenDiagnostic(collectTokens(results.result, 'type', 'error')));
			} else {
				//recovered from error
				diagnostics.push(...provideTokenDiagnostic(collectTokens(results.result, 'type', 'error')));
				diagnostics.push(...provideParserDiagnostic(results.error));
			}
		} else if (results.error !== undefined) {
			// fatal parser error
			diagnostics.push(...provideParserDiagnostic(results.error));
		} else {
			throw new Error('Parser failed to provide results');
		}
		return {
			symbols: SymbolInfCol,
			diagnostics: diagnostics
		};
	}

	private async _getDocumentSymbolsThreaded(
		document: TextDocument,
		options = { recovery: true, attemps: 10, memoryLimit: 0.9 }
	): Promise<ParserResult>
	{
		const documentSymbols = await spawn(new Worker('./workers/symbols.worker'));
		try {
			const source = document.getText();
			let loc = {
				start: {
					line: 0,
					character: 0
				},
				end: document.positionAt(source.length - 1)
			};
			return await documentSymbols(source, loc, options);
			// console.log('Hashed password:', hashed);
		} catch (err) {
			throw err;
		} finally {
			await Thread.terminate(documentSymbols);
		}
	}
	parseDocument(
		document: TextDocument,
		connection: Connection,
		options = { recovery: true, attemps: 15, memoryLimit: 0.9 }
	): Promise<ParserResult>
	{
		//TODO: Implement cancellation token, in the parser?
		// let source: CancellationTokenSource = new CancellationTokenSource();
		// let timer = new Promise((resolve, reject) => setTimeout(reject, 500, 'Request timeout'));

		return new Promise(/* async */(resolve, reject) =>
		{
			// this._getDocumentSymbols(document)
			this._getDocumentSymbolsThreaded(document, options)
				.then(result => resolve(result))
				.catch(error =>
				{
					// show alert
					connection.window.showWarningMessage(`MaxScript: can't parse the code.\nCode minifier, beautifier, diagnostics and hierarchical symbols will be unavailable.\nReason: ${error.message}`);
					return getDocumentSymbolsLegacy(document);
				})
				.then(
					result =>
					{
						resolve({
							symbols: <SymbolInformation[]>result,
							diagnostics: []
						});
					}/* ,
					() => resolve({
						symbols: [],
						diagnostics: []
					})*/)
				.catch(error => reject(error));
			// setTimeout(() => source.cancel(), 50, 'Request timeout');
		});
	}
}

/**
 * Initialized mxsDocumentSymbolProvider. Intended to be consumed by the SymbolProviders and be persistent for the current editor, i norder to acces it from the minifier
 */
export const mxsDocumentSymbols = new DocumentSymbolProvider();