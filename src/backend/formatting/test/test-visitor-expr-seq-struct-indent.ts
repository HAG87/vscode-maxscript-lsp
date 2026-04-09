import { strict as assert } from 'assert';

import { CharStream, CommonTokenStream, ParseTree } from 'antlr4ng';

import { mxsLexer } from '@parser/mxsLexer.js';
import { mxsParser } from '@parser/mxsParser.js';
import { codeBlock, mxsParserVisitorFormatter } from '../mxsParserVisitorFormatter.js';
import { ICodeFormatSettings, IMinifySettings, IPrettifySettings } from '@backend/types.js';

const source = `(
	struct foo (
		fn example=()
	)
)`;

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

// Regression guard: first expression inside top-level expr_seq should be indented.
assert.ok(
    formatted.includes('(\r\n\tstruct foo'),
    `Expected struct to be indented inside expr_seq.\nOutput:\n${formatted}`,
);

assert.ok(
    formatted.includes('\r\n\t)\r\n)'),
    `Expected struct closing paren to stay aligned with struct declaration.\nOutput:\n${formatted}`,
);

console.log('PASS test-visitor-expr-seq-struct-indent');
