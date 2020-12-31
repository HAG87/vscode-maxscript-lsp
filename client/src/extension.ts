/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as path from 'path';
import
{
	commands,
	ExtensionContext,
	Uri,
	workspace,
	window,
} from 'vscode';

import
{
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
	RequestType
} from 'vscode-languageclient/node';
//------------------------------------------------------------------------------------------
let client: LanguageClient;
//------------------------------------------------------------------------------------------
export const MXS_DOC = {
	// scheme: 'file',
	// pattern: '*.{ms,mcr}'
	language: 'maxscript',
};
//------------------------------------------------------------------------------------------
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
	context.subscriptions.push(
		// MaxScript Help command
		commands.registerTextEditorCommand('mxs.help',
			async (editor) =>
			{
				let uri = Uri.parse(encodeURI(
					`${workspace.getConfiguration('maxscript').get('Help.Provider', 'http://help.autodesk.com/view/3DSMAX/2021/ENU/')
					}?query=${editor.document.getText(editor.selection)!
					}&cg=Scripting%20%26%20Customization`
				));
				await commands.executeCommand('vscode.open', uri);
			}),
		// minify commands
		commands.registerCommand('mxs.minify.files',
			async args =>
			{
				window.showOpenDialog({
					canSelectMany: true,
					filters: {
						'MaxScript': ['ms', 'mcr']
					}
				}).then(
					async uris =>
					{
						if (!uris) { return; }

						let params: MinifyDocParams = {
							command: 'mxs.minify.files',
							uri: uris?.map(x => client.code2ProtocolConverter.asUri(x))
						};
						await client.sendRequest(MinifyDocRequest.type, params);
					}
				);
			}),
		commands.registerCommand('mxs.minify',
			async () =>
			{
				let activeEditorUri = window.activeTextEditor?.document.uri;

				if (!activeEditorUri
					|| activeEditorUri.scheme !== 'file'
					|| window.activeTextEditor?.document.isDirty) {
					await window.showInformationMessage('MaxScript minify: Save your file first.');
					return;
				}
				let params: MinifyDocParams = {
					command: 'mxs.minify',
					uri: [client.code2ProtocolConverter.asUri(activeEditorUri)]
				};
				await client.sendRequest(MinifyDocRequest.type, params);
			}),
		commands.registerCommand('mxs.minify.file',
			async args =>
			{
				let params: MinifyDocParams = {
					command: 'mxs.minify.file',
					uri: [client.code2ProtocolConverter.asUri(args)]
				};
				await client.sendRequest(MinifyDocRequest.type, params);
			}),
		commands.registerCommand('mxs.prettify',
			async () =>
			{
				let activeEditorUri = window.activeTextEditor?.document.uri;

				if (!activeEditorUri
					|| activeEditorUri.scheme !== 'file'
					|| window.activeTextEditor?.document.isDirty) {
					await window.showInformationMessage('MaxScript prettifier: Save your file first.');
					return;
				}
				let params: PrettifyDocParams = {
					command: 'mxs.prettify',
					uri: [client.code2ProtocolConverter.asUri(activeEditorUri)]
				};
				await client.sendRequest(PrettifyDocRequest.type, params);
			})
	);
	//------------------------------------------------------------------------------------------
	// Start the client. This will also launch the server
	client.start();
}

export function deactivate()
{
	if (!client) { return undefined; }
	return client.stop();
}