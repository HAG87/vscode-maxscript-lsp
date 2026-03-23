import { ExtensionContext, window } from 'vscode';

import { ExtensionHost } from './ExtensionHost.js';

// let extensionHost: ExtensionHost;
export const activate = (context: ExtensionContext): void => {
    console.log('[language-maxscript] activate() called');
    try {
        // extensionHost = new ExtensionHost(context);
        new ExtensionHost(context);
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