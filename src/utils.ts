import { TextDocument } from "vscode";
import { ExtensionHost } from "./ExtensionHost";

export class Utilities {
    public static isLanguageFile(document?: TextDocument | undefined): boolean {
        return document ? document.languageId === ExtensionHost.langSelector.language &&
                document.uri.scheme === ExtensionHost.langSelector.scheme : false;
    }
}