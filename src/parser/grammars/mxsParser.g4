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
    import { mxsParserBase } from "./mxsParserBase.js"
    import { mxsLexer } from "./mxsLexer.js"
}

options {
	tokenVocab = mxsLexer;
	superClass = mxsParserBase;
	//language = TypeScript; output = AST;
}

/*GRAMMAR RULES*/

program: NL* expr (lbk expr)* NL* EOF
	;

expr
	: simpleExpression
	| declarationExpression
	| assignmentExpression
	| ifExpression
	| whileLoopExpression
	| doLoopExpression
	| forLoopExpression
	| loopExitStatement
	| caseExpression
	| structDefinition
	| tryExpression
	| fnDefinition
	| fnReturnStatement
	| contextExpression
	| attributesDefinition
	| whenStatement
	| utilityDefinition
	| rolloutDefinition
	| toolDefinition
	| rcmenuDefinition
	| macroscriptDefinition
	| pluginDefinition
	;

//-------------------------------------- MACROSCRIPT_DEF
macroscriptDefinition
	: macroscript_predicate NL*
    lp
        (macroscript_clause (lbk? macroscript_clause)*)?
    rp
	;
macroscript_predicate: MacroScript NL* macro_name = identifier ( NL* param )*
	;
macroscript_clause: expr | eventHandlerClause
	;

//-------------------------------------- UTILITY_DEF
utilityDefinition
	: utility_predicate NL*
    lp
        ( rollout_clause (lbk? rollout_clause)* )?
    rp
	;
utility_predicate: Utility NL* utility_name = identifier NL* operand (NL* param)*
	;
//-------------------------------------- ROLLOUT_DEF
rolloutDefinition
	: rollout_predicate NL*
    lp
        ( rollout_clause (lbk? rollout_clause)* )?
    rp
	;

rollout_predicate: Rollout NL* rollout_name = identifier NL* operand (NL* param)*
	;
rollout_clause
	: declarationExpression
	| rolloutControl
	| rolloutGroup
	| fnDefinition
	| structDefinition
	| eventHandlerClause
	| toolDefinition
	| rolloutDefinition
	;

rolloutGroup
	: group_predicate NL*
    lp
        ( rolloutControl (lbk? rolloutControl)* )?
    rp
	;
group_predicate: Group NL* group_name = STRING?
	;

rolloutControl: rolloutControlType NL* controlName = identifier (NL* operand)? (NL* param)*
	;

rolloutControlType
	: ( Angle
	| Bitmap
	| Button
	| CheckBox
	| CheckButton
	| ColorPicker
	| ComboBox
	| CurveControl
	| DotnetControl
	| DropdownList
	| EditText
	| GroupBox
	| Hyperlink
	| ImgTag
	| Label
	| ListBox
	| MapButton
	| MaterialButton
	| MultilistBox
	| PickButton
	| PopupBenu
	| Progressbar
	| RadioButtons
	| Slider
	| Spinner
	| Subrollout
	| Timer )
	;

//-------------------------------------- TOOL_DEF
toolDefinition
	: tool_predicate NL*
    lp
        tool_clause (lbk? tool_clause)+
    rp
	;
tool_predicate: Tool NL* tool_name = identifier (NL* param)*
	;
tool_clause: declarationExpression | fnDefinition | structDefinition | eventHandlerClause
	;

//-------------------------------------- RCMENU_DEF
rcmenuDefinition
	: rcmenu_predicate NL*
	lp
		(rc_clause (NL* rc_clause)*)?
	rp
	;
rcmenu_predicate: RCmenu NL* rc_name = identifier
	;
rc_submenu
	: submenu_predicate NL*
    lp
        ( rc_clause (lbk? rc_clause)* )?
    rp
	;
submenu_predicate: SubMenu NL* submenu_name = STRING (NL* param)*
	;
rc_clause
	: declarationExpression
	| fnDefinition
	| structDefinition
	| eventHandlerClause
	| rc_submenu
	| rcmenuControl
	;

rcmenuControl
	: MenuItem (NL* operand)+ (NL* param)*
	| Separator NL* identifier (NL* param)*
	;

//-------------------------------------- PLUGIN_DEF
pluginDefinition
	: plugin_predicate NL*
    lp
        plugin_clause (lbk? plugin_clause)*
    rp
	;
plugin_predicate: Plugin NL* plugin_kind = identifier NL* plugin_name = identifier (NL* param)*
	;
plugin_clause
	: declarationExpression
	| fnDefinition
	| structDefinition
	| toolDefinition
	| rolloutDefinition
	| eventHandlerClause
	| paramsDefinition
	;

//-------------------------------------- CHANGE_HANDLER when <attribute> <objects> change[s] [
// id:<name> ] [handleAt:#redrawViews|#timeChange] [ <object_parameter> ] do <expr> when <objects>
// deleted [ id:<name> ] [handleAt:#redrawViews|#timeChange] [ <object_parameter> ] do <expr>
// objects var_name | path | array

whenStatement: when_predicate NL* DO NL* expr
	;

when_predicate
	: WHEN NL* (identifier NL*)? (identifier | path | expr_seq | array) NL* (CHANGE | DELETED)  NL*  (NL* param)* (NL* operand)?
	;

//-------------------------------------- CONTEXT_EXPR
contextExpression: ctx_cascading | ctx_set
	;

ctx_cascading: ctx_predicate (comma ctx_predicate)* NL* expr
	;
ctx_set
	: SET (ANIMATE | TIME | IN | LEVEL) NL* operand
	| SET COORDSYS NL* (LOCAL | operand)
	| SET ABOUT NL* (COORDSYS | operand)
	| SET UNDO NL* (STRING | param | identifier)? NL* simpleExpression
	;

ctx_predicate
	: AT NL* (LEVEL | TIME) NL* operand
	| IN NL* operand
	| ABOUT NL* (COORDSYS | operand)
	| (IN NL*)? COORDSYS NL* (LOCAL | operand)
	| (WITH NL*)? UNDO NL* (STRING | param | identifier)? NL* simpleExpression
	| (WITH NL*)? DefaultAction NL* name
	| (WITH NL*)? ctx_keyword NL* simpleExpression
	;

ctx_keyword
	: ( ANIMATE
	| DontRepeatMessages
	| MacroRecorderEmitterEnabled
	| MXScallstackCaptureEnabled
	| PrintAllElements
	| QUIET
	| REDRAW )
	;

//-------------------------------------- PARAMETER DEF
paramsDefinition
	: params_predicate NL*
    lp
        ( params_clause (lbk params_clause)* )?
    rp
	;
params_predicate: Parameters NL* identifier (NL* param)*
	;
params_clause
	: paramDefinition
	| eventHandlerClause
	;
paramDefinition: identifier (NL* param)*
	;

//-------------------------------------- ATTRIBUTES DEFINITION attributes <name> [version:n]
// [silentErrors:t/f] [initialRollupState:0xnnnnn] [remap:#(<old_param_names_array>,
// <new_param_names_array>)]
attributesDefinition
	: attributes_predicate NL*
    lp
        attributes_clause ( lbk attributes_clause )*
    rp
	;
attributes_predicate: Attributes NL* identifier (NL* param)*
	;
attributes_clause
	: declarationExpression
	| eventHandlerClause
	| paramsDefinition
	| rolloutDefinition
	;

//-------------------------------------- EVENT HANDLER
eventHandlerClause
	: ON NL* ev_args = event_args NL* ev_action = (DO | RETURN) NL* ev_body = expr
	;

event_args
	: ev_target = identifier NL* ev_type = identifier ( NL* ev_args += identifier )+
	| ev_target = identifier NL* ev_type = identifier
	| ev_type = identifier
	;

//---------------------------------------- STRUCT DEF
structDefinition
	: STRUCT NL* str_name = identifier NL*
    lp
        struct_body
    rp
	;

struct_body: (struct_access NL*)? struct_members ( comma (struct_access NL*)? struct_members )*
	;

struct_members
	: struct_member
	| fnDefinition
	| eventHandlerClause	
	;

struct_member: identifier assignment? ;

struct_access: PUBLIC | PRIVATE
	;

//---------------------------------------- FUNCTION DEF
fnDefinition
	: (fn_mod = MAPPED NL* fn_decl = FN | fn_decl = FN) NL* fn_name = identifier NL*
		( NL* fn_args )*
		(NL* fn_params)*
		NL* fn_body
	;

fn_body
	: EQ NL* expr
	;
fn_args
	: identifier
	// | de_ref
	;
fn_params
	: {this.colonBeNext()}? (identifier | kw_override) COLON (NL* operand_arg)?
	;

//FN_RETURN
fnReturnStatement: RETURN NL* expr
	;

//---------------------------------------- LOOPS While loop
whileLoopExpression: WHILE NL* expr NL* DO NL* expr
	;

// Do loop
doLoopExpression: DO NL* expr NL* WHILE NL* expr
	;

/* For loop
 * for <var_name> [, <index_name>[, <filtered_index_name>]] ( in | = )<sequence> ( do | collect ) <expr>
 * for-sequence
 * <expr> to <expr> [ by <expr> ] [while <expr>] [where <expr> ]
 * <expr> to <expr> [ by <expr> ] [where <expr> ]
 * <expr> [while <expr>] [ where<expr> ]
 * <expr> [where <expr>]
 */

forLoopExpression
	: FOR NL* for_body NL* for_operator = (IN | EQ) NL* for_sequence NL* for_action = (DO | COLLECT) NL* expr
	;

for_body : var = identifier ( comma index_name = identifier ( comma filtered_index_name = identifier )? )?
	;
for_sequence : expr ( NL* for_to NL* for_by? )? ( NL* (for_while NL* for_where? | for_where) )?
	;
for_to: TO NL* expr
	;
for_by: BY NL* expr
	;
for_while: WHILE NL* expr
	;
for_where: WHERE NL* expr
	;
loopExitStatement: EXIT (NL* WITH NL* expr)?
	;

//----------------------------------------TRY EXPR
tryExpression: TRY NL* expr NL* CATCH NL* expr
	;

//---------------------------------------- CASE-EXPR
caseExpression
	: case_predicate NL*
	lp
		case_item (lbk case_item)*
	rp
	;
case_predicate: CASE (NL* expr)? NL* OF
	;
// This will produce errors at compile time...
case_item: factor COLON NL* expr
	;

/*
 // this is not correct, because if should work for 5:(a), buuuut.....
case_item
    :{!this.colonBeNext()}? (NUMBER | TIMEVAL) COLON NL* expr;
    | (NUMBER | TIMEVAL) COLON (lbk | {!this.noSpaces()}?) expr
    | factor NL* COLON NL* expr
    ;

 case_factor
	: accessor
	| var_name
	| path
	| bool
	| STRING
	| name
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
ifExpression
	: IF NL* simpleExpression NL* THEN NL* expr (NL* ELSE NL* expr)?
	| IF NL* simpleExpression NL*   DO NL* expr	
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
declarationExpression
	: scope = decl_scope NL*
        decl += variableDeclaration ( comma decl += variableDeclaration )*
	;
variableDeclaration: identifier assignment?
	;
decl_scope: ( LOCAL | GLOBAL | PERSISTENT NL* GLOBAL)
	;

//---------------------------------------- ASSIGNMENT EXPRESSION
assignmentExpression
	: destination (ASSIGN | EQ) NL* expr
	;

assignment: EQ NL* expr
	;

destination: accessor | de_ref | identifier | path
	;

//---------------------------------------- SIMPLE_EXPR
/*
simple_expr : logic ;
logic
	: right = logic (OR | AND) NL* left = comparison
	| <assoc=right> NOT NL* right = logic | comparison
	;
 comparison
	: right = comparison COMPARE NL* left = sum
	| sum
	;
 sum
	: left = sum (PLUS | MINUS | UNARY_MINUS) NL* right = prod
	| prod
 	;
 prod
 	: left = prod (PROD | DIV) NL* right = pow
 	| pow
 	;
 pow
	 : <assoc=right> left = pow POW NL* right = as
	| as
 	;
 as
	: left = as AS NL* classname
	| unary
	; 
 unary
	: (MINUS | UNARY_MINUS) expr_operand
	| expr_operand
	;
 // */
// /*
simpleExpression
	// : (fn_call | de_ref | operand) AS NL* classname #TypecastExpr | fn_call #FnCallExpr | de_ref #DeRef | operand #OperandExpr
	: left = simpleExpression AS NL* classname	                                        //# TypecastExpr
	| (MINUS | UNARY_MINUS) right = simpleExpression									//# UnaryExpr
	| <assoc = right> left = simpleExpression POW NL* right = simpleExpression			//# ExponentExpr
	| left = simpleExpression (PROD | DIV) NL* right = simpleExpression					//# ProductExpr
	| left = simpleExpression (PLUS | MINUS | UNARY_MINUS) NL* right = simpleExpression	//# AdditionExpr
	| left = simpleExpression COMPARE NL* right = simpleExpression						//# ComparisonExpr
	| <assoc = right> NOT NL* right = simpleExpression									//# LogicNOTExpr
	| left = simpleExpression (OR | AND) NL* right = simpleExpression					//# LogicExpr
	| expr_operand							                                            //# ExprOperand
	;
// */

expr_operand
	: functionCall	//# FnCallExpr
	| de_ref	    //# deRef
	| operand	    //# OperandExpr
	;

classname: identifier | expr_seq
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

//TODO: Solve problem with "(roll_distance.width-10)"
functionCall
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
	: identifier
	| path
	| de_ref
	| accessor
	| expr_seq //EXPRESSION SEQUENCE
	| QUESTION
	;

//---------------------------------------- PARAMETER
param: param_name NL* operand_arg
	;

param_name: {this.colonBeNext()}? (identifier | kw_override) COLON
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
// TODO: Remove left recursion
accessor
    // : accessor (index | property)
    // | factor (index | property)
    : factor (index | property)+
	;

//------------------------------------------------------------------------//
// Property accessor
property: DOT NL* (identifier | kw_override)
	;

//Index accessor
index: lb expr rb
	;

//---------------------------------------- FACTORS
factor
	: identifier
	| bool
	| STRING
	| RESOURCE
	| path
	| name
	| NUMBER
	| TIMEVAL
	| QUESTION
	| array
	| bitArray
	| point3
	| point2
	| box2
	| expr_seq //EXPRESSION SEQUENCE
	;

//---------------------------------------- EXPR_SEQ <expr_seq> ::= ( <expr> { ( ; | <eol>) <expr> }
expr_seq:
	lp
		(expr (lbk expr)*)?
	rp
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
// bitArray: SHARP NL* lc (bitexpr ( comma bitexpr)*)? rc
bitArray: SHARP NL* lc bitList? rc
	;
bitList: bitexpr ( comma bitexpr)* ;

bitexpr: expr NL* DOTDOT NL* expr | expr
	;

// Array
// array: SHARP NL* lp (expr ( comma expr)*)? rp
array: SHARP NL* lp arrayList? rp
	;
arrayList: expr ( comma expr)* ;

// Identifiers
identifier
	: GLOB ids
	| {this.noWSBeNext()}? AMP ids
	| ids
	;

ids: (ID | QUOTED_ID | kw_reserved)
	;

path
	: {this.noWSBeNext()}? AMP PATH
	| PATH
	;

name: NAME
	;

de_ref: {this.noWSBeNext()}? PROD (accessor | ids | path)
	;
// by_ref: {this.noWSBeNext()}? AMP (ids | path) ;

// Boolean
bool: (TRUE | FALSE | OFF | ON)
	;
//---------------------------------------- OVERRIDABLE KEYWORDS CONTEXTUAL KEYWORDS...can be used as
// identifiers outside the context...
kw_reserved
	: rolloutControlType |
	( CHANGE
	| DELETED
	| Group
	| LEVEL
	| MenuItem
	| Separator
	| SET
	| SubMenu
	| TIME
	| PrintAllElements )
	;

kw_override
	: ( Attributes
	| Parameters
	| Plugin
	| RCmenu
	| RETURN
	| REDRAW
	| Rollout
	| Tool
	| TO
	| ON )
	;
//---------------------------------------- NEWLINE RESOLVING
lbk: NL+
	;
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