import { writeFile } from 'fs/promises';
import { basename } from 'path';
import {
  commands, ConfigurationChangeEvent, DiagnosticChangeEvent, ExtensionContext,
  FileSystemWatcher, languages, ProgressLocation, Range,
  TextDocument, TextDocumentChangeEvent, TextEditorEdit, Uri,
  window, workspace,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import { mxsCodeLensProvider } from './CodeLensProvider.js';
import { mxsCompletionProvider } from './CompletionItemProvider.js';
import { mxsDefinitionProvider } from './DefinitionProvider.js';
import { mxsDocumentHighlightProvider } from './DocumentHighlightProvider.js';
import { diagnosticAdapter } from './Diagnostics.js';
import { mxsRangeFormattingProvider } from './FormattingProvider.js';
import { mxsHoverProvider } from './HoverProvider.js';
import { mxsReferenceProvider } from './ReferenceProvider.js';
import { mxsRenameProvider } from './RenameProvider.js';
import { mxsSignatureHelpProvider } from './SignatureHelpProvider.js';
import {
    mxsRangeSemanticTokensProvider, mxsSemanticTokensProvider, mxsSemtoTokensLegend,
} from './SemanticTokensProvider.js';
import {
  defaultSettings, minifySettings, prettifySettings,
} from './settings.js';
import { mxsSymbolProvider } from './SymbolProvider.js';
import { Utilities } from './utils.js';
import { mxsWorkspaceSymbolProvider } from './WorkspaceSymbolProvider.js';

// import { ICodeFormatSettings } from './types.js';

export class ExtensionHost
{
    private changeTimers = new Map<string, ReturnType<typeof setTimeout>>();
    public static readonly langSelector = { language: 'maxscript', scheme: 'file' }
    private readonly backend: mxsBackend
    //----------------------------------------------------------------
    // this will hold a global collection of workspace symbols, provided in a simple manner,
    // these symbols does not hold much info, and does not follow code scopes
    private workspaceSymbolProvider: mxsWorkspaceSymbolProvider
    // Semantic tokens provider - need reference for refresh notifications
    private semanticTokensProvider!: mxsSemanticTokensProvider
    // CodeLens provider - need reference for refresh notifications
    private codeLensProvider!: mxsCodeLensProvider
    // Coalesce provider refreshes to avoid duplicate UI updates in the same tick.
    private providersRefreshScheduled: boolean = false
    // diagnostics for the extension
    private readonly diagnosticCollection = languages.createDiagnosticCollection('maxscript');
    //----------------------------------------------------------------
    public updateProviders(uri: string)
    {
        this.workspaceSymbolProvider.updateWorkspaceSymbols(uri)
    }

    private scheduleProvidersRefresh(): void
    {
        if (this.providersRefreshScheduled) {
            return
        }

        this.providersRefreshScheduled = true
        queueMicrotask(() =>
        {
            this.providersRefreshScheduled = false
            if (this.semanticTokensProvider) {
                this.semanticTokensProvider.refresh()
            }
            if (this.codeLensProvider) {
                this.codeLensProvider.refresh()
            }
        })
    }
    //----------------------------------------------------------------
    public constructor(ctx: ExtensionContext)
    {
        // start backend
        this.backend = new mxsBackend()
        // load settings
        const savedSettings = workspace.getConfiguration('maxScript')
        Object.assign(defaultSettings, savedSettings.get('formatter'))
        Object.assign(defaultSettings, savedSettings.get('completions'))
        Object.assign(minifySettings, savedSettings.get('minifier'))
        Object.assign(prettifySettings, savedSettings.get('prettifier'))
        // process active open document, if any.
        /*
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
        // */
        // Pre-load interpreter + cache data for each open document, if there's any.
        // /*
        for (const document of workspace.textDocuments) {
            if (Utilities.isLanguageFile(document)) {
                try {
                    this.backend.getContext(document.uri.toString(), document.getText())
                    this.diagnosticCollection.set(
                        document.uri,
                        diagnosticAdapter(this.backend.getContext(document.uri.toString())?.getDiagnostics)
                    )
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error)
                    console.error(`[language-maxscript] Failed to initialize context for ${document.uri.toString()}:`, error)
                    void window.showErrorMessage(`MaxScript parser initialization failed for ${basename(document.fileName)}: ${message}`)
                }
            }
        }
        // */
        // workspace symbols
        this.workspaceSymbolProvider = new mxsWorkspaceSymbolProvider(this.backend)
        //register eventHandlers
        this.registerEventHandlers(ctx)
        // register providers
        this.registerProviders(ctx)
        // register commands
        this.registerCommands(ctx)
        // watch files
        // this.registerFileWatcher(ctx)
    }

    // watch files for changes and update providers
    private registerFileWatcher(ctx: ExtensionContext): void
    {
        const watchFiles = workspace.createFileSystemWatcher('**/*.{ms,mcr}')
        watchFiles.onDidChange((uri) =>
        {
            this.updateProviders(uri.toString());
        })
        ctx.subscriptions.push(watchFiles)
    }
    
    //register eventHandlers
    private registerEventHandlers(ctx: ExtensionContext): void
    {
        ctx.subscriptions.push(
            workspace.onDidOpenTextDocument((document: TextDocument) =>
            {
                if (Utilities.isLanguageFile(document)) {
                    this.backend.getContext(document.uri.toString(), document.getText())
                    this.diagnosticCollection.set(
                        document.uri,
                        diagnosticAdapter(this.backend.getContext(document.uri.toString())?.getDiagnostics)
                    )
                }
            }),
            workspace.onDidCloseTextDocument((document: TextDocument) =>
            {
                if (Utilities.isLanguageFile(document)) {
                    this.backend.releaseContext(document.uri.toString())
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
                    
                    // Get reparse delay from settings, default to 300ms
                    const config = workspace.getConfiguration('maxscript');
                    const reparseDelay = config.get<number>('parser.reparseDelay', 300);
                    
                    this.changeTimers.set(fileName, setTimeout(() =>
                    {
                        this.changeTimers.delete(fileName)
                        
                        // Clear diagnostics before reparsing to ensure stale errors are removed
                        this.diagnosticCollection.delete(event.document.uri);
                        
                        // Reparse the document
                        this.backend.reparse(event.document.uri)
                        
                        // Get fresh diagnostics after reparse
                        const context = this.backend.getContext(event.document.uri.toString());
                        const diagnostics = context?.getDiagnostics ?? [];
                        
                        this.diagnosticCollection.set(
                            event.document.uri,
                            diagnosticAdapter(diagnostics)
                        )
                        
                        // Refresh providers after reparse (coalesced).
                        this.scheduleProvidersRefresh()
                        // this.updateProviders(event.document.uri.toString())
                    }, reparseDelay))
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
                    // use this method to update data
                    this.updateProviders(document.uri.toString())
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
            workspace.onDidChangeConfiguration((event: ConfigurationChangeEvent) =>
            {
                // console.log('Configuration changed, reloading')
                if (event.affectsConfiguration("maxScript")) {
                    const savedSettings = workspace.getConfiguration('maxScript')
                    Object.assign(defaultSettings, savedSettings.get('formatter'))
                    Object.assign(defaultSettings, savedSettings.get('completions'))
                    Object.assign(minifySettings, savedSettings.get('minifier'))
                    Object.assign(prettifySettings, savedSettings.get('prettifier'))
                    //...
                    // console.log(JSON.stringify(prettifyOptions))
                }
            }),
            /*
            //TODO: clean diagnostics
            languages.onDidChangeDiagnostics((event:DiagnosticChangeEvent) => {
                console.log(event.uris)
            }),
            //  */
        )
    }
    // register providers
    private registerProviders(ctx: ExtensionContext): void
    {
        ctx.subscriptions.push(
            // PASS
            languages.registerDocumentSymbolProvider(
                ExtensionHost.langSelector,
                new mxsSymbolProvider(this.backend)
            ),
            // PASS
            languages.registerReferenceProvider(
                ExtensionHost.langSelector,
                new mxsReferenceProvider(this.backend)
            ),
            // PASS
            languages.registerDefinitionProvider(
                ExtensionHost.langSelector,
                new mxsDefinitionProvider(this.backend)
            ),            
            // PASS
            languages.registerRenameProvider(
                ExtensionHost.langSelector,
                new mxsRenameProvider(this.backend)
            ),
            languages.registerDocumentHighlightProvider(
                ExtensionHost.langSelector,
                new mxsDocumentHighlightProvider(this.backend)
            ),
            languages.registerCompletionItemProvider(
                ExtensionHost.langSelector,
                new mxsCompletionProvider(this.backend, defaultSettings),
                " ", ".", "="
            ),
            languages.registerSignatureHelpProvider(
                ExtensionHost.langSelector,
                new mxsSignatureHelpProvider(this.backend),
                "(", ",", " "
            ),
            languages.registerDocumentSemanticTokensProvider(
                ExtensionHost.langSelector,
                this.semanticTokensProvider = new mxsSemanticTokensProvider(this.backend),
                mxsSemtoTokensLegend
            ),
            languages.registerDocumentRangeSemanticTokensProvider(
                ExtensionHost.langSelector,
                new mxsRangeSemanticTokensProvider(this.backend),
                mxsSemtoTokensLegend
            ),
            // PASS
            languages.registerHoverProvider(
                ExtensionHost.langSelector,
                new mxsHoverProvider(this.backend)
            ),
            
            languages.registerCodeLensProvider(
                ExtensionHost.langSelector,
                this.codeLensProvider = new mxsCodeLensProvider(this.backend)
            ),
            languages.registerDocumentRangeFormattingEditProvider(
                ExtensionHost.langSelector,
                new mxsRangeFormattingProvider(
                    this.backend,
                    defaultSettings.formatter
                )
            ),
            /*
             languages.registerDocumentFormattingEditProvider(
                 ExtensionHost.langSelector,
                 new mxsFormattingProvider(this.backend)
             ),
            */
            /*
            languages.registerWorkspaceSymbolProvider(
                this.workspaceSymbolProvider
            )
            // */
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
                        `${workspace.getConfiguration('maxScript').get('help.provider')}?query=${word!}`
                    ))
                    await commands.executeCommand('vscode.open', uri)
                }),
            // minify commands
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
                                minifySettings.filePrefix
                            )
                        }
                    )
                }),
            commands.registerCommand('mxs.minify.file',
                (uri: Uri) =>
                {
                    window.withProgress(
                        {
                            location: ProgressLocation.Window,
                            title: 'Minify file',
                        },
                        async (_progress, _token) =>
                        {
                            return this.minifyFile(uri, true,
                                minifySettings.filePrefix
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
                        for (const uri of uris) {
                            await this.minifyFile(uri, true,
                                minifySettings.filePrefix
                            )
                        }
                    }
                )
            }),
            commands.registerCommand('mxs.prettify',
                (uri) =>
                {
                    window.withProgress(
                        {
                            location: ProgressLocation.Window,
                            title: 'Prettify open document',
                        },
                        async (_progress, _token) =>
                        {
                            if (window.activeTextEditor) {
                                const editor = window.activeTextEditor
                                if (!uri
                                    || uri.scheme !== 'file'
                                    || window.activeTextEditor?.document.isDirty) {
                                    window.showInformationMessage('MaxScript prettifier: Save your file first.');
                                    return;
                                }
                                editor.edit((builder: TextEditorEdit) =>
                                {
                                    const text: string = editor.document.getText()!
                                    const range: Range = new Range(
                                        editor.document.positionAt(0)!,
                                        editor.document.positionAt(text.length)!
                                    );
                                    const prettyResult = this.prettifyDocument(uri, false)
                                    if (prettyResult) {
                                        builder.replace(range, prettyResult)
                                    }
                                })
                            }
                        }
                    )
                }),
            commands.registerCommand('mxs.prettify.file',
                (uri) =>
                {
                    window.withProgress(
                        {
                            location: ProgressLocation.Window,
                            title: 'Prettify file',
                        },
                        async (_progress, _token) =>
                        {
                            if (!uri
                                || uri.scheme !== 'file'
                                || window.activeTextEditor?.document.isDirty) {
                                window.showInformationMessage('MaxScript prettifier: Save your file first.');
                                return;
                            }
                            return this.prettifyFile(
                                uri,
                                false,
                                prettifySettings.filePrefix
                            )
                        }
                    )
                }),
            //...
        )
    }
    // commands support
    private minifyDocument(uri: Uri, shouldUnload: boolean = false, enhanced: boolean = false): string | null
    {
        // minify
        const minResult = this.backend.getContext(uri.toString())?.minifyCode(minifySettings, enhanced)
        // minify done, dispose context
        if (shouldUnload) {
            this.backend.releaseContext(uri.toString())
        }
        return minResult
    }

    private minifyFile(uri: Uri, shouldUnload: boolean = false, prefix: string = 'min_')
    {
        return new Promise<void>((resolve, reject) =>
        {
            const minResult = this.minifyDocument(uri, shouldUnload, false)
            // result ok
            if (minResult) {
                //save file
                const filename = Utilities.prefixFile(uri.fsPath, prefix)
                
                // console.log(prefix)

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
    private prettifyDocument(uri: Uri, shouldUnload: boolean = false): string | null
    {
        const prettyResult =
            this.backend.getContext(uri.toString())?.prettifyCode(prettifySettings)
        // done, dispose context
        if (shouldUnload) {
            this.backend.releaseContext(uri.toString())
        }
        return prettyResult
    }

    private prettifyFile(uri: Uri, shouldUnload: boolean = false, prefix: string = 'pretty_')
    {
        return new Promise<void>((resolve, reject) =>
        {
            const prettyResult = this.prettifyDocument(uri, shouldUnload)
            // result ok
            if (prettyResult) {
                //save file
                const filename = Utilities.prefixFile(uri.fsPath, prefix)
                writeFile(filename, prettyResult)
                    .then(
                        () =>
                        {
                            window.showInformationMessage(`MaxScript prettify: Document saved as ${basename(filename)}`)
                            resolve()
                        },
                        (reason) =>
                        {
                            window.showErrorMessage(`MaxScript prettify: Failed at ${basename(uri.fsPath)}. Reason: ${reason}`)
                            reject()
                        }
                    )
            } else {
                window.showErrorMessage(`MaxScript prettify: Failed at ${basename(uri.fsPath)}. Unable to parse the code`)
                reject()
            }
        });
    }
}