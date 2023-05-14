/**
 * Provide document symbols via parse tree.
 */
import { spawn, Thread, Worker } from "threads"
import
{
	Range,
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
import
{
	parserResult,
	ParserError,
	parserOptions
} from './mxsParserBase';
import { parseSource, parseSourceThreaded } from './mxsParser';
import getDocumentSymbolsLegacy from './mxsOutlineLegacy';
//--------------------------------------------------------------------------------
export interface ParserSymbols
{
	symbols: SymbolInformation[] | DocumentSymbol[]
	diagnostics: Diagnostic[]
	cst: any[]
}

export class DocumentSymbolProvider
{
	options: parserOptions = { recovery: true, attemps: 15, memoryLimit: 0.9 }
	private errorMessage(message: string)
	{
		return `MaxScript: can't parse the code.\nCode minifier, beautifier, diagnostics and hierarchical symbols will be unavailable.\nReason: ${message}`;
	}
	private documentRange(document: TextDocument): Range
	{
		return {
			start: document.positionAt(0),
			end: document.positionAt(document.getText().length - 1)
		};
	}
	private parseTextDocument(document: TextDocument, options?: parserOptions): ParserSymbols
	{
		let response: ParserSymbols = {
			symbols: [],
			diagnostics: [],
			cst: []
		};
		try {
			// feed the parser
			let results = parseSource(document.getText(), options);
			//COLLECT SYMBOLDEFINITIONS
			if (results!.result) {
				response.symbols = deriveSymbolsTree(results.result, this.documentRange(document));
				response.diagnostics = provideTokenDiagnostic(collectTokens(results.result, 'type', 'error'));
				response.cst = results.result;
			}
			// check for trivial errors
			if (results!.error) {
				response.diagnostics.concat(provideParserDiagnostic(results.error));
			}
		} catch (err: any) {
			if (err.tokens) {
				response.diagnostics = provideParserDiagnostic(err);
			} else {
				throw err;
			}
		} finally {
			return response;
		}
		// check for trivial errors
		if (results!.error) { diagnostics.push(...provideParserDiagnostic(results.error)); }

		return {
			symbols: SymbolInfCol,
			diagnostics: diagnostics
		};
	}
	private async parseTextDocumentThreaded(document: TextDocument, options?: parserOptions): Promise<ParserSymbols>
	{
		let documentSymbols = await spawn(new Worker('./workers/symbols.worker'));
		try {
			return await documentSymbols(document.getText(), this.documentRange(document), options);
		} finally {
			await Thread.terminate(documentSymbols);
		}
	}
	/** MXS document parser */
	async parseDocument(document: TextDocument, connection: Connection): Promise<ParserSymbols>
	{
		try {
			return this.parseTextDocument(document, this.options);
		} catch (e: any) {
			connection.window.showWarningMessage(this.errorMessage(e.message));
			return getDocumentSymbolsLegacy(document, new Array(provideParserErrorInformation(<ParserError>e)));
		}
	}
	/** MXS document parser - Threaded version */
	async parseDocumentThreaded(document: TextDocument, connection: Connection): Promise<ParserSymbols>
	{
		try {
			return await this.parseTextDocumentThreaded(document, this.options);
		} catch (e: any) {
			connection.window.showWarningMessage(this.errorMessage(e.message));
			return getDocumentSymbolsLegacy(document, new Array(provideParserErrorInformation(<ParserError>e)));
		}
	}
}
