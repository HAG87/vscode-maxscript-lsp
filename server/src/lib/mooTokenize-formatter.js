/**	
 * Simplified tokenizer for code formatting
 */
import { keywords, compile } from 'moo';
//-----------------------------------------------------------------------------------
// CASE INSENSITIVE FOR KEYWORKDS
const caseInsensitiveKeywords = map => {
	const transform = keywords(map);
	return text => transform(text.toLowerCase());
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
	identity: [
		/[$](?:[A-Za-z0-9_*?/\\]|\.\.\.)+/,
		'$',
		/'(?:\\['\\rn]|[^'\\\n])*?'/,
		/#[A-Za-z0-9_]+\b/,
		/#'[A-Za-z0-9_]+'/,
		/~[A-Za-z0-9_]+~/,
		/::[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]+/,
		{
			match: /[&]?[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]+(?![:])/,
			type: caseInsensitiveKeywords(keywordsDB)
		}
	],
	param: /[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]+:/,
	// Parens
	arraydef: /#[ \t]*\(/,
	bitarraydef: /#[ \t]*\{/,
	emptyparens: /\([\s\t]*\)/,
	lparen: '(',
	rparen: ')',
	emptybracket: /\[[\s\t]*\]/,
	lbracket: '[',
	rbracket: ']',
	lbrace: '{',
	rbrace: '}',
	// Values
	time: [
		/(?:[-]?(?:[0-9]+\.)?[0-9]+[msft])+/,
		/(?:[-]?(?:[0-9]+\.)[0-9]*[msft])+/,
		/[0-9]+[:][0-9]+\.[0-9]*/
	],
	bitrange: '..',
	number: [
		/0[xX][0-9a-fA-F]+/,
		/(?:[-]?[0-9]*)[.](?:[0-9]+(?:[eEdD][+-]?[0-9]+)?)/,
		/(?:[-]?[0-9]+\.(?!\.))/,
		/[-]?[0-9]+(?:[LP]|[eEdD][+-]?[0-9]+)?/,
		/(?:(?<!\.)[-]?\.[0-9]+(?:[eEdD][+-]?[0-9]+)?)/
	],
	// unary: {match: /(?<=[^\w)-])-(?![-\s])/},
	// Operators
	unaryminus: /-(?![-\s\t\r\n])/,
	operator: ['+', '-', '*', '/', '^', '==', '!=', '>', '<', '>=', '<=', '=', '+=', '-=', '*=', '/='],
	// Delimiters
	delimiter: '.',
	sep: ',',
	statement: ';',
	// This contains the rest of the stack in case of error.
	error: [
		{ match: /[¿¡!`´]/, error: true },
		/[/?\\]{2,}/
	],
	// fatalError: moo.error
});
//-----------------------------------------------------------------------------------
export default mxLexer;