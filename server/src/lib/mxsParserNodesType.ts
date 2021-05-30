import { Range } from 'vscode-languageserver';
//--------------------------------------------------------------------------
export interface baseNode
{
	type: string
	range?: Range
	[key: string]: any
}
export interface BlockStatement
{
	body: any[]
}
export interface EntityRcmenu
{
	id: any
	body: any[]
}
export interface EntityRcmenu_submenu
{
	label: any
	params: any[]
	body: any[]
}
export interface EntityRcmenu_separator
{
	id: any
	params: any[]
}
export interface EntityRcmenu_menuitem
{
	id: any
	label: any
	params: any[]
}
export interface EntityPlugin
{
	superclass: any
	class: any
	id: any
	params: any | any[]
	body: any | any[]
}
export interface EntityPlugin_params
{
	id: any
	params: any | any[]
	body: any | any[]
}
export interface PluginParam
{
	id: any
	params: any | any[]
}
export interface UnaryExpression
{
	operator: any
	right: any | any[]
}
export interface AssignmentExpression
{
	operand: any
	operator: any
	value: any | any[]
}
export interface MathExpression
{
	operator: any
	left: any | any[]
	right?: any | any[]
}
export interface LogicalExpression
{
	operator: any
	left?: any | any[]
	right: any | any[]
}
export interface CallExpression
{
	calle: any
	args: any | any[]
}
export interface Parameter
{
	value: any
}
export interface AccessorProperty
{
	operand: any
	property: any
}
export interface AccessorIndex
{
	operand: any
	index: any
}
export interface EntityTool
{
	id: any
	params: any | any[]
	body: any | any[]
}
export interface EntityRollout
{
	id: any
	title: any
	params: any | any[]
	body: any | any[]
}
export interface EntityUtility
{
	id: any
	title: any
	params: any | any[]
	body: any | any[]
}
export interface EntityRolloutGroup
{
	id: any
	body: any | any[]
}
export interface EntityRolloutControl
{
	class: any
	id: any
	text: any
	params: any | any[]
}
export interface EntityMacroscript
{
	id: any
	params: any | any[]
	body: any | any[]
}
export interface ParameterAssignment
{
	param: any
	value: any | any[]
	range?: Range
}
export interface Struct
{
	id: any
	body: any | any[]
}
export interface StructScope
{
	value: any
}
export interface Event
{
	id: any
	args: any | any[]
	modifier: any | any[]
	body: any | any[]
}
export interface EventArgs
{
	event: any
	target?: any
	args?: any[]
}
export interface WhenStatement
{
	args: any | any[]
	body: any | any[]
}
export interface Function
{
	modifier: any
	keyword: any
	id: any
	args: any | any[]
	params: any | any[]
	body: any | any[]
}
export interface FunctionReturn
{
	body: any | any[]
}
export interface ContextStatement
{
	context: any | any[]
	body: any | any[]
}
export interface ContextExpression
{
	prefix: any | null
	context: any | null
	args: any | any[]
}
export interface CaseStatement
{
	test: any
	cases: any | any[]
}
export interface CaseClause
{
	case: any
	body: any
}
export interface ForStatement
{
	index: any | any[]
	iteration: any
	value: any
	sequence: any | any[]
	action: any
	body: any | any[]
}
export interface ForLoopIndex
{
	variable: any
	index_name: any | null
	filtered_index_name: any | null
}
export interface ForLoopSequence
{
	to: any | null
	by: any | null
	while: any | any[]
	where: any
}
export interface LoopExit
{
	body: any | any[] | null
}
export interface DoWhileStatement
{
	body: any | any[]
	test: any | any[]
}
export interface WhileStatement
{
	test: any | any[]
	body: any | any[]
}
export interface IfStatement
{
	test: any | any[]
	operator: any
	consequent: any | any[]
}
export interface IfStatement
{
	test: any
	operator: any
	consequent: any | any[]
	alternate: any | any[]
}
export interface TryStatement
{
	body: any | any[]
	finalizer: any | any[]
}
export interface VariableDeclaration
{
	modifier: any | null
	decls: any | any[]
	scope: any | any[]
}
export interface Declaration
{
	id: any
	operator: any | null
	value: any | null
}
export interface Keyword
{
	value: any
}
export interface ObjectDecl
{
	elements: any[]
}
export interface BitRange
{
	start: any
	end: any
}
