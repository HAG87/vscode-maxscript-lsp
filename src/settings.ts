/**
 * ------------------------------------------------------------------------------------------
 * The global settings, used when the `workspace/configuration` request is not supported by the client.
 * Please note that this is not the case when using this server with the client provided in this example
 * but could happen with other clients.
 *------------------------------------------------------------------------------------------
*/

import {
  ICodeFormatSettings, IMaxScriptSettings, IMinifierSettings,
} from './types.js';

export const minifierSettings: ICodeFormatSettings & IMinifierSettings = {
    whitespaceChar: ' ',
    newLineChar: ';',
    indentChar: '',
    lineEndChar: ';',
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
    removeUnnecessaryScopes: false,
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
        condenseWhitespace: true,
    }
};