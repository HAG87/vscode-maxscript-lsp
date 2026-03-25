import { ICodeFormatSettings, IMinifySettings, IPrettifySettings } from '@backend/types.js';

export interface IMaxScriptSettings
{
    language?: {
        SemanticTokens: boolean,
        GoToSymbol: boolean,
        GoToDefinition: boolean,
        GoToReferences: boolean,
        Diagnostics: boolean,
    },
    parser?: {
        /** Debounce delay in milliseconds before reparsing after text changes (default: 300ms) */
        reparseDelay: number,
    },
    completions: {
        dataBaseCompletion: boolean,
        codeCompletion: boolean
    };
    // parser: {
    // 	multiThreading: boolean,
    // }
    formatter: ICodeFormatSettings;
    prettifier: Partial<IPrettifySettings>;
    minifier: Partial<IMinifySettings>;
}