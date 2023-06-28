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
	RequestType,
	ResponseError,
	InitializeError,
	SemanticTokensRegistrationOptions,
	SemanticTokensRegistrationType,
	CompletionItem
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as Path from 'path';
import { URI } from 'vscode-uri';
//------------------------------------------------------------------------------------------
import { MaxScriptSettings, defaultSettings } from './settings';
import { mxsCapabilities } from './capabilities';
//------------------------------------------------------------------------------------------
import { replaceText } from './lib/workspaceEdits';
import { prefixFile } from './lib/utils';
//------------------------------------------------------------------------------------------
import * as mxsCompletion from './mxsCompletions';
import { DocumentSymbolProvider, ParserSymbols } from './mxsOutline';
import * as mxsDefinitions from './mxsDefinitions';
import { SemanticTokensProvider } from './mxsSemantics';
import * as mxsMinify from './mxsMin';
import * as mxsFormatter from './mxsFormatter';
import * as mxsSimpleFormatter from './mxsSimpleFormatter';

// import { DocumentSymbolProviderThreaded } from './mxsOutlineThreaded';
// import * as mxsCompletionThreaded from './mxsCompletionsThreaded';
// import * as mxsMinifyThreaded from './mxsMinThreaded';
// import * as mxsFormatterThreaded from './mxsFormatterThreaded';

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
function shallowComparison(obj1: any, obj2: any): boolean
{
	return Object.keys(obj1).length === Object.keys(obj2).length &&
		(Object.keys(obj1) as (keyof typeof obj1)[]).every((key) =>
		{
			return (
				Object.prototype.hasOwnProperty.call(obj2, key) && obj1[key] === obj2[key]
			);
		});
}
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
	// let threading = false;

	return new Promise(resolve =>
	{

		getDocumentSettings(params.textDocument.uri)
			.then(result =>
			{
				if (!result.GoToSymbol) { resolve; }
				// threading = result.parser.multiThreading;
			});

		// mxsDocumentSymbols = !threading ? new DocumentSymbolProvider() : new DocumentSymbolProviderThreaded() ;
		// mxsDocumentSymbols = new DocumentSymbolProviderThreaded();
		//----------------------------------------------
		mxsDocumentSymbols = new DocumentSymbolProvider();
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
				/*
				let completionItemsCache =
					threading
						? mxsCompletionThreaded.provideCodeCompletionItems(JSON.parse(result.cst))
						: mxsCompletion.provideCodeCompletionItems(JSON.parse(result.cst));
						
				completionItemsCache.then((result: CompletionItem[]) =>
				*/
				mxsCompletion.CodeCompletionItems(JSON.parse(result.cst)).then((result: CompletionItem[]) =>
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
	let Completions = (await getDocumentSettings(params.textDocument.uri)).Completions ?? defaultSettings.Completions;

	let ProvideCompletions = [];

	// document symbols completion
	if (Completions.Definitions) {
		if (currentDocumentSymbols.has(params.textDocument.uri)) {
			ProvideCompletions.push(
				...mxsCompletion.DefinitionCompletionItems(<DocumentSymbol[]>currentDocumentSymbols.get(params.textDocument.uri))
			);
		}
	}
	// document parse tree completion
	if (Completions.Identifiers) {
		if (currentDocumentParseTree.has(params.textDocument.uri)) {
			// ProvideCompletions.push( ...mxsCompletion.provideDocumentCompletionItems(currentDocumentParseTree.get(params.textDocument.uri)) );
			ProvideCompletions.push(...currentDocumentParseTree.get(params.textDocument.uri));
		}
	}
	// database completions
	if (Completions.dataBaseCompletion) {
		ProvideCompletions.push(
			...mxsCompletion.CompletionItems(
				documents.get(params.textDocument.uri)!,
				params.position
			));
	}
	return ProvideCompletions;
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
interface MinifyDocParams
{
	command: string
	uri: string[];
}
namespace MinifyDocRequest
{
	export const type = new RequestType<MinifyDocParams, string[] | null, void>('MaxScript/minify');
}
interface PrettifyDocParams
{
	command: string
	uri: string[]
}
namespace PrettifyDocRequest
{
	export const type = new RequestType<PrettifyDocParams, string[] | null, void>('MaxScript/prettify');
}
/* Minifier */
async function minifyDocuments(uris: string[], prefix: string, formatter: Function, settings: any)
{
	let uri: string, path: string, newPath: string, doc: string;
	for (let i = 0; i < uris.length; i++) {
		uri = uris[i];
		path = URI.parse(uri).fsPath;
		newPath = prefixFile(path, prefix);
		doc = documents.get(uri)!.getText();
		if (!doc) {
			connection.window.showWarningMessage(
				`MaxScript minify: Failed at ${Path.basename(path)}. Reason: Can't read the file`
			);
			continue;
		}
		try {
			await formatter(doc, newPath, settings);

			connection.window.showInformationMessage(
				`MaxScript minify: Document saved as ${Path.basename(newPath)}`
			);
		} catch (e: any) {
			connection.window.showErrorMessage(
				`MaxScript minify: Failed at ${Path.basename(path)}. Reason: ${e.message}`
			);
		}
	}
}
async function minifyFiles(uris: string[], prefix: string, formatter: Function, settings: any)
{
	let uri: string, path: string, newPath: string;
	for (let i = 0; i < uris.length; i++) {
		uri = uris[i];
		path = URI.parse(uri).fsPath;
		newPath = prefixFile(path, prefix);

		try {
			await formatter(uri, newPath, settings);

			connection.window.showInformationMessage(
				`MaxScript minify: Document saved as ${Path.basename(newPath)}`
			);
		} catch (e: any) {
			connection.window.showErrorMessage(
				`MaxScript minify: Failed at ${Path.basename(path)}. Reason: ${e.message}`
			);
		}
	}
}
connection.onRequest(MinifyDocRequest.type, async params =>
{
	let settings = await getDocumentSettings(params.uri[0]) ?? defaultSettings;
	switch (params.command) {
		case 'mxs.minify':
			/*
			settings.parser.multiThreading
			? await minifyDocuments(params.uri, settings.MinifyFilePrefix, mxsMinifyThreaded.FormatDoc, mxsMinify.minifyOptions);
			: await minifyDocuments(params.uri, settings.MinifyFilePrefix, mxsMinify.FormatDoc, mxsMinify.minifyOptions);
			*/
			await minifyDocuments(params.uri, settings.MinifyFilePrefix, mxsFormatter.FormatDoc, mxsMinify.minifyOptions);

			break;
		case 'mxs.minify.file':
			/*
			settings.parser.multiThreading
			? await mxsMinifyThreaded.FormatFile(path, newPath, mxsMinify.minifyOptions)
			: await mxsMinify.FormatFile(path, newPath, mxsMinify.minifyOptions);
			*/
			await minifyDocuments(params.uri, settings.MinifyFilePrefix, mxsFormatter.FormatFile, mxsMinify.minifyOptions);
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
				`MaxScript prettifier: Failed at ${Path.basename(path)}. Reason: Can't read the file`
			);
			return;
		}
		try {
			let formattedData =
				// settings.parser.multiThreading
				// ? await mxsFormatter.FormatDataThreaded(doc.getText(), settings.prettifier)
				// : mxsFormatter.FormatData(doc.getText(), settings.prettifier);
				mxsFormatter.FormatData(doc.getText(), settings.prettifier);

			let reply = await replaceText.call(connection, doc, formattedData)
			if (reply.applied) {
				connection.window.showInformationMessage(
					`MaxScript prettifier sucess: ${Path.basename(path)}`
				);
			}
			if (reply.failedChange) {
				connection.window.showWarningMessage(
					`MaxScript prettifier: Failed at ${Path.basename(path)}. Reason: ${reply.failureReason}`
				);
			}
		} catch (e: any) {
			connection.window.showErrorMessage(
				`MaxScript prettifier: Failed at ${Path.basename(path)}. Reason: ${e.message}`
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