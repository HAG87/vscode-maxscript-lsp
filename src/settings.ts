/**
 * ------------------------------------------------------------------------------------------
 * The global settings, used when the `workspace/configuration` request is not supported by the client.
 * Please note that this is not the case when using this server with the client provided in this example
 * but could happen with other clients.
 *------------------------------------------------------------------------------------------
*/

import {
  ICodeFormatSettings, IMaxScriptSettings, IMinifySettings, IPrettifySettings,
} from '@backend/types.js';

export const minifySettings: ICodeFormatSettings & IMinifySettings & IPrettifySettings = {
    whitespaceChar: ' ',
    newLineChar: ';',
    indentChar: '',
    exprEndChar: ';',
    lineContinuationChar: '',
    statements: {
        useLineBreaks: true,
        optionalWhitespace: false
    },
    codeblock: {
        parensInNewLine: false,
        newlineAllways: false,
        spaced: false,
    },
    list: {
        useLineBreaks: false
    },
    condenseWhitespace: true,
    removeUnnecessaryScopes: true, //TODO:
    expressionsToBlock: false,
}

export const prettifySettings: ICodeFormatSettings & IMinifySettings & IPrettifySettings = {
    whitespaceChar: ' ',
    newLineChar: '\r\n',
    indentChar: '\t',
    exprEndChar: '\r\n',
    lineContinuationChar: '\\',
    codeblock: {
        newlineAllways: true, //ok
        parensInNewLine: true, //ok
        spaced: true, //ok
    },
    list: {
        useLineBreaks: false //ok
    },
    statements: {
        useLineBreaks: false, //TODO:
        optionalWhitespace: false //TODO:
    },
    removeUnnecessaryScopes: false, //TODO:
    condenseWhitespace: false, //ok
    expressionsToBlock: true, //TODO:
}

// default settings
export const defaultSettings: IMaxScriptSettings = {
    // language: {
    //  SemanticTokens: true,
    //  GoToSymbol: true,
    //  GoToDefinition: true,
    //  Diagnostics: true,
    //},
    parser: {
        reparseDelay: 300  // 300ms debounce delay for reparsing
    },
    completions: {
        dataBaseCompletion: true,
        codeCompletion: true
    },
    formatter: {
        indentChar: '\t',
        newLineChar: '\r\n',
        exprEndChar: ';',
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
        removeUnnecessaryScopes: false,
        condenseWhitespace: true,
    }
};