'use strict';
import
{
	CancellationToken,
	CancellationTokenSource,
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
export class mxsDocumentSymbolProvider
{
	/** Start a parser instance */
	private async documentSymbolsFromCST(
		CST: any,
		document: TextDocument
		// token?: CancellationToken
	): Promise<SymbolInformation[] | DocumentSymbol[]>
	{
		// token.onCancellationRequested(async () => reject('Cancellation requested'));
		let loc = {
			start: {
				line: 0,
				character: 0
			},
			end: document.positionAt(document.getText().length - 1)
		};
		let deriv = await deriveSymbolsTree(CST, loc);
		return <DocumentSymbol[]>deriv;
	}

	private async _getDocumentSymbols(document: TextDocument/*,  token: CancellationToken */): Promise<ParserResult>
	{
		// token.onCancellationRequested( async () => { throw new Error('File too large to be parsed').name = 'SIZE_LIMIT'; });

		let SymbolInfCol: SymbolInformation[] | DocumentSymbol[] = [];
		let diagnostics: Diagnostic[] = [];
		// **FAILSAFE**
		// if (document.lineCount > 1500 || src.length > 43000) { throw new Error('File too large to be parsed').name = 'SIZE_LIMIT'; }
		// feed the parser
		let results = await parseSource(document.getText());
		// the parser either finished at the first run, or recovered from an error, we have a CST...
		if (results.result !== undefined) {
			SymbolInfCol = await this.documentSymbolsFromCST(results.result, document);
			if (results.error === undefined) {
				// no problems so far...
				//TODO: { remapLocations: true } was intended to fix locations in recovered results, deprecated now with current parser code.
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
		}
		return {
			symbols: SymbolInfCol,
			diagnostics: diagnostics
		};
	}

	parseDocument(document: TextDocument, token: CancellationToken, connection: Connection, options = { recovery: true, attemps: 10, memoryLimit: 0.9}): Promise<ParserResult>
	{
		//TODO: Implement cancellation token, in the parser?
		// let source: CancellationTokenSource = new CancellationTokenSource();
		// let timer = new Promise((resolve, reject) => setTimeout(reject, 500, 'Request timeout'));

		return new Promise(async (resolve, reject) =>
		{
			token.onCancellationRequested(async () => reject('Cancellation requested'));

			// await this._getDocumentSymbolsThreaded(document, options);
			// this._getDocumentSymbolsThreaded(document, options)
			this._getDocumentSymbols(document)
				.then( result => resolve(result))
				.catch( (error) =>
				{
					// show alert
					console.log('NOTWORKING!', error.message);
					connection.window.showInformationMessage(`MaxScript: can't parse the code.\nCode minifier, beautifier, diagnostics and hierarchical symbols will be unavailable.`);
					return getDocumentSymbolsLegacy(document);
				})
				.then(
					result =>
					{
						resolve({
							symbols: <SymbolInformation[]>result,
							diagnostics: []
						});
					})
				.catch(e => reject(e));
			// setTimeout(() => source.cancel(), 50, 'Request timeout');
		});
	}
}

/**
 * Initialized mxsDocumentSymbolProvider. Intended to be consumed by the SymbolProviders and be persistent for the current editor, i norder to acces it from the minifier
 */
export const mxsDocumentSymbols = new mxsDocumentSymbolProvider();