/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import
{
	createConnection,
	Diagnostic,
	DidChangeConfigurationNotification,
	DocumentSymbol,
	InitializeResult,
	ProposedFeatures,
	SymbolInformation,
	TextDocuments,
	TextDocumentSyncKind,
	ResponseError,
	InitializeError,
	SemanticTokensRegistrationOptions,
	SemanticTokensRegistrationType,
	CompletionItem
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { basename } from 'path';
import { PathLike } from 'fs';
import { URI } from 'vscode-uri';
//------------------------------------------------------------------------------------------
import { MaxScriptSettings, defaultSettings } from './settings';
import { mxsCapabilities } from './capabilities';
//------------------------------------------------------------------------------------------
import { replaceText } from './workspaceEdits';
import { prefixFile } from './utils';
//------------------------------------------------------------------------------------------
import * as mxsCompletion from './mxsCompletions';
import { DocumentSymbolProvider, ParserSymbols } from './mxsOutline';
import * as mxsDefinitions from './mxsDefinitions';
import { SemanticTokensProvider } from './mxsSemantics';
import * as mxsFormatter from './mxsFormatter';
import * as mxsSimpleFormatter from './mxsSimpleFormatter';

import { DocumentSymbolProviderThreaded } from './mxsOutlineThreaded';
import * as mxsCompletionThreaded from './mxsCompletionsThreaded';
import * as mxsFormatterThreaded from './mxsFormatterThreaded';
import { MinifyDocRequest, PrettifyDocRequest } from './mxsCommands';
//------------------------------------------------------------------------------------------
// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
export let connection = createConnection(ProposedFeatures.all);
// Create a simple text document manager. Supports full document sync only
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
/* Client Capabilities */
let Capabilities = new mxsCapabilities();
//------------------------------------------------------------------------------------------
/** The semantic tokens provider */
let mxsSemanticTokens: SemanticTokensProvider;
/** mxsDocumentSymbolProvider. Intended to be consumed by the SymbolProviders and be persistent for the current editor */
let mxsDocumentSymbols: DocumentSymbolProvider;
//------------------------------------------------------------------------------------------
/**  Current documentSymbols: Store the current document Symbols for later use */
let currentDocumentSymbols: Map<string, DocumentSymbol[] | SymbolInformation[]> = new Map();
/** Store current parse tree for later use */
let currentDocumentParseTree: Map<string, any[] | any> = new Map();
let cachedCompletionItems: Map<string, CompletionItem[]> = new Map();
//------------------------------------------------------------------------------------------
/* Settings */
// let globalSettings: MaxScriptSettings = { ...defaultSettings };
let globalSettings: MaxScriptSettings = defaultSettings;
// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<MaxScriptSettings>> = new Map();
//------------------------------------------------------------------------------------------
function diagnoseDocument(uri: string, diagnose: Diagnostic[])
{
	if (!Capabilities.hasDiagnosticCapability && !globalSettings.Diagnostics) { return; }
	connection.sendDiagnostics({
		uri: uri,
		diagnostics: diagnose
	});
}
/*
connection.languages.diagnostics.on(async (params) => {
	const document = documents.get(params.textDocument.uri);
	if (document !== undefined) {
		return {
			kind: DocumentDiagnosticReportKind.Full,
			items: await validateTextDocument(document)
		} satisfies DocumentDiagnosticReport;
	} else {
		// We don't know the document. We can either try to read it from disk
		// or we don't report problems for it.
		return {
			kind: DocumentDiagnosticReportKind.Full,
			items: []
		} satisfies DocumentDiagnosticReport;
	}
});
*/
//------------------------------------------------------------------------------------------
/* Initialize the server */
connection.onInitialize((params, cancel, progress): Thenable<InitializeResult> | ResponseError<InitializeError> | InitializeResult =>
{
	progress.begin('Initializing MaxScript Server');
	Capabilities.initialize(params.capabilities);
	// Initialize semanticToken provider
	mxsSemanticTokens = new SemanticTokensProvider(params.capabilities.textDocument!.semanticTokens!);
	// Initialize the symbols provider

	/*
	//TODO:
	for (let folder of params.workspaceFolders) {
		connection.console.log(`${folder.name} ${folder.uri}`);
	}
	if (params.workspaceFolders && params.workspaceFolders.length > 0) {
		folder = params.workspaceFolders[0].uri;
	}
	*/

	return new Promise((resolve, reject) =>
	{
		let result: InitializeResult = {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Incremental,
				completionProvider:
					Capabilities.hasCompletionCapability
						? {
							resolveProvider: false,
							triggerCharacters: ['.']
						}
						: undefined,
				documentSymbolProvider: Capabilities.hasDocumentSymbolCapability,
				definitionProvider: Capabilities.hasDefinitionCapability,
				documentFormattingProvider: Capabilities.hasDocumentFormattingCapability,

				// workspaceSymbolProvider: true,
				// documentRangeFormattingProvider: true,
				// documentOnTypeFormattingProvider: {
				// 	firstTriggerCharacter: ';',
				// 	moreTriggerCharacter: ['}', '\n']
				// },
				// renameProvider: true,
				// workspace: {
				// 	workspaceFolders: {
				// 		supported: true,
				// 		changeNotifications: true
				// 	}
				// },
				// typeDefinitionProvider: true,
				// declarationProvider: { workDoneProgress: true },
				// executeCommandProvider: {
				// 	commands: ['testbed.helloWorld']
				// },
				// callHierarchyProvider: true,
				// selectionRangeProvider: { workDoneProgress: true }
			}
		};
		// wait to start...
		setTimeout(() => { resolve(result); }, 50);
	});
});
//------------------------------------------------------------------------------------------
connection.onInitialized(() =>
{
	if (Capabilities.hasConfigurationCapability) {
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}

	// Semantic tokens
	if (Capabilities.hasDocumentSemanticTokensCapability) {
		const registrationOptions: SemanticTokensRegistrationOptions = {
			documentSelector: null,
			legend: mxsSemanticTokens.legend!,
			range: false,
			full: {
				delta: true
			}
		};
		connection.client.register(SemanticTokensRegistrationType.type, registrationOptions);
	}
	// Settings...
	// getGlobalSettings()

	/*
	//TODO:
	if (Capabilities.hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
	*/
});
//------------------------------------------------------------------------------------------
/*
async function getGlobalSettings()
{
	let src = await connection.workspace.getConfiguration({
		section: 'MaxScript'
	}) as MaxScriptSettings;
	Object.assign(globalSettings, src);
}
// */
function getWorkspaceSettings(resource: string)
{
	let result: Thenable<MaxScriptSettings> = connection.workspace.getConfiguration({
		scopeUri: resource,
		section: 'MaxScript'
	});
	// set document settings from workspace settings
	documentSettings.set(resource, result);
	// return Promise.resolve(result);
	return result;
}
function getDocumentSettings(resource: string)
{
	if (!Capabilities.hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	// return Promise.resolve( documentSettings.get(resource) ?? getWorkspaceSettings(resource) );
	return (documentSettings.get(resource) ?? getWorkspaceSettings(resource));
}
//------------------------------------------------------------------------------------------
connection.onDidChangeConfiguration(change =>
{
	if (Capabilities.hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = (change.settings.languageServerMaxScript || defaultSettings);
	}
	// Revalidate all open text documents
	documents.all().forEach(async (textDocument: TextDocument) =>
	{
		await getDocumentSettings(textDocument.uri)
	});
});
//------------------------------------------------------------------------------------------
documents.onDidClose(change =>
{
	// Only keep settings for open documents
	documentSettings.delete(change.document.uri);
	// clear values
	currentDocumentSymbols.delete(change.document.uri);
	currentDocumentParseTree.delete(change.document.uri);
	cachedCompletionItems.delete(change.document.uri);
	// Remove diagnostics for closed document 
	diagnoseDocument(change.document.uri, []);
});

/*
documents.onDidChangeContent(
	change =>
	{
		diagnoseDocument(change.document, []);
	});
*/
//------------------------------------------------------------------------------------------
// connection.onDidCloseTextDocument
// connection.onDidChangeTextDocument
// connection.onDidOpenTextDocument
//------------------------------------------------------------------------------------------
/* Document formatter */
connection.onDocumentFormatting(async params =>
{
	try {
		return mxsSimpleFormatter.SimpleDocumentFormatter(
			documents.get(params.textDocument.uri)!,
			(await getDocumentSettings(params.textDocument.uri))?.formatter
		);
	} catch (err) {
		// in case of error, swallow it and return undefined (no result)
		return;
	}
});

// TODO: Document Range formatter - WIP
/*
connection.onDocumentRangeFormatting(async params =>
{
	if (!Capabilities.hasDocumentFormattingCapability) { return; }

	let document = documents.get(params.textDocument.uri)!;
	return await mxsSimpleRangeFormatter(
		document,
		params.range
	));
});
// */
//------------------------------------------------------------------------------------------
/* Provide DocumentSymbols and diagnostics  */
connection.onDocumentSymbol((params, token) =>
{
	// cancellation request
	token.onCancellationRequested(_ => { });
	// settings
	let threading = false;

	return new Promise(resolve =>
	{

		getDocumentSettings(params.textDocument.uri)
			.then(result =>
			{
				if (!result.GoToSymbol) { resolve; }
				threading = result.parser.multiThreading;
			});

		mxsDocumentSymbols = !threading ? new DocumentSymbolProvider() : new DocumentSymbolProviderThreaded();
		// mxsDocumentSymbols = new DocumentSymbolProviderThreaded();
		//----------------------------------------------
		// mxsDocumentSymbols = new DocumentSymbolProvider();
		//----------------------------------------------
		getDocumentSettings(params.textDocument.uri)
			.then(result =>
			{
				mxsDocumentSymbols.options.recovery = result.parser.errorCheck;
				mxsDocumentSymbols.options.attemps = result.parser.errorLimit;
			});

		let document = documents.get(params.textDocument.uri)!;

		mxsDocumentSymbols.parseDocument(document, connection).then((result: ParserSymbols) =>
		{
			currentDocumentSymbols.set(params.textDocument.uri, result.symbols);
			// currentDocumentParseTree.set(params.textDocument.uri, result.cst);
			// offload Document completions from the onCompletion Event
			if (result.cst) {
				// /*
				let completionItemsCache =
					threading
						? mxsCompletionThreaded.CodeCompletionItems(JSON.parse(result.cst))
						: mxsCompletion.CodeCompletionItems(JSON.parse(result.cst));

				completionItemsCache.then((result: CompletionItem[]) =>
				// */
				// mxsCompletion.CodeCompletionItems(JSON.parse(result.cst)).then((result: CompletionItem[]) =>
				{
					currentDocumentParseTree.set(
						params.textDocument.uri,
						result
					);
				});
			}
			//-----------------------------------
			// Provide diagnostics
			diagnoseDocument(params.textDocument.uri, result.diagnostics);
			//-----------------------------------
			resolve(result.symbols);
		})
			.catch((error: any) =>
			{
				connection.window.showInformationMessage(`MaxScript symbols provider unhandled error:\n${error?.message}`);
				diagnoseDocument(params.textDocument.uri, []);
				resolve;
			});
	});

});
//------------------------------------------------------------------------------------------
/* Completion Items */
connection.onCompletion(async (params, token) =>
{
	// token request
	token.onCancellationRequested(_ => { });

	if (!(await getDocumentSettings(params.textDocument.uri)).Completions) { return []; }

	// settings
	const CompletionOptions = (await getDocumentSettings(params.textDocument.uri)).Completions ?? defaultSettings.Completions;

	const CompletionItems = new Set<CompletionItem>();

	// database completions
	if (CompletionOptions.dataBaseCompletion) {
		mxsCompletion.CompletionItems(
			documents.get(params.textDocument.uri)!,
			params.position
		).forEach((item) => CompletionItems.add(item));
	}

	// document symbols completion
	if (CompletionOptions.Definitions) {
		mxsCompletion.InDocumentCompletionItems(<DocumentSymbol[]>currentDocumentSymbols.get(params.textDocument.uri))
			.forEach((item) => CompletionItems.add(item));
	}
	// document parse tree completion
	if (CompletionOptions.Identifiers) {
		if (currentDocumentParseTree.has(params.textDocument.uri)) {
			[...currentDocumentParseTree.get(params.textDocument.uri)]
				.forEach((item: CompletionItem) => CompletionItems.add(item));
		}
	}

	const arr = Array.from(CompletionItems).filter((obj, pos, arr) =>
	{
		return arr.map(mapObj => mapObj["label"]).indexOf(obj["label"]) === pos
	})
	return arr;
});

//------------------------------------------------------------------------------------------
/* Definition provider */
// method 1: regex match the file
// method 2: search the parse tree for a match
// method 2.1: implement Workspace capabilities
connection.onDefinition((params, token) =>
{
	// token request
	token.onCancellationRequested(_ => { });

	return new Promise(resolve =>
	{
		// settings
		getDocumentSettings(params.textDocument.uri)
			.then(result =>
			{
				if (!result.GoToDefinition) { resolve; }
			});
		// get document definitions
		mxsDefinitions.getDocumentDefinitions(
			documents.get(params.textDocument.uri)!,
			params.position,
			currentDocumentSymbols.get(params.textDocument.uri))
			.then(resolve)
			.catch(err =>
			{
				connection.console.log('MaxScript Definitions unhandled error: ' + err.message);
				resolve;
			})
	});
});
//------------------------------------------------------------------------------------------
/*  Provide semantic tokens */
connection.languages.semanticTokens.on(params =>
{
	const document = documents.get(params.textDocument.uri);
	return document !== undefined ? mxsSemanticTokens.provideSemanticTokens(document) : { data: [] };
});
// TODO: Fix tokens update
connection.languages.semanticTokens.onDelta(params =>
{
	const document = documents.get(params.textDocument.uri);
	return document !== undefined ? mxsSemanticTokens.provideDeltas(document, params.textDocument.uri) : { edits: [] };
});
//------------------------------------------------------------------------------------------
/* Commands */
/* Minifier */
async function minifyDocuments(uris: string[], prefix: string, formatter: Function, settings: any)
{
	let path: string,
		newPath: PathLike,
		document: string;

	for (let i = 0; i < uris.length; i++) {
		path = URI.parse(uris[i]).fsPath;
		newPath = prefixFile(path, prefix);
		document = documents.get(uris[i])!.getText();
		//console.log(doc);
		if (!document) {
			connection.window.showWarningMessage(
				`MaxScript minify: Failed at ${basename(path)}. Reason: Can't read the file`
			);
			continue;
		}
		try {
			await formatter(document, newPath, settings);

			connection.window.showInformationMessage(
				`MaxScript minify: Document saved as ${basename(newPath)}`
			);
		} catch (e: any) {
			connection.window.showErrorMessage(
				`MaxScript minify: Failed at ${basename(path)}. Reason: ${e.message}`
			);
		}
	}
}
// /*
async function minifyFiles(uris: string[], prefix: string, formatter: Function, settings: any)
{
	let path: string,
		newPath: string;

	for (let i = 0; i < uris.length; i++) {
		path = URI.parse(uris[i]).fsPath;
		newPath = prefixFile(path, prefix);

		try {
			await formatter(path, newPath, settings);

			connection.window.showInformationMessage(
				`MaxScript minify: Document saved as ${basename(newPath)}`
			);
		} catch (e: any) {
			connection.window.showErrorMessage(
				`MaxScript minify: Failed at ${basename(path)}. Reason: ${e.message}`
			);
		}
	}
}
// */
connection.onRequest(MinifyDocRequest.type, async params =>
{
	let settings = await getDocumentSettings(params.uri[0]) ?? defaultSettings;
	switch (params.command) {
		case 'mxs.minify':
			settings.parser.multiThreading
				? await minifyDocuments(params.uri, settings.MinifyFilePrefix, mxsFormatterThreaded.MinifyDoc, mxsFormatter.minifyOptions)
				: await minifyDocuments(params.uri, settings.MinifyFilePrefix, mxsFormatter.MinifyDoc, mxsFormatter.minifyOptions);
			break;
		case 'mxs.minify.file':
			settings.parser.multiThreading
				? await minifyFiles(params.uri, settings.MinifyFilePrefix, mxsFormatterThreaded.MinifyFile, mxsFormatter.minifyOptions)
				: await minifyFiles(params.uri, settings.MinifyFilePrefix, mxsFormatter.MinifyFile, mxsFormatter.minifyOptions);
	}
	return [];
});
/* Prettyfier */

connection.onRequest(PrettifyDocRequest.type, async params =>
{
	let settings = await getDocumentSettings(params.uri[0]) ?? defaultSettings;

	// let opts: Partial<reflowOptions> = {};
	// Object.assign(opts, settings.prettifier);

	if (params.command !== 'mxs.prettify') { return []; }
	params.uri.forEach(async (uri) =>
	{
		let path = URI.parse(uri).fsPath;
		let doc = documents.get(uri);
		if (!doc) {
			connection.window.showWarningMessage(
				`MaxScript prettifier: Failed at ${basename(path)}. Reason: Can't read the file`
			);
			return;
		}
		try {
			let formattedData =
				settings.parser.multiThreading
					? await mxsFormatterThreaded.FormatData(doc.getText(), settings.prettifier)
					: mxsFormatter.FormatData(doc.getText(), settings.prettifier);
			// mxsFormatter.FormatData(doc.getText(), settings.prettifier);

			let reply = await replaceText.call(connection, doc, formattedData)
			if (reply.applied) {
				connection.window.showInformationMessage(
					`MaxScript prettifier sucess: ${basename(path)}`
				);
			}
			if (reply.failedChange) {
				connection.window.showWarningMessage(
					`MaxScript prettifier: Failed at ${basename(path)}. Reason: ${reply.failureReason}`
				);
			}
		} catch (e: any) {
			connection.window.showErrorMessage(
				`MaxScript prettifier: Failed at ${basename(path)}. Reason: ${e.message}`
			);
		}
	});
	return [];
});
//------------------------------------------------------------------------------------------
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);
// Listen on the connection
connection.listen();