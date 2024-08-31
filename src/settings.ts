/**
 * ------------------------------------------------------------------------------------------
 * The global settings, used when the `workspace/configuration` request is not supported by the client.
 * Please note that this is not the case when using this server with the client provided in this example
 * but could happen with other clients.
 *------------------------------------------------------------------------------------------
*/

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

export interface IPrettifierSettings
{
    keepComments?: boolean,
    keepEmptyLines?: boolean,
    indentOnly?: boolean,
    expressionsToBlock: boolean,
    filePrefix: string,
}

export interface IMinifierSettings
{
    expressionsToBlock: boolean,
    removeUnnecessaryScopes: boolean,
    filePrefix: string,
}

export interface IMaxScriptSettings
{
    language?: {
        SemanticTokens: boolean,
        GoToSymbol: boolean,
        GoToDefinition: boolean,
        Diagnostics: boolean,
    },
    Completions?: {
        dataBaseCompletion: boolean,
        codeCompletion: boolean
    };
    // parser: {
    // 	multiThreading: boolean,
    // }
    formatter: ICodeFormatSettings;
    prettifier: IPrettifierSettings;
    minifier: IMinifierSettings;
}

// default settings
export const defaultSettings: IMaxScriptSettings = {
    // language: {
    //  SemanticTokens: true,
    //  GoToSymbol: true,
    //  GoToDefinition: true,
    //  Diagnostics: true,
    //},
    // parser: {
    // 	multiThreading: true,
    // },
    Completions: {
        dataBaseCompletion: true,
        codeCompletion: true
    },
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