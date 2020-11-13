/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import
{
	createConnection,
	// DefinitionParams,
	Diagnostic,
	DidChangeConfigurationNotification,
	DocumentSymbol,
	// DocumentSymbolParams,
	// ExecuteCommandParams,
	InitializeParams,
	InitializeResult,
	ProposedFeatures,
	SymbolInformation,
	// TextDocumentPositionParams,
	TextDocuments,
	TextDocumentSyncKind,
	// DocumentFormattingParams,
	RequestType
	// DocumentRangeFormattingParams
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as Path from 'path';
// import * as assert from 'assert';
//------------------------------------------------------------------------------------------
import { MaxScriptSettings, defaultSettings } from './settings';
import { mxsCapabilities } from './capabilities';

import * as utils from './lib/utils';
import * as mxsCompletion from './mxsCompletions';
import { mxsDocumentSymbols } from './mxsOutline';
import * as mxsMinifier from './mxsMin';
import * as mxsDefinitions from './mxsDefinitions';
import { mxsSimpleDocumentFormatter } from './mxsFormatter';
//------------------------------------------------------------------------------------------
// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
export let connection = createConnection(ProposedFeatures.all);
// Create a simple text document manager. The text document manager. Supports full document sync only
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

/* Client Capabilities */
export let Capabilities = new mxsCapabilities();
//------------------------------------------------------------------------------------------
// Current document
/* Store the current document Symbols for later use*/
let currentDocumentSymbols: DocumentSymbol[] | SymbolInformation[] = [];
let currentTextDocument: TextDocument;
//------------------------------------------------------------------------------------------
connection.onInitialize(
	(params: InitializeParams) =>
	{
		Capabilities.initialize(params.capabilities);
		//...
		const result: InitializeResult = {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Incremental,
				// Tell the client that the server supports code completion
				completionProvider: {
					resolveProvider: false,
					triggerCharacters: ['.']
				},
				documentSymbolProvider: true,
				definitionProvider: true,
				documentFormattingProvider: true,
				// UNFNISHED!
				// documentRangeFormattingProvider: true,
				// declarationProvider: true,
				// referencesProvider: true,
				// typeDefinitionProvider: true,
				// implementationProvider: true,
				// ...
			}
		};
		// listen to the connection
		documents.listen(connection);

		//TODO: Implement workspace capabilities
		/*
		if (Capabilities.hasWorkspaceFolderCapability) {
			result.capabilities.workspace = {
				workspaceFolders: {
					supported: true
				}
			};
		}
		*/
		return result;
	});
//------------------------------------------------------------------------------------------
connection.onInitialized(
	() =>
	{
		if (Capabilities.hasConfigurationCapability) {
			// Register for all configuration changes.
			connection.client.register(DidChangeConfigurationNotification.type, undefined);
		}
		/*
		if (hasWorkspaceFolderCapability) {
			connection.workspace.onDidChangeWorkspaceFolders(_event => {
				connection.console.log('Workspace folder change event received.');
			});
		}
		*/
	});
//------------------------------------------------------------------------------------------
// Settings
let globalSettings: MaxScriptSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<MaxScriptSettings>> = new Map();

function getDocumentSettings(resource: string): Thenable<MaxScriptSettings>
{
	if (!Capabilities.hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'MaxScript'
		});
		documentSettings.set(resource, result);
	}
	return result;
}
//------------------------------------------------------------------------------------------
/* Document parsing logic wrapper */
/*
function parseDocument(document: TextDocument, cancelation: CancellationToken): Thenable<DocumentSymbol[] | SymbolInformation[]>
{
	return new Promise<SymbolInformation[] | DocumentSymbol[]>((resolve) =>
	{
		mxsDocumentSymbols.parseDocument(document, cancelation)
			.then(
				result =>
				{
					diagnoseDocument(document, result.diagnostics);
					resolve(result.symbols);
				},
				() =>
				{
					diagnoseDocument(document, []);
					resolve([]);
				}
			)
			.catch(
				error =>
				{
					diagnoseDocument(document, []);
					resolve([]);
				}
			);
	});
	// return await mxsDocumentSymbols.parseDocument(document, cancelation);
}
*/

// TODO: Remove diagnoses for closed files
function diagnoseDocument(document: TextDocument, diagnose: Diagnostic[])
{
	if (!Capabilities.hasDiagnosticCapability && !globalSettings.Diagnostics) { return; }
	// connection.console.log('We received a Diagnostic update event');
	connection.sendDiagnostics({ uri: document.uri, diagnostics: diagnose });
}

async function validateDocument(textDocument: TextDocument): Promise<void>
{
	// TODO: Diagnostics for unsaved documents keeps showing. maybe has to do with 'shema'?...

	// connection.console.log('We received a content change event');
	// connection.sendRequest()

	// revalidate settings
	await getDocumentSettings(textDocument.uri);
	// reset diagnostics
	diagnoseDocument(textDocument, []);
	//...
}
//------------------------------------------------------------------------------------------
connection.onDidChangeConfiguration(
	change =>
	{
		if (Capabilities.hasConfigurationCapability) {
			// Reset all cached document settings
			documentSettings.clear();
		} else {
			globalSettings = <MaxScriptSettings>(
				(change.settings.languageServerMaxScript || defaultSettings)
			);
		}
		// Revalidate all open text documents
		documents.all().forEach(validateDocument);
	});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
/*
documents.onDidChangeContent(
	change =>
	{
		validateDocument(change.document);
	});
*/
// Only keep settings for open documents
// documents.
documents.onDidClose(
	change =>
	{
		documentSettings.delete(change.document.uri);
		validateDocument(change.document);
	});
//------------------------------------------------------------------------------------------
// documents.onDidOpen
// documents.onDidSave

// This handler resolves additional information for the item selected in the completion list.
// connection.onCompletionResolve
// connection.onSelectionRanges
// connection.onTypeDefinition
//------------------------------------------------------------------------------------------
/*
connection.onDidChangeWatchedFiles(_change => {
	Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});
*/
//------------------------------------------------------------------------------------------
// Document formatter
connection.onDocumentFormatting(
	async params =>
	{
		/* let options: FormattingOptions = {
			tabSize: 5,
			insertSpaces: false,
			insertFinalNewline: true,
			trimTrailingWhitespace: true,
			trimFinalNewlines : true
		}; */
		if (!Capabilities.hasDocumentFormattingCapability && !globalSettings.formatter.indentOnly) { return; }
		// let settings = await getDocumentSettings(_DocumentFormattingParams.textDocument.uri);

		let document = documents.get(params.textDocument.uri)!;
		try {
			return await mxsSimpleDocumentFormatter(document, { IndentOnly: globalSettings.formatter.indentOnly });
		} catch (err) {
			// in case of error, swallow it and return undefined (no result)
			return;
		}
	});
/*
// Document Range formatter - WIP
connection.onDocumentRangeFormatting(
	async (_DocumentRangeFormattingParams: DocumentRangeFormattingParams) =>
	{
		if (!Capabilities.hasDocumentFormattingCapability) { return; }
		let document = documents.get(_DocumentRangeFormattingParams.textDocument.uri)!;
		return await mxsSimpleRangeFormatter(
			document,
			_DocumentRangeFormattingParams.range
		));
	});
// */
//------------------------------------------------------------------------------------------
// Update the parsed document, and diagnostics on Symbols request... ?
// unhandled: Error defaults to no results 
connection.onDocumentSymbol(
	(params, cancelation) =>
	{
		/*
		currentDocumentSymbols = await parseDocument(document, cancelation);
		return currentDocumentSymbols;
		*/
		return new Promise<SymbolInformation[] | DocumentSymbol[]>((resolve, reject) =>
		{

			if (!Capabilities.hasDocumentSymbolCapability) { resolve(); }
			getDocumentSettings(params.textDocument.uri)
				.then(
					result => { if (!result.GoToSymbol) { resolve(); } }
				);

			let document = documents.get(params.textDocument.uri)!;
			// console.log('Current symbols: ' + params.textDocument.uri);

			mxsDocumentSymbols.parseDocument(document, cancelation)
				.then(
					result =>
					{
						// connection.console.log('--> symbols sucess ');
						//-----------------------------------
						currentDocumentSymbols = result.symbols;
						currentTextDocument = document;
						//-----------------------------------
						diagnoseDocument(document, result.diagnostics);
						resolve(result.symbols);
					},
					// reason =>
					() =>
					{
						// connection.console.log('SOME REJECTION HAPPENED ON DOCSYMBOLS: ' + reason);
						diagnoseDocument(document, []);
						resolve();
					}
				)
				.catch(
					error =>
					{
						// connection.console.log('SOME ERROR HAPPENED ON DOCSYMBOLS: ' + error);
						diagnoseDocument(document, []);
						resolve();
					}
				);
		});

	});
// This handler provides the initial list of the completion items.
connection.onCompletion(
	async (params, cancellation) =>
	{

		let settings = await getDocumentSettings(params.textDocument.uri);
		if (!Capabilities.hasCompletionCapability && !settings.Completions) { return; }

		let document = documents.get(params.textDocument.uri)!;
		return mxsCompletion.provideCompletionItems(document, params.position);
	}
);
// This handler provides Definition results
// unhandled: Error defaults to no results 
connection.onDefinition(
	async (params, cancellation) =>
	{

		let settings = await getDocumentSettings(params.textDocument.uri);
		if (!Capabilities.hasDefinitionCapability && !settings.GoToDefinition) { return; }

		// method 1: regex match the file
		// method 2: search the parse tree for a match
		// method 2.1: implement Workspace capabilities

		try {
			let definitions =
				await mxsDefinitions.getDocumentDefinitions(
					documents.get(params.textDocument.uri)!,
					params.position,
					cancellation,
					params.textDocument.uri === currentTextDocument.uri ? currentDocumentSymbols : undefined,
					// mxsDocumentSymbols.msxParser.parsedCST
				);
			return definitions;
		} catch (err) {
			// connection.console.log('MaxScript Definitions unhandled error: ' + err.message);
			return [];
		}
	});
//------------------------------------------------------------------------------------------
/* Commands */
interface MinifyDocParams
{
	command: string
	uri: string[];
}

namespace MinifyDocRequest
{
	export const type = new RequestType<MinifyDocParams, string[] | null, void>('MaxScript/minify');
}

connection.onRequest(MinifyDocRequest.type,
	async (params) =>
	{
		// connection.console.log(JSON.stringify(params, null, 2));

		// let settings = await getDocumentSettings(currentTextDocument.uri);
		let settings = await getDocumentSettings(params.uri[0]);

		// connection.console.log('SERVER RECIEVED A REQUEST!');

		for (let i= 0; i < params.uri.length; i++)
		{
			let uri = params.uri[i];
			let path = utils.uriToPath(uri)!;
			let newPath = utils.prefixFile(path, settings.MinifyFilePrefix);

			try {
				await mxsMinifier.MinifyFile(path, newPath);
				connection.window.showInformationMessage(`MaxScript minify: Document saved as ${Path.basename(newPath)}`);
			} catch (err) {
				connection.window.showErrorMessage(`MaxScript minify: Failed at ${Path.basename(newPath)}. Reason: ${err.message}`);
			}
		}
		return null;
	});
//------------------------------------------------------------------------------------------
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);
// Listen on the connection
connection.listen();