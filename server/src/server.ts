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
//------------------------------------------------------------------------------------------
import { MaxScriptSettings, defaultSettings } from './settings';
import { mxsCapabilities } from './capabilities';
//------------------------------------------------------------------------------------------
import * as utils from './lib/utils';
import { replaceText } from './lib/workspaceEdits';
import * as mxsCompletion from './mxsCompletions';
import { mxsDocumentSymbols } from './mxsOutline';
import * as mxsMinifier from './mxsMin';
import * as mxsPretty from './mxsRebuild';
import * as mxsDefinitions from './mxsDefinitions';
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
// Current document
/* Store the current document Symbols for later use*/
let currentDocumentSymbols: DocumentSymbol[] | SymbolInformation[] = [];
let currentTextDocument: TextDocument;
let semanticTokensProvider: mxsSemanticTokens;
//------------------------------------------------------------------------------------------
connection.onInitialize(
	(params, cancel, progress): Thenable<InitializeResult> | ResponseError<InitializeError> | InitializeResult =>
	{
		progress.begin('Initializing MaxScript Server');
		Capabilities.initialize(params.capabilities);

		semanticTokensProvider = new mxsSemanticTokens(params.capabilities.textDocument!.semanticTokens!);
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
			setTimeout(() =>
			{
				resolve(result);
			}, 50);
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
			legend: semanticTokensProvider.legend!,
			range: false,
			full: {
				delta: true
			}
		};
		connection.client.register(SemanticTokensRegistrationType.type, registrationOptions);
	}

	/*
	if (Capabilities.hasWorkspaceFolderCapability) {
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
// TODO: Remove diagnoses for closed files
function diagnoseDocument(document: TextDocument, diagnose: Diagnostic[])
{
	if (!Capabilities.hasDiagnosticCapability && !globalSettings.Diagnostics) { return; }
	// connection.console.log('We received a Diagnostic update event');
	connection.sendDiagnostics({ uri: document.uri, diagnostics: diagnose });
}

async function validateDocument(textDocument: TextDocument)
{
	// revalidate settings
	await getDocumentSettings(textDocument.uri);
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

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
/*
documents.onDidChangeContent(
	change =>
	{
		diagnoseDocument(change.document, []);
	});
*/
// Only keep settings for open documents
// documents.
documents.onDidClose(change =>
{
	documentSettings.delete(change.document.uri);
	diagnoseDocument(change.document, []);
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
connection.onDocumentFormatting(async params =>
{
	/* let options: FormattingOptions = {
		tabSize: 5,
		insertSpaces: false,
		insertFinalNewline: true,
		trimTrailingWhitespace: true,
		trimFinalNewlines : true
	}; */

	let document = documents.get(params.textDocument.uri)!;
	let formatterSettings = {
		indentOnly: globalSettings.formatter.indentOnly,
		indentChar: '\t',
		whitespaceChar: ' '
	};
	try {
		return await mxsFormatter.SimpleDocumentFormatter(document, formatterSettings);
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
connection.onDocumentSymbol((params, cancelation) =>
{
	/*
	currentDocumentSymbols = await parseDocument(document, cancelation);
	return currentDocumentSymbols;
	*/
	return new Promise<SymbolInformation[] | DocumentSymbol[]>((resolve, reject) =>
	{
		let options = { recovery: true, attemps: 10, memoryLimit: 0.9 };
		getDocumentSettings(params.textDocument.uri)
			.then(
				result =>
				{
					options.recovery = result.parser.errorCheck;
					if (!result.GoToSymbol) { resolve([]); }
				}
			);

		let document = documents.get(params.textDocument.uri)!;
		// console.log('Current symbols: ' + params.textDocument.uri);
		mxsDocumentSymbols.parseDocument(document, cancelation, connection, options)
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
				}
			)
			.catch(
				error =>
				{
					connection.window.showInformationMessage('MaxScript symbols provider fail: ' + error.message);
					diagnoseDocument(document, []);
					resolve([]);
				}
			);
	});

});
// This handler provides the initial list of the completion items.
connection.onCompletion(async params =>
{
	let settings = await getDocumentSettings(params.textDocument.uri);
	if (!settings.Completions) { return; }

	return mxsCompletion.provideCompletionItems(
		documents.get(params.textDocument.uri)!,
		params.position
	);
});
// This handler provides Definition results
// unhandled: Error defaults to no results 
connection.onDefinition(async (params, cancellation) =>
{

	let settings = await getDocumentSettings(params.textDocument.uri);
	if (!settings.GoToDefinition) { return; }

	// method 1: regex match the file
	// method 2: search the parse tree for a match
	// method 2.1: implement Workspace capabilities

	try {
		return await mxsDefinitions.getDocumentDefinitions(
			documents.get(params.textDocument.uri)!,
			params.position,
			cancellation,
			params.textDocument.uri === currentTextDocument.uri ? currentDocumentSymbols : undefined,
			// mxsDocumentSymbols.msxParser.parsedCST
		);
	} catch (err) {
		connection.console.log('MaxScript Definitions unhandled error: ' + err.message);
		return [];
	}
});
//------------------------------------------------------------------------------------------
connection.languages.semanticTokens.on((params) =>
{
	const document = documents.get(params.textDocument.uri);
	if (document === undefined) {
		return { data: [] };
	}
	return semanticTokensProvider.provideSemanticTokens(document);
});

connection.languages.semanticTokens.onDelta((params) => {
	const document = documents.get(params.textDocument.uri);
	if (document === undefined) {
		return { edits: [] };
	}
	return semanticTokensProvider.provideDeltas(document, params.textDocument.uri);
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
connection.onRequest(MinifyDocRequest.type, async params =>
{
	let settings = await getDocumentSettings(params.uri[0]);

	if (params.command === 'mxs.minify' || params.command === 'mxs.minify.file') {
		for (let i = 0; i < params.uri.length; i++) {
			let uri = params.uri[i];
			let path = utils.uriToPath(uri)!;
			let newPath = utils.prefixFile(path, settings.MinifyFilePrefix);
			let doc = documents.get(uri);
			if (!doc) {
				connection.window.showInformationMessage(
					`MaxScript minify: Failed at ${Path.basename(path)}. Reason: Can't read the file`
				);
				continue;
			}
			try {
				await mxsMinifier.MinifyDoc(doc.getText(), newPath);
				connection.window.showInformationMessage(
					`MaxScript minify: Document saved as ${Path.basename(newPath)}`
				);
			} catch (err) {
				connection.window.showErrorMessage(
					`MaxScript minify: Failed at ${Path.basename(newPath)}. Reason: ${err.message}`
				);
			}
		}
	} else {
		for (let i = 0; i < params.uri.length; i++) {
			let uri = params.uri[i];
			let path = utils.uriToPath(uri)!;
			let newPath = utils.prefixFile(path, settings.MinifyFilePrefix);
			try {
				await mxsMinifier.MinifyFile(path, newPath);
				connection.window.showInformationMessage(
					`MaxScript minify: Document saved as ${Path.basename(newPath)}`);
			} catch (err) {
				connection.window.showErrorMessage(
					`MaxScript minify: Failed at ${Path.basename(newPath)}. Reason: ${err.message}`
				);
			}
		}
	}
	return null;
});
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
		codeblock: {
			newlineAtParens: settings.prettifier.codeblock?.newlineAtParens || true,
			newlineAllways: settings.prettifier.codeblock?.newlineAllways || true,
			spaced: settings.prettifier.codeblock?.spaced || true
		}
	};
	if (params.command === 'mxs.prettify') {
		for (let i = 0; i < params.uri.length; i++) {
			let uri = params.uri[i];
			let doc = documents.get(uri);
			if (!doc) {
				connection.window.showInformationMessage(
					`MaxScript prettifier: Failed at ${Path.basename(utils.uriToPath(uri)!)}. Reason: Can't read the file`
				);
				continue;
			}
			try {
				let res = await mxsPretty.prettyData(doc.getText(), opts);
				let reply = await replaceText.call(connection, doc, res);

				if (reply.applied) {
					connection.window.showInformationMessage(
						`MaxScript prettifier sucess: ${Path.basename(utils.uriToPath(uri)!)}`
					);
				} else {
					connection.window.showInformationMessage(
						`MaxScript prettifier: Failed at ${Path.basename(utils.uriToPath(uri)!)}. Reason: ${reply.failureReason}`
					);
				}
			} catch (err) {
				connection.window.showInformationMessage(
					`MaxScript prettifier: Failed at ${Path.basename(utils.uriToPath(uri)!)}. Reason: ${err.message}`
				);
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