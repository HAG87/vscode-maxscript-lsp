import { ExtensionContext, languages, TextDocument, TextDocumentChangeEvent, workspace } from 'vscode';
import { mxsBackend } from './backend/Backend.js';
import { Utilities } from './utils.js';
import { mxsSymbolProvider } from './SymbolProvider.js';

export class ExtensionHost
{
    private changeTimers = new Map<string, ReturnType<typeof setTimeout>>();

    public static readonly langSelector = { language: 'maxscript', scheme: 'file' }
    private readonly backend: mxsBackend;

    // diagnostics for the extension
    private readonly diagnosticCollection = languages.createDiagnosticCollection('maxscript');

    public constructor(ctx: ExtensionContext)
    {
        // start backend
        this.backend = new mxsBackend();

        //register eventHandlers
        this.registerEventHandlers(ctx);
        // register providers
        this.registerProviders(ctx);
        // register commands
        this.registerCommands(ctx);
    }

    //register eventHandlers
    private registerEventHandlers(ctx: ExtensionContext): void
    {
        ctx.subscriptions.push(
            workspace.onDidOpenTextDocument((document: TextDocument) =>
            {
                if (Utilities.isLanguageFile(document)) {
                    this.backend.loadDocument(document.uri);
                    // this.regenerateBackgroundData(document);
                }
            }),
            workspace.onDidCloseTextDocument((document: TextDocument) =>
            {
                if (Utilities.isLanguageFile(document)) {
                    this.backend.unloadDocument(document.uri);
                    // clear diagnostics for the document
                    // this.diagnosticCollection.set(document.uri, []);
                }
            }),
            workspace.onDidChangeTextDocument((event: TextDocumentChangeEvent) =>
            {
                // check for content changes
                if (event.contentChanges.length > 0 && Utilities.isLanguageFile(event.document)) {
                    this.backend.setText(event.document.uri, event.document.getText());

                    const fileName = event.document.fileName;
                    const timer = this.changeTimers.get(fileName);
                    if (timer) {
                        clearTimeout(timer);
                    }
                    this.changeTimers.set(fileName, setTimeout(() =>
                    {
                        this.changeTimers.delete(fileName);
                        this.backend.reparse(event.document.uri);

                        // this.processDiagnostic(event.document);
                        // this.codeLensProvider.refresh();
                    }, 300));
                }
            }),
            workspace.onDidSaveTextDocument((document: TextDocument) =>
            {
                if (Utilities.isLanguageFile(document)) {
                    const timer = this.changeTimers.get(document.fileName);
                    if (timer) {
                        clearTimeout(timer);
                    }
                    // use this method to update data, like the tree providers
                    // this.regenerateBackgroundData(document);
                }
            }),
            /*
            window.onDidChangeTextEditorSelection((event: TextEditorSelectionChangeEvent) => {
                if (FrontendUtils.isGrammarFile(event.textEditor.document)) {
                    // this.diagramProvider.update(event.textEditor);
                    // this.atnGraphProvider.update(event.textEditor, false);
                    this.actionsProvider.update(event.textEditor);
                }
            }),
           window.onDidChangeActiveTextEditor((textEditor: TextEditor | undefined) => {
                if (textEditor) {
                    FrontendUtils.updateVsCodeContext(this.backend, textEditor.document);
                    this.updateTreeProviders(textEditor.document);
                }
            }),
            workspace.onDidChangeConfiguration((event: ConfigurationChangeEvent) => {
                if (event.affectsConfiguration("antlr4")) {
                    const level = workspace.getConfiguration("antlr4").get<LogLevel>("log") ?? "none";
                    Log.updateLogLevel(level);
                }
            })
            */
        //    languages.onDidChangeDiagnostics(() => workspace
        );
    }
    // register providers
    private registerProviders(ctx: ExtensionContext): void
    {
        ctx.subscriptions.push(
            languages.registerDocumentSymbolProvider(
                ExtensionHost.langSelector,
                new mxsSymbolProvider(this.backend)
            ),
            // languages.
            //..
        );
    }
    // register commands
    private registerCommands(ctx: ExtensionContext): void
    {
        ctx.subscriptions.push(
            //..
        );
    }
}