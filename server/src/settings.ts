'use strict';
// Settings
export interface MaxScriptSettings
{
	GoToSymbol: boolean;
	GoToDefinition: boolean;
	Diagnostics: boolean;
	Completions: boolean;
	MinifyFilePrefix: string;
	formatter: { indentOnly: boolean },
	parser: { errorCheck: boolean }
	// language?: { semantics: boolean };
	// ...
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.

// put default settings here
export const defaultSettings: MaxScriptSettings = {
	GoToSymbol: true,
	GoToDefinition: true,
	Diagnostics: true,
	Completions: true,
	MinifyFilePrefix: 'min_',
	formatter: { indentOnly: true },
	parser: { errorCheck: true }
	//language?: { semantics: true },
};