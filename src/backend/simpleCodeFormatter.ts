import { mxsLexer } from "../parser/mxsLexer.js";

enum filterCurrenEnum {
	assign,
	newline,
	delimiter,
	lbracket,
	emptyparens,
	emptybraces,
	bitrange,
	unaryminus
};
enum filterAheadEnum {
	assign,
	newline,
	delimiter,
	sep,
	ws,
	lbracket,
	rbracket,
	emptyparens,
	emptybraces,
	bitrange,
	unaryminus
};

export interface ISimpleFormatterSettings
{
	indentOnly: boolean;
	indentChar: string;
	whitespaceChar: string;
	indentBlock: boolean;
	blockInNewLine: boolean;
	maintainNewline: boolean;
}

const indentTokens: Set<number> = new Set([
	mxsLexer.LPAREN,
	mxsLexer.LBRACK,
	mxsLexer.LBRACE,
]);

const unIndentTokens: Set<number> = new Set([
	mxsLexer.RPAREN,
	mxsLexer.RBRACK,
	mxsLexer.RBRACE,	
]);

/**
 * Fallback class to provide simple formatting options when the parser is not available
 */
export class mxsSimpleFormatter {
    // use moo as basic tokenizer to format code or..
    // use the regex method.
	// use antlr tokenizer
	
	indentation: number = 0;

	constructor() {}
	// format entire document
	// format range
	
}