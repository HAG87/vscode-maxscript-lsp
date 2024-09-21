import { writeFile } from 'fs/promises';
import { basename } from 'path';
import {
  commands, ConfigurationChangeEvent, ExtensionContext, languages,
  ProgressLocation, Range, TextDocument, TextDocumentChangeEvent,
  TextEditorEdit, Uri, window, workspace,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import { mxsCompletionProvider } from './CompletionItemProvider.js';
import { mxsDefinitionProvider } from './DefinitionProvider.js';
import { diagnosticAdapter } from './Diagnostics.js';
import { mxsRangeFormattingProvider } from './FormattingProvider.js';
import { mxsHoverProvider } from './HoverProvider.js';
import { mxsReferenceProvider } from './ReferenceProvider.js';
import { mxsRenameProvider } from './RenameProvider.js';
import {
  mxsSemanticTokensProvider, mxsSemtoTokensLegend,
} from './SemanticTokensProvider.js';
import {
  defaultSettings, minifySettings, prettifyOptions,
} from './settings.js';
import { mxsSymbolProvider } from './SymbolProvider.js';
import { ICodeFormatSettings } from './types.js';
import { Utilities } from './utils.js';

//TODO: settings - references (workspace symbols semtokens, references and completions)

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

        // load settings
        const savedSettings = workspace.getConfiguration('maxScript')
        Object.assign(defaultSettings, savedSettings)
        Object.assign(minifySettings, savedSettings.get('minifier'))
        Object.assign(prettifyOptions, savedSettings.get('prettifier'))

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
                console.log('preload')
                this.backend.loadDocument(document.uri.toString(), document.getText())
                this.diagnosticCollection.set(
                    document.uri,
                    diagnosticAdapter(this.backend.getDiagnostics(document.uri.toString()))
                )
            }
        }
        // */
        //register eventHandlers
        this.registerEventHandlers(ctx)
        // register providers
        this.registerProviders(ctx)
        // register commands
        this.registerCommands(ctx)
    }

    //register eventHandlers
    private registerEventHandlers(ctx: ExtensionContext): void
    {
        ctx.subscriptions.push(
            workspace.onDidOpenTextDocument((document: TextDocument) =>
            {
                if (Utilities.isLanguageFile(document)) {
                    this.backend.loadDocument(document.uri.toString(), document.getText())
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
            workspace.onDidChangeConfiguration((event: ConfigurationChangeEvent) => {
                if (event.affectsConfiguration("maxScript")) {
                    const savedSettings = workspace.getConfiguration('maxScript')
                    Object.assign(defaultSettings, savedSettings)
                    Object.assign(minifySettings, savedSettings.get('minifier'))
                    Object.assign(prettifyOptions, savedSettings.get('prettifier'))
                    //...
                }
            }),
            /*
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
                new mxsCompletionProvider(this.backend, defaultSettings),
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
                new mxsRangeFormattingProvider(
                    this.backend,
                    defaultSettings.formatter
                )
            )
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
                        for (const uri of uris) {
                            this.minifyFile(uri, true,
                                workspace.getConfiguration('MaxScript').get('minifier.filePrefix')
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
                                workspace.getConfiguration('MaxScript').get('minifier.filePrefix')
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
        const minResult = this.backend.minifyCode(uri.toString(), minifySettings, enhanced)
        // minify done, dispose context
        if (shouldUnload) {
            this.backend.unloadDocument(uri.toString())
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
        const prettyResult = this.backend.prettifyCode(uri.toString(), prettifyOptions)
        // done, dispose context
        if (shouldUnload) {
            this.backend.unloadDocument(uri.toString())
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