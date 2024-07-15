// moo tokenizer
const moo = require('moo');
const { caseInsensitiveKeywords } = require('./mooUtils');
const { keywordsTypeDB } = require('./keywordsDB');
//-----------------------------------------------------------------------------------
// Moo Lexer
const mxLexer = moo.compile({
	// the comments
	comment_SL: /--.*$/u,
	comment_BLK: { match: /\/\*(?:.|[\n\r])*?\*\//u, lineBreaks: true },

	// strings
	string: [
		{ match: /@"(?:\\"|[^"])*?(?:"|\\")/u, lineBreaks: true },
		{ match: /"(?:\\["\\rntsx]|[^"])*?"/u, lineBreaks: true },
		// { match: /"""[^]*?"""/, lineBreaks: true, value: x => x.slice(3, -3)},
	],

	// whitespace -  also matches line continuations
	ws: [
		{ match: /\\(?:[ \t]*[;\r\n]+)/u, lineBreaks: true },
		{ match: /[ \t]+/u }
	],

	// newline: { match: /(?:[\r\n]|[\\]\s*[\r\n])+/, lineBreaks: true },
	newline: { match: /(?:[;\r\n]+)/u, lineBreaks: true },

	// strings ~RESOURCE~
	locale: /~[_\p{L}]+~/u,

	path: [
		{ match: /\$(?:(?:[\p{L}0-9_*\\?]+|[.]{3}|'[^']+')[\\/]?)+/u, lineBreaks: true },
		{ match: /\$/u }
	],

	// #name literals
	name: [
		{ match: /#[\p{L}0-9_]+/u },
		{ match: /#'[\p{L}0-9_]+'/u }
	],

	identity: [
		{ match: /'(?:(?:[^']|[\r\n])+)'/u, lineBreaks: true },
		{ match: /::[_\p{L}][0-9_\p{L}]*/u },
		{ match: /[&][_\p{L}][0-9_\p{L}]*/u },
		{
			match: /[_\p{L}][0-9_\p{L}]*/u,
			type: caseInsensitiveKeywords(keywordsTypeDB)
		},
	],

	sharp: /#/u,
	questionmark: /\?/u,

	// PARENS, BRACKETS, BRACES
	lparen:   /\(/u,
	rparen:   /\)/u,
	lbracket: /\[/u,
	rbracket: /\]/u,
	lbrace:   /\{/u,
	rbrace:   /\}/u,

	// Operators.
	comparison:
		[
			/[=]{2}/u,
			/!=/u,
			/[><]=/u,
			/>/u,
			/</u
		],
	assign:
		[
			/\+=/u,
			/-=/u,
			/\*=/u,
			/\/=/u,
			/=/u
		],
	math:
		[
			/\+/u,
			/-/u,
			/\*/u,
			/\//u,
			/\^/u
		],

	// time format
	time: [
		{ match: /(?:(?:[0-9]+[.])?[0-9]+[msftMSFT])+/u },
		{ match: /(?:(?:[0-9]+[.])[0-9]*[msftMSFT])+/u },
		{ match: /[0-9]+[:][0-9]+[.][0-9]*/u }
	],

	// number formats
	number: [
		/0[xX][0-9a-fA-F]+/u,
		/(?:[0-9]*)[.](?:[0-9]+(?:[eEdD][+-]?[0-9]+)?)/u, // 123.123d-6
		/(?:[0-9]+\.(?!\.))/u, // 123.
		/[0-9]+(?:[lLpP]|[eEdD][+-]?[0-9]+)?/u, // 456 | 123e-5 | integers
		/(?:(?<!\.)\.[0-9]+(?:[eEdD][+-]?[0-9]+)?)/u // -.789e-9
	],

	// DELIMITERS
	bitrange: /\.\./u,
	dot:      /\./u,
	comma:    /,/u,
	// statement: ';',
	colon: /:/u,

	// [\$?`] COMPLETE WITH UNWANTED CHARS HERE THAT CAN BREAK THE TOKENIZER
	error: [
		{ match: /[¿¡!`´]|[/?\\]{2,}/u, error: true },
		// { match: /.+/ } //match any character left
	],
	// This contains the rest of the stack in case of error.
	// fatalError: moo.error
});
//-----------------------------------------------------------------------------------
module.exports = mxLexer;