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
		{ match: /\$(?:(?:[A-Za-z0-9_*\\?]+|[.]{3}|'[^']+')[\\/]?)+/, lineBreaks: true },
		{ match: /\$/ }
	],

	property: { match: /(?<=\.)[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/ },
	identity: [
		{ match: /'(?:(?:[^']|[\r\n])+)'/, lineBreaks: true },
		{ match: /::[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/ },
		{ match: /[&][A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/ },
		{
			match: /[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/,
			type: caseInsensitiveKeywords(keywords)
		}
	],
	
	time: [
		{ match: /(?:(?:(?:[0-9]*[.])?[0-9]+|[0-9]+[.])[msft])+/},
		{ match: /[0-9]+[:][0-9]+\.[0-9]*/}
	],

	// Parens
	arraydef: /#[\s\t]*\(/,
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
		{ match: /(?:[\s\t]-)?[0-9]+(?:[LP]|[eEdD][+-]?[0-9]+)?/},
		{ match: /(?:[\s\t]-)?(?:[0-9]*)[.](?:[0-9]+(?:[eEdD][+-]?[0-9]+)?)/}
	],
	operator_assign: ['=', '+=', '-=', '*=', '/='],
	// Operators
	unaryminus: [
		// preceeded by WS and suceeded by non WS nor (N -n) =
		{ match: /(?<=[\s\t\n\r])[-](?![\s\t=])/},
		// preceeded by an operator
		{ match: /(?<=[-+/*^=][\s\t]*)[-]/}
	],
	operator_compare: ['==', '!=', '>', '<', '>=', '<='],
	operator_math: ['+', '-', '*', '/', '^'],

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
