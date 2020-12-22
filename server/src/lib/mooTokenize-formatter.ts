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
	],
	// whitespace -  also matches line continuations
	ws: { match: /(?:[ \t]+|(?:[\\][ \t\r\n]+))/, lineBreaks: true },
	nl: { match: /(?:[\r\n]+)/, lineBreaks: true },
	
	// Identities
	param: /[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*:/,
	name: [
		{ match: /#[A-Za-z0-9_]+\b/ },
		{ match: /#'[A-Za-z0-9_]+'/ },
	],
	locale: { match: /~[A-Za-z0-9_]+~/ },
	path: { match: /\$(?:(?:[A-Za-z0-9_*?\/]|\.{3}|\\\\)+|'(?:[^'\n\r])+')?/},
	property: { match: /(?<=\.)[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/ },
	parameter: { match: /[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*(?=[ \t]*\:[^:])/ },
	identity: [
		
		{ match: /'(?:\\['\\rn]|[^'\\\n])*'/},
		{ match: /::[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/},
		{
			match: /[&]?[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/,
			type: caseInsensitiveKeywords(keywords)
		}
	],
	// Values
	time: [
		{ match: /(?:[-]?(?:[0-9]+\.)?[0-9]+[msft])+/},
		{ match: /(?:[-]?(?:[0-9]+\.)[0-9]*[msft])+/},
		{ match: /[0-9]+[:][0-9]+\.[0-9]*/}
	],
	number: [
		{ match: /0[xX][0-9a-fA-F]+/},
		{ match: /(?:[-]?[0-9]*)[.](?:[0-9]+(?:[eEdD][+-]?[0-9]+)?)/},
		{ match: /(?:[-]?[0-9]+\.(?!\.))/},
		{ match: /[-]?[0-9]+(?:[LP]|[eEdD][+-]?[0-9]+)?/},
		{ match: /(?:(?<!\.)[-]?\.[0-9]+(?:[eEdD][+-]?[0-9]+)?)/}
	],
	unaryminus: [
		// preceded by WS and suceeded by non WS
		{ match: /(?<=[\s\t\n\r])[-](?![\s\t])/},
		// preceded by an operator and WS
		{ match: /(?<=['+', '-', '*', '/', '^', '==', '!=', '>', '<', '>=', '<=', '=', '+=', '-=', '*=', '/='][\s\t]*)[-]/}
	],
	// Parens
	arraydef: /#[ \t]*\(/,
	bitarraydef: /#[ \t]*\{/,
	emptyparens: {match: /\([\s\t]*\)/, lineBreaks: false},
	lparen: /\(/,
	rparen: /\)/,
	emptybracket: {match: /\[\]/, lineBreaks: false},
	lbracket: /\[/,
	rbracket: /\]/,
	lbrace: /\{/,
	rbrace: /\}/,
	// Operators
	bitrange: '..',
	operator: ['+', '-', '*', '/', '^', '==', '!=', '>', '<', '>=', '<=', '=', '+=', '-=', '*=', '/='],
	// Delimiters
	assign: /\:/,
	delimiter: '.',
	sep: ',',
	statement: ';',
	// This contains the rest of the stack in case of error.
	error: [
		{ match: /[¿¡!`´]/},
		{ match: /[/?\\]{2,}/}
	],
	fatalError: moo.error
});