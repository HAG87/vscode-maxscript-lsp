import { CharStream, CommonTokenStream } from 'antlr4ng';
import { mxsLexer } from '../../../parser/mxsLexer.js';
import { mxsParser } from '../../../parser/mxsParser.js';
import { codeBlock, mxsParserVisitorFormatter } from '../mxsParserVisitorFormatter.js';
import { ParseTree } from 'antlr4ng';
import { ICodeFormatSettings, IMinifySettings, IPrettifySettings } from '../../types.js';

console.log('=== Diagnostic: Nested IF statements (matching user code) ===\n');

// This matches the structure from the user's report more closely
const testCode = `if snapMode.hit then(
	local objs=getcurrentSelection()
	if objs.count==0 AND snapMode.node!=undefined then objs=#(snapMode.node)
)`;

console.log('Input code:');
console.log(testCode);
console.log('');

// Parse
const chars = CharStream.fromString(testCode);
const lexer = new mxsLexer(chars);
const stream = new CommonTokenStream(lexer);
stream.fill();
const parser = new mxsParser(stream);
const tree = parser.program();

// Prettify settings
const prettifySettings: ICodeFormatSettings & IMinifySettings & IPrettifySettings = {
    whitespaceChar: ' ',
    newLineChar: '\r\n',
    indentChar: '\t',
    exprEndChar: '\r\n',
    lineContinuationChar: '\\',
    codeblock: { newlineAllways: true, parensInNewLine: true, spaced: true },
    statements: { useLineBreaks: false, optionalWhitespace: false },
    list: { useLineBreaks: false },
    removeUnnecessaryScopes: false,
    condenseWhitespace: false,
    expressionsToBlock: true,
};

const visitor = new mxsParserVisitorFormatter(prettifySettings);
const result = visitor.visit(tree as ParseTree);
const formatted = result instanceof codeBlock ? result.toString(prettifySettings) : String(result);

console.log('Formatted output:');
console.log(formatted);
console.log('');
console.log('Formatted (JSON):');
console.log(JSON.stringify(formatted));
console.log('');

// Check for the problem
if (formatted.includes('thenobjs')) {
    console.log('❌ PROBLEM: "thenobjs" token merging detected!');
} else if (formatted.includes('then objs') || (formatted.includes('then') && formatted.includes('objs'))  ) {
    console.log('✅ OK: "then" and "objs" are properly separated');
} else {
    console.log('⚠️  UNKNOWN');
}
