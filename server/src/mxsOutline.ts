/**
 * Provide document symbols via parse tree.
 */
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
import
{
	parseSource,
	parseSourceThreaded
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
	connection: Connection

	options: parserOptions = { recovery: false, attemps: 10, memoryLimit: 0.9 }
	private parserResultsInstance: parserResult = {}

	constructor(connection: Connection)
	{
		this.connection = connection;
	}

	private getDocumentSize(document: TextDocument): Range
	{
		return {
			start: { line: 0, character: 0 },
			end: document.positionAt(document.getText().length - 1)
		};
	}
	private parseTextDocument(document: TextDocument, options?: parserOptions): ParserSymbols
	{
		let SymbolInfCol: SymbolInformation[] | DocumentSymbol[] = [];
		let diagnostics: Diagnostic[] = [];
		// feed the parser
		try {
			let results = parseSource(document.getText(), options);
			//COLLECT SYMBOLDEFINITIONS
			if (results!.result) {
				this.parserResultsInstance = results.result;

				SymbolInfCol = deriveSymbolsTree(results.result, this.getDocumentSize(document));
				diagnostics.push(
					...provideTokenDiagnostic(
						collectTokens(results.result, 'type', 'error')
					));
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
		let SymbolInfCol: SymbolInformation[] | DocumentSymbol[] = [];
		let diagnostics: Diagnostic[] = [];
		// feed the parser
		try {
			let results = await parseSourceThreaded(document.getText(), options);
			//COLLECT SYMBOLDEFINITIONS
			if (results!.result) {
				this.parserResultsInstance = results.result;

				SymbolInfCol = deriveSymbolsTree(results.result, this.getDocumentSize(document));
				diagnostics.push(
					...provideTokenDiagnostic(
						collectTokens(results.result, 'type', 'error')
					));
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
		}
	}

	public parseSucess() {
		return Object.keys(this.parserResultsInstance).length !== 0
	}
	
	public getParseTree()
	{
		return this.parseSucess() ? this.parserResultsInstance : null;
	}
	/** MXS document parser */
	async parseDocument(document: TextDocument): Promise<ParserSymbols>
	{
		try {
			return this.parseTextDocument(document, this.options);
		} catch (e: any) {
			this.connection.window.showWarningMessage(
				`MaxScript: can't parse the code.\nCode minifier, beautifier, diagnostics and hierarchical symbols will be unavailable.\nReason: ${e.message}`
			);
			return getDocumentSymbolsLegacy(document, new Array(provideParserErrorInformation(<ParserError>e)));
		}
	}

	async parseDocumentThreaded(document: TextDocument): Promise<ParserSymbols>
	{
		try {
			return await this.parseTextDocumentThreaded(document, this.options);
		} catch (e: any) {
			this.connection.window.showWarningMessage(
				`MaxScript: can't parse the code.\nCode minifier, beautifier, diagnostics and hierarchical symbols will be unavailable.\nReason: ${e.message}`
			);
			// console.log(e.description);
			return getDocumentSymbolsLegacy(document, new Array(provideParserErrorInformation(<ParserError>e)));
		}
	}
}