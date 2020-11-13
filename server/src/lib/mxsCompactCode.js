/* eslint-disable eqeqeq */
'use strict';
/**
 * Check if value is node
 * @param {any} node CST node
 */
const isNode = (node) =>  typeof node === 'object' && node != null;
/**
 * filter nodes by type property
 * @param {any} node CST node
 */
const getNodeType = (node) => node !== undefined && ('type' in node) ? node.type : undefined;

// Basic expressions
/*
function unary(right, op) {
	return `${op}${spaceLR(op, right)}${right}`;
}
function binary(left, right, op) {
	return `${left}${spaceLR(left, op)}${op}${spaceLR(op, right)}${right}`;
}
//*/
function binaryNode(node) {
	let _left  = node.left || '';
	let _right = node.right || '';
	let left   = `${_left}${spaceLR(_left, node.operator)}`;
	let right  = `${spaceLR(node.operator, _right)}${_right}`;
	return `${left}${node.operator}${right}`;
}
function exprTerm(exprArr) {
	return (Array.isArray(exprArr) ? exprArr.join(';') : exprArr);
}
/**
 * Join string array
 * @param {string[] | undefined} arr
 */
function joinStatements(arr) {
	if (!arr || arr.length === 0) {return '';}
	return arr.reduce((acc, curr) => {
		let term = curr || '';
		return (acc + spaceLR(acc, term) + term);
	});
}
/**
 * Insert whitespace between alphanumerics
 * @param {string} str1 Left string
 * @param {string} str2 Right string
 */
function spaceLR(str1, str2) {
	if (!str2 || !str1) {return '';}
	return /[\w_$?-]$/gmi.test(str1) && /^(?:[\w_-]|::)/gmi.test(str2) ? ' ' : '';
}
/**
 * Wrap string in spaces if alphanumeric
 * @param {string} str contained string
 * @param {bool} end Add ws at end
 */
function spaceSE(str, end = true) {
	let _start = /^(?:[\w_-]|::)/gmi.test(str) ? ' ' : '';
	let _end = /[\w_$?-]$/gmi.test(str) && end ? ' ' : '';
	return `${_start}${str}${_end}`;
}
function spaceAlphaNum(str) {
	let start = /^[\w]/gmi.test(str) ? ' ' : '';
	let end = /[\w]$/gmi.test(str) ? ' ' : '';
	return `${start}${str}${end}`; 

}

let tokensValue = {
	assign       (node) { return node.value; },
	comparison   (node) { return node.value; },
	error        (node) { return node.text; }, // faulty tokens!
	global_typed (node) { return node.text; },
	hex          (node) { return node.text; },
	identity     (node) { return node.text; },
	
	locale       (node) { return node.text; },
	math         (node) { return node.value; },
	name         (node) { return node.text; },
	number       (node) { return node.text; },
	param        (node) { return node.value; },
	path         (node) { return node.text; },
	property     (node) { return node.value; },
	string       (node) { return node.text; },
	time         (node) { return node.text; },
	typed_iden   (node) { return node.text; },
	
	keyword      (node) { return node.text; },
	
	kw_about         (node) { return node.text; },
	kw_as            (node) { return node.text; },
	kw_at            (node) { return node.text; },
	kw_bool          (node) { return node.text; },
	kw_by            (node) { return node.text; },
	kw_case          (node) { return node.text; },
	kw_catch         (node) { return node.text; },
	kw_collect       (node) { return node.text; },
	kw_compare       (node) { return node.text; },
	kw_context       (node) { return node.text; },
	kw_coordsys      (node) { return node.text; },
	kw_defaultAction (node) { return node.text; },
	kw_do            (node) { return node.text; },
	kw_else          (node) { return node.text; },
	kw_exit          (node) { return node.text; },
	kw_for           (node) { return node.text; },
	kw_from          (node) { return node.text; },
	kw_function      (node) { return node.text; },
	kw_global        (node) { return node.text; },
	kw_group         (node) { return node.text; },
	kw_if            (node) { return node.text; },
	kw_in            (node) { return node.text; },
	kw_level         (node) { return node.text; },
	kw_local         (node) { return node.text; },
	kw_macroscript   (node) { return node.text; },
	kw_mapped        (node) { return node.text; },
	kw_menuitem      (node) { return node.text; },
	kw_not           (node) { return node.text; },
	kw_null          (node) { return node.text; },
	kw_objectset     (node) { return node.text; },
	kw_of            (node) { return node.text; },
	kw_on            (node) { return node.text; },
	kw_parameters    (node) { return node.text; },
	kw_persistent    (node) { return node.text; },
	kw_plugin        (node) { return node.text; },
	kw_rcmenu        (node) { return node.text; },
	kw_return        (node) { return node.text; },
	kw_rollout       (node) { return node.text; },
	kw_scope         (node) { return node.text; },
	kw_separator     (node) { return node.text; },
	kw_set           (node) { return node.text; },
	kw_struct        (node) { return node.text; },
	kw_submenu       (node) { return node.text; },
	kw_then          (node) { return node.text; },
	kw_time          (node) { return node.text; },
	kw_to            (node) { return node.text; },
	kw_tool          (node) { return node.text; },
	kw_try           (node) { return node.text; },
	kw_uicontrols    (node) { return node.text; },
	kw_undo          (node) { return node.text; },
	kw_utility       (node) { return node.text; },
	kw_when          (node) { return node.text; },
	kw_where         (node) { return node.text; },
	kw_while         (node) { return node.text; },
	kw_with          (node) { return node.text; },
};
const visitorPatterns = {
	// TOKENS
	...tokensValue,
	// LITERALS
	Literal    (node, stack) { return stack.value;},
	Identifier (node, stack) { return stack.value;},
	Parameter (node, stack) { return stack.value;},
	BitRange   (node, stack) { return `${stack.start}..${stack.end}`;},
	// Declaration - DEPRECATED
	Declaration(node, stack) {
		return stack.value ? `${stack.id}=${stack.value}` : stack.id;
	},
	// Types
	ObjectArray(node, stack) {
		if (Array.isArray(stack.elements) && stack.elements.length > 1) {
			return `#(${stack.elements.join(',')})`;
		}
		else {
			return `#(${stack.elements})`;
		}
	},
	ObjectBitArray(node, stack) {
		if (Array.isArray(stack.elements) && stack.elements.length > 1) {
			return `#{${stack.elements.join(',')}}`;
		}
		else {
			return `#{${stack.elements}}`;
		}
	},
	ObjectPoint4(node, stack) { return `[${stack.elements.join(',')}]`; },
	ObjectPoint3(node, stack) { return `[${stack.elements.join(',')}]`; },
	ObjectPoint2(node, stack) { return `[${stack.elements.join(',')}]`; },
	// Accesors
	AccessorIndex(node, stack) { return `${stack.operand}[${stack.index}]`; },
	AccessorProperty(node, stack) { return `${stack.operand}.${stack.property}`; },
	// Call
	CallExpression(node, stack) {
		let args = joinStatements(stack.args);
		return `${stack.calle}${spaceLR(stack.calle, args)}${args}`;
	},
	// Assign
	ParameterAssignment(node, stack) {
		return `${stack.param}:${stack.value || ' '}`;
	},
	AssignmentExpression(node, stack) {
		return `${stack.operand}${stack.operator}${stack.value}`;
	},
	// STATEMENTS
	BlockStatement(node, stack) {
		// CHECK SEMICOLONS AT END!!!
		return `(${exprTerm(stack.body)})`;
	},
	// Struct
	Struct(node, stack) {
		let body;
		if (Array.isArray(stack.body)) {
			body =
				stack.body.reduce((acc, curr, index, src) => {
					if (index < src.length - 1) {
						let sep = /(?:private|public)$/gmi.test(curr) ? ';' : ',';
						return (acc + curr + sep);
					} else {
						return (acc + curr);
					}
				}, '');
		} else {
			body = stack.body;
		}
		return `struct ${stack.id}(${body})`;
	},
	StructScope(node, stack) {return stack.value;},
	// Functions
	Function(node, stack) {
		let decl = `${node.mapped ? 'mapped ' : ''}${stack.keyword} ${stack.id}`;
		let args = ('args' in stack) ? joinStatements(stack.args) : '';
		let params = ('params' in stack) ? joinStatements(stack.params) : '';
		let body = exprTerm(stack.body);
		return joinStatements([decl, args, params, '=', body]);
	},
	FunctionReturn(node, stack) {
		return joinStatements(['return', exprTerm(stack.body)]);
	},
	// Plugin
	EntityPlugin(node, stack) {
		let body = exprTerm(stack.body);
		return joinStatements(['plugin', stack.superclass, stack.class, ...stack.params, '(', body, ')']);
	},
	EntityPlugin_params(node, stack) {
		let body = exprTerm(stack.body);
		return `parameters ${stack.id} ${joinStatements(stack.params)}(${body})`;
	},
	PluginParam(node, stack) {
		return `${stack.id} ${joinStatements(stack.params)}`;
	},
	// Tool
	EntityTool(node, stack) {
		return `tool ${stack.id} ${joinStatements(stack.params)}(${exprTerm(stack.body)})`;
	},
	// MacroScript
	EntityMacroscript(node, stack) {
		return `macroScript ${stack.id} ${joinStatements(stack.params)}(${exprTerm(stack.body)})`;
	},
	// rcMenu
	EntityRcmenu(node, stack) {
		return `rcmenu ${stack.id}(${exprTerm(stack.body)})`;
	},
	EntityRcmenu_submenu(node, stack) {
		return `subMenu${stack.label}${stack.params}(${exprTerm(stack.body)})`;
	},
	EntityRcmenu_menuitem(node, stack) {
		return `menuItem ${stack.id}${stack.label}${joinStatements(stack.params)}`;
	},
	EntityRcmenu_separator(node, stack) {
		return joinStatements(['separator', stack.id, ...stack.params]);
	},
	// Utility - Rollout
	EntityUtility(node, stack) {
		return `utility ${stack.id}${stack.title}${joinStatements(stack.params)}(${exprTerm(stack.body)})`;
	},
	EntityRollout(node, stack) {
		return `rollout ${stack.id}${stack.title}${joinStatements(stack.params)}(${exprTerm(stack.body)})`;
	},
	EntityRolloutGroup(node, stack) {
		return `group${stack.id}(${exprTerm(stack.body)})`;
	},
	EntityRolloutControl(node, stack) {
		return joinStatements([stack.class, stack.id, stack.text, ...stack.params]);
	},
	// Event
	Event(node, stack) {
		let body = exprTerm(stack.body);
		return joinStatements(['on', stack.args, stack.modifier, body]);
	},
	EventArgs(node, stack) {
		return [].concat(
			stack.target || '',
			stack.event || '',
			joinStatements(stack.args)
		)
			.filter(x => x.length > 0)
			.join(' ');
	},
	WhenStatement(node, stack) {
		let args = joinStatements(stack.args);
		let body = exprTerm(stack.body);
		return joinStatements(['when', args, 'do', body]);
	},
	// Declarations
	VariableDeclaration(node, stack) {
		if (stack.modifier) {
			return `${stack.modifier} ${stack.scope} ${stack.decls.join(',')}`;
		} else {
			return `${stack.scope} ${stack.decls.join(',')}`;
		}
	},
	// SIMPLE EXPRESSIONS
	MathExpression(node, stack) {
		// binaryNode(stack)
		let left = stack.left || '';
		let right = stack.right || '';

		if (/\w+/gmi.test(stack.operator)) {
			return `${left}${spaceAlphaNum(stack.operator)}${right}`;
		} else {
			let space =
			/[-]$/gmi.test(stack.operator)
				&& /^[-]/gmi.test(right)
				? ' ' : '';
			
			return `${left}${stack.operator}${space}${right}`;
		}
	},
	LogicalExpression(node, stack) {return binaryNode(stack);},
	UnaryExpression(node, stack) {return `${stack.operator}${stack.right}`;},
	// STATEMENTS
	IfStatement(node, stack) {
		let test = stack.test;
		let operator = stack.operator ? stack.operator : 'then';
		let consequent = stack.consequent;
		let alternate = stack.alternate;
		let res;
		if (alternate) {
			res = ['if', test, operator, consequent, 'else', alternate];
		} else {
			res = ['if', test, operator, consequent];
		}
		return joinStatements(res);
	},
	LoopExit(node, stack) {
		let body = exprTerm(stack.body);
		return joinStatements(['exit with', body]);
	},
	TryStatement(node, stack) {
		return joinStatements(['try', stack.block, 'catch', stack.finalizer]);
	},
	DoWhileStatement(node, stack) {
		let body = exprTerm(stack.body);
		return joinStatements(['do', body, 'while', stack.test]);
	},
	WhileStatement(node, stack) {
		let body = exprTerm(stack.body);
		return joinStatements(['while', stack.test, 'do', body]);
	},
	ForStatement(node, stack) {
		let body = exprTerm(stack.body);

		let it = ['for', stack.variable, stack.iteration];
		let valseq = [stack.value, stack.sequence];
		let act = [stack.action, body];
		return joinStatements([].concat(it, valseq, act));
	},
	ForLoopSequence(node, stack) {
		let _to = (stack.to.length > 0) ? `to${spaceSE(stack.to, false)}` : '';
		let _by = (stack.by.length > 0) ? `by${spaceSE(stack.by, false)}` : '';
		let _while = (stack.while.length > 0) ? `while${spaceSE(stack.while, false)}` : '';
		let _where = (stack.where.length > 0) ? `where${spaceSE(stack.where, false)}` : '';
		return joinStatements([_to, _by, _while, _where]);

	},
	CaseStatement(node, stack) {
		return joinStatements(['case', stack.test, 'of', '(', stack.cases.join(';'), ');']);
	},
	CaseClause(node, stack) {
		let body = exprTerm(stack.body);
		let spacer = /\d$/gmi.test(stack.case) ? ' ' : '';
		return `${stack.case}${spacer}:${body}`;
	},
	// context expressions
	ContextStatement(node, stack) {
		let contx = stack.context.join(',');
		let body = exprTerm(stack.body);
		return joinStatements([contx, body]);
	},
	ContextExpression(node, stack) {
		let prefix = stack.prefix || '';
		let context = stack.context;
		return joinStatements([prefix, context, ...stack.args]);
	},
};
//-----------------------------------------------------------------------------------
/**
 * 	Visitor pattern function to transform MaxScript CST to minified code 
 * @param {any} node CST
 * @param {any} callbackMap rules
 */
function visit(node, callbackMap) {
	return _visit(node, null, null, 0, 0);
	function _visit(node, parent, key, level = 0) {
		const nodeType = getNodeType(node);
		// captured values
		let stack = {};
		// get the node keys
		const keys = Object.keys(node);
		// loop through the keys
		for (let i = 0; i < keys.length; i++) {
			// child is the value of each key
			let key = keys[i];
			const child = node[key];
			// could be an array of nodes or just an object
			if (Array.isArray(child)) {
				// value is an array, visit each item
				let collection = [];
				for (let j = 0; j < child.length; j++) {
					if (isNode(child[j])) {
						collection.push(
							_visit(child[j], node, key, level + 1)
							// setImmediate(_visit, child[j], node, key, level + 1)
						);
					}
					// else {
					// not object array items. i.e. null values
					// }
				}
				stack[key] = collection;
				// console.log(stack);
			}
			else if (isNode(child)) {
				// value is an object, visit it
				stack[key] = _visit(child, node, key, level + 1);
				// stack[key] = setImmediate(_visit, child, node, key, level + 1);
				// console.log(stack);
			}
			// else if (child === String || child === Number) {
			// eslint-disable-next-line no-empty
			//...
			// }
		}
		let res;
		if (nodeType !== undefined && nodeType in callbackMap) {
			// setImmediate( () => callbackMap[nodeType](node, stack));
			res = callbackMap[nodeType](node, stack);
		}
		else if (nodeType) {
			// this handles unmapped nodes
			res = node;
		}
		else if (Array.isArray(node)) {
			res = keys.map(x => stack[x]).join(';');
		}
		//--------------------------------
		return res;
	}
}
//-----------------------------------------------------------------------------------
/**
 * Minify MaxScript code
 * @param {any} cst MaxScript parser cst
 */
function mxsMinify(cst) {
	return visit(cst, visitorPatterns);
}
export { mxsMinify, visit, visitorPatterns };
