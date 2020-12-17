/**	
 * Simplified tokenizer for code formatting
 */
import { keywords, compile } from 'moo';
//-----------------------------------------------------------------------------------
// CASE INSENSITIVE FOR KEYWORKDS
const caseInsensitiveKeywords = (map: { [k: string]: string | string[] }) => {
	const transform = keywords(map);
	return (text: string) => transform(text.toLowerCase());
};
//-----------------------------------------------------------------------------------
// KEYWORDS
import { keywordsDB } from './keywordsDB';
//-----------------------------------------------------------------------------------
// Moo Lexer
var mxLexer = compile({
	// Comments
	comment_SL: /--.*$/,
	comment_BLK: { match: /\/\*(?:.|[\n\r])*?\*\//, lineBreaks: true, },
	string: [
		{ match: /@"(?:\\"|[^"])*?(?:"|\\")/, lineBreaks: true },
		{ match: /"(?:\\["\\rntsx]|[^"])*?"/, lineBreaks: true },
	],
	// whitespace -  also matches line continuations
	ws: { match: /(?:[ \t]+|(?:[\\][ \t\r\n]+))/, lineBreaks: true },
	newline: { match: /(?:[\r\n]+)/, lineBreaks: true },
	
	// Identities
	param: /[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*:/,

	identity: [
		{ match: /\$(?:(?:[A-Za-z0-9_*?\/]|\.{3}|\\\\)+|'(?:[^'\n\r])+')?/},
		{ match: /'(?:\\['\\rn]|[^'\\\n])*'/},
		{ match: /#[A-Za-z0-9_]+\b/},
		{ match: /#'[A-Za-z0-9_]+'/},
		{ match: /~[A-Za-z0-9_]+~/},
		{ match: /::[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/},
		{
			match: /[&]?[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/,
			type: caseInsensitiveKeywords(keywordsDB)
		}
	],
	
	time: [
		{ match: /(?:[-]?(?:[0-9]+\.)?[0-9]+[msft])+/},
		{ match: /(?:[-]?(?:[0-9]+\.)[0-9]*[msft])+/},
		{ match: /[0-9]+[:][0-9]+\.[0-9]*/}
	],

	// Parens
	arraydef: /#[ \t]*\(/,
	bitarraydef: /#[ \t]*\{/,
	emptyparens: {match: /\(\)/, lineBreaks: false},
	lparen: '(',
	rparen: ')',
	emptybracket: {match: /\[\]/, lineBreaks: false},
	lbracket: '[',
	rbracket: ']',
	lbrace: '{',
	rbrace: '}',
	
	// Values
	bitrange: '..',
	number: [
		{ match: /0[xX][0-9a-fA-F]+/},
		{ match: /(?:[-]?[0-9]*)[.](?:[0-9]+(?:[eEdD][+-]?[0-9]+)?)/},
		{ match: /(?:[-]?[0-9]+\.(?!\.))/},
		{ match: /[-]?[0-9]+(?:[LP]|[eEdD][+-]?[0-9]+)?/},
		{ match: /(?:(?<!\.)[-]?\.[0-9]+(?:[eEdD][+-]?[0-9]+)?)/}
	],
	// unaryminus: {match: /(?<=[^\w)-])-(?![-])/},
	// Operators
	unaryminus: [
		// preceded by WS and suceeded by non WS
		{ match: /(?<=[\s\t\n\r])[-](?![\s\t])/},
		// preceded by an operator and WS
		{ match: /(?<=['+', '-', '*', '/', '^', '==', '!=', '>', '<', '>=', '<=', '=', '+=', '-=', '*=', '/='][\s\t]*)[-]/}
	],
	operator: ['+', '-', '*', '/', '^', '==', '!=', '>', '<', '>=', '<=', '=', '+=', '-=', '*=', '/='],

	// Delimiters
	delimiter: '.',
	sep: ',',
	statement: ';',
	// This contains the rest of the stack in case of error.
	error: [
		{ match: /[¿¡!`´]/, error: true },
		{ match: /[/?\\]{2,}/}
	],
	// fatalError: moo.error
});
//-----------------------------------------------------------------------------------
export default mxLexer;