'use strict';
import
{
	CancellationToken,
	CancellationTokenSource,
	Diagnostic,
	SymbolInformation,
	DocumentSymbol,
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
import { mxsParseSource } from './mxsParser';
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
	msxParser = new mxsParseSource('');

	private async documentSymbolsFromCST(
		CST: any,
		document: TextDocument
		// options = { remapLocations: false },
		// token?: CancellationToken
	): Promise<SymbolInformation[] | DocumentSymbol[]>
	{
		let deriv = await deriveSymbolsTree(CST, document);
		return <DocumentSymbol[]>deriv;
	}

	private async _getDocumentSymbols(document: TextDocument): Promise<ParserResult>
	{
		let SymbolInfCol: SymbolInformation[] | DocumentSymbol[] = [];
		let diagnostics: Diagnostic[] = [];

		// let token: CancellationTokenSource = new CancellationTokenSource();
		
		//TODO: Implement cancellation token, in the parser?
		/*
		var p = Promise.race([
			fetch('/resource-that-may-take-a-while'),
			new Promise(function (resolve, reject) {
				setTimeout(() => reject(new Error('request timeout')), 5000)
			})
		])
		p.then(response => console.log(response))
		p.catch(error => console.log(error))
		*/
		
		// feed the parser
		this.msxParser.source = document.getText();
		// try {
		let results = await this.msxParser.ParseSource();
		// the parser either finished at the first run, or recovered from an error, we have a CST...
		// console.log('Document parsing request - sucess');
		if (results.result !== undefined) {
			if (results.error === undefined) {
				// no problems so far...
				//TODO: { remapLocations: true } was intended to fix locations in recovered results, deprecated now with current parser code.
				SymbolInfCol = await this.documentSymbolsFromCST(results.result, document);		
				// check for trivial errors
				diagnostics.push(...provideTokenDiagnostic(document, collectTokens(results.result, 'type', 'error')));
			} else {
				//recovered from error
				SymbolInfCol = await this.documentSymbolsFromCST(results.result, document);
				diagnostics.push(...provideTokenDiagnostic(document, collectTokens(results.result, 'type', 'error')));
				diagnostics.push(...provideParserDiagnostic(document, results.error));
			}
		} else if (results.error !== undefined) {
			// fatal parser error
			diagnostics.push(...provideParserDiagnostic(document, results.error));
		}
		return {
			symbols: SymbolInfCol,
			diagnostics: diagnostics
		};
		// } catch (err) {
		// 	console.log('MaxScript Parser unhandled error: ' + err.message);
		// 	throw err;
		// }
	}

	parseDocument(document: TextDocument, token: CancellationToken): Promise<ParserResult>
	{
		return new Promise((resolve, reject) =>
		{
			token.onCancellationRequested(async () => reject('Cancellation requested'));

			this._getDocumentSymbols(document)
				.then(
					result => resolve(result),
					reason => reject(reason))
				.catch(err => reject(err));
		});
	}
}

/**
 * Initialized mxsDocumentSymbolProvider. Intended to be consumed by the SymbolProviders and be persistent for the current editor, i norder to acces it from the minifier
 */
export const mxsDocumentSymbols = new mxsDocumentSymbolProvider();