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
    import { mxsParserBase } from "./base/mxsParserBase.js"
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
	| ifStatement
	| whileLoopStatement
	| doLoopStatement
	| forLoopStatement
	| loopExitStatement
	| caseStatement
	| structDefinition
	| tryStatement
	| fnDefinition
	| fnReturnStatement
	| contextStatement
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
	: ifStatement                  // IF
	| whileLoopStatement           // WHILE
	| forLoopStatement             // FOR
	| tryStatement                 // TRY
	| caseStatement                // CASE
	| declarationStatement         // LOCAL | GLOBAL | PERSISTENT
	| fnDefinition                 // FN | MAPPED
	| fnReturnStatement            // RETURN
	| structDefinition             // STRUCT
	| contextStatement              // AT | IN | WITH | SET | ABOUT
	| whenStatement                // WHEN
	| loopExitStatement            // EXIT
	// Definition blocks - keyword-led
	| macroscriptDefinition         // MacroScript
	| utilityDefinition             // Utility
	| rolloutDefinition             // Rollout
	| toolDefinition                // Tool
	| rcmenuDefinition              // RCmenu
	| pluginDefinition              // Plugin
	| attributesDefinition          // Attributes
	// Ambiguous cases - must be last (can start with identifier/accessor/path)
	| doLoopStatement              // DO (conflicts with if-do, while-do, etc.)
	| simpleExpression              // Fallback - expressions, assignments, function calls, etc.
	;
//*/
//-------------------------------------- MACROSCRIPT_DEF
macroscriptDefinition
	: macroscriptClause NL*
    lp
        (macroscriptMembers (lbk? macroscriptMembers)*)?
    rp
	;
macroscriptClause: MacroScript NL* macro_name = identifier ( NL* param )*
	;
macroscriptMembers: expr | eventHandlerStatement
	;
//-------------------------------------- UTILITY_DEF
utilityDefinition
	: utilityClause NL*
    lp
        ( rolloutMembers (lbk? rolloutMembers)* )?
    rp
	;
utilityClause: Utility NL* utility_name = identifier NL* operand (NL* param)*
	;
//-------------------------------------- ROLLOUT_DEF
rolloutDefinition
	: rolloutClause NL*
    lp
        ( rolloutMembers (lbk? rolloutMembers)* )?
    rp
	;

rolloutClause: Rollout NL* rollout_name = identifier NL* operand (NL* param)*
	;
rolloutMembers
	: declarationStatement
	| rolloutControl
	| rolloutGroupDefinition
	| fnDefinition
	| structDefinition
	| eventHandlerStatement
	| toolDefinition
	| rolloutDefinition
	;

rolloutGroupDefinition
	: groupClause NL*
    lp
        ( rolloutControl (lbk? rolloutControl)* )?
    rp
	;
groupClause: Group NL* group_name = STRING?
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
	: toolClause NL*
    lp
        toolMembers (lbk? toolMembers)*
    rp
	;
toolClause: Tool NL* tool_name = identifier (NL* param)*
	;
toolMembers: declarationStatement | fnDefinition | structDefinition | eventHandlerStatement
	;

//-------------------------------------- RCMENU_DEF
rcmenuDefinition
	: rcmenuClause NL*
	lp
		(rcMembers (lbk? rcMembers)*)?
	rp
	;
rcmenuClause: RCmenu NL* rc_name = identifier
	;
rcSubmenuDefinition
	: submenuClause NL*
    lp
        ( rcMembers (lbk? rcMembers)* )?
    rp
	;
submenuClause: SubMenu NL* submenu_name = STRING (NL* param)*
	;
rcMembers
	: declarationStatement
	| fnDefinition
	| structDefinition
	| eventHandlerStatement
	| rcSubmenuDefinition
	| rcmenuControl
	;

rcmenuControl
	: MenuItem (NL* operand)+ (NL* param)*
	| Separator NL* identifier (NL* param)*
	;

//-------------------------------------- PLUGIN_DEF
pluginDefinition
	: pluginClause NL*
    lp
        pluginMembers (lbk? pluginMembers)*
    rp
	;
pluginClause: Plugin NL* plugin_kind = identifier NL* plugin_name = identifier (NL* param)*
	;
pluginMembers
	: declarationStatement
	| fnDefinition
	| structDefinition
	| toolDefinition
	| rolloutDefinition
	| eventHandlerStatement
	| paramsDefinition
	;

//-------------------------------------- CHANGE_HANDLER when <attribute> <objects> change[s] [
// id:<name> ] [handleAt:#redrawViews|#timeChange] [ <object_parameter> ] do <expr> when <objects>
// deleted [ id:<name> ] [handleAt:#redrawViews|#timeChange] [ <object_parameter> ] do <expr>
// objects var_name | path | array

whenStatement: whenClause NL* DO NL* expr
	;

whenClause
	: WHEN NL* (reference NL*)? (reference | path | exprSeq | array) NL* identifier  NL*  (NL* param)* (NL* operand)?
	;

//-------------------------------------- CONTEXT_EXPR

contextStatement
	: ctxCascading
	| ctxSet
	;

ctxCascading: ctxClause (comma ctxClause)* NL* expr
	;
/*
	set <context>      
	Where, <context> is one of the MAXScript context prefixes: animate , time , in , coordsys , about , level , or undo .
 */
ctxSet
	: SET (
		(ANIMATE | TIME | LEVEL | IN) NL* operand
		| ctxCoordsys
		| ctxAbout
		| ctxUndo
	)
	;

/* One of the following context expressions:
	at level <node>
	at time <time>
	in <node>
	[ in ] coordsys ( local | world | parent | <operand> )
	about ( pivot | selection | coordsys | <operand> )
	[ with ] animate <boolean> 
	[ with ] undo <boolean>
	[ with ] redraw <boolean>
	[ with ] quiet <boolean>
	[ with ] redraw <boolean>
	[ with ] printAllElements <boolean>
	[ with ] defaultAction <action>
	[ with ] MXSCallstackCaptureEnabled <boolean>
	[ with ] dontRepeatMessages <boolean>
	[ with ] macroRecorderEmitterEnabled <boolean>
 */
ctxClause
	: AT NL* (LEVEL | TIME) NL* operand
	| IN NL* (ctxCoordsys | operand)
	| WITH NL* (ctxUndo | ctxSwitches)
	| ctxAbout
	| ctxCoordsys
	| ctxUndo
	| ctxSwitches
	;

ctxAbout: ABOUT NL* (COORDSYS | operand)
	;
ctxCoordsys: COORDSYS NL* (LOCAL | operand)
	;
ctxUndo: UNDO NL* (STRING | param | reference)? NL* operand
	;
ctxSwitches
	: ( ANIMATE
	| DefaultAction
	| DontRepeatMessages
	| MacroRecorderEmitterEnabled
	| MXScallstackCaptureEnabled
	| PrintAllElements
	| QUIET
	| REDRAW ) NL* operand
	;

//-------------------------------------- PARAMETER DEF
paramsDefinition
	: paramsClause NL*
    lp
        ( paramsMembers (lbk paramsMembers)* )?
    rp
	;
paramsClause: Parameters NL* identifier (NL* param)*
	;
paramsMembers
	: paramDefinition
	| eventHandlerStatement
	;
paramDefinition: identifier (NL* param)*
	;

//-------------------------------------- ATTRIBUTES DEFINITION attributes <name> [version:n]
// [silentErrors:t/f] [initialRollupState:0xnnnnn] [remap:#(<old_param_names_array>,
// <new_param_names_array>)]
attributesDefinition
	: attributesClause NL*
    lp
        attributesMembers ( lbk attributesMembers )*
    rp
	;
attributesClause: Attributes NL* identifier (NL* param)*
	;
attributesMembers
	: declarationStatement
	| eventHandlerStatement
	| paramsDefinition
	| rolloutDefinition
	;

//-------------------------------------- EVENT HANDLER
eventHandlerStatement
	: ON NL* ev_args = eventArgs NL* ev_action = (DO | RETURN) NL* ev_body = expr
	;

eventArgs
	: refs += reference (NL* refs += reference)*
	;

//---------------------------------------- STRUCT DEF
structDefinition
	: STRUCT NL* str_name = identifier NL*
    lp
        structBody
    rp
	;

structBody: (structAccess NL*)? structMembers ( comma (structAccess NL*)? structMembers )*
	;

structMembers
	: structMember
	| fnDefinition
	| eventHandlerStatement	
	;

structMember: identifier assignment? ;

structAccess: PUBLIC | PRIVATE
	;

//---------------------------------------- FUNCTION DEF
fnDefinition
	: (fn_mod = MAPPED NL* fn_decl = FN | fn_decl = FN) NL* fn_name = identifier NL*
		( NL* fnArgs )*
		( NL* fnParams )*
		NL* fnBody
	;

fnBody
	: EQ NL* expr
	;
fnArgs
	: {this.noWSBeNext()}? AMP identifier   // &arg - by-reference parameter
	| identifier                             // arg - by-value parameter
	;
fnParams
	: {this.colonBeNext()}? (identifier | kwOverride) COLON (NL* operandArg)?
	;

//FN_RETURN
fnReturnStatement: RETURN NL* returnValue = expr
	;

//---------------------------------------- LOOPS While loop
whileLoopStatement: WHILE NL* condition = expr NL* DO NL* body = expr
	;

// Do loop
doLoopStatement: DO NL* body = expr NL* WHILE NL* condition = expr
	;

/* For loop
 * for <var_name> [, <index_name>[, <filtered_index_name>]] ( in | = )<sequence> ( do | collect ) <expr>
 * for-sequence
 * <expr> to <expr> [ by <expr> ] [while <expr>] [where <expr> ]
 * <expr> to <expr> [ by <expr> ] [where <expr> ]
 * <expr> [while <expr>] [ where<expr> ]
 * <expr> [where <expr>]
 */

forLoopStatement
	: FOR NL* forBody NL* for_operator = (IN | EQ) NL* forSequence NL* for_action = (DO | COLLECT) NL* body = expr
	;

forBody : var = reference ( comma index_name = reference ( comma filtered_index_name = reference )? )?
	;
forSequence : expr ( NL* forTo NL* forBy? )? ( NL* (forWhile NL* forWhere? | forWhere) )?
	;
forTo: TO NL* expr
	;
forBy: BY NL* expr
	;
forWhile: WHILE NL* expr
	;
forWhere: WHERE NL* expr
	;
loopExitStatement: EXIT (NL* WITH NL* exitValue = expr)?
	;

//----------------------------------------TRY EXPR
tryStatement: TRY NL* tryBody = expr NL* CATCH NL* catchBody = expr
	;

//---------------------------------------- CASE-EXPR
caseStatement
	: caseClause NL*
	lp
		caseItem (lbk caseItem)*
	rp
	;
caseClause: CASE (NL* expr)? NL* OF
	;
// This will produce errors at compile time...
caseItem: factor COLON NL* expr
	;

//---------------------------------------- IF-CLAUSE
// OPTIMIZED: Factor common prefix to avoid re-parsing condition
// Key insight: Use simpleExpression for condition (not expr) to avoid infinite recursion
// The body can be expr (which may include nested if statements)
ifStatement
	: IF NL* ifCondition = simpleExpression NL* (
		THEN NL* thenBody = expr (NL* ELSE NL* elseBody = expr)?
		| DO NL* doBody = expr
	)
	;

/* PREVIOUS VERSIONS (kept for reference)

// This works but is slow - parses condition twice
ifStatement
	: IF NL* simpleExpression NL* THEN NL* expr (NL* ELSE NL* expr)?
	| IF NL* simpleExpression NL*   DO NL* expr	
	;

// This caused infinite loop - used expr in condition (includes ifStatement recursively)
if_statement
 : IF NL* ifClause = expr NL* THEN NL*
    ifBody = expr NL*
        (ELSE NL* elseBody = expr | {this.itsNot(mxsLexer.ELSE)}? )
    | IF NL* ifClause = expr NL* DO NL* ifBody = expr
    ;
*/

//---------------------------------------- DECLARATIONS
declarationStatement
	: scope = declScope NL*
        decl += variableDeclaration ( comma decl += variableDeclaration )*
	;
variableDeclaration: identifier assignment?
	;
declScope: ( LOCAL | GLOBAL | PERSISTENT NL* GLOBAL)
	;

assignment: EQ NL* expr
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
// ASSIGNMENT EXPRESSION is now integrated into simpleExpression as its lowest-precedence operator.

simpleExpression
	: left = simpleExpression (ASSIGN | EQ) NL* assignExpr = expr						//# AssignmentExpr (LOWEST precedence)
	| left = simpleExpression AS NL* classname	                                        //# TypecastExpr
	| left = simpleExpression OR NL* right = simpleExpression					        //# LogicOrExpr
	| left = simpleExpression AND NL* right = simpleExpression					        //# LogicAndExpr
	| left = simpleExpression COMPARE NL* right = simpleExpression						//# ComparisonExpr
	| left = simpleExpression (PLUS | MINUS | UNARY_MINUS) NL* right = simpleExpression	//# AdditionExpr
	| left = simpleExpression (PROD | DIV) NL* right = simpleExpression					//# ProductExpr
	| <assoc = right> left = simpleExpression POW NL* right = simpleExpression			//# ExponentExpr (right assoc)
	| (MINUS | UNARY_MINUS) right = simpleExpression									//# UnaryMinusExpr (prefix)
	| <assoc = right> NOT NL* right = simpleExpression									//# LogicNotExpr (prefix)
	| exprOperand							                                            //# ExprOperand (HIGHEST precedence)
	;

// MaxScript operator precedence within exprOperand:
// Ordered choice in ANTLR: first match wins
//
// 1. Try prefix operators (&, *) first - they bind to the tightest construct after them
//    &foo.bar → &(foo.bar) - reference to accessor result
//    *foo.bar → *(foo.bar) - dereference accessor result
//
// 2. Then try function calls - postfix operator that needs call syntax
//    foo.bar() → (foo.bar)() - call the result of accessor
//
// 3. Finally try operand - accessor (postfix .[]) or primary (literals/identifiers)
//    foo.bar → accessor
//    foo → identifier (via factor)
//
// This ordering correctly implements MaxScript's precedence where & and * are prefix
// operators that have lower precedence than postfix operators (. [] ()), meaning:
// - &obj.prop is parsed as &(obj.prop), not (&obj).prop
// - *arr[0] is parsed as *(arr[0]), not (*arr)[0]
exprOperand
	: functionCall
	| deRef
	| operand
	;

operand
	: accessor    // Postfix: property/index access (obj.prop[0])
	| factor      // Primary: literals, identifiers, paths, etc.
	;

classname: ID | kwReserved | exprSeq
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
 1. fnCaller now excludes deRef (handled separately in exprOperand)
 2. Parser tries functionCall first, which requires call syntax
 3. If no call syntax present, falls back to plain operand
 4. This still requires backtracking but is necessary for MaxScript's syntax
 
 The ambiguity between "foo bar" (call) and "foo bar" (two identifiers)
 is resolved by operator precedence - function calls bind tighter than
 most operators, so arguments are consumed greedily up to an operator.
 */

functionCall
	: fnCaller (
		parenPair                                    // foo()
		| (args += operandArg)+ (params += param)*   // foo arg1 arg2 x:val
		| (params += param)+                          // foo x:val y:val
	)
	;

parenPair: {this.closedParens()}? LPAREN RPAREN
	;

fnCaller
	: accessor
	| reference
	| path
	| exprSeq
	| QUESTION
	;

//---------------------------------------- PARAMETER
param: paramName NL* operandArg
	;

paramName: {this.colonBeNext()}? (identifier | kwOverride) COLON
	;

operandArg
	: UNARY_MINUS operand
	| operand
	;

// ------------------------------------------------------------------------ ACCESSORS
/*
accessor // with left recursion to handle chaining: foo.bar[1].baz
    : accessor (index | property)
    | factor (index | property)
	;
 */
accessor
    : factor (index | property)+
	;

// Property accessor
property
	: DOT NL* (identifier | kwOverride)
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
	| vector
	| exprSeq //EXPRESSION SEQUENCE
	;

//---------------------------------------- EXPR_SEQ <exprSeq> ::= ( <expr> { ( ; | <eol>) <expr> }
exprSeq:
	lp
		(expr (lbk expr)*)?
	rp
	;

//---------------------------------------- TYPES
// Unified vector literal: [expr, expr, ...] — covers Point2, Point3, Box2, etc.
vector:
    lb
        expr (comma expr)*
    rb
	;

// BitArray
bitArray: SHARP NL* lc bitList? rc
	;
bitList: bitexpr ( comma bitexpr)*
	;
// Current: SLL conflict — both alts start with expr
// bitexpr: expr NL* DOTDOT NL* expr | expr

// Fix: factor common prefix — fully LL(1) after parsing expr
bitexpr: expr (NL* DOTDOT NL* expr)?
	;

// Array
array: SHARP NL* lp arrayList? rp
	;
arrayList: expr ( comma expr)*
	;

// Dereference operator: *identifier, *path, *accessor
deRef: {this.noWSBeNext()}? PROD (accessor | reference | path)
	;
// Reference operator: &identifier, &path, &accessor
// by_ref: {this.noWSBeNext()}? AMP (accessor | reference | path);

// Identifiers
reference
	: GLOB identifier
	| {this.noWSBeNext()}? AMP identifier //by_ref
	| identifier
	;

identifier
	: (ID | QUOTED_ID | kwReserved)
	;

path
	: {this.noWSBeNext()}? AMP PATH
	| PATH
	;

name: NAME
	;

bool: (TRUE | FALSE | OFF | ON)
	;
//---------------------------------------- OVERRIDABLE KEYWORDS CONTEXTUAL KEYWORDS
//...can be used as identifiers outside the context...
kwReserved
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

kwOverride
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