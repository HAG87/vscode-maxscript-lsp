// moo tokenizer
import { keywords, compile } from 'moo';
//-----------------------------------------------------------------------------------
// CASE INSENSITIVE FOR KEYWORKDS
const caseInsensitiveKeywords = map => {
	const transform = keywords(map);
	return text => transform(text.toLowerCase());
};
//-----------------------------------------------------------------------------------
// KEYWORDS
const UIcontrols = [
	'angle', 'bitmap', 'button',
	'checkbox', 'checkbutton', 'colorpicker',
	'combobox', 'curvecontrol', 'dropdownlist',
	'edittext', 'groupbox', 'hyperlink',
	'imgtag', 'label', 'listbox',
	'mapbutton', 'materialbutton', 'multilistbox',
	'pickbutton', 'popupmenu', 'progressbar',
	'radiobuttons', 'slider', 'spinner',
	'subrollout', 'timer', 'dotnetcontrol'
];
const kwContext = [
	'animate',
	'redraw',
	'quiet',
	'printallelements',
	'mxscallstackcaptureenabled',
	'dontrepeatmessages',
	'macrorecorderemitterenabled'
];
const kwObjectSet = [
	'objects', 'geometry', 'lights', 'cameras', 'helpers',
	'shapes', 'systems', 'spacewarps', 'selection'
];
const keywordsDB = {
	'kw_about': 'about',
	'kw_as': 'as',
	'kw_at': 'at',
	'kw_bool': ['true', 'false', 'off'],
	'kw_by': 'by',
	'kw_case': 'case',
	'kw_catch': 'catch',
	'kw_collect': 'collect',
	'kw_compare': ['and', 'or'],
	'kw_context': kwContext,
	'kw_coordsys': 'coordsys',
	'kw_defaultAction': 'defaultaction',
	'kw_do': 'do',
	'kw_else': 'else',
	'kw_exit': 'exit',
	'kw_for': 'for',
	'kw_from': 'from',
	'kw_function': ['function', 'fn'],
	'kw_global': 'global',
	'kw_group': 'group',
	'kw_if': 'if',
	'kw_in': 'in',
	'kw_level': 'level',
	'kw_local': 'local',
	'kw_macroscript': 'macroscript',
	'kw_mapped': 'mapped',
	'kw_menuitem': 'menuitem',
	'kw_not': 'not',
	'kw_null': ['undefined', 'unsupplied', 'ok', 'silentvalue'],
	'kw_objectset': kwObjectSet,
	'kw_of': 'of',
	'kw_on': 'on',
	'kw_parameters': 'parameters',
	'kw_persistent': 'persistent',
	'kw_plugin': 'plugin',
	'kw_rcmenu': 'rcmenu',
	'kw_return': 'return',
	'kw_rollout': 'rollout',
	'kw_scope': ['private', 'public'],
	'kw_separator': 'separator',
	'kw_set': 'set',
	'kw_struct': 'struct',
	'kw_submenu': 'submenu',
	'kw_then': 'then',
	'kw_time': 'time',
	'kw_to': 'to',
	'kw_tool': 'tool',
	'kw_try': 'try',
	'kw_uicontrols': UIcontrols,
	'kw_undo': 'undo',
	'kw_utility': 'utility',
	'kw_when': 'when',
	'kw_where': 'where',
	'kw_while': 'while',
	'kw_with': 'with',
	// 'kw_continue':    'continue',
	// 'kw_dontcollect': 'dontcollect',
	// 'kw_max':         'max',
	// 'kw_redraw':      'redraw',
	// 'kw_throw':       'throw',
};
//-----------------------------------------------------------------------------------
// Moo Lexer
var mxLexer = compile({
	// the comments
	comment_SL: /--.*$/,
	comment_BLK: { match: /\/\*(?:.|[\n\r])*?\*\//, lineBreaks: true, },
	string: [
		{ match: /@"(?:\\"|[^"])*?(?:"|\\")/, lineBreaks: true },
		{ match: /"(?:\\["\\rntsx]|[^"])*?"/, lineBreaks: true },
	],
	// whitespace -  also matches line continuations
	ws: { match: /(?:[ \t]+|(?:[\\][ \t\r\n]+))/, lineBreaks: true },
	newline: { match: /(?:[\r\n]+)/, lineBreaks: true },

	// path_name $mounstrosity*/_?
	path: [
		/[$](?:[A-Za-z0-9_*?/\\]|\.\.\.)+/,
		'$'
	],
	identity: [
		/'(?:\\['\\rn]|[^'\\\n])*?'/,
		/#[A-Za-z0-9_]+\b/,
		/#'[A-Za-z0-9_]+'/,
		/~[A-Za-z0-9_]+~/,
		/::[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/,
		/[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*(?=[ \t]*[:][^:])/,
		/[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*(?=\.)/,
		/(?<=\.)[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/,
		{
			match: /[&]?[A-Za-z_\u00C0-\u00FF][A-Za-z0-9_\u00C0-\u00FF]*/,
			type: caseInsensitiveKeywords(keywordsDB)
		}
	],
	param: ':',
	// PARENS
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
	unaryminus: /-(?![-\s\t\r\n])/,
	operator: ['+', '-', '*', '/', '^', '==', '!=', '>', '<', '>=', '<=', '=', '+=', '-=', '*=', '/='],
	// DELIMITERS
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