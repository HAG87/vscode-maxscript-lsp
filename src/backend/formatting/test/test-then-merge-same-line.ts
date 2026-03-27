import { CharStream, CommonTokenStream } from 'antlr4ng'
import { mxsLexer } from '../../../parser/mxsLexer.js'
import { mxsParser } from '../../../parser/mxsParser.js'
import { codeBlock, mxsParserVisitorFormatter } from '../mxsParserVisitorFormatter.js'
import { ICodeFormatSettings, IMinifySettings, IPrettifySettings } from '../../types.js'

const code = `if objs.count==0 AND snapMode.node!=undefined then objs=#(snapMode.node)`

console.log('=== Testing THEN-ID merge on same line ===\n')
console.log('Input:', code)

// Parse
const chars = CharStream.fromString(code)
const lexer = new mxsLexer(chars)
const stream = new CommonTokenStream(lexer)
stream.fill()
const parser = new mxsParser(stream)
const tree = parser.program()

// Prettify settings
const prettifySettings: ICodeFormatSettings & IMinifySettings & IPrettifySettings = {
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

// Minify settings
const minifySettings: ICodeFormatSettings & IMinifySettings & IPrettifySettings = {
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
    removeUnnecessaryScopes: false, //TODO:
    expressionsToBlock: false,
}

console.log('\n--- Full Document Format (prettified) ---')
const formatterPretty = new mxsParserVisitorFormatter(prettifySettings)
const prettyResult = formatterPretty.visit(tree) as codeBlock
const prettified = prettyResult.toString(prettifySettings)
console.log('Output:', prettified)

if (prettified.includes('thenobjs')) {
    console.log('\n❌ ERROR: "thenobjs" merge detected!')
} else {
    console.log('\n✅ OK: "then" and "objs" are properly separated')
}

console.log('\n--- Full Document Format (minified) ---')
const formatterMinify = new mxsParserVisitorFormatter(minifySettings)
const minResult = formatterMinify.visit(tree) as codeBlock
const minified = minResult.toString(minifySettings)
console.log('Output:', minified)

if (minified.includes('thenobjs')) {
    console.log('\n❌ ERROR: "thenobjs" merge detected in minified!')
} else {
    console.log('\n✅ OK: "then" and "objs" are properly separated in minified')
}
