/**
 * Provide document symbols via parse tree.
 */
import { spawn, Thread, Worker } from "threads"
import
{
	// CancellationToken,
	// CancellationTokenSource,
	Range,
	Diagnostic,
	SymbolInformation,
	DocumentSymbol,
	Connection,
} from 'vscode-languageserver';
import { TextDocument, } from 'vscode-languageserver-textdocument';
import
{
	ParserError,
	provideParserDiagnostic,
	provideTokenDiagnostic,
	provideParserErrorInformation
} from './mxsDiagnostics';
import
{
	deriveSymbolsTree,
	collectTokens
} from './mxsProvideSymbols';
import { parseSource, parserOptions, parserResult } from './mxsParser';
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
		let results: parserResult;
		// feed the parser
		try {
			results = await parseSource(document.getText(), options);
			//COLLECT SYMBOLDEFINITIONS
			if (results.result!) {
				SymbolInfCol = this.documentSymbolsFromCST(results.result, document);
				diagnostics.push(...provideTokenDiagnostic(collectTokens(results.result, 'type', 'error')));
			}
			// check for trivial errors
			if (results.error!) {diagnostics.push(...provideParserDiagnostic(results.error));}

			return {
				symbols: SymbolInfCol,
				diagnostics: diagnostics
			};
		}catch (err:any) {		
			throw err;
		}		
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
	async parseDocument(
		document: TextDocument,
		connection: Connection,
		threading = true,
		options: parserOptions = { recovery: true, attemps: 15, memoryLimit: 0.9 }
	): Promise<ParserResult>
	{
		try {
			let res = threading
				? await this._parseTextDocumentThreaded(document, options)
				: await this._parseTextDocument(document, options);
				console.log(res);
			return res;
		} catch (e: any) {
			// console.log('error!');
			connection.window.showWarningMessage( `MaxScript: can't parse the code.\nCode minifier, beautifier, diagnostics and hierarchical symbols will be unavailable.\nReason: ${e.error.message}` );
			/*
			return {
				symbols: [],
				diagnostics: <Array<Diagnostic>> new Array(provideParserErrorInformation(<ParserError>e.error))
			}
			//*/
			return getDocumentSymbolsLegacy(document, new Array(provideParserErrorInformation(<ParserError>e.error)));
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