// moo tokenizer
const moo = require('moo');
const { caseInsensitiveKeywords } = require('./mooUtils');
const { keywordsTypeDB } = require('./keywordsDB');
//-----------------------------------------------------------------------------------
// Moo Lexer
const mxLexer = moo.compile({
	// the comments
	comment_SL: /--.*$/,
	comment_BLK: { match: /\/\*(?:.|[\n\r])*?\*\//, lineBreaks: true },

	// strings
	string: [
		{ match: /@"(?:\\"|[^"])*?(?:"|\\")/, lineBreaks: true },
		{ match: /"(?:\\["\\rntsx]|[^"])*?"/, lineBreaks: true },
		// { match: /"""[^]*?"""/, lineBreaks: true, value: x => x.slice(3, -3)},
	],

	// whitespace -  also matches line continuations
	ws: [
		{ match: /\\(?:[ \t]*[;\r\n]+)/, lineBreaks: true },
		{ match: /[ \t]+/ }
	],

	// newline: { match: /(?:[\r\n]|[\\]\s*[\r\n])+/, lineBreaks: true },
	newline: { match: /(?:[;\r\n]+)/, lineBreaks: true },

	// strings ~RESOURCE~
	locale: /~[A-Za-z0-9_]+~/,

	path: [
		{ match: /\$(?:[A-Za-z0-9_*?/]|\.{3}|\\[\\/"'])+/ },
		{ match: /\$'(?:[^'])+'/, lineBreaks: true },
		{ match: /\$/ }
	],

	// #name literals
	name: [
		{ match: /#[A-Za-z0-9_]+/ },
		{ match: /#'[A-Za-z0-9_]+'/ }
	],

	identity: [
		{ match: /'(?:(?:[^']|[\r\n])+)'/, lineBreaks: true },
		{ match: /::[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/ },
		{ match: /[&][A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/ },
		{
			match: /[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/,
			type: caseInsensitiveKeywords(keywordsTypeDB)
		},
	],

	sharp: '#',
	questionmark: '?',

	// PARENS, BRACKETS, BRACES
	lparen: '(',
	rparen: ')',
	lbracket: '[',
	rbracket: ']',
	lbrace: '{',
	rbrace: '}',

	// Operators.
	comparison: ['==', '!=', '>', '<', '>=', '<='],
	assign: ['=', '+=', '-=', '*=', '/='],
	math: ['+', '-', '*', '/', '^'],

	// time format
	time: [
		{ match: /(?:(?:[0-9]+[.])?[0-9]+[msftMSFT])+/ },
		{ match: /(?:(?:[0-9]+[.])[0-9]*[msftMSFT])+/ },
		{ match: /[0-9]+[:][0-9]+[.][0-9]*/ }
	],

	// number formats
	number: [
		/0[xX][0-9a-fA-F]+/,
		/(?:[0-9]*)[.](?:[0-9]+(?:[eEdD][+-]?[0-9]+)?)/, // 123.123d-6
		/(?:[0-9]+\.(?!\.))/, // 123.
		/[0-9]+(?:[lLpP]|[eEdD][+-]?[0-9]+)?/, // 456 | 123e-5 | integers
		/(?:(?<!\.)\.[0-9]+(?:[eEdD][+-]?[0-9]+)?)/ // -.789e-9
	],

	// DELIMITERS
	bitrange: '..',
	delimiter: '.',
	sep: ',',
	// statement: ';',
	param: ':',

	// [\$?`] COMPLETE WITH UNWANTED CHARS HERE THAT CAN BREAK THE TOKENIZER
	error: [
		{ match: /[¿¡!`´]/, error: true },
		{ match: /[/?\\]{2,}/ },
		// { match: /.+/ } //match any character left
	],
	// This contains the rest of the stack in case of error.
	// fatalError: moo.error
});
//-----------------------------------------------------------------------------------
module.exports = mxLexer;