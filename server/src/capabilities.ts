import { ClientCapabilities } from 'vscode-languageserver';

//------------------------------------------------------------------------------------------
export class mxsCapabilities
{
	hasConfigurationCapability: boolean;
	hasWorkspaceFolderCapability: boolean;
	hasCompletionCapability: boolean;
	hasDiagnosticRelatedInformationCapability: boolean;
	hasDiagnosticCapability: boolean;
	hasDocumentSymbolCapability: boolean;
	hasDefinitionCapability: boolean;
	hasDocumentFormattingCapability: boolean;
	hasDocumentSemanticTokensCapability: boolean;
	constructor()
	{
		this.hasConfigurationCapability = false;
		this.hasWorkspaceFolderCapability = false;
		this.hasCompletionCapability = false;
		this.hasDiagnosticRelatedInformationCapability = false;
		this.hasDiagnosticCapability = false;
		this.hasDocumentSymbolCapability = false;
		this.hasDefinitionCapability = false;
		this.hasDocumentFormattingCapability = false;
		this.hasDocumentSemanticTokensCapability = false;
	}

	initialize(capabilities: ClientCapabilities)
	{
		// Does the client support the `workspace/configuration` request?
		// If not, we will fall back using global settings
		this.hasConfigurationCapability = !!(capabilities.workspace?.configuration);
		this.hasWorkspaceFolderCapability = !!(capabilities.workspace?.workspaceFolders);
		this.hasDiagnosticCapability = !!(capabilities.textDocument?.publishDiagnostics);
		this.hasDiagnosticRelatedInformationCapability = !!(capabilities.textDocument?.publishDiagnostics);
		this.hasDocumentSymbolCapability = !!(capabilities.textDocument?.documentSymbol);
		this.hasDefinitionCapability = !!(capabilities.textDocument?.definition);
		this.hasCompletionCapability = !!(capabilities.textDocument?.completion);
		this.hasDocumentFormattingCapability = !!(capabilities.textDocument?.formatting);
		this.hasDocumentSemanticTokensCapability = !!(capabilities.textDocument?.semanticTokens);
	}
}
