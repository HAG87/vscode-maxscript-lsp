/* $antlr-format
 alignColons hanging,
 alignSemicolons hanging,
 allowShortBlocksOnASingleLine
 true,
 allowShortRulesOnASingleLine false,
 alignFirstTokens true,
 minEmptyLines 1
 */
parser grammar mxsParser;

@header {
    import { mxsParserBase } from "./mxsParserBase"
    import { mxsLexer } from "./mxsLexer"
}

options {
	tokenVocab = mxsLexer;
	superClass = mxsParserBase;
	//language = TypeScript; output = AST;
}

/*GRAMMAR RULES*/

program: NL* expr (NL+ expr)* NL* EOF
	;

/*
 expr
 : simple_expr
 | var_decl
 | assignment_expr
 | assignmentOp_expr
 | while_loop
 | do_loop
 | for_loop
 | loop_exit
 | if_statement
 | case_expr
 | struct_def
 | try_expr 
 | fn_def
 | fn_return
 | context_expr
 | attributes_def
 | when_construct
 | utility_def
 | rollout_def
 | tool_def
 | rcmenu_def
 | macroscript_def
 | plugin_def
 ;
 */
// /*
expr: non_if_expr | if_statement
	;

non_if_expr
	: simple_expr
	| var_decl
	| assignment_expr
	| assignmentOp_expr
	| while_loop
	| do_loop
	| for_loop
	| loop_exit
	| case_expr
	| struct_def
	| try_expr
	| fn_def
	| fn_return
	| context_expr
	| attributes_def
	| when_expr
	| utility_def
	| rollout_def
	| tool_def
	| rcmenu_def
	| macroscript_def
	| plugin_def
	;

// */

//-------------------------------------- MACROSCRIPT_DEF
macroscript_def
	: MACROSCRIPT NL* var_name ( NL* param_name NL* (operand | RESOURCE) )* NL*
    lp
        (macroscript_clause (NL* macroscript_clause)*)?
    rp
	;

macroscript_clause: expr | event_handler
	;

//-------------------------------------- UTILITY_DEF
utility_def
	: UTILITY NL* var_name NL* operand (NL* param)* NL*
    lp
        ( rollout_clause (NL* rollout_clause)* )?
    rp
	;

//-------------------------------------- ROLLOUT_DEF
rollout_def
	: ROLLOUT NL* var_name NL* operand (NL* param)* NL*
    lp
        ( rollout_clause (NL* rollout_clause)* )?
    rp
	;

rollout_clause
	: var_decl
	| rollout_control
	| rollout_group
	| fn_def
	| struct_def
	| event_handler
	| tool_def
	| rollout_def
	;

rollout_group
	: GROUP NL* STRING? NL*
    lp
        ( rollout_control (NL* rollout_control)* )?
    rp
	;

rollout_control: RolloutControl (NL* operand)+ (NL* param)*
	;

//-------------------------------------- TOOL_DEF
tool_def
	: TOOL NL* var_name (NL* param)* NL*
    lp
        tool_clause (NL* tool_clause)+
    rp
	;

tool_clause: var_decl | fn_def | struct_def | event_handler
	;

//-------------------------------------- RCMENU_DEF
rcmenu_def
	: RCMENU NL* var_name NL* lp (rc_clause (NL* rc_clause)*)? rp
	;

rc_clause
	: var_decl
	| fn_def
	| struct_def
	| event_handler
	| rc_submenu
	| rc_menuitem
	| rc_separator
	;

rc_submenu
	: SUBMENU NL* STRING (NL* param)* NL*
    lp
        ( rc_clause (NL* rc_clause)* )?
    rp
	;

rc_separator: SEPARATOR NL* var_name (NL* param)*
	;

rc_menuitem: MENUITEM (NL* operand)+ (NL* param)*
	;

//-------------------------------------- PLUGIN_DEF
plugin_def
	: PLUGIN NL* var_name NL* var_name (NL* param)* NL*
    lp
        plugin_clause (NL* plugin_clause)*
    rp
	;

plugin_clause
	: var_decl
	| fn_def
	| struct_def
	| tool_def
	| rollout_def
	| event_handler
	| param_def
	;

//-------------------------------------- CHANGE_HANDLER when <attribute> <objects> change[s] [
// id:<name> ] [handleAt:#redrawViews|#timeChange] [ <object_parameter> ] do <expr> when <objects>
// deleted [ id:<name> ] [handleAt:#redrawViews|#timeChange] [ <object_parameter> ] do <expr>
// objects var_name | PATH | array

when_expr: when_predicate NL* DO NL* expr
	;

when_predicate
	: WHEN NL* (var_name NL*)? (var_name | PATH | expr_seq | array) NL* (CHANGE | DELETED)  NL*  (NL* param)* (NL* operand)?
	;

//-------------------------------------- CONTEXT_EXPR
/*The full syntax for <context_expr> is:
 
 <context> { , <context> } <expr>
 where <context> is
 one
 of:
 
 at level <node>
 at time <time>
 about <center_spec>
 in <node>
 [ in ] coordsys
 <coordsys>
 [ with ] animate <boolean>
 [ with ] undo <boolean>
 [ with ] redraw <boolean>
 [ with
 ] quiet
 <boolean>
 [ with ] redraw <boolean>
 [ with ] printAllElements <boolean>
 [ with ]
 defaultAction
 <action>
 [ with ] MXSCallstackCaptureEnabled <boolean>
 [ with ]
 dontRepeatMessages
 <boolean>
 [
 with ] macroRecorderEmitterEnabled <boolean>
 
 set <context> 
 Where, <context> is
 one of the
 MAXScript context prefixes: 
 animate,
 time,
 in,
 coordsys,
 about,
 level,
 undo
 */

context_expr: ctx_cascading | ctx_set
	;

ctx_cascading: ctx_predicate (comma ctx_predicate)* NL* expr
	;

ctx_set
	: SET (ANIMATE | TIME | IN | LEVEL) NL* operand
	| SET COORDSYS NL* (LOCAL | operand)
	| SET ABOUT NL* (COORDSYS | operand)
	| SET UNDO NL* (STRING | param | var_name)? NL* simple_expr
	;

ctx_predicate
	: AT NL* (LEVEL | TIME) NL* operand
	| IN NL* operand
	| ABOUT NL* (COORDSYS | operand)
	| IN? NL* COORDSYS NL* (LOCAL | operand)
	| WITH? NL* UNDO NL* (STRING | param | var_name)? NL* simple_expr
	| WITH? NL* DEFAULTACTION NL* NAME
	| WITH? NL* ctx_keyword NL* simple_expr
	;

ctx_keyword
	: ANIMATE
	| DONTREPEATMESSAGES
	| MACRORECORDEREMITERENABLED
	| MXSCALLSTACKCAPTUREENABLED
	| PRINTALLELEMENTS
	| QUIET
	| REDRAW
	;

//-------------------------------------- PARAMETER DEF
param_def
	: PARAMETERS NL* var_name (NL* param)* NL*
    lp
        ( param_clause (NL+ param_clause)* )?
    rp
	;

param_clause: param_expr | event_handler
	;

param_expr: var_name (NL* param)*
	;

//-------------------------------------- ATTRIBUTES DEFINITION attributes <name> [version:n]
// [silentErrors:t/f] [initialRollupState:0xnnnnn] [remap:#(<old_param_names_array>,
// <new_param_names_array>)]
attributes_def
	: ATTRIBUTES NL* var_name (NL* param)* NL*
    lp
        attributes_clause ( NL+ attributes_clause )*
    rp
	;

attributes_clause
	: var_decl
	| event_handler
	| param_def
	| rollout_def
	;

//-------------------------------------- EVENT HANDLER
event_handler
	: ON NL* ev_args = event_args NL* ev_action = (DO | RETURN) NL* ev_body = expr
	;

event_args
	: ev_target = var_name NL* ev_type = var_name ( NL* ev_args += var_name )+
	| ev_target = var_name NL* ev_type = var_name
	| ev_type = var_name
	;

//---------------------------------------- STRUCT DEF
struct_def
	: STRUCT NL* str_name = var_name NL*
    lp
        struct_member ( comma struct_member )*
    rp
	;

// struct_members: struct_member (comma struct_member)* ;
/*
 struct_member
 : (scope = struct_scope NL*)? 
 (
 assignment_expr
 | var_name
 | fn_def
 |
 event_handler
 )
 ;
 */
// /* 
struct_member
	: (scope = struct_scope NL*)? (
		assignment_expr
		| var_name
		| fn_def
		| event_handler
	)
	;

struct_scope: PUBLIC | PRIVATE
	;

// */

//---------------------------------------- FUNCTION DEF
fn_def
	: fn_mod = MAPPED? NL* fn_decl = FN NL* fn_name = var_name NL*
		( NL* fn_args )*
		(NL* fn_params)*
		NL* EQ NL*
		fn_body = expr
	;

fn_args
	: var_name
	// | de_ref
	;

fn_params: param | param_name
	;

//FN_RETURN
fn_return: RETURN NL* expr
	;

//---------------------------------------- LOOPS While loop
while_loop: WHILE NL* expr NL* DO NL* expr
	;

// Do loop
do_loop: DO NL* expr NL* WHILE NL* expr
	;

/* For loop
 * for <var_name> [, <index_name>[, <filtered_index_name>]] ( in | = )<sequence> ( do |
 * collect ) <expr>
 * for-sequence
 * <expr> to <expr> [ by <expr> ] [while <expr>] [where <expr> ]
 * <expr> to <expr> [ by <expr> ] [where <expr> ]
 * <expr> [while <expr>] [ where<expr> ]
 * <expr>
 * [where <expr>]
 */

for_loop
	: FOR NL* var = var_name (
		comma index_name = var_name (
			comma filtered_index_name = var_name
		)?
	)? NL* for_operator = (IN | EQ) NL* for_sequence NL* for_action = (
		DO
		| COLLECT
	) NL* expr
	;

for_sequence
	: expr NL* (
		for_to NL* for_by? NL* for_while? NL* for_where?
		| for_while? NL* for_where?
	)
	;

for_to: TO NL* expr
	;

for_by: BY NL* expr
	;

for_while: WHILE NL* expr
	;

for_where: WHERE NL* expr
	;

loop_exit: EXIT ( NL* WITH NL* expr)?
	;

//----------------------------------------TRY EXPR
try_expr: TRY NL* expr NL* CATCH NL* expr
	;

//---------------------------------------- CASE-EXPR
case_expr
	: CASE NL* expr? NL* OF NL* lp case_item (NL+ case_item)* rp
	;

// This will produce errors at compile time...
case_item: factor COLON NL* expr
	;

/*
 // this is not correct, because if should work for 5:(a), buuuut.....
case_item
    :{!this.colonBeNext()}? (NUMBER | TIMEVAL) COLON NL* expr;
    | (NUMBER | TIMEVAL) COLON (NL+ | {!this.noSpaces()}?) expr
    | factor NL* COLON NL* expr
    ;

 case_factor
 : accessor
 | var_name
 | PATH
 | by_ref
 | bool
 | STRING
 | NAME
 | array
 | bitArray
 | point3
 | point2
 | box2
 | unary_minus
 | expr_seq
 ;
 */
//---------------------------------------- IF-CLAUSE
/*
 ('else' e | {_input.LA(1) != ELSE}?)
 ifStatement
    : 'if' expression 'then' (statement | block) 'else' (statement | block)
    | 'if' expression 'then' (statementNoIf | block)
    ;
*/

/*
 statement : non_if_statement | if_statement ;

 if_statement
    : 'if' parExpression 
        ifBody= (
            non_if_statement 'else' elseBody=statement
                | if_statement )
    ;   
*/
/*
 stmt : matched_stmt ∣ open_stmt ;

 matched_stmt
    : if expr then matched_stmt else matched_stmt
    ∣ other
 ;
 open_stmt
    : if expr then stmt
    ∣ if expr then matched_stmt else open_stmt
 ;
 */

// /*
// this does work but it is slooow
if_statement
	: IF NL* expr NL* (
		THEN NL* non_if_expr NL* ELSE NL* expr
		| (THEN | DO) NL* expr
		| if_statement
	)
	;

/*
 : IF NL* expr NL* DO NL* expr 
 | IF NL* expr NL* 
    ( THEN NL* non_if_expr NL* ELSE NL* expr
        | THEN NL* expr
        | if_statement )
// */

/* // this fails for whatever reason with SLL
 if_statement
 : IF NL* ifClause = expr NL* THEN NL*
    ifBody = expr NL*
        (ELSE NL* elseBody = expr | {this.itsNot(mxsLexer.ELSE)}? )
    | IF NL* ifClause = expr NL* DO NL* ifBody = expr
    ;
*/

//---------------------------------------- DECLARATIONS
var_decl
	: scope = decl_scope NL*
        decl += declaration ( comma decl += declaration )*
	;

declaration: assignment_expr | var_name
	;

decl_scope: ( LOCAL | GLOBAL | PERSISTENT NL* GLOBAL)
	;

//---------------------------------------- ASSIGNMENT EXPRESSION
assignment_expr: left = destination EQ NL* right = expr
	;

assignmentOp_expr: left = destination ASSIGN NL* right = expr
	;

destination: accessor | de_ref | var_name | PATH
	;

//---------------------------------------- SIMPLE_EXPR
/*
 simple_expr
 : logic
 ;
 
 logic
 : right = logic (OR | AND) NL* left = comparison
 |
 <assoc=right>
 NOT NL* right = logic
 | comparison
 ;
 comparison
 : right = comparison COMPARE
 NL*
 left = sum
 |
 sum
 ;
 sum
 : left = sum (PLUS | MINUS | UNARY_MINUS) NL* right = prod
 |
 prod
 ;
 prod
 : left =
 prod (PROD | DIV) NL* right = pow
 | pow
 ;
 pow
 : <assoc=right> left =
 pow POW
 NL* right = as
 |
 as
 ;
 as
 : left = as AS NL* classname
 | unary
 ;
 
 unary
 : (MINUS
 |
 UNARY_MINUS) expr_operand
 | expr_operand
 ;
 //
 */
expr_operand
	: fn_call	# FnCallExpr
	| de_ref	# deRef
	| operand	# OperandExpr
	;

// /*
simple_expr
	: left = expr_operand AS NL* classname	# TypecastExpr
	| expr_operand							# ExprOperand
	// : (fn_call | de_ref | operand) AS NL* classname #TypecastExpr | fn_call #FnCallExpr | de_ref
	// #DeRef | operand #OperandExpr
	| (MINUS | UNARY_MINUS) right = simple_expr									# UnaryExpr
	| <assoc = right> left = simple_expr POW NL* right = simple_expr			# ExponentExpr
	| left = simple_expr (PROD | DIV) NL* right = simple_expr					# ProductExpr
	| left = simple_expr (PLUS | MINUS | UNARY_MINUS) NL* right = simple_expr	# AdditionExpr
	| left = simple_expr COMPARE NL* right = simple_expr						# ComparisonExpr
	| <assoc = right> NOT NL* right = simple_expr								# LogicNOTExpr
	| left = simple_expr (OR | AND) NL* right = simple_expr						# LogicExpr
	;
// */
classname: var_name | expr_seq
	;

//---------------------------------------- FUNCTION CALL Positional Arguments Keyword Arguments
/*
 A <function_call> has a lower precedence than an <operand>,
 but it has a higher precedence than
 all the math,
 comparison, and logical operations.
 This means you have to be careful 
 about
 correctly parenthesizing function arguments
 */

fn_call
	// : caller = fn_caller ( args += operand)+ ( params += param)*
	: caller = fn_caller (
		// PAREN_PAIR //nullary call operator
		paren_pair //nullary call operator
		| (args += operand_arg)+ (params += param)*
		// | (args += operand_arg)+
		| (params += param)+
	)
	// | operand
	;

paren_pair: {this.closedParens()}? LPAREN RPAREN
	;

fn_caller
	: var_name
	| PATH
	| de_ref
	| accessor
	// | unary_minus //UNARY MINUS
	| expr_seq //EXPRESSION SEQUENCE
	| QUESTION
	;

//---------------------------------------- PARAMETER
param: param_name NL* operand_arg
	;

param_name: {this.colonBeNext()}? (var_name | kw_override) COLON
	;

operand_arg
	: UNARY_MINUS operand
	| operand
	;

// unary_op : UNARY_MINUS operand ;
// ------------------------------------------------------------------------//
operand
	// : (MINUS | UNARY_MINUS) unaryMinus = operand
	: accessor
	| factor
	;

//------------------------------------------------------------------------//
accessor
    : accessor (index | property)
    | factor (index | property)
	;

//------------------------------------------------------------------------//
// Property accessor
property: DOT NL* (var_name | kw_override)
	;

//Index accessor
index: lb expr rb
	;

//---------------------------------------- FACTORS
factor
	: var_name
	| bool
	| STRING
	| PATH
	| NAME
	| NUMBER
	| TIMEVAL
	| QUESTION
	| array
	| bitArray
	| point3
	| point2
	| box2
	// | unary_minus //UNARY MINUS
	| expr_seq //EXPRESSION SEQUENCE
	;

//---------------------------------------- UNARY_MINUS unary_minus : (MINUS NL*| UNARY_MINUS) expr ;

//---------------------------------------- EXPR_SEQ <expr_seq> ::= ( <expr> { ( ; | <eol>) <expr> }
// )
expr_seq
	: lp (expr (NL+ expr)*)? rp //| LPAREN NL* RPAREN
	;

//---------------------------------------- TYPES
box2:
    lb
        expr comma expr comma expr comma expr
    rb
	;

point3:
    lb
        expr comma expr comma expr
    rb
	;

point2:
    lb
        expr comma expr
    rb
	;

// BitArray
bitArray: SHARP NL* lc bitList? rc
	;

bitList: bitexpr ( comma bitexpr)*
	;

// */
bitexpr: expr NL* DOTDOT NL* expr | expr
	;

// Array
array: SHARP NL* lp arrayList? rp
	;

arrayList: expr ( comma expr)*
	;

// */ Identifiers
var_name: ids | by_ref
	;

ids: GLOB? (ID | QUOTED | kw_reserved)
	;

by_ref: {this.noWSBeNext()}? AMP (ids | PATH)
	;

de_ref: {this.noWSBeNext()}? PROD (accessor | ids | PATH)
	;

// Boolean
bool: (BOOL | OFF | ON)
	;

//---------------------------------------- OVERRIDABLE KEYWORDS CONTEXTUAL KEYWORDS...can be used as
// identifiers outside the context...
kw_reserved
	: (
		RolloutControl
		| CHANGE
		| DELETED
		| GROUP
		| LEVEL
		| MENUITEM
		| SEPARATOR
		| SET
		| SUBMENU
		| TIME
		| PRINTALLELEMENTS
	)
	;

kw_override
	: (
		ATTRIBUTES
		| PARAMETERS
		| PLUGIN
		| RCMENU
		| RETURN
		| ROLLOUT
		| TO
		| TOOL
		| ON
	)
	;

//---------------------------------------- NEWLINE RESOLVING
lp: LPAREN NL*
	;

rp: NL* RPAREN
	;

lb: LBRACK NL*
	;

rb: RBRACK
	;

lc: LBRACE NL*
	;

rc: NL* RBRACE
	;

comma: NL* COMMA NL*
	;