/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import
{
	CancellationToken,
	createConnection,
	DefinitionParams,
	Diagnostic,
	DidChangeConfigurationNotification,
	DocumentSymbol,
	DocumentSymbolParams,
	ExecuteCommandParams,
	InitializeParams,
	InitializeResult,
	ProposedFeatures,
	SymbolInformation,
	TextDocumentPositionParams,
	TextDocuments,
	TextDocumentSyncKind,
	DocumentFormattingParams,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as Path from 'path';
//------------------------------------------------------------------------------------------
import { MaxScriptSettings, defaultSettings } from './settings';
import * as mxsCompletion from './mxsCompletions';
import { mxsDocumentSymbols } from './mxsOutline';
import * as mxsMinifier from './mxsMin';
import * as utils from './lib/utils';
import { Commands } from './mxsCommands';
import * as mxsDefinitions from './mxsDefinitions';
import { mxsSimpleTextEditFormatter } from './mxsFormatter';
import { mxsCapabilities } from './mxsCapabilities';
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
let currentTextDocument: TextDocument;
/* Store the current document Symbols for later use*/
let currentDocumentSymbols: DocumentSymbol[] | SymbolInformation[] = [];
//------------------------------------------------------------------------------------------
connection.onInitialize((params: InitializeParams) =>
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
			// declarationProvider: true,
			// referencesProvider: true,
			// typeDefinitionProvider: true,
			// implementationProvider: true,
			// ...
			executeCommandProvider: {
				commands: [
					Commands.MXS_MINDOC.command,
					Commands.MXS_MINFILE.command,
					// Commands.MXS_MINFILES.command
				]
			}
		}
	};
	if (Capabilities.hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: false
			}
		};
	}
	return result;
});
//------------------------------------------------------------------------------------------
connection.onInitialized(() =>
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
			section: 'languageServerMaxScript'
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
	// connection.console.log('We received a Diagnostic update event');
	if (Capabilities.hasDiagnosticCapability) {
		connection.sendDiagnostics({ uri: document.uri, diagnostics: diagnose });
	}
}

async function validateDocument(textDocument: TextDocument): Promise<void>
{
	connection.console.log('We received a content change event');
	// revalidate settings
	await getDocumentSettings(textDocument.uri);
	/*
		- settings...
		- parser
		- symbols and diagnostics
	*/
	// reset diagnostics
	if (Capabilities.hasDiagnosticCapability) { diagnoseDocument(textDocument, []); }
	//...
}
//------------------------------------------------------------------------------------------
connection.onDidChangeConfiguration(change =>
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

// Only keep settings for open documents
documents.onDidClose(e =>
{
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change =>
{
	currentTextDocument = change.document;
	// validateDocument(change.document);
});
//------------------------------------------------------------------------------------------
// documents.onDidClose
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
/*
let options: FormattingOptions = {
	tabSize: 5,
	insertSpaces: false,
	insertFinalNewline: true,
	trimTrailingWhitespace: true,
	trimFinalNewlines : true
};
*/
/**	Document formatter */
connection.onDocumentFormatting(
	async (_DocumentFormattingParams: DocumentFormattingParams) =>
	{
		if (!Capabilities.hasDocumentFormattingCapability) { return; }

		let document = documents.get(_DocumentFormattingParams.textDocument.uri)!;
		return await mxsSimpleTextEditFormatter(document);
	});
//------------------------------------------------------------------------------------------
// Update the parsed document, and diagnostics on Symbols request... ?
// TODO: FIX THE REASIN WHY IS FAILING SO MUCH
connection.onDocumentSymbol(
	(_DocumentSymbolParams: DocumentSymbolParams, cancelation) =>
	{
		/*
		currentDocumentSymbols = await parseDocument(document, cancelation);
		return currentDocumentSymbols;
		*/
		return new Promise<SymbolInformation[] | DocumentSymbol[]>((resolve, reject) =>
		{
			// TODO: use settings too
			if (!Capabilities.hasDocumentSymbolCapability) { resolve(); }

			let document = documents.get(_DocumentSymbolParams.textDocument.uri)!;

			mxsDocumentSymbols.parseDocument(document, cancelation)
				.then(
					result =>
					{
						diagnoseDocument(document, result.diagnostics);
						resolve(result.symbols);
					},
					reason =>
					{
						connection.console.log('SOME REJECTION HAPPENED ON DOCSYMBOLS: ' + reason);

						diagnoseDocument(document, []);
						resolve();
					}
				)
				.catch(
					error =>
					{
						connection.console.log('SOME ERROR HAPPENED ON DOCSYMBOLS: ' + error);
						diagnoseDocument(document, []);
						resolve();
					}
				);
		});

	});
// This handler provides the initial list of the completion items.
connection.onCompletion(
	async (_textDocumentPosition: TextDocumentPositionParams, cancelation) =>
	{
		let settings = await getDocumentSettings(currentTextDocument.uri);
		if (!Capabilities.hasCompletionCapability && !settings.Completions) { return; }

		let document = documents.get(_textDocumentPosition.textDocument.uri)!;
		return mxsCompletion.provideCompletionItems(document, _textDocumentPosition.position);
	}
);
// This handler provides Definition results
connection.onDefinition(
	async (_DefinitionParams: DefinitionParams) =>
	{
		let settings = await getDocumentSettings(currentTextDocument.uri);
		if (!Capabilities.hasDefinitionCapability && !settings.GoToDefinition) { return; }

		// let document = documents.get(_DefinitionParams.textDocument.uri)!;
		// let document = currentTextDocument;

		// method 1: regex match the file
		// method 2: search the parse tree for a match
		// method 2.1: implement Workspace capabilities

		let definitions =
			await mxsDefinitions.getDocumentDefinitions(
				documents.get(_DefinitionParams.textDocument.uri)!,
				_DefinitionParams.position,
				//TODO: CHANGE THIS
				mxsDocumentSymbols.msxParser.parsedCST,
				currentDocumentSymbols
			);
		return definitions;
	});
//------------------------------------------------------------------------------------------
/* Commands */
connection.onExecuteCommand(
	async (arg: ExecuteCommandParams) =>
	{

		let settings = await getDocumentSettings(currentTextDocument.uri);

		if (arg.command === Commands.MXS_MINDOC.command) {
			try {
				let path = utils.uriToPath(currentTextDocument.uri)!;
				let newPath = utils.prefixFile(path, settings.MinifyFilePrefix);
				// connection.console.log(utils.uriToPath(currentTextDocument.uri)!);
				//TODO: CHANGE THIS
				await mxsMinifier.MinifyDoc(mxsDocumentSymbols.msxParser.parsedCST || currentTextDocument.getText(), newPath);
				connection.window.showInformationMessage(`MaxScript minify: Document saved as ${Path.basename(newPath)}`);
			} catch (err) {
				connection.window.showErrorMessage(`MaxScript minify: Failed. Reason: ${err.message}`);
			}
		} else if (arg.command === Commands.MXS_MINFILE.command && arg.arguments !== undefined) {
			if (!Array.isArray(arg.arguments) || Array.isArray(arg.arguments) && arg.arguments[0] === undefined) {
				connection.window.showErrorMessage(`MaxScript minify: Failed. Reason: invalid command arguments`);
				return;
			}
			try {
				// arguments can be an array of paths or an URI
				let filenames: { src: string, dest: string }[];

				if ('path' in arg.arguments[0]) {
					let path = utils.uriToPath(arg.arguments[0].path)!;
					let newPath = utils.prefixFile(path, settings.MinifyFilePrefix);
					filenames = [
						{ src: path, dest: newPath }
					];
				} else {
					filenames = arg.arguments[0].map((path: string) =>
					{
						return {
							src: path,
							dest: utils.prefixFile(path, settings.MinifyFilePrefix)
						};
					});
				}
				// connection.console.log(JSON.stringify(filenames, null, 2));
				for (let paths of filenames) {
					// do it for each file...
					try {
						await mxsMinifier.MinifyFile(paths.src, paths.dest);
						connection.window.showInformationMessage(`MaxScript minify: Document saved as ${Path.basename(paths.dest)}`);
					} catch (err) {
						connection.window.showErrorMessage(`MaxScript minify: Failed at ${Path.basename(paths.dest)}. Reason: ${err.message}`);
					}
				}
			} catch (err) {
				connection.window.showErrorMessage(`MaxScript minify: Failed. Reason: ${err.message}`);
			}
		}
	});
//------------------------------------------------------------------------------------------
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);
// Listen on the connection
connection.listen();