// Settings
export interface MaxScriptSettings
{
	GoToSymbol: boolean;
	GoToDefinition: boolean;
	Diagnostics: boolean;
	Completions: boolean
	CompletionSettings: {
		dataBaseCompletion: boolean,
		symbolsCompletion: boolean,
		parserCompletion: boolean
	};
	MinifyFilePrefix: string;
	formatter: {
		indentOnly: boolean,
		indentChar: string,
		whitespaceChar: string },
	parser: {
		errorCheck: boolean,
		multiThreading: boolean,
		errorLimit: number
	}
	prettifier: {
		filePrefix: string,
		codeblock?: {
			newlineAtParens: boolean,
			newlineAllways: boolean,
			spaced: boolean,
		},
		statements?: {
			optionalWhitespace: boolean
		},
		list?: {
			useLineBreaks: boolean
		}
	},
	language?: { semantics: boolean };
	// ...
}
//------------------------------------------------------------------------------------------
// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
//------------------------------------------------------------------------------------------
// put default settings here
export const defaultSettings: MaxScriptSettings = {
	GoToSymbol: true,
	GoToDefinition: true,
	Diagnostics: true,
	Completions: true,
	CompletionSettings: {
		dataBaseCompletion: true,
		symbolsCompletion: true,
		parserCompletion: true
	},
	MinifyFilePrefix: 'min_',
	formatter: {
		indentOnly: true,
		indentChar: '\t',
		whitespaceChar: ' '
	},
	parser: {
		errorCheck: true,
		multiThreading: true,
		errorLimit: 10
	},
	prettifier: {
		filePrefix: 'pretty_',
		codeblock: {
			newlineAtParens: true,
			newlineAllways: true,
			spaced: true,
		},
		statements: {
			optionalWhitespace: false
		},
		list: {
			useLineBreaks: true
		}
	},
	language: { semantics: true },
};