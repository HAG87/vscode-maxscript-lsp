import { commands, Disposable, ExtensionContext, tasks, TextDocument, TextEditor, window, workspace } from 'vscode';

import { MaxScriptTaskProvider } from './tasks/MaxScriptTaskProvider';

const bootstrapCommandIds = [
    'mxs.help',
    'mxs.minify',
    'mxs.minify.files',
    'mxs.prettify',
    'mxs.prettify.files',
] as const;

let extensionHostPromise: Promise<void> | undefined;
let bootstrapCommandDisposables: Disposable[] = [];

function isMaxScriptDocument(document: TextDocument | undefined): boolean {
    if (!document || document.uri.scheme !== 'file') {
        return false;
    }

    if (document.languageId === 'maxscript') {
        return true;
    }

    const lowerPath = document.uri.fsPath.toLowerCase();
    return lowerPath.endsWith('.ms') || lowerPath.endsWith('.mcr');
}

function hasOpenMaxScriptDocument(): boolean {
    return workspace.textDocuments.some((document) => isMaxScriptDocument(document));
}

function disposeBootstrapCommands(): void {
    for (const disposable of bootstrapCommandDisposables) {
        disposable.dispose();
    }
    bootstrapCommandDisposables = [];
}

function registerBootstrapCommands(context: ExtensionContext): void {
    if (bootstrapCommandDisposables.length > 0) {
        return;
    }

    bootstrapCommandDisposables = bootstrapCommandIds.map((commandId) =>
        commands.registerCommand(commandId, async (...args: unknown[]) => {
            await ensureExtensionHost(context);
            return commands.executeCommand(commandId, ...args);
        })
    );

    context.subscriptions.push(...bootstrapCommandDisposables);
}

async function ensureExtensionHost(context: ExtensionContext): Promise<void> {
    if (!extensionHostPromise) {
        disposeBootstrapCommands();
        extensionHostPromise = (async () => {
            const modulePath = './ExtensionHost.cjs';
            const { ExtensionHost } = await import(modulePath);
            new ExtensionHost(context);
            console.log('[language-maxscript] ExtensionHost initialized');
        })();
    }

    try {
        await extensionHostPromise;
    } catch (error) {
        extensionHostPromise = undefined;
        registerBootstrapCommands(context);
        throw error;
    }
}

export const activate = async (context: ExtensionContext): Promise<void> => {
    console.log('[language-maxscript] activate() called');
    try {
        registerBootstrapCommands(context);
        context.subscriptions.push(
            tasks.registerTaskProvider(
                MaxScriptTaskProvider.taskType,
                new MaxScriptTaskProvider(),
            ),
            workspace.onDidOpenTextDocument((document) => {
                if (isMaxScriptDocument(document)) {
                    void ensureExtensionHost(context);
                }
            }),
            window.onDidChangeActiveTextEditor((editor: TextEditor | undefined) => {
                if (isMaxScriptDocument(editor?.document)) {
                    void ensureExtensionHost(context);
                }
            }),
        );

        if (hasOpenMaxScriptDocument()) {
            await ensureExtensionHost(context);
        }
    } catch (error) {
        console.error('[language-maxscript] Activation failed:', error);
        const message = error instanceof Error ? error.message : String(error);
        void window.showErrorMessage(`language-maxscript activation failed: ${message}`);
        throw error;
    }
}

export const deactivate = () => {
    // fsw.dispose();
}