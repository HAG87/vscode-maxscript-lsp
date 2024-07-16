// import { Token } from 'moo';
const ReRegExp = require('reregexp').default;
/*
export{}
declare global {
    interface Array<T> {
        random(): Array<T>;
    }
}
if (!Array.prototype.random) {
  Array.prototype.random = function<T>(): T[] {
      return this[Math.floor((Math.random()*this.length))];
  }
}
*/
const rand = (arr: string[]) => arr[Math.floor((Math.random()*arr.length))];

const rx = (rule:string):string => {
	let lit = new ReRegExp( new RegExp(rule) );
	return lit.build();
};

type tokenValue = {
    [index: string]: string;
} 
export const emmitTokenValue = (r:number):tokenValue => ({
	comment_SL      : rx(`[-]{2}[A-Za-z0-9_]{${r >= 3 ? r-2 : 0}}`),
	comment_BLK     : rx(`\\/\\*[a-z]{${r >= 5 ? r-4 : 0}}\\*\\/`),
	string          : rx(`"(?:[A-Za-z0-9_]{${r >= 3 ? r-2 : 0}})"`),
	ws              : rx(`[ \t]{${r}}`),
	error              : rx(`[ \t]{${r}}`),
	newline         : rx(`[;\r\n]{${r}}`),
	locale          : rx(`~[A-Za-z0-9_]{${r >= 2 ? r-2 : 0}}~`),
	path            : rx(`\\$[A-Za-z0-9_]{${r > 1 ? r-1 : 0}}`),
	name            : rx(`#[A-Za-z0-9_]{${r > 1 ? r-1 : 0}}`),
	identity        : rx(`[A-Za-z_][A-Za-z0-9_]{${r > 1 ? r-1 : 0}}`),
	sharp           : '#',
	questionmark    : '?',
	lparen          : '(',
	rparen          : ')',
	lbracket        : '[',
	rbracket        : ']',
	lbrace          : '{',
	rbrace          : '}',
	comparison      : rx(`(?:(=[=!><])|[><]){${r}}`),
	assign          : rx(`=[-+/*]{${r > 1 ? r-1 : 0}}`),
	math            : rx(`[-+/*]{${r}}`),
	time            : rx(`[0-9][:][0-9][.][0-9]{${r >= 4 ? r-4: 0}}`),
	number          : rx(`[0-9]{${r}}`),
	bitrange        : '..',
	delimiter       : '.',
	sep             : ',',
	param           : ':',
	kw_about        : 'about',
	kw_as           : 'as',
	kw_at           : 'at',
	kw_attributes   : 'attributes',
	kw_bool         : rand(['true', 'false', 'off']),
	kw_by           : 'by',
	kw_case         : 'case',
	kw_catch        : 'catch',
	kw_collect      : 'collect',
	kw_compare      : rand(['and', 'or']),
	kw_context      : rand([ 'animate', 'dontrepeatmessages', 'macrorecorderemitterenabled', 'mxscallstackcaptureenabled', 'printallelements', 'quiet', 'redraw' ]),
	kw_animate      : 'animate',
	kw_coordsys     : 'coordsys',
	kw_defaultAction: 'defaultaction',
	kw_do           : 'do',
	kw_else         : 'else',
	kw_exit         : 'exit',
	kw_for          : 'for',
	kw_from         : 'from',
	kw_function     : rand(['function', 'fn']),
	kw_global       : 'global',
	kw_group        : 'group',
	kw_if           : 'if',
	kw_in           : 'in',
	kw_level        : 'level',
	kw_local        : 'local',
	kw_macroscript  : 'macroscript',
	kw_mapped       : 'mapped',
	kw_menuitem     : 'menuitem',
	kw_not          : 'not',
	kw_null         : rand(['undefined', 'unsupplied', 'ok', 'silentvalue']),
	kw_of           : 'of',
	kw_on           : 'on',
	kw_parameters   : 'parameters',
	kw_persistent   : 'persistent',
	kw_plugin       : 'plugin',
	kw_rcmenu       : 'rcmenu',
	kw_return       : 'return',
	kw_rollout      : 'rollout',
	kw_scope        : rand(['private', 'public']),
	kw_separator    : 'separator',
	kw_set          : 'set',
	kw_struct       : 'struct',
	kw_submenu      : 'submenu',
	kw_then         : 'then',
	kw_time         : 'time',
	kw_to           : 'to',
	kw_tool         : 'tool',
	kw_try          : 'try',
	kw_uicontrols   : rand([ 'angle', 'button', 'checkbox', 'checkbutton', 'colorpicker', 'combobox', 'curvecontrol', 'dotnetcontrol', 'dropdownlist', 'edittext', 'groupbox', 'hyperlink', 'imgtag', 'label', 'listbox', 'mapbutton', 'materialbutton', 'multilistbox', 'pickbutton', 'popupmenu', 'progressbar', 'radiobuttons', 'slider', 'spinner', 'subrollout', 'timer' ]),
	kw_undo         : 'undo',
	kw_utility      : 'utility',
	kw_when         : 'when',
	kw_where        : 'where',
	kw_while        : 'while',
	kw_with         : 'with',
});