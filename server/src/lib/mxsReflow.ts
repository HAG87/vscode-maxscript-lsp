import moo from 'moo';
import * as nodetype from './mxsParserNodesType';
//-----------------------------------------------------------------------------------
// options....
export class reflowOptions //implements reflowOptions
{
	indent: string
	spacer: string
	linebreak: string
	wrapIdentities: boolean
	elements: { useLineBreaks: boolean }
	statements: { optionalWhitespace: boolean }
	expression: {useWhiteSpace: boolean}
	codeblock: {
		newlineAtParens: boolean,
		newlineAllways: boolean,
		spaced: boolean
	}
	indentAt: RegExp
	
	constructor(spacer?: string, linebreak?: string, indent?: string)
	{
		this.indent = indent ?? '\t';
		this.spacer = spacer ?? ' ';
		this.linebreak = linebreak ?? '\n';
		this.wrapIdentities = false,
		this.elements = {
			useLineBreaks: true
		};
		this.statements = {
			optionalWhitespace: false
		};
		this.expression = {useWhiteSpace: false};
		this.codeblock = {
			newlineAtParens: true,
			newlineAllways: true,
			spaced: true
		};
		this.indentAt = new RegExp(`${this.linebreak}`, 'g');
	}
	reset()
	{
		this.indent = '\t';
		this.spacer = ' ';
		this.linebreak = '\n';
		this.wrapIdentities = false,
		this.elements = {
			useLineBreaks: true
		};
		this.statements = {
			optionalWhitespace: false
		};
		this.expression = {useWhiteSpace: false};
		this.codeblock = {
			newlineAtParens: true,
			newlineAllways: true,
			spaced: true
		};
		this.indentAt = new RegExp(`${this.linebreak}`, 'g');
	}
}
export const options = new reflowOptions();
//-----------------------------------------------------------------------------------
//TODO: MINUS WHITESPACE -- KEEP ONLY FOR UNARY EXPRESSION!!!
function optionalWS(values: string[], empty = '', ws = ' ')
{
	// at the end
	let w_ = /\w$/im;
	let s_ = /\W$/im;
	let m_ = /-$/im;
	let d_ = /\d$/im;
	let c_ = /\:$/im;
	let cc_ = /\:\:$/im;
	// at the start
	let _w = /^\w/im;
	let _s = /^\W/im;
	let _m = /^-/im;
	let _d = /^\d/im;
	let _c = /^\:/im;
	let _cc = /^\:\:/im;
	let _eq = /^=/im;
	let res = values.reduce((acc, curr) =>
	{
		if (
			// alpha - alpha
			w_.test(acc) && _w.test(curr)
			// minus - minus
			|| m_.test(acc) && _m.test(curr)
			// alpha - minus *** this will break expressions
			// || w_.test(acc) && _m.test(curr)
			// minus - alpha *** this will break expressions
			// || m_.test(acc) && _w.test(curr)
			// number - colon
			|| d_.test(acc) && _c.test(curr)
			// colon - number
			// || c_.test(acc) && _d.test(curr)
			// alphanum - double colon
			|| w_.test(acc) && _cc.test(curr)
			// param: - param:
			|| c_.test(acc) && c_.test(curr)
			// param: =
			|| c_.test(acc) && _eq.test(curr)
		) {
			return (acc + ws + curr);
		} else {
			return (acc + empty + curr);
		}
	});
	return res;
}
// Objects to construct the codeMap...EXPTESSION | STATEMENT | ELEMENTS | CODEBLOCK
// join elems with WS, one line:
// statement
class Statement
{
	value: any[]
	type: string
	optionalWhitespace: boolean
	addLinebreaks: boolean

	constructor(...args: any)
	{
		this.type = 'statement';
		this.value = [];
		this.optionalWhitespace = false;
		this.addLinebreaks = true;
		this.add(...args);
	}

	get toString()
	{
		if (!options.statements.optionalWhitespace && !this.optionalWhitespace) {
			let res = this.value.reduce((acc, curr) =>
			{
				if (curr.includes(options.linebreak) && this.addLinebreaks) {
					return acc + options.linebreak + curr;
				} else {
					return acc + options.spacer + curr;
				}
			});
			return res;
		} else {
			return optionalWS(this.value);
		}
	}

	add(...value: any)
	{
		this.value = this.value.concat(...value.filter((e:any) => e != null));
	}
}
// join elemns with NL.. block of code
//block
class Codeblock
{
	value: any[]
	type: string
	indent: boolean
	wrapped: boolean

	constructor(...args: any)
	{
		this.type = 'codeblock';
		this.value = [];
		this.indent = false;
		this.wrapped = false;
		this.add(...args);
		// this.indentPattern
	}

	get toString()
	{
		// test for linebreaks...
		// pass
		let pass = true;
		if (Array.isArray(this.value)) {
			pass = this.value.length > 1 || (this.value[0] && this.value[0].includes(options.linebreak));
		}
		if (this.wrapped) {
			if (options.codeblock.newlineAtParens && pass) {
				let res = ([] as string[]).concat('(', this.value).join(options.linebreak);
				if (this.indent) {
					res = res.replace(options.indentAt, `${options.linebreak}${options.indent}`);
				}
				res = res.concat(options.linebreak, ')');
				return res;
			} else {
				return options.codeblock.spaced
					? `(${options.spacer}${this.value.join(options.linebreak)}${options.spacer})`
					: `(${this.value.join(options.linebreak)})`;
			}
		} else if (options.codeblock.newlineAllways/* pass */) {
			let res = this.value.join(options.linebreak);
			if (this.indent) {
				res = res.replace(options.indentAt, `${options.linebreak}${options.indent}`);
			}
			return res;
		} else {
			return options.codeblock.spaced
				? this.value.join(options.spacer)
				: optionalWS(this.value);
		}
	}

	add(...value:any)
	{
		if (value[0] != null) {
			this.value = this.value.concat(...value.filter((e:any) => e != null));
		}
	}
}
// join elems with ',' list of items
//list
class Elements
{
	value: any[]
	type: string
	indent: boolean
	listed: boolean
	
	constructor(...args:any)
	{
		this.listed = false;
		this.type = 'elements';
		this.value = [];
		this.indent = false;
		this.add(...args);
	}

	get toString()
	{
		if (this.listed && options.elements.useLineBreaks) {
			let res = this.value.join(',' + options.linebreak);
			if (this.indent) {
				res = res.replace(options.indentAt, `${options.linebreak}${options.indent}`);
			}
			return res;
		} else {
			return this.value.join(',' + options.spacer);
		}
	}

	add(...value: any)
	{
		if (value[0] != null) {
			this.value = this.value.concat(...value.filter((e:any) => e != null));
		}
	}
}
// expressions
class Expr
{
	type: string
	value: any[]
	constructor(...args: any)
	{
		this.type = 'expr';
		this.value = [];
		this.add(...args);
	}

	get toString()
	{
		if (options.expression.useWhiteSpace){
			return optionalWS(this.value);
		} else {
			return this.value.join('');
		}
	}

	add(...value: any)
	{
		this.value = this.value.concat(...value.filter((e:any) => e != null));
	}
}
//-----------------------------------------------------------------------------------
/**
 * Check if value is node
 * @param {any} node CST node
 */
function isNode(node: any)
{
	return (typeof node === 'object' && node != undefined);
}
/**
 * filter nodes by type property
 * @param {any} node CST node
 */
function getNodeType(node: any): string
{
	return (node.hasOwnProperty('type')) ? node.type : undefined;
}
/**
 * Apply node transform to PARENT KEY!
 */
function editNode(callback: Function, node: any, parent: any, key: string, level: number | null, index: number | null)
{
	let res = callback(node, parent, key, level, index);
	// apply indentation to hig-level rules
	// if (isNode(res) && 'indent' in res) { res.indent = level; }
	index != null ? parent[key][index] = res : parent[key] = res;
}
/*
function removeNode(node, parent, key, index) {
	if (key in parent) {
		index != null ? parent[key].splice(index, 1) : delete parent[key]
	}
}
*/
//-----------------------------------------------------------------------------------
/**
 * Visit and derive CST to a recoverable code map
 * @param {any} tree CST node
 * @param {any} callbackMap Patterns function
 */
function derive(this: any, tree: any, callbackMap: any)
{
	let _visit = (node: any, parent: any, key: string | null, level: number, index: number | null) =>
	{
		const nodeType = getNodeType(node);
		// get the node keys
		const keys = Object.keys(node);
		// loop through the keys
		for (let i = 0; i < keys.length; i++) {
			// child is the value of each key
			let key = keys[i];
			const child = node[key];
			// could be an array of nodes or just an object
			if (Array.isArray(child)) {
				for (let j = 0; j < child.length; j++) {
					if (isNode(child[j])) {
						_visit(child[j], node, key, level + 1, j);
					}
				}
			}
			else if (isNode(child)) {
				_visit(child, node, key, level + 1, null);
			}
		}

		if (callbackMap[nodeType]) {
			if (parent) {
				editNode.call(this, callbackMap[nodeType], node, parent, key!, level, index);
			} else {
				return node;
			}
		}
	};
	_visit(tree, tree, null, 0, null);
}
/**
 * Visit and derive Code from a recoverable code map
 * @param {any} tree CodeMap node
 */
function reduce(tree: any)
{
	function _visit(node: any, parent: any, key: string | null, level: number, index: number | null)
	{
		const keys = Object.keys(node);
		for (let i = 0; i < keys.length; i++) {
			let key = keys[i];
			// for (const key in node) {
			const child = node[key];
			if (Array.isArray(child)) {
				for (let j = 0; j < child.length; j++) {
					if (isNode(child[j])) {
						_visit(child[j], node, key, level + 1, j);
					}
				}
			}
			else if (isNode(child)) {
				_visit(child, node, key, level + 1, null);
			}
		}
		let res;
		if (getNodeType(node) && parent) {
			// if ('indent' in node) { node.indent = level; }
			res = node.toString;
		} else {
			res = node;
		}
		if (key) {
			index != null ? parent[key][index] = res : parent[key] = res;
		}
	}
	_visit(tree, tree, null, 0, null);
}
//-----------------------------------------------------------------------------------
// utility functions
const isArrayUsed = (val: any) => val && Array.isArray(val) && val.length > 0 ? true : false;
const isNotEmpty = (val: any) => val && !Array.isArray(val) || Array.isArray(val) && val.length > 0 ? true : false;
const toArray = (val: any) => Array.isArray(val) ? val : [val];
/*
var wrap = function (func) {
	return function () {
		var args = [...arguments].splice(0);
		return func.apply(this, args);
	};
};
function nodeText(node:any) {
	index != null ? parent[key][index] = node.text : parent[key] = node.text;
}
function nodeValue(node:any) {
	index != null ? parent[key][index] = node.value : parent[key] = node.value;
}
function wrapInParens(node, key) {
	return [
		'(',
		...toArray(node[key]),
		')'
	];
}
*/
//-----------------------------------------------------------------------------------
/**
 * Token transformations
 */
let tokensValue = {
	global_typed(node: moo.Token) { return node.text; },
	hex(node: moo.Token) { return node.text; },
	identity(node: moo.Token) { return node.text; },
	locale(node: moo.Token) { return node.text; },
	name(node: moo.Token) { return node.text; },
	number(node: moo.Token) { return node.text; },
	path(node: moo.Token) { return node.text; },
	string(node: moo.Token) { return node.text; },
	time(node: moo.Token) { return node.text; },
	property(node: moo.Token) { return node.value; },
	params(node: moo.Token) { return node.value; },
	math(node: moo.Token) { return node.value; },
	assign(node: moo.Token) { return node.value; },
	comparison(node: moo.Token) { return node.value; },
	keyword(node: moo.Token) { return node.text; },

	kw_about(node: moo.Token) { return node.text; },
	kw_as(node: moo.Token) { return node.text; },
	kw_at(node: moo.Token) { return node.text; },
	kw_attributes(node: moo.Token) { return node.text; },
	kw_bool(node: moo.Token) { return node.text; },
	kw_by(node: moo.Token) { return node.text; },
	kw_case(node: moo.Token) { return node.text; },
	kw_catch(node: moo.Token) { return node.text; },
	kw_collect(node: moo.Token) { return node.text; },
	kw_compare(node: moo.Token) { return node.text; },
	kw_context(node: moo.Token) { return node.text; },
	kw_coordsys(node: moo.Token) { return node.text; },
	kw_defaultAction(node: moo.Token) { return node.text; },
	kw_do(node: moo.Token) { return node.text; },
	kw_else(node: moo.Token) { return node.text; },
	kw_exit(node: moo.Token) { return node.text; },
	kw_for(node: moo.Token) { return node.text; },
	kw_from(node: moo.Token) { return node.text; },
	kw_function(node: moo.Token) { return node.text; },
	kw_global(node: moo.Token) { return node.text; },
	kw_group(node: moo.Token) { return node.text; },
	kw_if(node: moo.Token) { return node.text; },
	kw_in(node: moo.Token) { return node.text; },
	kw_level(node: moo.Token) { return node.text; },
	kw_local(node: moo.Token) { return node.text; },
	kw_macroscript(node: moo.Token) { return node.text; },
	kw_mapped(node: moo.Token) { return node.text; },
	kw_menuitem(node: moo.Token) { return node.text; },
	kw_not(node: moo.Token) { return node.text; },
	kw_null(node: moo.Token) { return node.text; },
	kw_objectset(node: moo.Token) { return node.text; },
	kw_of(node: moo.Token) { return node.text; },
	kw_on(node: moo.Token) { return node.text; },
	kw_parameters(node: moo.Token) { return node.text; },
	kw_persistent(node: moo.Token) { return node.text; },
	kw_plugin(node: moo.Token) { return node.text; },
	kw_rcmenu(node: moo.Token) { return node.text; },
	kw_return(node: moo.Token) { return node.text; },
	kw_rollout(node: moo.Token) { return node.text; },
	kw_scope(node: moo.Token) { return node.value; },
	kw_separator(node: moo.Token) { return node.text; },
	kw_set(node: moo.Token) { return node.text; },
	kw_struct(node: moo.Token) { return node.text; },
	kw_submenu(node: moo.Token) { return node.text; },
	kw_then(node: moo.Token) { return node.text; },
	kw_time(node: moo.Token) { return node.text; },
	kw_to(node: moo.Token) { return node.text; },
	kw_tool(node: moo.Token) { return node.text; },
	kw_try(node: moo.Token) { return node.text; },
	kw_uicontrols(node: moo.Token) { return node.text; },
	kw_undo(node: moo.Token) { return node.text; },
	kw_utility(node: moo.Token) { return node.text; },
	kw_when(node: moo.Token) { return node.text; },
	kw_where(node: moo.Token) { return node.text; },
	kw_while(node: moo.Token) { return node.text; },
	kw_with(node: moo.Token) { return node.text; },

	error(node: moo.Token) { return node.text; },
};
/**
 * expressions-statements tranformations
 */
let conversionRules = {
	// TOKENS
	...tokensValue,
	// LITERALS
	Literal(node: moo.Token) { return node.value; },
	Identifier(node: moo.Token) { return options.wrapIdentities ? `'${node.value}'` : node.value; },
	Identifier_global(node: moo.Token) { return '::' + node.value; },
	EmptyParens() { return '()'; },
	Parameter(node: moo.Token) { return new Expr(node.value, ':'); },
	BitRange(node: any) { return new Expr(node.start, '..', node.end); },
	//-------------------------------------------------------------------------------------------
	// DECLARATION
	Declaration(node: nodetype.Declaration)
	{
		return new Statement(node.id, node.operator, node.value);
	},
	// Types
	ObjectArray(node: nodetype.ObjectDecl)
	{
		let res = new Expr('#(');
		if (isArrayUsed(node.elements)) {
			let elems = new Elements();
			node.elements.forEach(
				(e:any) =>
				{
					// just to be safe, it should be reduced by now...
					if (isArrayUsed(e)) {
						let body = new Codeblock(...e);
						body.indent = true;
						elems.add(body);
					} else {
						elems.add(e);
					}
				});
			res.add(elems);
		} else if (isNotEmpty(node.elements)) {
			res.add(node.elements);
		}
		res.add(')');

		return res;
	},
	ObjectBitArray(node: nodetype.ObjectDecl)
	{
		let res = new Expr('#{');

		if (isArrayUsed(node.elements)) {
			let elems = new Elements();
			node.elements.forEach(
				(e:any) =>
				{
					// just to be safe, it should be reduced by now...
					if (isArrayUsed(e)) {
						let body = new Codeblock(...e);
						body.indent = true;
						elems.add(body);
					} else if (isNotEmpty(e)) {
						elems.add(e);
					}
				});
			res.add(elems);
		} else if (isNotEmpty(node.elements)) {
			res.add(node.elements);
		}
		res.add('}');

		return res;
	},
	ObjectPoint4(node: nodetype.ObjectDecl)
	{
		return new Expr(
			'[',
			new Elements(...node.elements),
			']'
		);
	},
	ObjectPoint3(node: nodetype.ObjectDecl)
	{
		return new Expr(
			'[',
			new Elements(...node.elements),
			']'
		);
	},
	ObjectPoint2(node: nodetype.ObjectDecl)
	{
		return new Expr(
			'[',
			new Elements(...node.elements),
			']'
		);
	},
	// Accesors
	AccessorIndex(node: nodetype.AccessorIndex)
	{
		return new Expr(
			node.operand,
			'[',
			node.index,
			']'
		);
	},
	AccessorProperty(node: nodetype.AccessorProperty)
	{
		return new Expr(
			node.operand,
			'.',
			node.property
		);
	},
	// Call
	CallExpression(node: nodetype.CallExpression)
	{
		let res = new Statement(
			node.calle,
			...toArray(node.args)
		);
		res.addLinebreaks = false;

		if (node.args.includes('()')) {
			res.optionalWhitespace = true;
		}
		return res;
	},
	// Assign
	ParameterAssignment(node: nodetype.ParameterAssignment)
	{
		let res = new Statement(
			node.param,
			node.value,
		);
		res.addLinebreaks = false;
		return res;
	},
	AssignmentExpression(node: nodetype.AssignmentExpression)
	{
		return new Statement(
			node.operand,
			node.operator,
			node.value
		);
	},
	// Functions
	Function(node: nodetype.Function)
	{
		let stat = new Statement(
			node.modifier,
			node.keyword,
			node.id,
			...toArray(node.args),
			...toArray(node.params),
			'='
		);
		let res = new Codeblock(
			stat,
			...toArray(node.body)
		);
		res.indent = false;
		return res;
	},
	FunctionReturn(node: any)
	{
		return new Statement(
			'return',
			node.body || ';'
		);
	},
	// Declarations
	VariableDeclaration(node: nodetype.VariableDeclaration)
	{
		let decls;
		if (isArrayUsed(node.decls)) {
			if (node.decls.length > 1) {
				decls = new Elements(...node.decls);
				decls.listed = true;
			} else {
				decls = node.decls;
			}
		} else if (isNotEmpty(node.decls)) {
			decls = [node.decls];
		}

		let res = new Statement(
			node.modifier,
			node.scope,
			...toArray(decls)
		);
		return res;
	},
	// SIMPLE EXPRESSIONS - OK
	MathExpression(node: nodetype.MathExpression)
	{
		return new Statement(
			node.left,
			node.operator,
			node.right
		);
	},
	LogicalExpression(node: nodetype.LogicalExpression)
	{
		return new Statement(
			node.left,
			node.operator,
			node.right
		);
	},
	/** Added a dummy whitespace */
	UnaryExpression(node: nodetype.UnaryExpression)
	{
		if (options.statements.optionalWhitespace) {
			return new Expr(
				' ',
				node.operator,
				node.right
			);
		} else {
			return new Expr(
				node.operator,
				node.right
			);
		}
	},
	// STATEMENTS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
	BlockStatement(node: nodetype.BlockStatement)
	{
		// /*
		let res = new Codeblock(...toArray(node.body));
		res.wrapped = true;
		res.indent = true;
		return res;
		// */
		/*
		let res = new codeblock(
			'(',
			...toArray(node.body),
			')'
		);
		return res;
		*/
	},
	IfStatement(node: nodetype.IfStatement)
	{
		let res;
		let stat = new Statement(
			'if',
			node.test,
			node.operator,
			// node.consequent
		);

		if (node.consequent.type === 'codeblock') {
			res = new Codeblock(
				stat,
				node.consequent
			);
			if (node.alternate) {
				res.add(
					'else',
					node.alternate
				);
			}
		} else {
			stat.add(node.consequent);
			if (node.alternate) {
				if (node.alternate.type === 'codeblock') {
					stat.add('else');
					res = new Codeblock(stat, node.alternate);
				} else {
					stat.add('else', node.alternate);
					res = stat;
				}
			} else {
				res = stat;
			}
		}
		return res;
	},
	TryStatement(node: nodetype.TryStatement)
	{
		let test = new Statement(
			'try',
			...toArray(node.body)
		);
		let catcher = new Statement(
			'catch',
			node.finalizer
		);
		let res = new Codeblock(
			test,
			catcher
		);
		return res;
	},
	DoWhileStatement(node: nodetype.DoWhileStatement)
	{
		let stat = new Statement(
			'do',
			...toArray(node.body),
		);
		let test = new Statement(
			'while',
			node.test
		);
		let res = new Codeblock(
			stat,
			test,
		);
		return res;
	},
	WhileStatement(node: nodetype.WhileStatement)
	{
		let res = new Statement(
			'while',
			node.test,
			'do',
			...toArray(node.body)
		);
		return res;
	},
	ForStatement(node: nodetype.ForStatement)
	{
		let res;
		let stat = new Statement(
			'for',
			node.index,
			node.iteration,
			node.value,
			...toArray(node.sequence),
			node.action,
			// ...toArray(node.body)
		);
		if (node.body.type === 'codeblock') {
			res = new Codeblock(stat, ...toArray(node.body));
		} else {
			stat.add(...toArray(node.body));
			res = stat;
		}
		return res;
	},
	ForLoopIndex(node: nodetype.ForLoopIndex)
	{
		return new Elements(
		node.variable,
		node.index_name,
		node.filtered_index_name)
	},
	ForLoopSequence(node: nodetype.ForLoopSequence)
	{
		let _to = isNotEmpty(node.to) ? ['to', ...toArray(node.to)] : null;
		let _by = isNotEmpty(node.by) ? ['by', ...toArray(node.by)] : null;
		let _while = isNotEmpty(node.while) ? ['while', ...toArray(node.while)] : null;
		let _where = isNotEmpty(node.where) ? ['where', ...toArray(node.where)] : null;

		let stats = ([] as any[]).concat(_to, _by, _while, _where).filter(e => e != null);
		return new Statement(...stats);
	},
	LoopExit(node: nodetype.LoopExit)
	{
		let res = new Statement('exit');
		if (node.body) {
			res.add(
				'with',
				...toArray(node.body)
			);
		} else {
			res.add(';');
		}
		return res;
	},
	/*
	case statement is somewhat broken, will never get this thing right
	adding a terminator to overcome this
	*/
	CaseStatement(node: nodetype.CaseStatement)
	{
		let stat = new Statement(
			'case',
			node.test,
			'of'
		);
		let fix = new Statement(options.linebreak);
		let body = new Codeblock(...toArray(node.cases));
		body.wrapped = true;
		body.indent = true;
		return new Codeblock(
			stat,
			body,
			fix
		);
	},
	CaseClause(node: nodetype.CaseClause)
	{
		let res = new Statement(
			node.case,
			':',
			...toArray(node.body)
		);
		res.optionalWhitespace = true;
		return res;
	},
	// context expressions
	ContextStatement(node: nodetype.ContextStatement)
	{
		return new Statement(
			node.context,
			node.body
		);
	},
	ContextExpression(node: nodetype.ContextExpression)
	{
		return new Statement(
			node.prefix,
			node.context,
			...toArray(node.args)
		);
	},
	// Struct >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
	Struct(node: nodetype.Struct)
	{
		let stat = new Statement(
			'struct',
			node.id
		);
		let body = new Codeblock();
		body.wrapped = true;
		body.indent = true;
		if (isArrayUsed(node.body)) {
			// handle struct members...
			let stack: Elements | null = null;
			node.body.forEach((e:any) =>
			{
				// test for structScope
				if (typeof e === 'string' && /(?:private|public)$/mi.test(e)) {
					if (stack) {
						//hack to overcome las missing comma, but adds an extra newline
						stack.add('');
						body.add(stack);
						stack = null;
					}
					body.add(e);
				} else {
					if (!stack) {
						stack = new Elements(e);
						stack.listed = true;
					} else {
						stack.add(e);
					}
				}
			});
			// add last stack
			if (stack) {
				body.add(stack);
			}
		} else if (isNotEmpty(node.body)) {
			body.add(node.body);
		}
		let res = new Codeblock(stat, body);
		return res;
	},
	StructScope(node: nodetype.StructScope) { return node.value; },
	// StructScope: wrap(nodeValue);
	//-------------------------------------------------------------------------
	// Attributes
	EntityAttributes(node: nodetype.EntityAttributes)
	{
		let stat = new Statement(
			'attributes',
			node.id,
			...toArray(node.params)
		)
		let body = new Codeblock(...toArray(node.body));
		body.wrapped = true;
		body.indent = true;
		return new Codeblock(
			stat,
			body
		);
	},
	// Plugin
	EntityPlugin(node: nodetype.EntityPlugin)
	{
		let stat = new Statement(
			'plugin',
			node.superclass,
			node.class,
			...toArray(node.params)
		);
		let body = new Codeblock(...toArray(node.body));
		body.wrapped = true;
		body.indent = true;
		let res = new Codeblock(
			stat,
			body
		);
		return res;
	},
	EntityPlugin_params(node: nodetype.EntityPlugin_params)
	{
		let stat = new Statement(
			'parameters',
			node.id,
			...toArray(node.params)
		);
		let body = new Codeblock(...toArray(node.body));
		body.wrapped = true;
		body.indent = true;
		return new Codeblock(
			stat,
			body
		);
	},
	PluginParam(node: nodetype.PluginParam)
	{
		return new Statement(
			node.id,
			...toArray(node.params)
		);
	},
	// Tool
	EntityTool(node: nodetype.EntityTool)
	{
		let decl = new Statement(
			'tool',
			node.id,
			...toArray(node.params)
		);
		let body = new Codeblock(...toArray(node.body));
		body.wrapped = true;
		body.indent = true;
		return new Codeblock(
			decl,
			body
		);
	},
	// MacroScript
	EntityMacroscript(node: nodetype.EntityMacroscript)
	{
		let decl = new Statement(
			'macroScript',
			node.id
		);
		let body = new Codeblock(...toArray(node.body));
		body.wrapped = true;
		body.indent = true;
		return new Codeblock(
			decl,
			...toArray(node.params),
			body
		);
	},
	// Utility - Rollout
	EntityUtility(node: nodetype.EntityUtility)
	{
		let decl = new Statement(
			'utility',
			node.id,
			node.title,
			...toArray(node.params)
		);
		let body = new Codeblock(...toArray(node.body));
		body.wrapped = true;
		body.indent = true;
		return new Codeblock(
			decl,
			body
		);
	},
	EntityRollout(node: nodetype.EntityRollout)
	{
		let decl = new Statement(
			'rollout',
			node.id,
			node.title,
			...toArray(node.params)
		);
		let body = new Codeblock(...toArray(node.body));
		body.wrapped = true;
		body.indent = true;
		return new Codeblock(
			decl,
			body
		);
	},
	EntityRolloutGroup(node: nodetype.EntityRolloutGroup)
	{
		let body = new Codeblock(...toArray(node.body));
		body.wrapped = true;
		body.indent = true;
		let res = new Codeblock(
			new Statement('group', node.id),
			body
		);
		return res;
	},
	EntityRolloutControl(node: nodetype.EntityRolloutControl)
	{
		return new Statement(
			node.class,
			node.id,
			node.text,
			...toArray(node.params)
		);
	},
	// rcMenu
	EntityRcmenu(node: nodetype.EntityRcmenu)
	{
		let body = new Codeblock(...toArray(node.body));
		body.wrapped = true;
		body.indent = true;
		return new Codeblock(
			new Statement('rcmenu', node.id),
			body
		);
	},
	EntityRcmenu_submenu(node: nodetype.EntityRcmenu_submenu)
	{
		let stat = new Statement(
			'subMenu',
			node.label,
			...toArray(node.params)
		);
		let body = new Codeblock(...toArray(node.body));
		body.wrapped = true;
		body.indent = true;
		return new Codeblock(
			stat,
			body
		);
	},
	EntityRcmenu_menuitem(node: nodetype.EntityRcmenu_menuitem)
	{
		return new Statement(
			'menuItem',
			node.id,
			node.label,
			...toArray(node.params)
		);
	},
	EntityRcmenu_separator(node: nodetype.EntityRcmenu_separator)
	{
		return new Statement(
			'separator',
			node.id,
			...toArray(node.params)
		);
	},
	// Event
	Event(node: nodetype.Event)
	{
		let stat = new Statement(
			'on',
			...toArray(node.args),
			node.modifier
		);
		let res = new Codeblock(
			stat,
			node.body
		);
		return res;
	},
	EventArgs(node: nodetype.EventArgs)
	{
		return new Statement(
			node.target,
			node.event,
			...toArray(node.args)
		);
	},
	WhenStatement(node: nodetype.WhenStatement)
	{
		let stat = new Statement(
			'when',
			...node.args.flat(),
			'do'
		);
		let res = new Codeblock(
			stat,
			...toArray(node.body)
		);
		return res;
	},
};
//-----------------------------------------------------------------------------------
export function mxsReflow(cst: any[])
{
	// derive code tree
	derive(cst, conversionRules);
	// reduce the tree. use options
	reduce(cst);
	return cst.join(options.linebreak);
}
// module.exports = { mxsReflow, options };
