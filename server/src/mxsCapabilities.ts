import { ClientCapabilities } from 'vscode-languageserver';

//------------------------------------------------------------------------------------------
export interface mxsCapabilities
{
	hasConfigurationCapability: boolean;
	hasWorkspaceFolderCapability: boolean;
	hasCompletionCapability: boolean;
	hasDiagnosticRelatedInformationCapability: boolean;
	hasDiagnosticCapability: boolean;
	hasDocumentSymbolCapability: boolean;
	hasDefinitionCapability: boolean;
	hasDocumentFormattingCapability: boolean;
}
export class mxsCapabilities implements mxsCapabilities
{
	hasConfigurationCapability: boolean;
	hasWorkspaceFolderCapability: boolean;
	hasCompletionCapability: boolean;
	hasDiagnosticRelatedInformationCapability: boolean;
	hasDiagnosticCapability: boolean;
	hasDocumentSymbolCapability: boolean;
	hasDefinitionCapability: boolean;
	hasDocumentFormattingCapability: boolean;

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
	}

	initialize(capabilities: ClientCapabilities)
	{
		// Does the client support the `workspace/configuration` request?
		// If not, we will fall back using global settings
		this.hasConfigurationCapability = !!(
			capabilities.workspace && !!capabilities.workspace.configuration
		);
		this.hasWorkspaceFolderCapability = !!(
			capabilities.workspace && !!capabilities.workspace.workspaceFolders
		);
		this.hasDiagnosticCapability = !!(
			capabilities.textDocument &&
			capabilities.textDocument.publishDiagnostics
		);
		this.hasDiagnosticRelatedInformationCapability = !!(
			capabilities.textDocument &&
			capabilities.textDocument.publishDiagnostics &&
			capabilities.textDocument.publishDiagnostics.relatedInformation
		);
		this.hasDocumentSymbolCapability = !!(
			capabilities.textDocument &&
			capabilities.textDocument.documentSymbol
		);
		this.hasDefinitionCapability = !!(
			capabilities.textDocument &&
			capabilities.textDocument.definition
		);
		this.hasCompletionCapability = !!(
			capabilities.textDocument &&
			capabilities.textDocument.completion
		);
		this.hasDocumentFormattingCapability = !!(
			capabilities.textDocument &&
			capabilities.textDocument.formatting
		);
	}
}
