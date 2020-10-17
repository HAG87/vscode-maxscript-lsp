'use strict';
// import * as cp from 'child_process';
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
	// setDiagnostics,
	provideTokenDiagnostic,
	ParserError
} from './mxsDiagnostics';
import
{
	// collectStatementsFromCST,
	// collectSymbols,
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

		try {
			// feed the parser
			this.msxParser.source = document.getText();
			await this.msxParser.ParseSourceAsync();
			SymbolInfCol = await this.documentSymbolsFromCST(document, this.msxParser.parsedCST);
			diagnostics.push(...provideTokenDiagnostic(document, collectTokens(this.msxParser.parsedCST, 'type', 'error')));
		} catch (err) {
			if (err.recoverable !== undefined) {
				if (err.recoverable === true) {
					//recovered from error
					SymbolInfCol = await this.documentSymbolsFromCST(document, this.msxParser.parsedCST, { remapLocations: true });
					diagnostics.push(...provideTokenDiagnostic(document, collectTokens(this.msxParser.parsedCST, 'type', 'error')));
					diagnostics.push(...provideParserDiagnostic(document, <ParserError>err));
					// throw err;
				} else {
					// fatal error
					diagnostics.push(...provideParserDiagnostic(document, <ParserError>err));
				}
			} else {
				// not a parser error
				throw err;
			}
		}
		return {
			symbols: SymbolInfCol,
			diagnostics: diagnostics
		};
	}

	// private wait = (delay: number, value?: any) => new Promise(resolve => setTimeout(resolve, delay, value));

	async parseDocument(document: TextDocument, cancelation: CancellationToken): Promise<ParserResult>
	{
		// this.activeDocument = undefined;
		return new Promise((resolve, reject) =>
		{
			// this.later(500).then(
			// () => {
			cancelation.onCancellationRequested(async () => reject('Cancellation requested'));
			this._getDocumentSymbols(document)
				.then(
					result =>
					{
						resolve(result);
					})
				.catch(
					err =>
					{
						reject(err);
					});
		}
		);
		// });
	}
}

/**
 * Initialized mxsDocumentSymbolProvider. Intended to be consumed by the SymbolProviders and be persistent for the current editor, i norder to acces it from the minifier
 */
export const mxsDocumentSymbols = new mxsDocumentSymbolProvider();