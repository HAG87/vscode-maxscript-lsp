// Settings
export interface ICodeFormatSettings
{
    indentChar: string,
    newLineChar: string,
    lineEndChar: string,
    lineContinuationChar: string,
    whitespaceChar: string,
    codeblock: {
        parensInNewLine: boolean,
        newlineAllways: boolean,
        spaced: boolean,
    },
    statements: {
        useLineBreaks: boolean,
        optionalWhitespace: boolean
    },
    list: {
        useLineBreaks: boolean
    }
}

export interface IMaxScriptSettings
{
    language?: {
        SemanticTokens: boolean,
        GoToSymbol: boolean,
        GoToDefinition: boolean,
        Diagnostics: boolean,
    },
    // parser: {
    // 	multiThreading: boolean,
    // }
    Completions?: {
        dataBaseCompletion: boolean,
        codeCompletion: boolean
    };
    formatter: ICodeFormatSettings;
    prettifier: {
        keepComments?: boolean,
        keepEmptyLines?: boolean,
        indentOnly?: boolean,
        expressionsToBlock: boolean,
        filePrefix: string,
    };
    minifier: {
        expressionsToBlock: boolean,
        removeUnnecessaryScopes: boolean,
        filePrefix: string,
    }
}

/**
 * ------------------------------------------------------------------------------------------
 * The global settings, used when the `workspace/configuration` request is not supported by the client.
 * Please note that this is not the case when using this server with the client provided in this example
 * but could happen with other clients.
 *------------------------------------------------------------------------------------------
*/
// put default settings here
export const defaultSettings: IMaxScriptSettings = {
    // language: {
    //  SemanticTokens: true,
    //  GoToSymbol: true,
    //  GoToDefinition: true,
    //  Diagnostics: true,
    //},
    // Completions: {
    // 	dataBaseCompletion: true,
    // codeCompletion: boolean
    // },
    // parser: {
    // 	multiThreading: true,
    // },
    formatter: {
        indentChar: '\t',
        newLineChar: '\r\n',
        lineEndChar: ';',
        lineContinuationChar: '\\',
        whitespaceChar: ' ',
        codeblock: {
            parensInNewLine: true,
            newlineAllways: false,
            spaced: true,
        },
        statements: {
            useLineBreaks: true,
            optionalWhitespace: false
        },
        list: {
            useLineBreaks: false
        }
    },
    prettifier: {
        filePrefix: 'pretty_',
        expressionsToBlock: true,        
    },
    minifier: {
        filePrefix: 'min_',
        removeUnnecessaryScopes: true,
        expressionsToBlock: true, 
    }
};