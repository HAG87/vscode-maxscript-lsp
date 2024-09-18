import { ExtensionContext } from 'vscode';

import { ExtensionHost } from './ExtensionHost.js';

let extensionHost: ExtensionHost;

export const activate = (context: ExtensionContext): void => {
    extensionHost = new ExtensionHost(context);
}