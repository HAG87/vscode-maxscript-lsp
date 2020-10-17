/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import
{
	CancellationToken,
	// Command,
	// CompletionItem,
	createConnection,
	// Definition,
	// DefinitionLink,
	DefinitionParams,
	Diagnostic,
	// DefinitionRequest,
	// Diagnostic,
	// DiagnosticSeverity,
	DidChangeConfigurationNotification,
	DocumentSymbol,
	DocumentSymbolParams,
	ExecuteCommandParams,
	InitializeParams,
	InitializeResult,
	// Location,
	// Position,
	ProposedFeatures,
	// Range,
	// ShowMessageNotification,
	SymbolInformation,
	// TextDocumentIdentifier,
	TextDocumentPositionParams,
	TextDocuments,
	TextDocumentSyncKind,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as Path from 'path';
//------------------------------------------------------------------------------------------
import mxsCompletion from './mxsCompletions';
import { mxsDocumentSymbols, ParserResult} from './mxsOutline';
// import {mxsDiagnosticCollection} from './mxsDiagnostics';
import mxsMinifier from './mxsMin';
import * as utils from './lib/utils';
import { Commands } from './mxsCommands';
import mxsDefinitions from './mxsDefinitions';
//------------------------------------------------------------------------------------------
// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
export let connection = createConnection(ProposedFeatures.all);
//------------------------------------------------------------------------------------------
// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
let currentTextDocument: TextDocument;
//------------------------------------------------------------------------------------------
let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasCompletionCapability: Boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;
let hasDiagnosticCapability: boolean = false;
let hasDocumentSymbolCapability: boolean = false;
let hasDefinitionCapability: boolean = false;
//------------------------------------------------------------------------------------------
connection.onInitialize((params: InitializeParams) =>
{
	let capabilities = params.capabilities;
	// Does the client support the `workspace/configuration` request?
	// If not, we will fall back using global settings
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);
	hasDocumentSymbolCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.documentSymbol
	);
	hasDefinitionCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.definition
	);
	hasCompletionCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.completion
	);
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
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: false
			}
		};
	}
	return result;
});

connection.onInitialized(() =>
{
	if (hasConfigurationCapability) {
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

// Settings
interface MaxScriptSettings
{
	GoToSymbol: boolean;
	GoToDefinition: boolean;
	Diagnostics: boolean;
	Completions: boolean;
	// semantics: boolean;
	MinifyFilePrefix: string;
	// ...
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.

// put default settings here
const defaultSettings: MaxScriptSettings = {
	GoToSymbol: true,
	GoToDefinition: true,
	Diagnostics: true,
	Completions: true,
	//semantics:     true,
	MinifyFilePrefix: 'min_',
};

let globalSettings: MaxScriptSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<MaxScriptSettings>> = new Map();

function getDocumentSettings(resource: string): Thenable<MaxScriptSettings>
{
	if (!hasConfigurationCapability) {
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
let currentDocumentSymbols: DocumentSymbol[] | SymbolInformation[] = [];

function parseDocument(document: TextDocument, cancelation: CancellationToken)
{
	return new Promise<SymbolInformation[] | DocumentSymbol[]>((resolve, reject) =>
	{
		mxsDocumentSymbols.parseDocument(document, cancelation).then(
			result =>
			{
				diagnoseDocument(document, result.diagnostics);
				resolve(result.symbols);
			}
		)
			.catch(
				error =>
				{
					reject([]);
				}
			);
	});

	// return await mxsDocumentSymbols.parseDocument(document, cancelation);
}

function diagnoseDocument(document: TextDocument, diagnose: Diagnostic[])
{
	// connection.console.log('We received a Diagnostic update event');
	connection.sendDiagnostics({ uri: document.uri, diagnostics: diagnose });
	/*
	if (mxsDiagnosticCollection.length !== 0) {	
		connection.console.log('We have diagnostics!');
		connection.sendDiagnostics({ uri: document.uri, diagnostics: mxsDocumentSymbols.documentDiagnostics });
	}
	*/
}

async function validateDocument(textDocument: TextDocument): Promise<void>
{
	connection.console.log('We received a content change event');
	let settings = await getDocumentSettings(textDocument.uri);
	/*
		- settings...
		- parser
		- symbols and diagnostics
	*/
	// reset diagnostics
	if (hasDiagnosticCapability) {
		let resetDiagnostic:Diagnostic[] = [];
		diagnoseDocument(textDocument, resetDiagnostic);
	}
	//...
}
//------------------------------------------------------------------------------------------
connection.onDidChangeConfiguration(change =>
{
	if (hasConfigurationCapability) {
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
// documents.onDidClose
// documents.onDidOpen
// documents.onDidSave

// connection.onDidChangeWatchedFiles(_change => {
// Monitored files have change in VSCode
// connection.console.log('We received an file change event');
// });
//------------------------------------------------------------------------------------------
// Update the parsed document, and diagnostics on Symbols request... ?
connection.onDocumentSymbol(async (_DocumentSymbolParams: DocumentSymbolParams, cancelation) =>
{
	if (!hasDocumentSymbolCapability) { return; }
	// connection.console.log('We received a DocumentSymbol request');
	
	return await parseDocument(currentTextDocument, cancelation);
});
// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams, cancelation) =>
	{
		if (!hasCompletionCapability) { return; }
		return mxsCompletion.provideCompletionItems(currentTextDocument, _textDocumentPosition.position);
	}
);
// This handler provides Definition results
connection.onDefinition(async (_DefinitionParams: DefinitionParams) =>
{
	// connection.console.log('We received an DefinitionParams event');
	if (!hasDefinitionCapability) { return; }
	// let document = documents.get(_DefinitionParams.textDocument.uri)!;
	let document = currentTextDocument;
	let position = _DefinitionParams.position;

	// method 1: regex match the file
	// method 2: search the parse tree for a match
	// method 2.1: implement Workspace capabilities
	let definitions =
		await mxsDefinitions.getDocumentDefinitions(
			document,
			position,
			//TODO: CHANGE THIS
			mxsDocumentSymbols.msxParser.parsedCST,
			currentDocumentSymbols
		);
	return definitions;
});
// This handler resolves additional information for the item selected in the completion list.
// connection.onCompletionResolve
// connection.onSelectionRanges
// connection.onTypeDefinition

// This handler porvides commands execution
connection.onExecuteCommand(async (arg: ExecuteCommandParams) =>
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