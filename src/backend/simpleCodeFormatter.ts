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
enum indentTokensEnum {
	lparen,
	lbracket,
	lbrace,
	arraydef,
	bitarraydef
};
enum unindentTokensEnum {
	rparen,
	rbracket,
	rbrace
}

export interface SimpleFormatterSettings
{
	indentOnly: boolean,
	indentChar: string
	whitespaceChar: string
}
/**
 * Fallback class to provide simple formatting options when the parser is not available
 */
export class mxsSimpleFormatter {
    // use moo as basic tokenizer to format code or..
    // use the regex method.
}