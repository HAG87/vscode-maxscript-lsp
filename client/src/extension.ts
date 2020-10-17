/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as path from 'path';
import
{
	commands,
	ExtensionContext,
	languages,
	workspace,
	window,
} from 'vscode';

import
{
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';
import * as Path from 'path';
//------------------------------------------------------------------------------------------
import { mxsDocumentSemanticTokensProvider, legend } from './mxsSemantics';
import mxsHelp from './mxsHelp';
//------------------------------------------------------------------------------------------
let client: LanguageClient;
//------------------------------------------------------------------------------------------
export const MXS_DOC = {
	// scheme: 'file',
	language: 'maxscript',
	// pattern: '*.{ms,mcr}'
};
//------------------------------------------------------------------------------------------

export function activate(context: ExtensionContext)
{
	// The server is implemented in node
	let serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};
	//------------------------------------------------------------------------------------------
	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [MXS_DOC],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'languageServerMaxScript',
		'Language Server MaxScript',
		serverOptions,
		clientOptions
	);
	//------------------------------------------------------------------------------------------
	// MaxScript Help command
	context.subscriptions.push( commands.registerTextEditorCommand('mxs.help', (textEditor) => { mxsHelp(textEditor); }) );
	context.subscriptions.push(
		commands.registerCommand('mxs.minify.files',
			async () =>
			{
				// get files...
				let files = await window.showOpenDialog({
					canSelectMany: true,
					filters: {
						'MaxScript': ['ms', 'mcr']
					}
				});
				if (files) {
					let filesPath = files.map(f => Path.normalize(f.fsPath));
					// execute file minifier
					await commands.executeCommand('mxs.minify.file', filesPath);
				} else {
					// no files
				}
			}
		)
	);
	//------------------------------------------------------------------------------------------
	// FEATURES IMPLEMENTED IN CLIENT...
	let mxsConfig = (workspace.getConfiguration('maxscript'));

	// semantics
	if (mxsConfig.get('Language.Semantics', true)) {
		context.subscriptions.push(
			languages.registerDocumentSemanticTokensProvider(
				MXS_DOC.language!,
				new mxsDocumentSemanticTokensProvider(),
				legend
			));
	}
	//------------------------------------------------------------------------------------------
	// Start the client. This will also launch the server
	client.start();
}

export function deactivate(): Thenable<void> | undefined
{
	if (!client) {
		return undefined;
	}
	return client.stop();
}