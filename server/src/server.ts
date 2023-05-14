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
	SemanticTokensRegistrationType
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
import { DocumentSymbolProvider } from './mxsOutline';
import * as mxsMinifier from './mxsMin';
import * as mxsDefinitions from './mxsDefinitions';
import * as mxsSimpleFormatter from './mxsSimpleFormatter';
import * as mxsFormatter from './mxsFormatter';
import { mxsSemanticTokens } from './mxsSemantics';
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
let semanticTokensProvider: mxsSemanticTokens;
/**
 * mxsDocumentSymbolProvider. Intended to be consumed by the SymbolProviders and be persistent for the current editor
 */
let mxsDocumentSymbols: DocumentSymbolProvider;
//------------------------------------------------------------------------------------------
/**  Current documentSymbols: Store the current document Symbols for later use */
let currentDocumentSymbols: DocumentSymbol[] | SymbolInformation[] = [];
/**  Current document: Store the current document URI for later use */
let currentTextDocumentURI: string | undefined;
/** Store current parse tree for later use */
let currentDocumentParseTree: any | any[];
//------------------------------------------------------------------------------------------
/* Initialize the server */
connection.onInitialize((params, cancel, progress): Thenable<InitializeResult> | ResponseError<InitializeError> | InitializeResult =>
{
	progress.begin('Initializing MaxScript Server');
	Capabilities.initialize(params.capabilities);
	// Initialize semanticToken provider
	semanticTokensProvider = new mxsSemanticTokens(params.capabilities.textDocument!.semanticTokens!);
	// Initialize the symbols provider
	mxsDocumentSymbols = new DocumentSymbolProvider();
	/*
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

connection.onInitialized(() =>
{
	if (Capabilities.hasConfigurationCapability) {
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}

	// Semantic tokens
	if (Capabilities.hasDocumentSemanticTokensCapability) {
		const registrationOptions: SemanticTokensRegistrationOptions = {
			documentSelector: null,
			legend: semanticTokensProvider.legend!,
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
	if (Capabilities.hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
	*/
});
//------------------------------------------------------------------------------------------
/* Settings */
// let globalSettings: MaxScriptSettings = { ...defaultSettings };
let globalSettings: MaxScriptSettings = defaultSettings;
// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<MaxScriptSettings>> = new Map();
/*
async function getGlobalSettings()
{
	type KeysOfType<T, U> = { [k in keyof T]-?: T[k] extends U ? k : never }[keyof T];

	let src = await connection.workspace.getConfiguration({
		section: 'MaxScript'
	}) as MaxScriptSettings;

	Object.keys(globalSettings).forEach(key =>
	{
		let K = key as KeysOfType<MaxScriptSettings, boolean>
		// hasOwnProperty(src, key)
		if (src[K]) {
			if (typeof src[K] === 'object') {
				Object.assign(globalSettings[K], src[K]);
			} else {
				globalSettings[K] =  src[K];
			}
		}
	});
}
*/
function getDocumentSettings(resource: string)
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
function diagnoseDocument(document: TextDocument, diagnose: Diagnostic[])
{
	if (!Capabilities.hasDiagnosticCapability && !globalSettings.Diagnostics) { return; }
	// connection.console.log('We received a Diagnostic update event');
	connection.sendDiagnostics({ uri: document.uri, diagnostics: diagnose });
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
	documents.all().forEach(async (textDocument: TextDocument) =>
	{
		await getDocumentSettings(textDocument.uri)
	});
});

documents.onDidClose(change =>
{
	// Only keep settings for open documents
	documentSettings.delete(change.document.uri);
	currentTextDocumentURI = undefined;
	// Remove diagnostics for closed document 
	diagnoseDocument(change.document, []);
});

/*
documents.onDidChangeContent(
	change =>
	{
		diagnoseDocument(change.document, []);
	});
*/
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

// Document Range formatter - WIP
/*
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
/* Provide DocumentSymbols and diagnostics  */
connection.onDocumentSymbol((params, cancelation) =>
{
	return new Promise(resolve =>
	{
		// cancellation request
		cancelation.onCancellationRequested(/* async */() => resolve);
		// settings
		let threading = false;

		getDocumentSettings(params.textDocument.uri)
			.then(result =>
			{
				if (!result.GoToSymbol) { resolve; }
				mxsDocumentSymbols.options.recovery = result.parser.errorCheck;
				mxsDocumentSymbols.options.attemps = result.parser.errorLimit;
				// threading = result.parser.multiThreading;
			});

		let document = documents.get(params.textDocument.uri)!;
		let symbolsresult =
			threading
				? mxsDocumentSymbols.parseDocumentThreaded(document, connection)
				: mxsDocumentSymbols.parseDocument(document, connection);

		symbolsresult.then((result: any) =>
		{
			//-----------------------------------
			currentDocumentSymbols = result.symbols;
			// currentDocumentParseTree = result.cst;
			currentTextDocumentURI = params.textDocument.uri;
			//-----------------------------------
			diagnoseDocument(document, result.diagnostics);
			resolve(result.symbols);
		})
			.catch((error: any) =>
			{
				connection.window.showInformationMessage(`MaxScript symbols provider unhandled error:\n${error?.message}`);
				diagnoseDocument(document, []);
				resolve;
			});
	});

});

/* Completion Items */
connection.onCompletion(async params =>
{
	if (!(await getDocumentSettings(params.textDocument.uri)).Completions) { return; }
	// parser completions
	// outliner completions
	let SymbolDocumentsCompletion = currentDocumentSymbols ? mxsCompletion.provideSymbolCompletionItems(<DocumentSymbol[]>currentDocumentSymbols) : [];
	// database completions
	let DatabaseCompletion = mxsCompletion.provideCompletionItems(
		documents.get(params.textDocument.uri)!,
		params.position
	);
	return [...SymbolDocumentsCompletion, ...DatabaseCompletion];
});

/* Definition provider */
// method 1: regex match the file
// method 2: search the parse tree for a match
// method 2.1: implement Workspace capabilities

connection.onDefinition((params, cancellation) =>
{
	return new Promise(resolve =>
	{
		// cancellation request
		cancellation.onCancellationRequested(/* async */() => resolve);
		// settings
		getDocumentSettings(params.textDocument.uri)
			.then(result =>
			{
				if (!result.GoToDefinition) { resolve; }
			});
		mxsDefinitions.getDocumentDefinitions(
			documents.get(params.textDocument.uri)!,
			params.position,
			currentTextDocumentURI === params.textDocument.uri ? currentDocumentSymbols : undefined)
			.then(
				result => resolve(result),
				() => resolve)
			.catch(error =>
			{
				connection.console.log('MaxScript Definitions unhandled error: ' + error);
				resolve;
			})
	});
});
//------------------------------------------------------------------------------------------
/*  Provide semantic tokens */
connection.languages.semanticTokens.on(params =>
{
	const document = documents.get(params.textDocument.uri);
	return document !== undefined ? semanticTokensProvider.provideSemanticTokens(document) : { data: [] };
});
// TODO: Fix tokens update
connection.languages.semanticTokens.onDelta(params =>
{
	const document = documents.get(params.textDocument.uri);
	return document !== undefined ? semanticTokensProvider.provideDeltas(document, params.textDocument.uri) : { edits: [] };
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
connection.onRequest(MinifyDocRequest.type, async params =>
{
	let settings = await getDocumentSettings(params.uri[0]);

	if (params.command === 'mxs.minify'/*  || params.command === 'mxs.minify.file' */) {
		for (let i = 0; i < params.uri.length; i++) {
			let doc = documents.get(params.uri[i]);
			let path = URI.parse(params.uri[i]).fsPath;
			// let path = Path.normalize(params.uri[i]);
			let newPath = prefixFile(path, settings.MinifyFilePrefix);
			if (!doc) {
				connection.window.showWarningMessage(
					`MaxScript minify: Failed at ${Path.basename(path)}. Reason: Can't read the file`
				);
				continue;
			}
			try {
				if (settings.parser.multiThreading) {
					await mxsMinifier.MinifyDocThreaded(doc.getText(), newPath);
				} else {
					await mxsMinifier.MinifyDoc(doc.getText(), newPath);
				}
				connection.window.showInformationMessage(
					`MaxScript minify: Document saved as ${Path.basename(newPath)}`
				);
			} catch (err: any) {
				connection.window.showErrorMessage(
					`MaxScript minify: Failed at ${Path.basename(path)}. Reason: ${err.message}`
				);
			}
		}
	} else {
		for (let i = 0; i < params.uri.length; i++) {
			let path = URI.parse(params.uri[i]).fsPath;
			// let path = Path.normalize(params.uri[i]);
			let newPath = prefixFile(path, settings.MinifyFilePrefix);
			try {
				if (settings.parser.multiThreading) {
					await mxsMinifier.MinifyFileThreaded(path, newPath);
				} else {
					await mxsMinifier.MinifyFile(path, newPath);
				}
				connection.window.showInformationMessage(
					`MaxScript minify: Document saved as ${Path.basename(newPath)}`
				);
			} catch (err: any) {
				connection.window.showErrorMessage(
					`MaxScript minify: Failed at ${Path.basename(path)}. Reason: ${err.message}`
				);
			}
		}
	}
	return null;
});
/* Prettyfier */
connection.onRequest(PrettifyDocRequest.type, async params =>
{
	let settings = await getDocumentSettings(params.uri[0]);
	let opts = {
		elements: {
			useLineBreaks: settings.prettifier.list?.useLineBreaks || true
		},
		statements: {
			optionalWhitespace: settings.prettifier.statements?.optionalWhitespace || false
		},
		// TODO: expression.useWhiteSpace...
		codeblock: {
			newlineAtParens: settings.prettifier.codeblock?.newlineAtParens || true,
			newlineAllways: settings.prettifier.codeblock?.newlineAllways || true,
			spaced: settings.prettifier.codeblock?.spaced || true
		}
	};
	if (params.command === 'mxs.prettify') {
		for (let i = 0; i < params.uri.length; i++) {
			let doc = documents.get(params.uri[i]);
			let path = URI.parse(params.uri[i]).fsPath;
			// let path = params.uri[i];
			if (!doc) {
				connection.window.showWarningMessage(
					`MaxScript prettifier: Failed at ${Path.basename(path)}. Reason: Can't read the file`
				);
				continue;
			}
			try {
				let reply = await replaceText.call(
					connection,
					doc,
					settings.parser.multiThreading ? await mxsFormatter.FormatDataThreaded(doc.getText(), opts) : mxsFormatter.FormatData(doc.getText(), opts)
				);
				if (reply.applied) {
					connection.window.showInformationMessage(
						`MaxScript prettifier sucess: ${Path.basename(path)}`
					);
				} else {
					connection.window.showWarningMessage(
						`MaxScript prettifier: Failed at ${Path.basename(path)}. Reason: ${reply.failureReason}`
					);
				}
			} catch (err: any) {
				connection.window.showErrorMessage(
					`MaxScript prettifier: Failed at ${Path.basename(path)}. Reason: ${err.message}`
				);
				// throw err;
			}
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