/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	SymbolInformation,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	TextDocumentIdentifier,
	DocumentSymbolParams,
	InitializeResult,
	ExecuteCommandParams,
	Command
} from 'vscode-languageserver';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';
//------------------------------------------------------------------------------------------
// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);
//------------------------------------------------------------------------------------------

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;
let hasDiagnosticCapability: boolean = false;
let hasDocumentSymbolCapability: boolean = false;
//------------------------------------------------------------------------------------------
import mxsCompletion from './mxsCompletions';
import {mxsDocumentSymbols} from './mxsOutline';
// import {mxsDiagnosticCollection} from './mxsDiagnostics';
//------------------------------------------------------------------------------------------

const MXS_MINDOC = Command.create('Minify open document','mxs.minify');
const MXS_MINFILE = Command.create('Minify file','mxs.minify.file');
const MXS_MINFILES = Command.create('Minify files...','mxs.minify.files');

const commands = [
	MXS_MINDOC,
	MXS_MINFILE,
	MXS_MINFILES
];

connection.onInitialize((params: InitializeParams) => {
	let capabilities = params.capabilities;
	// capabilities.textDocument?.documentSymbol
	// capabilities.textDocument.
	// Does the client support the `workspace/configuration` request?
	// If not, we will fall back using global settings
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	/*
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	*/
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
			//definitionProvider: true
			// COMPLETE CAPABILITIES HERE
			executeCommandProvider: {
				commands: commands.map(command => command.command)
			}
		}
	};
	/*
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	*/
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface MaxScriptSettings {
	maxNumberOfProblems: number;
	// add settings here
}

// WHAT IS THE MEANING OF THIS??
// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.

// put default settings here
const defaultSettings: MaxScriptSettings = { maxNumberOfProblems: 1000 };
let globalSettings: MaxScriptSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<MaxScriptSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
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

function getDocumentSettings(resource: string): Thenable<MaxScriptSettings> {
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

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});
//------------------------------------------------------------------------------------------

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
let currentTextDocument: TextDocument;

documents.onDidChangeContent(change => {
	currentTextDocument = change.document;
	// validateDocument(change.document);
});

async function parseDocument(document: TextDocument) {
	return await mxsDocumentSymbols.parseDocument(document);
}

function diagnoseDocument(document: TextDocument) {
	// connection.console.log('We received a Diagnostic update event');
	connection.sendDiagnostics({ uri: document.uri, diagnostics: mxsDocumentSymbols.documentDiagnostics });
	/*
	if (mxsDiagnosticCollection.length !== 0) {	
		connection.console.log('We have diagnostics!');
		connection.sendDiagnostics({ uri: document.uri, diagnostics: mxsDocumentSymbols.documentDiagnostics });
	}
	*/
}

async function validateDocument(textDocument: TextDocument): Promise<void> {
	connection.console.log('We received a content change event');
	let settings = await getDocumentSettings(textDocument.uri);
	
	/*
		- settings...
		- parser
		- symbols and diagnostics
		- use the stored AST for the minifier: mxsDocumentSymbols.msxParser.parsedCST
	*/
	diagnoseDocument(textDocument);
	
	/*
	// In this simple example we get the settings for every validate run.
	let settings = await getDocumentSettings(textDocument.uri);

	// The validator creates diagnostics for all uppercase words length 2 and more
	let text = textDocument.getText();
	let pattern = /\b[A-Z]{2,}\b/g;
	let m: RegExpExecArray | null;

	let problems = 0;
	let diagnostics: Diagnostic[] = [];
	while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		problems++;
		let diagnostic: Diagnostic = {
			severity: DiagnosticSeverity.Warning,
			range: {
				start: textDocument.positionAt(m.index),
				end: textDocument.positionAt(m.index + m[0].length)
			},
			message: `${m[0]} is all uppercase.`,
			source: 'ex'
		};
		if (hasDiagnosticRelatedInformationCapability) {
			diagnostic.relatedInformation = [
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: 'Spelling matters'
				},
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: 'Particularly for names'
				}
			];
		}
		diagnostics.push(diagnostic);
	}

	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
	// */
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

//------------------------------------------------------------------------------------------
// Update the parsed document, and diagnostics on Symbols request... ?
connection.onDocumentSymbol( async (_DocumentSymbolParams:DocumentSymbolParams) => {
	/*
	- USE THE VALIDATE DOCUMENT, RETURN SYMBOLS...OR A GLOBAL VAR ?...
	*/
	// connection.console.log('We received a DocumentSymbol request');
	let doc = documents.get(_DocumentSymbolParams.textDocument.uri)!;
	// let documentSymbols = await mxsDocumentSymbols.parseDocument(doc);
	// connection.sendDiagnostics({ uri: doc.uri, diagnostics: mxsDocumentSymbols.documentDiagnostics });
	let documentSymbols = await parseDocument(doc);
	diagnoseDocument(doc);
	// return await mxsDocumentSymbols.parseDocument(doc);
	return documentSymbols;
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		return mxsCompletion.provideCompletionItems(currentTextDocument, _textDocumentPosition.position);
	}
);
// This handler resolves additional information for the item selected in
// the completion list.
// connection.onCompletionResolve(
//...
// 	}
// );


connection.onExecuteCommand( async (params: ExecuteCommandParams) => {
	console.log('Command executed!');
});
//------------------------------------------------------------------------------------------
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
