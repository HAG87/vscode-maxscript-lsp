/**	
 * Simplified tokenizer for code formatting
 */
import moo from 'moo';
import { caseInsensitiveKeywords } from './mooUtils';
import { keywordsDB } from './keywordsDB';
interface keywordsMap {
	[key: string]: string[] | keywordsMap
}
//-----------------------------------------------------------------------------------
export const mxsFormatterLexer = (keywords:keywordsMap = keywordsDB) => moo.compile({
	// Comments
	comment_SL: /--.*$/,
	comment_BLK: { match: /\/\*(?:.|[\n\r])*?\*\//, lineBreaks: true, },
	string: [
		{ match: /@"(?:\\"|[^"])*?(?:"|\\")/, lineBreaks: true },
		{ match: /"(?:\\["\\rntsx]|[^"])*?"/, lineBreaks: true },
		{ match: /~[A-Za-z0-9_]+~/ }
	],
	// whitespace -  also matches line continuation backslash: needs to be a separated token
	// bkslsh: {match: /(?:[\\][ \t]+)/},
	bkslsh: {match: /\\/},
	ws: { match: /(?:[ \t]+)/},
	// ws: { match: /(?:[ \t]+|(?:[\\][ \t]+))/},
	newline: { match: /(?:[\r\n]+)/, lineBreaks: true },
	
	// Identities
	parameter: /[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*(?=[ \t]*\:[^:])/,
	name: [
		{ match: /#[A-Za-z0-9_]+\b/ },
		{ match: /#'[A-Za-z0-9_]+'/ },
	],
	path: [
		{ match: /\$(?:(?:[A-Za-z0-9_*?/]|\.{3}|\\[\\/"'])+)?/ },
		{ match: /\$'(?:[^'])+'/, lineBreaks: true },
	],
	property: { match: /(?<=\.)[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/ },
	identity: [
		{ match: /'(?:\\['\\rn]|[^'\\\n])*'/},
		{ match: /::[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/},
		{
			match: /[&]?[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/,
			type: caseInsensitiveKeywords(keywords)
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
	emptyparens: {match: /\([ \t]*\)/, lineBreaks: false},
	lparen: '(',
	rparen: ')',
	emptybracket: {match: /\[[ \t]*\]/, lineBreaks: false},
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
	assign: /(?<!:)\:(?!:)/,
	delimiter: '.',
	sep: ',',
	statement: ';',
	// This contains the rest of the stack in case of error.
	error: [
		{ match: /[¿¡!`´]/, error: true },
		{ match: /[/?\\]{2,}/}
	],
});
