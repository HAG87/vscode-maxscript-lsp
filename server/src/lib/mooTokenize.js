// moo tokenizer
const moo = require('moo');
const { caseInsensitiveKeywords } = require('./mooUtils');
const { keywordsTypeDB } = require('./keywordsDB');
//-----------------------------------------------------------------------------------
// Moo Lexer
const mxLexer = moo.compile({
	// the comments
	comment_SL: /--.*$/,
	comment_BLK: { match: /\/\*(?:.|[\n\r])*?\*\//, lineBreaks: true, },
	// strings
	string: [
		{ match: /@"(?:\\"|[^"])*?(?:"|\\")/, lineBreaks: true },
		{ match: /"(?:\\["\\rntsx]|[^"])*?"/, lineBreaks: true },
		// { match: /"""[^]*?"""/, lineBreaks: true, value: x => x.slice(3, -3)},
	],
	// whitespace -  also matches line continuations
	// ws: { match: /(?:[ \t]+|(?:[\\][ \t\r\n]+))/, lineBreaks: true },
	ws: [
		{ match: /\\(?:[ \t]*[\r\n]+)/, lineBreaks: true },
		/[ \t]+/
	],
	// newline: { match: /(?:[\r\n]|[\\]\s*[\r\n])+/, lineBreaks: true },
	newline: { match: /(?:[\r\n]+)/, lineBreaks: true },

	// strings ~RESOURCE~
	locale: /~[A-Za-z0-9_]+~/,

	// path_name $mounstrosity*/_?
	path: /\$(?:(?:[A-Za-z0-9_*?\/]|\.{3}|\\\\)+|'(?:[^'\n\r])+')?/,

	// ::global variable
	global_typed: /::[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]+/,
	// property <object>.<property>
	// property: { match: /\.[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/, value: x => x.slice(1) },

	// IDENTIFIERS
	// a mounstrosity
	typed_iden: /'(?:\\['\\rn]|[^'\\\n])*?'/,

	// parameter <param_name>:
	/*
	param_name: {
		match:/[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*(?=[:])/,
		// value: x => x.slice(0, -1)
	},
	*/
	identity: [
		// properties
		/(?<=\.)[&]?[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/,
		/[&]?[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*(?=[.])/,
		'?',
		// param names
		/[&]?[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*(?=[:])/,
		{
			match: /[&]?[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*(?![:.])/,
			type: caseInsensitiveKeywords(keywordsTypeDB)
		},
	],
	// array marker #(...) | #{...}
	arraydef: /#[ \t]*\(/,
	bitarraydef: /#[ \t]*\{/,
	// PARENS
	lparen: '(',
	rparen: ')',

	// BRACKETS, BRACES...
	lbracket: '[',
	rbracket: ']',
	lbrace: /{/,
	rbrace: /}/,

	// Operators.
	comparison: ['==', '!=', '>', '<', '>=', '<='],
	assign: ['=', '+=', '-=', '*=', '/='],
	// unary: {match: /(?<=[^\w)-])-(?![-\s])/},
	math: ['+', '-', '*', '/', '^'],

	// time format
	time: [
		/(?:[-]?(?:[0-9]+[.])?[0-9]+[msft])+/,
		/(?:[-]?(?:[0-9]+[.])[0-9]*[msft])+/,
		/[0-9]+[:][0-9]+[.][0-9]*/
	],

	// number formats
	bitrange: '..',
	hex: /0[xX][0-9a-fA-F]+/,
	number: [
		/(?:[-]?[0-9]*)[.](?:[0-9]+(?:[eEdD][+-]?[0-9]+)?)/, // 123.123d-6
		/(?:[-]?[0-9]+\.(?!\.))/, // 123.
		/[-]?[0-9]+(?:[LP]|[eEdD][+-]?[0-9]+)?/, // 456 | 123e-5 | integers
		/(?:(?<!\.)[-]?\.[0-9]+(?:[eEdD][+-]?[0-9]+)?)/ // -.789e-9
	],

	// #name literals .. should go higher??
	name: [
		/#[A-Za-z0-9_]+\b/,
		/#'[A-Za-z0-9_]+'/
	],

	// DELIMITERS
	delimiter: '.',
	sep: ',',
	statement: ';',
	param: ':',

	// [\$?`] COMPLETE WITH UNWANTED CHARS HERE THAT CAN BREAK THE TOKENIZER
	error: [
		{ match: /[¿¡!`´]/, error: true },
		{ match: /[/?\\]{2,}/ },
	],
	// This contains the rest of the stack in case of error.
	// fatalError: moo.error
});
//-----------------------------------------------------------------------------------
module.exports = mxLexer;