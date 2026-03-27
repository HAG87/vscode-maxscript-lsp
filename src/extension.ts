import { ExtensionContext, tasks, window } from 'vscode';

import { ExtensionHost } from './ExtensionHost.js';
import { MaxScriptTaskProvider } from './tasks/MaxScriptTaskProvider.js';

// let extensionHost: ExtensionHost;
export const activate = (context: ExtensionContext): void => {
    console.log('[language-maxscript] activate() called');
    try {
        // extensionHost = new ExtensionHost(context);
        new ExtensionHost(context);
        context.subscriptions.push(
            tasks.registerTaskProvider(
                MaxScriptTaskProvider.taskType,
                new MaxScriptTaskProvider(),
            ),
        );
        console.log('[language-maxscript] ExtensionHost initialized');
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