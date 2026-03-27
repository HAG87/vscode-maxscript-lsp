import { strict as assert } from 'assert';
import { readFileSync } from 'fs';

import { CharStream, CommonTokenStream, ParseTree } from 'antlr4ng';

import { mxsLexer } from '../../../parser/mxsLexer.js';
import { mxsParser } from '../../../parser/mxsParser.js';
import { codeBlock, mxsParserVisitorFormatter } from '../mxsParserVisitorFormatter.js';
import { ICodeFormatSettings, IMinifySettings, IPrettifySettings } from '../../types.js';

const source = readFileSync('E:/repos/maxscript-parser/examples/example-12.ms', 'utf8');

const options: ICodeFormatSettings & IMinifySettings & IPrettifySettings = {
    whitespaceChar: ' ',
    newLineChar: '\r\n',
    indentChar: '\t',
    exprEndChar: '\r\n',
    lineContinuationChar: '\\',
    codeblock: {
        newlineAllways: true,
        parensInNewLine: true,
        spaced: true,
    },
    statements: {
        useLineBreaks: false,
        optionalWhitespace: false,
    },
    list: {
        useLineBreaks: false,
    },
    removeUnnecessaryScopes: false,
    condenseWhitespace: false,
    expressionsToBlock: true,
};

const chars = CharStream.fromString(source);
const lexer = new mxsLexer(chars);
const stream = new CommonTokenStream(lexer);
stream.fill();
const parser = new mxsParser(stream);
const tree = parser.program();

const visitor = new mxsParserVisitorFormatter(options);
const formattedResult = visitor.visit(tree as ParseTree);
const formatted = formattedResult instanceof codeBlock
    ? formattedResult.toString(options)
    : String(formattedResult);

// Guard for user-reported issue near end of file.
assert.ok(
    formatted.includes('\r\n\tstruct cmloader\r\n\t('),
    `Expected struct cmloader block to be indented in outer expr_seq.\n${formatted.slice(Math.max(0, formatted.indexOf('struct cmloader') - 180), formatted.indexOf('struct cmloader') + 240)}`,
);

assert.ok(
    formatted.includes('\r\n\t)\r\n\tcmloader()'),
    `Expected struct cmloader closing paren to be aligned with declaration.\n${formatted.slice(Math.max(0, formatted.indexOf('struct cmloader') - 180), formatted.indexOf('struct cmloader') + 320)}`,
);

console.log('PASS test-visitor-example12-struct-indent');
