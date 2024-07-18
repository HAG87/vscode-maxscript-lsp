import { ExtensionContext } from "vscode";
import { ExtensionHost } from "./ExtensionHost";

let extensionHost: ExtensionHost;

export const activate = (context: ExtensionContext): void => {
    extensionHost = new ExtensionHost(context);
}