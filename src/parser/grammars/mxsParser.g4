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

 /*
// OLD VERSION:
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
//*/
///*
expr
	// Keyword-led expressions - unambiguous, fast first-token lookup
	: ifExpression                  // IF
	| whileLoopExpression           // WHILE
	| forLoopExpression             // FOR
	| tryExpression                 // TRY
	| caseExpression                // CASE
	| declarationExpression         // LOCAL | GLOBAL | PERSISTENT
	| fnDefinition                  // FN | MAPPED
	| fnReturnStatement             // RETURN
	| structDefinition              // STRUCT
	| contextExpression             // AT | IN | WITH | SET | ABOUT
	| whenStatement                 // WHEN
	| loopExitStatement             // EXIT
	// Definition blocks - keyword-led
	| macroscriptDefinition         // MacroScript
	| utilityDefinition             // Utility
	| rolloutDefinition             // Rollout
	| toolDefinition                // Tool
	| rcmenuDefinition              // RCmenu
	| pluginDefinition              // Plugin
	| attributesDefinition          // Attributes
	// Ambiguous cases - must be last (can start with identifier/accessor/path)
	| doLoopExpression              // DO (conflicts with if-do, while-do, etc.)
	| assignmentExpression          // catch-all: simpleExpression with optional assignment
	;
//*/
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
        tool_clause (lbk? tool_clause)*
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
		(rc_clause (lbk? rc_clause)*)?
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
	: WHEN NL* (reference NL*)? (reference | path | expr_seq | array) NL* identifier  NL*  (NL* param)* (NL* operand)?
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
	| SET UNDO NL* (STRING | param | reference)? NL* simpleExpression
	;

ctx_predicate
	: AT NL* (LEVEL | TIME) NL* operand
	| IN NL* operand
	| ABOUT NL* (COORDSYS | operand)
	| (IN NL*)? COORDSYS NL* (LOCAL | operand)
	| (WITH NL*)? UNDO NL* (STRING | param | reference)? NL* simpleExpression
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
	: ev_target = reference NL* ev_type = reference ( NL* ev_args += reference )+
	| ev_target = reference NL* ev_type = reference
	| ev_type = reference
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
		( NL* fn_params )*
		NL* fn_body
	;

fn_body
	: EQ NL* expr
	;
fn_args
	: reference
	// | de_ref
	;
fn_params
	: {this.colonBeNext()}? (identifier | kw_override) COLON (NL* operand_arg)?
	;

//FN_RETURN
fnReturnStatement: RETURN NL* returnValue = expr
	;

//---------------------------------------- LOOPS While loop
whileLoopExpression: WHILE NL* condition = expr NL* DO NL* body = expr
	;

// Do loop
doLoopExpression: DO NL* body = expr NL* WHILE NL* condition = expr
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
	: FOR NL* for_body NL* for_operator = (IN | EQ) NL* for_sequence NL* for_action = (DO | COLLECT) NL* body = expr
	;

for_body : var = reference ( comma index_name = reference ( comma filtered_index_name = reference )? )?
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
loopExitStatement: EXIT (NL* WITH NL* exitValue = expr)?
	;

//----------------------------------------TRY EXPR
tryExpression: TRY NL* tryBody = expr NL* CATCH NL* catchBody = expr
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

// OPTIMIZED: Factor common prefix to avoid re-parsing condition
// Key insight: Use simpleExpression for condition (not expr) to avoid infinite recursion
// The body can be expr (which may include nested if statements)
ifExpression
	: IF NL* ifCondition = simpleExpression NL* (
		THEN NL* thenBody = expr (NL* ELSE NL* elseBody = expr)?
		| DO NL* doBody = expr
	)
	;

/* PREVIOUS VERSIONS (kept for reference)

// This works but is slow - parses condition twice
ifExpression
	: IF NL* simpleExpression NL* THEN NL* expr (NL* ELSE NL* expr)?
	| IF NL* simpleExpression NL*   DO NL* expr	
	;

// This caused infinite loop - used expr in condition (includes ifExpression recursively)
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
// Unified rule: parse simpleExpression, then optionally match assignment.
// This eliminates the prediction ambiguity between assignmentExpression and
// simpleExpression that caused LL-mode failures during deep lookahead.
assignmentExpression
	: simpleExpression ((ASSIGN | EQ) NL* expr)?
	;

assignment: EQ NL* expr
	;

destination: de_ref | reference | path | accessor
	;

//---------------------------------------- SIMPLE_EXPR
//--- Operator Precedence (Correct MaxScript Order) ---//
// Direct left recursion - ANTLR4 handles efficiently
// Precedence from LOWEST to HIGHEST (top to bottom):
// 1. Type cast (as)
// 2. Logical OR
// 3. Logical AND
// 4. Comparison (==, !=, <, >, <=, >=)
// 5. Addition/Subtraction (+, -)
// 6. Multiplication/Division (*, /)
// 7. Exponentiation (^) - right associative
// 8. Unary prefix (-, +, not) - right associative
// 9. Primary expressions (highest)

simpleExpression
	: left = simpleExpression AS NL* classname	                                        //# TypecastExpr (LOWEST precedence)
	| left = simpleExpression OR NL* right = simpleExpression					        //# LogicOrExpr
	| left = simpleExpression AND NL* right = simpleExpression					        //# LogicAndExpr
	| left = simpleExpression COMPARE NL* right = simpleExpression						//# ComparisonExpr
	| left = simpleExpression (PLUS | MINUS | UNARY_MINUS) NL* right = simpleExpression	//# AdditionExpr
	| left = simpleExpression (PROD | DIV) NL* right = simpleExpression					//# ProductExpr
	| <assoc = right> left = simpleExpression POW NL* right = simpleExpression			//# ExponentExpr (right assoc)
	| (MINUS | UNARY_MINUS) right = simpleExpression									//# UnaryMinusExpr (prefix)
	| <assoc = right> NOT NL* right = simpleExpression									//# LogicNotExpr (prefix)
	| expr_operand							                                            //# ExprOperand (HIGHEST precedence)
	;

expr_operand
	: functionCall
	| de_ref
	| operand
	;

operand
	: accessor
	| factor
	;

classname: ID | kw_reserved | expr_seq
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
 
 Strategy to reduce backtracking:
 1. fn_caller now excludes de_ref (handled separately in expr_operand)
 2. Parser tries functionCall first, which requires call syntax
 3. If no call syntax present, falls back to plain operand
 4. This still requires backtracking but is necessary for MaxScript's syntax
 
 The ambiguity between "foo bar" (call) and "foo bar" (two identifiers)
 is resolved by operator precedence - function calls bind tighter than
 most operators, so arguments are consumed greedily up to an operator.
 */

functionCall
	: fn_caller (
		paren_pair                                    // foo()
		| (args += operand_arg)+ (params += param)*   // foo arg1 arg2 x:val
		| (params += param)+                          // foo x:val y:val
	)
	;

paren_pair: {this.closedParens()}? LPAREN RPAREN
	;

fn_caller
	: accessor
	| reference
	| path
	| expr_seq
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
	: reference
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
arrayList: expr ( comma expr)*
	;

de_ref: {this.noWSBeNext()}? PROD (accessor | identifier | path)
	;
// by_ref: {this.noWSBeNext()}? AMP (ids | path) ;

// Identifiers
reference
	: GLOB identifier
	| {this.noWSBeNext()}? AMP identifier
	| identifier
	;

identifier: (ID | QUOTED_ID | kw_reserved)
	;

path
	: {this.noWSBeNext()}? AMP PATH
	| PATH
	;

name: NAME
	;



// Boolean
bool: (TRUE | FALSE | OFF | ON)
	;
//---------------------------------------- OVERRIDABLE KEYWORDS CONTEXTUAL KEYWORDS...can be used as
// identifiers outside the context...
kw_reserved
	: rolloutControlType |
	( Group
	| LEVEL
	| MenuItem
	| Separator
	| SET
	| SubMenu
	| TIME
	| Tool
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
	| AND
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