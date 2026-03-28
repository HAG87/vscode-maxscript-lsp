import { writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, isAbsolute, resolve } from 'path';
import { basename } from 'path';
import {
  commands, ConfigurationChangeEvent, ExtensionContext,
  FileSystemWatcher, languages, ProgressLocation, Range,
  TextDocument, TextDocumentChangeEvent, TextEditorEdit, Uri,
  window, workspace,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import { mxsCodeLensProvider } from './CodeLensProvider.js';
import { mxsCallHierarchyProvider } from './CallHierarchyProvider.js';
import { mxsCompletionProvider } from './CompletionItemProvider.js';
import { mxsDefinitionProvider } from './DefinitionProvider.js';
import { mxsDocumentHighlightProvider } from './DocumentHighlightProvider.js';
import { diagnosticAdapter } from './Diagnostics.js';
import { mxsFoldingRangeProvider } from './FoldingRangeProvider.js';
import { mxsFormattingProvider, mxsRangeFormattingProvider } from './FormattingProvider.js';
import { mxsHoverProvider } from './HoverProvider.js';
import { mxsLinkedEditingRangeProvider } from './LinkedEditingRangeProvider.js';
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
    private static readonly fileInLiteralPattern = /\bfilein\s*\(?\s*@?"([^"]+)"\s*\)?/ig;
    private changeTimers = new Map<string, ReturnType<typeof setTimeout>>();
    private runtimeDependencies = new Map<string, Set<string>>();
    private fileWatcher?: FileSystemWatcher
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

    private isTrackedWorkspaceScriptUri(uri: Uri): boolean
    {
        if (uri.scheme !== 'file') {
            return false
        }

        const lowerPath = uri.fsPath.toLowerCase()
        return lowerPath.endsWith('.ms') || lowerPath.endsWith('.mcr')
    }

    private findOpenDocument(uri: Uri): TextDocument | undefined
    {
        const target = uri.toString()
        return workspace.textDocuments.find((document) => document.uri.toString() === target)
    }

    private clearPendingReparse(uri: Uri): void
    {
        const timer = this.changeTimers.get(uri.fsPath)
        if (timer) {
            clearTimeout(timer)
            this.changeTimers.delete(uri.fsPath)
        }
    }

    private getOpenRuntimeDependencyOwners(targetUri: string): TextDocument[]
    {
        const owners: TextDocument[] = []
        for (const [sourceUri, deps] of this.runtimeDependencies.entries()) {
            if (!deps.has(targetUri)) {
                continue
            }

            const document = workspace.textDocuments.find((candidate) => candidate.uri.toString() === sourceUri)
            if (document && Utilities.isLanguageFile(document)) {
                owners.push(document)
            }
        }

        return owners
    }

    private ensureDocumentContext(document: TextDocument): void
    {
        const uri = document.uri.toString()
        const text = document.getText()

        this.backend.setLiveDocumentText(uri, text)
        const context = this.backend.getExistingContext(uri) ?? this.backend.acquireContext(uri, text)
        context.setText(text)
    }

    private refreshRuntimeDependencyOwners(targetUri: string): void
    {
        for (const owner of this.getOpenRuntimeDependencyOwners(targetUri)) {
            this.ensureDocumentContext(owner)
            this.reparseAndRefreshDocument(owner, true)
        }
    }

    private handleWatchedFileChange(uri: Uri): void
    {
        if (!this.isTrackedWorkspaceScriptUri(uri)) {
            return
        }

        if (this.findOpenDocument(uri)) {
            return
        }

        const uriString = uri.toString()
        this.updateProviders(uriString)

        const existingContext = this.backend.getExistingContext(uriString)
        if (existingContext) {
            const latestText = this.backend.getDocumentText(uriString)
            existingContext.setText(latestText)
            this.backend.reparse(uriString)
            this.reconcileRuntimeDependencies(uriString, latestText)
        }

        this.refreshRuntimeDependencyOwners(uriString)
        this.refreshOpenDocumentDiagnostics()
        this.scheduleProvidersRefresh()
    }

    private handleWatchedFileCreate(uri: Uri): void
    {
        if (!this.isTrackedWorkspaceScriptUri(uri)) {
            return
        }

        if (this.findOpenDocument(uri)) {
            return
        }

        this.updateProviders(uri.toString())
    }

    private handleWatchedFileDelete(uri: Uri): void
    {
        if (!this.isTrackedWorkspaceScriptUri(uri)) {
            return
        }

        this.clearPendingReparse(uri)

        if (this.findOpenDocument(uri)) {
            return
        }

        const uriString = uri.toString()
        const owners = this.getOpenRuntimeDependencyOwners(uriString)
        this.removeRuntimeDependencyGraphFor(uriString)
        this.updateProviders(uriString)

        for (const owner of owners) {
            this.ensureDocumentContext(owner)
            this.reparseAndRefreshDocument(owner, true)
        }

        this.refreshOpenDocumentDiagnostics()
        this.scheduleProvidersRefresh()
    }

    private handleWorkspaceFileDelete(uri: Uri): void
    {
        this.handleWatchedFileDelete(uri)
    }

    private handleWorkspaceFileRename(oldUri: Uri, newUri: Uri): void
    {
        const oldTracked = this.isTrackedWorkspaceScriptUri(oldUri)
        const newTracked = this.isTrackedWorkspaceScriptUri(newUri)

        if (!oldTracked && !newTracked) {
            return
        }

        this.clearPendingReparse(oldUri)
        this.clearPendingReparse(newUri)

        if (oldTracked) {
            this.handleWatchedFileDelete(oldUri)
        }

        if (newTracked) {
            this.handleWatchedFileCreate(newUri)

            const renamedDocument = this.findOpenDocument(newUri)
            if (renamedDocument && Utilities.isLanguageFile(renamedDocument)) {
                const uri = renamedDocument.uri.toString()
                this.ensureDocumentContext(renamedDocument)
                this.reconcileRuntimeDependencies(uri, renamedDocument.getText())
                this.refreshOpenDocumentDiagnostics()
                this.scheduleProvidersRefresh()
                this.updateProviders(uri)
            }
        }
    }

    private syncBackendTraceSettings(): void
    {
        const config = workspace.getConfiguration('maxScript')
        this.backend.updateTraceSettings({
            tracePerformance: config.get<boolean>('providers.tracePerformance', false),
            traceParserDecisions: config.get<boolean>('providers.traceParserDecisions', false),
            traceRouting: config.get<boolean>('providers.traceRouting', false),
        })
        this.backend.updateAstSettings({
            contextualSemanticTokens: config.get<boolean>('providers.contextualSemanticTokens', true),
        })
    }

    private resolveWorkspaceFileInUri(sourceUri: string, fileInTarget: string): string | undefined
    {
        const target = fileInTarget.trim();
        if (!target || target.startsWith('$')) {
            return undefined;
        }

        const sourceFsPath = Uri.parse(sourceUri).fsPath;
        const sourceDir = dirname(sourceFsPath);
        const resolvedPath = isAbsolute(target)
            ? target
            : resolve(sourceDir, target);

        if (!existsSync(resolvedPath)) {
            return undefined;
        }

        const uri = Uri.file(resolvedPath);
        if (!workspace.getWorkspaceFolder(uri)) {
            return undefined;
        }

        const lower = resolvedPath.toLowerCase();
        if (!lower.endsWith('.ms') && !lower.endsWith('.mcr')) {
            return undefined;
        }

        return uri.toString();
    }

    private collectRuntimeDependencyUris(sourceUri: string, sourceText: string): Set<string>
    {
        const uris = new Set<string>();
        ExtensionHost.fileInLiteralPattern.lastIndex = 0;

        let match: RegExpExecArray | null;
        while ((match = ExtensionHost.fileInLiteralPattern.exec(sourceText)) !== null) {
            const rawPath = match[1];
            const depUri = this.resolveWorkspaceFileInUri(sourceUri, rawPath);
            if (depUri && depUri !== sourceUri) {
                uris.add(depUri);
            }
        }

        return uris;
    }

    private reconcileRuntimeDependencies(sourceUri: string, sourceText: string): void
    {
        const current = this.collectRuntimeDependencyUris(sourceUri, sourceText);
        const previous = this.runtimeDependencies.get(sourceUri) ?? new Set<string>();

        const sourceEntry = this.backend.contexts.get(sourceUri);
        if (!sourceEntry) {
            this.runtimeDependencies.set(sourceUri, current);
            return;
        }

        for (const depUri of previous) {
            if (current.has(depUri)) {
                continue;
            }
            this.backend.releaseDependencyContext(sourceUri, depUri)
        }

        for (const depUri of current) {
            if (previous.has(depUri)) {
                continue;
            }
            const depContext = this.backend.acquireDependencyContext(sourceUri, depUri)
            sourceEntry.context.addAsReferenceTo(depContext);
        }

        this.runtimeDependencies.set(sourceUri, current);
        this.backend.setRuntimeDependencyTargets(sourceUri, current);
    }

    private removeRuntimeDependencyGraphFor(uri: string): void
    {
        const sourceEntry = this.backend.contexts.get(uri);
        const outgoing = this.runtimeDependencies.get(uri);
        if (sourceEntry && outgoing) {
            for (const depUri of outgoing) {
                this.backend.releaseDependencyContext(uri, depUri)
            }
        }
        this.runtimeDependencies.delete(uri);
        this.backend.removeRuntimeDependencyNode(uri);

        for (const [sourceUri, deps] of this.runtimeDependencies.entries()) {
            if (!deps.has(uri)) {
                continue;
            }

            this.backend.releaseDependencyContext(sourceUri, uri)
            deps.delete(uri);
            this.backend.setRuntimeDependencyTargets(sourceUri, deps);
        }
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

    private publishDiagnosticsForDocument(document: TextDocument): void
    {
        const uri = document.uri.toString()
        const context = this.backend.getExistingContext(uri)
        if (!context) {
            this.diagnosticCollection.delete(document.uri)
            return
        }

        const diagnostics = [
            ...context.getDiagnostics,
            ...this.backend.getWorkspaceGlobalAmbiguityDiagnostics(uri),
        ]

        this.diagnosticCollection.set(
            document.uri,
            diagnosticAdapter(diagnostics)
        )
    }

    private refreshOpenDocumentDiagnostics(): void
    {
        for (const document of workspace.textDocuments) {
            if (!Utilities.isLanguageFile(document)) {
                continue
            }

            this.publishDiagnosticsForDocument(document)
        }
    }

    private reparseAndRefreshDocument(document: TextDocument, updateWorkspaceSymbols: boolean = false): void
    {
        const uri = document.uri.toString()

        this.diagnosticCollection.delete(document.uri)
        this.backend.reparse(uri)
        this.reconcileRuntimeDependencies(uri, document.getText())
        this.refreshOpenDocumentDiagnostics()
        this.scheduleProvidersRefresh()

        if (updateWorkspaceSymbols) {
            this.updateProviders(uri)
        }
    }
    //----------------------------------------------------------------
    public constructor(ctx: ExtensionContext)
    {
        // start backend
        this.backend = new mxsBackend()
        this.syncBackendTraceSettings()
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
                    const uri = document.uri.toString()
                    this.ensureDocumentContext(document)
                    this.reconcileRuntimeDependencies(uri, document.getText())
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error)
                    console.error(`[language-maxscript] Failed to initialize context for ${document.uri.toString()}:`, error)
                    void window.showErrorMessage(`MaxScript parser initialization failed for ${basename(document.fileName)}: ${message}`)
                }
            }
        }
        // update diagnostics
        this.refreshOpenDocumentDiagnostics()
        // workspace symbols
        this.workspaceSymbolProvider = new mxsWorkspaceSymbolProvider(this.backend)
        //register eventHandlers
        this.registerEventHandlers(ctx)
        // register providers
        this.registerProviders(ctx)
        // register commands
        this.registerCommands(ctx)
        this.registerFileWatcher(ctx)
    }

    // watch files for changes and update providers
    private registerFileWatcher(ctx: ExtensionContext): void
    {
        this.fileWatcher = workspace.createFileSystemWatcher('**/*.{ms,mcr}')
        this.fileWatcher.onDidChange((uri) =>
        {
            this.handleWatchedFileChange(uri)
        })
        this.fileWatcher.onDidCreate((uri) =>
        {
            this.handleWatchedFileCreate(uri)
        })
        this.fileWatcher.onDidDelete((uri) =>
        {
            this.handleWatchedFileDelete(uri)
        })
        ctx.subscriptions.push(this.fileWatcher)
    }
    
    //register eventHandlers
    private registerEventHandlers(ctx: ExtensionContext): void
    {
        ctx.subscriptions.push(
            workspace.onDidOpenTextDocument((document: TextDocument) =>
            {
                if (Utilities.isLanguageFile(document)) {
                    const uri = document.uri.toString()
                    this.ensureDocumentContext(document)
                    this.reconcileRuntimeDependencies(document.uri.toString(), document.getText())
                    this.refreshOpenDocumentDiagnostics()
                }
            }),
            workspace.onDidCloseTextDocument((document: TextDocument) =>
            {
                if (Utilities.isLanguageFile(document)) {
                    this.backend.clearLiveDocumentText(document.uri.toString())
                    this.removeRuntimeDependencyGraphFor(document.uri.toString())
                    this.backend.releaseContext(document.uri.toString())
                    this.diagnosticCollection.delete(document.uri)
                    this.refreshOpenDocumentDiagnostics()
                }
            }),
            workspace.onDidChangeTextDocument((event: TextDocumentChangeEvent) =>
            {
                // check for content changes
                if (event.contentChanges.length > 0 && Utilities.isLanguageFile(event.document)) {
                    this.ensureDocumentContext(event.document)

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
                        this.reparseAndRefreshDocument(event.document)
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
                        this.changeTimers.delete(document.fileName)
                        this.reparseAndRefreshDocument(document, true)
                        return
                    }
                    //TODO:
                    // use this method to update data
                    this.updateProviders(document.uri.toString())
                }
            }),
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
                    this.syncBackendTraceSettings()
                    //...
                    // console.log(JSON.stringify(prettifyOptions))
                }
            }),
            workspace.onDidRenameFiles((event) => {
                for (const file of event.files) {
                    this.handleWorkspaceFileRename(file.oldUri, file.newUri)
                }
            }),
            workspace.onDidDeleteFiles((event) => {
                for (const file of event.files) {
                    this.handleWorkspaceFileDelete(file)
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
        // Always on Providers
        ctx.subscriptions.push(
            languages.registerDocumentSymbolProvider(
                ExtensionHost.langSelector,
                new mxsSymbolProvider(this.backend, defaultSettings)
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
            languages.registerDocumentRangeFormattingEditProvider(
                ExtensionHost.langSelector,
                new mxsRangeFormattingProvider(
                    this.backend,
                    defaultSettings.formatter
                )
            ),
            languages.registerDocumentFormattingEditProvider(
                ExtensionHost.langSelector,
                new mxsFormattingProvider(
                    this.backend,
                    prettifySettings)
            ),
        );
        // conditional Providers
        if (defaultSettings.providers.dataBaseCompletion || defaultSettings.providers.codeCompletion) {
            ctx.subscriptions.push(
                languages.registerCompletionItemProvider(
                    ExtensionHost.langSelector,
                    new mxsCompletionProvider(this.backend, defaultSettings),
                    " ", ".", "="
                )
            )
        }
        if (defaultSettings.providers.referenceProvider) {
            ctx.subscriptions.push(
                languages.registerReferenceProvider(
                    ExtensionHost.langSelector,
                    new mxsReferenceProvider(this.backend, defaultSettings)
                )
            )
        }
        if (defaultSettings.providers.definitionProvider) {
            ctx.subscriptions.push(
                languages.registerDefinitionProvider(
                    ExtensionHost.langSelector,
                    new mxsDefinitionProvider(this.backend, defaultSettings)
                )
            )
        }
        if (defaultSettings.providers.renameProvider) {
            ctx.subscriptions.push(
                languages.registerRenameProvider(
                    ExtensionHost.langSelector,
                    new mxsRenameProvider(this.backend, defaultSettings)
                )
            )
        }
        if (defaultSettings.providers.documentHighlightProvider) {
            ctx.subscriptions.push(
                languages.registerDocumentHighlightProvider(
                    ExtensionHost.langSelector,
                    new mxsDocumentHighlightProvider(this.backend, defaultSettings)
                )
            )
        }
        if (defaultSettings.providers.signatureHelpProvider) {
            ctx.subscriptions.push(
                languages.registerSignatureHelpProvider(
                    ExtensionHost.langSelector,
                    new mxsSignatureHelpProvider(this.backend, defaultSettings)
                )
            )
        }
        if (defaultSettings.providers.hoverProvider) {
            ctx.subscriptions.push(
                languages.registerHoverProvider(
                    ExtensionHost.langSelector,
                    new mxsHoverProvider(this.backend, defaultSettings)
                )
            )
        }
        if (defaultSettings.providers.linkedEditingRangeProvider) {
            ctx.subscriptions.push(
                languages.registerLinkedEditingRangeProvider(
                    ExtensionHost.langSelector,
                    new mxsLinkedEditingRangeProvider(this.backend, defaultSettings)
                )
            )
        }
        if (defaultSettings.providers.foldingRangeProvider) {
            ctx.subscriptions.push(
                languages.registerFoldingRangeProvider(
                    ExtensionHost.langSelector,
                    new mxsFoldingRangeProvider(this.backend, defaultSettings)
                )
            )
        }
        if (defaultSettings.providers.callHierarchyProvider) {
            ctx.subscriptions.push(
                languages.registerCallHierarchyProvider(
                    ExtensionHost.langSelector,
                    new mxsCallHierarchyProvider(this.backend, defaultSettings)
                )
            )
        }
        if (defaultSettings.providers.codelensProvider) {
            ctx.subscriptions.push(
                languages.registerCodeLensProvider(
                    ExtensionHost.langSelector,
                    new mxsCodeLensProvider(this.backend)
                )
            )
        }
        if (defaultSettings.providers.workspaceSymbolProvider) {
            ctx.subscriptions.push(
                languages.registerWorkspaceSymbolProvider(
                    this.workspaceSymbolProvider
                    // ExtensionHost.langSelector,
                    // new mxsWorkspaceSymbolProvider(this.backend)
                )
            )
        }
        //...
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
            commands.registerCommand('mxs.minify.files', async (uri?: Uri, selectedUris?: Uri[]) =>
            {
                await this.processFiles(this.minifyFile.bind(this), minifySettings.filePrefix || "", uri, selectedUris);
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
            /*
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
            */
            commands.registerCommand('mxs.prettify.files', async (uri?: Uri, selectedUris?: Uri[]) =>
            {
                await this.processFiles(this.prettifyFile.bind(this), prettifySettings.filePrefix || "", uri, selectedUris);
            }),
        )
    }
    // commands support
    private minifyDocument(uri: Uri, shouldUnload: boolean = false, enhanced: boolean = true): string | null
    {
        // minify
        const minResult = this.backend.acquireContext(uri.toString())?.minifyCode(minifySettings, enhanced)
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
            const minResult = this.minifyDocument(uri, shouldUnload, true)
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
            this.backend.acquireContext(uri.toString())?.prettifyCode(prettifySettings)
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
    private async processFiles(formatter:any, prefix: string, uri?: Uri, selectedUris?: Uri[] ): Promise<void>
    {
        const isMaxScriptFile = (candidate: Uri): boolean => {
            const lowerPath = candidate.fsPath.toLowerCase()
            return lowerPath.endsWith('.ms') || lowerPath.endsWith('.mcr')
        }

        const uniqueUris = new Map<string, Uri>()
        const incomingUris = selectedUris && selectedUris.length > 0
            ? selectedUris
            : (uri ? [uri] : [])

        for (const candidate of incomingUris) {
            if (!candidate || candidate.scheme !== 'file' || !isMaxScriptFile(candidate)) {
                continue
            }
            uniqueUris.set(candidate.toString(), candidate)
        }

        let uris = Array.from(uniqueUris.values())
        if (uris.length === 0) {
            uris = (await window.showOpenDialog({
                canSelectMany: true,
                filters: {
                    'MaxScript': ['ms', 'mcr']
                }
            })) ?? []
        }

        if (uris.length === 0) {
            return
        }

        for (const selectedUri of uris) {
            await formatter(selectedUri, true, prefix )
        }
    }
}