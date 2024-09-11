import { commands, ExtensionContext, languages, ProgressLocation, TextDocument, TextDocumentChangeEvent, Uri, window, workspace } from 'vscode'
import { readFile, writeFile } from 'fs/promises';
import { basename } from 'path'
import { mxsBackend } from './backend/Backend.js'
import { Utilities } from './utils.js'
import { mxsSymbolProvider } from './SymbolProvider.js'
import { diagnosticAdapter } from './Diagnostics.js'
import { mxsReferenceProvider } from './ReferenceProvider.js'
import { mxsDefinitionProvider } from './DefinitionProvider.js'
import { mxsRenameProvider } from './RenameProvider.js'
import { mxsHoverProvider } from './HoverProvider.js'
import { mxsCompletionProvider } from './CompletionItemProvider.js'
import { mxsRangeSemanticTokensProvider, mxsSemanticTokensProvider, mxsSemtoTokensLegend } from './SemanticTokensProvider.js'
import { mxsFormattingProvider, mxsRangeFormattingProvider } from './FormattingProvider.js'

export class ExtensionHost
{
    private changeTimers = new Map<string, ReturnType<typeof setTimeout>>();
    public static readonly langSelector = { language: 'maxscript', scheme: 'file' }
    private readonly backend: mxsBackend

    // diagnostics for the extension
    private readonly diagnosticCollection = languages.createDiagnosticCollection('maxscript');

    public constructor(ctx: ExtensionContext)
    {
        // start backend
        this.backend = new mxsBackend()
        // process active open document, if any.
        const editor = window.activeTextEditor
        if (editor && Utilities.isLanguageFile(editor.document)) {
            const document = editor.document
            this.backend.loadDocument(document.uri.toString(), document.getText())
            // TODO:
            //  this.regenerateBackgroundData(document);
            this.diagnosticCollection.set(
                document.uri,
                diagnosticAdapter(this.backend.getDiagnostics(document.uri.toString()))
            )
        }
        //register eventHandlers
        this.registerEventHandlers(ctx)
        // register providers
        this.registerProviders(ctx)
        // register commands
        this.registerCommands(ctx)
        // TODO: Load interpreter + cache data for each open document, if there's any.
        /*
        for (const document of workspace.textDocuments) {
            this.processDiagnostic(document);
            //..
        }
        */
    }

    //register eventHandlers
    private registerEventHandlers(ctx: ExtensionContext): void
    {
        ctx.subscriptions.push(
            workspace.onDidOpenTextDocument((document: TextDocument) =>
            {
                if (Utilities.isLanguageFile(document)) {
                    this.backend.loadDocument(document.uri.toString(), document.getText())
                    //TODO:
                    // this.regenerateBackgroundData(document);
                    this.diagnosticCollection.set(
                        document.uri,
                        diagnosticAdapter(this.backend.getDiagnostics(document.uri.toString()))
                    )
                }
            }),
            workspace.onDidCloseTextDocument((document: TextDocument) =>
            {
                if (Utilities.isLanguageFile(document)) {
                    this.backend.unloadDocument(document.uri.toString())
                    // clear diagnostics for the document
                    this.diagnosticCollection.set(document.uri, [])
                }
            }),
            workspace.onDidChangeTextDocument((event: TextDocumentChangeEvent) =>
            {
                // check for content changes
                if (event.contentChanges.length > 0 && Utilities.isLanguageFile(event.document)) {
                    this.backend.setText(event.document.uri.toString(), event.document.getText())

                    const fileName = event.document.fileName
                    const timer = this.changeTimers.get(fileName)
                    if (timer) {
                        clearTimeout(timer)
                    }
                    this.changeTimers.set(fileName, setTimeout(() =>
                    {
                        this.changeTimers.delete(fileName)
                        this.backend.reparse(event.document.uri)
                        //TODO:
                        // this.processDiagnostic(event.document);
                        this.diagnosticCollection.set(
                            event.document.uri,
                            diagnosticAdapter(this.backend.getDiagnostics(event.document.uri.toString()))
                        )
                        //TODO:
                        // this.codeLensProvider.refresh();
                    }, 300))
                }
                // */
            }),
            workspace.onDidSaveTextDocument((document: TextDocument) =>
            {
                if (Utilities.isLanguageFile(document)) {
                    const timer = this.changeTimers.get(document.fileName)
                    if (timer) {
                        clearTimeout(timer)
                    }
                    //TODO:
                    // use this method to update data, like the tree providers
                    // this.regenerateBackgroundData(document);
                }
            }),
            /*
            //TODO:
            window.onDidChangeTextEditorSelection((event: TextEditorSelectionChangeEvent) => {
                if (FrontendUtils.isGrammarFile(event.textEditor.document)) {
                    this.actionsProvider.update(event.textEditor);
                }
            }),
            //TODO:
           window.onDidChangeActiveTextEditor((textEditor: TextEditor | undefined) => {
                if (textEditor) {
                    FrontendUtils.updateVsCodeContext(this.backend, textEditor.document);
                    this.updateTreeProviders(textEditor.document);
                }
            }),
            // */
            //TODO:
            /*
             workspace.onDidChangeConfiguration((event: ConfigurationChangeEvent) => {
                 if (event.affectsConfiguration("maxScript")) {
                     const config = workspace.getConfiguration("maxScript");
                     //...
                 }
             }),
             //TODO:
             languages.onDidChangeDiagnostics(() => workspace
             */
        )
    }
    // register providers
    private registerProviders(ctx: ExtensionContext): void
    {
        ctx.subscriptions.push(
            languages.registerDocumentSymbolProvider(
                ExtensionHost.langSelector,
                new mxsSymbolProvider(this.backend)
            ),
            languages.registerReferenceProvider(
                ExtensionHost.langSelector,
                new mxsReferenceProvider(this.backend)
            ),
            languages.registerDefinitionProvider(
                ExtensionHost.langSelector,
                new mxsDefinitionProvider(this.backend)
            ),
            languages.registerRenameProvider(
                ExtensionHost.langSelector,
                new mxsRenameProvider(this.backend)
            ),
            languages.registerHoverProvider(
                ExtensionHost.langSelector,
                new mxsHoverProvider(this.backend)
            ),
            languages.registerCompletionItemProvider(
                ExtensionHost.langSelector,
                new mxsCompletionProvider(this.backend),
                " ", ".", "="
            ),
            languages.registerDocumentSemanticTokensProvider(
                ExtensionHost.langSelector,
                new mxsSemanticTokensProvider(this.backend),
                mxsSemtoTokensLegend
            ),
            /*
            languages.registerDocumentRangeSemanticTokensProvider(
                ExtensionHost.langSelector,
                new mxsRangeSemanticTokensProvider(this.backend),
                mxsSemtoTokensLegend
            ),
            */
            /*
             languages.registerDocumentFormattingEditProvider(
                 ExtensionHost.langSelector,
                 new mxsFormattingProvider(this.backend)
             ),
             // */
            languages.registerDocumentRangeFormattingEditProvider(
                ExtensionHost.langSelector,
                new mxsRangeFormattingProvider(this.backend)
            )
            // languages.
            //...
        )
    }
    // register commands
    private registerCommands(ctx: ExtensionContext): void
    {
        ctx.subscriptions.push(
            commands.registerTextEditorCommand('mxs.help',
                async (editor) =>
                {
                    let word = editor.document.getText(editor.selection)

                    if (!word || /^\s*$/.test(word)) {
                        word = editor.document.getText(editor.document.getWordRangeAtPosition(editor.selection.active))
                    }

                    const uri = Uri.parse(encodeURI(
                        `${workspace.getConfiguration('MaxScript').get('help.provider')}?query=${word!}`
                    ))
                    await commands.executeCommand('vscode.open', uri)
                }),
            // minify commands
            /*
            function setOptions(settings?: Partial<reflowOptions>)
            {
                options.reset();
                if (settings) {
                    Object.assign(options, settings);
                }
            }
            */
            commands.registerCommand('mxs.minify',
                (uri) =>
                {
                    window.withProgress(
                        {
                            location: ProgressLocation.Window,
                            title: 'Minify open document',
                        },
                        async (_progress, _token) =>
                        {
                            if (!uri
                                || uri.scheme !== 'file'
                                || window.activeTextEditor?.document.isDirty) {
                                window.showInformationMessage('MaxScript minify: Save your file first.');
                                return;
                            }
                            return this.minifyFile(
                                uri,
                                false,
                                workspace.getConfiguration('MaxScript').get('minifier.filePrefix')
                            )
                        }
                    )
                }),
            commands.registerCommand('mxs.minify.file',
                (uri: Uri) =>
                {
                    // this.minifyFile(uri)
                    window.withProgress(
                        {
                            location: ProgressLocation.Window,
                            title: 'Minify file',
                        },
                        (_progress, _token) =>
                        {
                            return this.minifyFile(uri, true,
                                workspace.getConfiguration('MaxScript').get('minifier.filePrefix')
                            )
                        }
                    )
                }
            ),
            commands.registerCommand('mxs.minify.files', async () =>
            {
                window.showOpenDialog({
                    canSelectMany: true,
                    filters: {
                        'MaxScript': ['ms', 'mcr']
                    }
                }).then(
                    async (uris: Uri[] | undefined) =>
                    {
                        if (!uris) { return; }
                        for (let uri of uris) {
                            this.minifyFile(uri, true,
                                workspace.getConfiguration('MaxScript').get('minifier.filePrefix')
                            )
                        }
                    }
                )
            }),
            //..
            /*           
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
            */
        )
    }

    private minifyFile(uri: Uri, shouldUnload: boolean = false, prefix: string = 'min_')
    {
        return new Promise<void>((resolve, reject) =>
        {
            // minify
            const minResult = this.backend.minifyCode(uri.toString())
            // minify done, dispose context
            if (shouldUnload) {
                this.backend.unloadDocument(uri.toString())
            }
            // result ok
            if (minResult) {
                //save file
                const filename = Utilities.prefixFile(uri.fsPath, prefix)
                writeFile(filename, minResult)
                    .then(
                        () =>
                        {
                            window.showInformationMessage(`MaxScript minify: Document saved as ${basename(filename)}`)
                            resolve()
                        },
                        (reason) =>
                        {
                            window.showErrorMessage(`MaxScript minify: Failed at ${basename(uri.fsPath)}. Reason: ${reason}`)
                            reject()
                        }
                    )
            } else {
                window.showErrorMessage(`MaxScript minify: Failed at ${basename(uri.fsPath)}. Unable to parse the code`)
                reject()
            }
        });
    }
}