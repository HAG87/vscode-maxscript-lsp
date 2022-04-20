/**
 * Provide document symbols via parse tree.
 */
import { spawn, Thread, Worker } from "threads"
import
{
	// CancellationToken,
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
import { parseSource, parserOptions } from './mxsParser';
import getDocumentSymbolsLegacy from './mxsOutlineLegacy';
//--------------------------------------------------------------------------------
export interface ParserResult
{
	symbols: SymbolInformation[] | DocumentSymbol[]
	diagnostics: Diagnostic[]
}

// type cancellationToken = { cancel: () => void};

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

	private async _parseTextDocument(document: TextDocument, options?: parserOptions): Promise<ParserResult>
	{
		let SymbolInfCol: SymbolInformation[] | DocumentSymbol[] = [];
		let diagnostics: Diagnostic[] = [];

		// feed the parser
		let results = await parseSource(document.getText(), options);
		// the parser either finished at the first run, or recovered from an error, we have a CST...
		if (results.result !== undefined) {
			//-----------------------------------
			SymbolInfCol = this.documentSymbolsFromCST(results.result, document);
			//-----------------------------------
			if (results.error === undefined) {
				// no problems so far...
				// check for trivial errors
				diagnostics.push(...provideTokenDiagnostic(collectTokens(results.result, 'type', 'error')));
			} else {
				//recovered from error
				diagnostics.push(...provideTokenDiagnostic(collectTokens(results.result, 'type', 'error')));
				diagnostics.push(...provideParserDiagnostic(results.error));
			}

			// fatal error, parser failed to provide a valid CST
		} else if (results.error !== undefined) {
			diagnostics.push(...provideParserDiagnostic(results.error));
		} /* else {
			throw new Error('Parser failed to provide results');
		} */
		return {
			symbols: SymbolInfCol,
			diagnostics: diagnostics
		};
	}

	private async _parseTextDocumentThreaded(document: TextDocument, options?: parserOptions): Promise<ParserResult>
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
	parseDocument(
		document: TextDocument,
		connection: Connection,
		threading = true,
		options: parserOptions = { recovery: true, attemps: 15, memoryLimit: 0.9 }
	): Promise<ParserResult>
	{
		//TODO: Implement cancellation token, in the parser?
		// let source: CancellationTokenSource = new CancellationTokenSource();
		// let timer = new Promise((resolve, reject) => setTimeout(reject, 500, 'Request timeout'));

		return new Promise(/* async */(resolve, reject) =>
		{
			const documentSymbols: Promise<ParserResult> =
				threading
					? this._parseTextDocumentThreaded(document, options)
					: this._parseTextDocument(document, options);
			// this._getDocumentSymbols(document, options)
			// this._getDocumentSymbolsThreaded(document, options)
			/* if (threading) {
				documentSymbols = this._parseTextDocumentThreaded(document, options)
			} else {
				documentSymbols = this._parseTextDocument(document, options)
			} */
			documentSymbols
				.then(result => resolve(result))
				.catch(e =>
				{
					connection.window.showWarningMessage(
						`MaxScript: can't parse the code.\nCode minifier, beautifier, diagnostics and hierarchical symbols will be unavailable.\nReason: ${e.message}`
					);
					// As last resort, use the simple regex method					
					return getDocumentSymbolsLegacy(document);					
				})
				.then(result => resolve(<ParserResult>result))
				.catch(e => reject(e));
			// setTimeout(() => source.cancel(), 50, 'Request timeout');
		});
	}
}

/**
 * Initialized mxsDocumentSymbolProvider. Intended to be consumed by the SymbolProviders and be persistent for the current editor
 */
export const mxsDocumentSymbols = new DocumentSymbolProvider();