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
    providers:{
        dataBaseCompletion: boolean,
        codeCompletion: boolean
        astSymbolProvider: boolean,
        definitionProvider: boolean,
        referenceProvider: boolean,
        hoverProvider: boolean,
        renameProvider: boolean,
        documentHighlightProvider: boolean,
        signatureHelpProvider: boolean,
        linkedEditingRangeProvider: boolean,
        foldingRangeProvider: boolean,
        codelensProvider: boolean,
        callHierarchyProvider: boolean,
        workspaceSymbolProvider: boolean,
        contextualSemanticTokens: boolean,
    };
    debug?: {
        tracePerformance: boolean,
        traceRouting: boolean,
        traceParseDecisions: boolean,
    };
    formatter: ICodeFormatSettings;
    prettifier: Partial<IPrettifySettings>;
    minifier: Partial<IMinifySettings>;
}