'use strict';
import
{
	CancellationToken,
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
	ReCollectStatementsFromCST,
	ReCollectSymbols,
	collectTokens
} from './mxsProvideSymbols';
import { mxsParseSource } from './mxsParser';
//--------------------------------------------------------------------------------
export interface ParserResult
{
	symbols: SymbolInformation[] | DocumentSymbol[]
	diagnostics: Diagnostic[]
}
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
	/** Current active document */
	// activeDocument!: TextDocument | undefined;
	/** Current document symbols */
	// activeDocumentSymbols: SymbolInformation[] = [];
	/** Current document diagnostics */
	// documentDiagnostics!: Diagnostic[];

	private async documentSymbolsFromCST(
		document: TextDocument,
		CST: any,
		options = { remapLocations: false }
	): Promise<SymbolInformation[] | DocumentSymbol[]>
	{
		let CSTstatements = ReCollectStatementsFromCST(CST);
		let Symbols = await ReCollectSymbols(document, CSTstatements);
		// let CSTstatements = collectStatementsFromCST(CST);		
		// let Symbols = collectSymbols(document, CST, CSTstatements);
		return Symbols;
	}

	private async _getDocumentSymbols(document: TextDocument): Promise<ParserResult>
	{
		let SymbolInfCol: SymbolInformation[] | DocumentSymbol[] = [];
		let diagnostics: Diagnostic[] = [];

		// feed the parser
		this.msxParser.source = document.getText();
		// try {
		let results = await this.msxParser.ParseSourceAsync();
		// the parser either finished at the first run, or recovered from an error, we have a CST...
		if (results.result !== undefined) {
			if (results.error === undefined) {
				// no problems so far...
				SymbolInfCol = await this.documentSymbolsFromCST(document, this.msxParser.parsedCST);
				// check for trivial errors
				diagnostics.push(...provideTokenDiagnostic(document, collectTokens(this.msxParser.parsedCST, 'type', 'error')));
			} else {
				//recovered from error
				SymbolInfCol = await this.documentSymbolsFromCST(document, this.msxParser.parsedCST, { remapLocations: true });
				diagnostics.push(...provideTokenDiagnostic(document, collectTokens(this.msxParser.parsedCST, 'type', 'error')));
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

	parseDocument(document: TextDocument, cancellation: CancellationToken): Promise<ParserResult>
	{
		// this.activeDocument = undefined;
		return new Promise((resolve, reject) =>
		{
			// this.later(500).then(
			// () => {
			// cancellation request
			cancellation.onCancellationRequested(async () => reject('Cancellation requested'));
			this._getDocumentSymbols(document)
				.then(
					result => resolve(result),
					reason => reject(reason))
				.catch(err => reject(err));
		});
		// });
	}
}

/**
 * Initialized mxsDocumentSymbolProvider. Intended to be consumed by the SymbolProviders and be persistent for the current editor, i norder to acces it from the minifier
 */
export const mxsDocumentSymbols = new mxsDocumentSymbolProvider();