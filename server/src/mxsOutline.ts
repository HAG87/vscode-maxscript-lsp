/**
 * Provide document symbols via parse tree.
 */
import { spawn, Thread, Worker } from "threads"
import
{
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
	// parserResult,
	ParserError,
	parserOptions
} from './mxsParserBase';
import { parseSource } from './mxsParser';
import getDocumentSymbolsLegacy from './mxsOutlineLegacy';
//--------------------------------------------------------------------------------
export interface ParserSymbols
{
	symbols: SymbolInformation[] | DocumentSymbol[]
	diagnostics: Diagnostic[]
}

export class DocumentSymbolProvider
{
	private parseTextDocument(document: TextDocument, options?: parserOptions): ParserSymbols
	{
		let SymbolInfCol: SymbolInformation[] | DocumentSymbol[] = [];
		let diagnostics: Diagnostic[] = [];
		// feed the parser
		try {
			let results = parseSource(document.getText(), options);
			//COLLECT SYMBOLDEFINITIONS
			if (results!.result) {
				const loc = {
					start: { line: 0, character: 0 },
					end: document.positionAt(document.getText().length - 1)
				};
				SymbolInfCol = deriveSymbolsTree(results.result, loc);
				diagnostics.push(...provideTokenDiagnostic(collectTokens(results.result, 'type', 'error')));
			}
			// check for trivial errors
			if (results!.error) { diagnostics.push(...provideParserDiagnostic(results.error)); }
		} catch (err: any) {
			if (err.tokens) {
				diagnostics.push(...provideParserDiagnostic(err));
			} else {
				throw err;
			}
		} finally {
			return {
				symbols: SymbolInfCol,
				diagnostics: diagnostics
			};
			SymbolInfCol = deriveSymbolsTree(results.result, loc);
			diagnostics.push(...provideTokenDiagnostic(collectTokens(results.result, 'type', 'error')));
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
		} finally {
			await Thread.terminate(documentSymbols);
		}
	}

	/** MXS document parser */
	async parseDocument(
		document: TextDocument,
		connection: Connection,
		options: parserOptions = { recovery: true, attemps: 15, memoryLimit: 0.9 }
	): Promise<ParserSymbols>
	{
		try {
			return this.parseTextDocument(document, options);
		} catch (e: any) {
			connection.window.showWarningMessage(
				`MaxScript: can't parse the code.\nCode minifier, beautifier, diagnostics and hierarchical symbols will be unavailable.\nReason: ${e.message}`
			);
			return getDocumentSymbolsLegacy(document, new Array(provideParserErrorInformation(<ParserError>e)));
		}
	}

	async parseDocumentThreaded(
		document: TextDocument,
		connection: Connection,
		options: parserOptions = { recovery: true, attemps: 15, memoryLimit: 0.9 }
	): Promise<ParserSymbols>
	{
		try {
			return await this.parseTextDocumentThreaded(document, options);
		} catch (e: any) {
			connection.window.showWarningMessage(`MaxScript: can't parse the code.\nCode minifier, beautifier, diagnostics and hierarchical symbols will be unavailable.\nReason: ${e.message}`);
			// console.log(e.description);
			return getDocumentSymbolsLegacy(document, new Array(provideParserErrorInformation(<ParserError>e)));
		}
	}
}

/**
 * Initialized mxsDocumentSymbolProvider. Intended to be consumed by the SymbolProviders and be persistent for the current editor
 */
export const mxsDocumentSymbols = new DocumentSymbolProvider();