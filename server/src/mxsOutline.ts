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
	ParserError,
	parserOptions
} from './mxsParserBase';
import
{
	parseSource,
} from './mxsParser';
import getDocumentSymbolsLegacy from './mxsOutlineLegacy';
//--------------------------------------------------------------------------------
export interface ParserSymbols
{
	symbols: SymbolInformation[] | DocumentSymbol[]
	diagnostics: Diagnostic[]
	cst?: string
}

export class DocumentSymbolProvider
{
	options: parserOptions = { recovery: true, attemps: 15, memoryLimit: 0.9 }
	protected errorMessage(message: string)
	{
		return `MaxScript: can't parse the code.\nCode minifier, beautifier, diagnostics and hierarchical symbols will be unavailable.\nReason: ${message}`;
	}
	protected documentRange(document: TextDocument): Range
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
			cst: ''
		};
		try {
			// feed the parser
			let results = parseSource(document.getText(), options);
			//COLLECT SYMBOLDEFINITIONS
			if (results!.result) {
				response.symbols = deriveSymbolsTree(results.result, this.documentRange(document));
				response.diagnostics = provideTokenDiagnostic(collectTokens(results.result, 'type', 'error'));
				response.cst = JSON.stringify(results.result);
			}
			// check for trivial errors
			if (results!.error) {
				response.diagnostics.push(...provideParserDiagnostic(results.error));
			}
			return response;
		} catch (err: any) {
			if (err.tokens) {
				response.diagnostics = provideParserDiagnostic(err);
				return response
			} else {
				throw err;
			}
		}
	}
	/** MXS document parser */
	async parseDocument(document: TextDocument, connection: Connection): Promise<ParserSymbols>
	{
		return new Promise((resolve) =>
		{
			try {
				resolve(this.parseTextDocument(document, this.options));
			} catch (e: any) {
				connection.window.showWarningMessage(this.errorMessage(e.message));
				resolve(getDocumentSymbolsLegacy(document, new Array(provideParserErrorInformation(<ParserError>e))));
			}
		});
	}
}
