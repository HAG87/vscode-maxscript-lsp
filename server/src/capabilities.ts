import { ClientCapabilities } from 'vscode-languageserver';

//------------------------------------------------------------------------------------------
export class mxsCapabilities
{
	hasConfigurationCapability                = false;
	hasWorkspaceFolderCapability              = false;
	hasCompletionCapability                   = false;
	hasDiagnosticRelatedInformationCapability = false;
	hasDiagnosticCapability                   = false;
	hasDocumentSymbolCapability               = false;
	hasDefinitionCapability                   = false;
	hasDocumentFormattingCapability           = false;
	hasDocumentSemanticTokensCapability       = false;

	initialize(capabilities: ClientCapabilities)
	{
		// Does the client support the `workspace/configuration` request?
		// If not, we will fall back using global settings
		this.hasConfigurationCapability                = !!(capabilities.workspace?.configuration);
		this.hasWorkspaceFolderCapability              = !!(capabilities.workspace?.workspaceFolders);
		this.hasDiagnosticCapability                   = !!(capabilities.textDocument?.publishDiagnostics);
		this.hasDiagnosticRelatedInformationCapability = !!(capabilities.textDocument?.publishDiagnostics);
		this.hasDocumentSymbolCapability               = !!(capabilities.textDocument?.documentSymbol);
		this.hasDefinitionCapability                   = !!(capabilities.textDocument?.definition);
		this.hasCompletionCapability                   = !!(capabilities.textDocument?.completion);
		this.hasDocumentFormattingCapability           = !!(capabilities.textDocument?.formatting);
		this.hasDocumentSemanticTokensCapability       = !!(capabilities.textDocument?.semanticTokens);
	}
}
