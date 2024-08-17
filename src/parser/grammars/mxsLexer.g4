/* $antlr-format
 alignColons hanging,
 alignSemicolons hanging,
 allowShortBlocksOnASingleLine
 true,
 allowShortRulesOnASingleLine true,
 alignFirstTokens true
 */
lexer grammar mxsLexer;

@header {
	import { mxsLexerBase } from './mxsLexerBase.js'
}

options {
	// caseInsensitive = true;
	superClass = mxsLexerBase;
}
/* 
 @members{ 
 public static readonly NEWLINE_CHANNEL = 2;
 }
 //*/

//COMMENTS
BLOCK_COMMENT: '/*' .*? ('*/' | EOF) -> channel(HIDDEN)
	;

LINE_COMMENT: '--' ~[\r\n]* -> channel(HIDDEN)
	;

//STRING
STRING: String_regular | String_verbatim
	;
//BASIC VALUES
NUMBER
	: Int Cnot?
	| Float
	| Hex
	;
TIMEVAL
	: (( (Int? [.])? Int | Int [.]) [mfstMFST])+
	| Int [:] Int? [.] Int
	| Int [nN]
	;
//--------------------------------------------------------------//
//VALUES
TRUE: T R U E
	;
FALSE: F A L S E
	;
// KEYWORDS
AND: A N D
	;
AS: A S
	;
AT: A T
	;
BY: B Y
	;
CASE: C A S E
	;
CATCH: C A T C H
	;
COLLECT: C O L L E C T
	;
DO: D O
	;
ELSE: E L S E
	;
EXIT: E X I T
	;
FOR: F O R
	;
FROM: F R O M
	;
IF: I F
	;
IN: I N
	;
OF: O F
	;
ON: O N
	;
OFF: O F F
	;
OR: O R
	;
RETURN: R E T U R N
	;
SET: S E T
	;
THEN: T H E N
	;
// THROW:   [tT] [hH] [rR] [oO] [wW];
TO: T O
	;
TRY: T R Y
	;
WHEN: W H E N
	;
WHERE: W H E R E
	;
WHILE: W H I L E
	;
WITH: W I T H
	;
NOT: N O T
	;
PUBLIC: P U B L I C
	;
PRIVATE: P R I V A T E
	;
//RESERVED KEYWORDS
ABOUT: A B O U T
	;
COORDSYS: C O O R D S Y S
	;
LEVEL: L E V E L
	;
TIME: T I M E
	;
UNDO: U N D O
	;
CHANGE: C H A N G E S?
	;
DELETED: D E L E T E D
	;
DefaultAction: D E F A U L T A C T I O N
	;
ANIMATE: A N I M A T E
	;
DontRepeatMessages: D O N T R E P E A T M E S S A G E S
	;
MacroRecorderEmitterEnabled
	: M A C R O R E C O R D E R E M I T T E R E N A B L E D
	;
MXScallstackCaptureEnabled
	: M X S C A L L S T A C K C A P T U R E E N A B L E D
	;
PrintAllElements: P R I N T A L L E L E M E N T S
	;
QUIET: Q U I E T
	;
REDRAW: R E D R A W
	;
//BLOCKS
Group: G R O U P
	;
MacroScript: M A C R O S C R I P T
	;
Rollout: R O L L O U T
	;
Tool: T O O L
	;
Utility: U T I L I T Y
	;
RCmenu: R C M E N U
	;
Parameters: P A R A M E T E R S
	;
Plugin: P L U G I N
	;
Attributes: A T T R I B U T E S
	;
//CONTROLS
Angle         : A N G L E ;
Bitmap        : B I T M A P ;
Button        : B U T T O N ;
CheckBox      : C H E C K B O X ;
CheckButton   : C H E C K B U T T O N ;
ColorPicker   : C O L O R P I C K E R ;
ComboBox      : C O M B O B O X ;
CurveControl  : C U R V E C O N T R O L ;
DotnetControl : D O T N E T C O N T R O L ;
DropdownList  : D R O P D O W N L I S T ;
EditText      : E D I T T E X T ;
GroupBox      : G R O U P B O X ;
Hyperlink     : H Y P E R L I N K ;
ImgTag        : I M G T A G ;
Label         : L A B E L ;
ListBox       : L I S T B O X ;
MapButton     : M A P B U T T O N ;
MaterialButton: M A T E R I A L B U T T O N ;
MultilistBox  : M U L T I L I S T B O X ;
PickButton    : P I C K B U T T O N ;
PopupBenu     : P O P U P M E N U ;
Progressbar   : P R O G R E S S B A R ;
RadioButtons  : R A D I O B U T T O N S ;
Slider        : S L I D E R ;
Spinner       : S P I N N E R ;
Subrollout    : S U B R O L L O U T ;
Timer         : T I M E R ;

Separator: S E P A R A T O R
	;
MenuItem: M E N U I T E M
	;
SubMenu: S U B M E N U
	;
//DEFINTITIONS
MAPPED: M A P P E D
	;
FN: F U N C T I O N | F N
	;
STRUCT: S T R U C T
	;
//DECLARATIONS
LOCAL: L O C A L
	;
GLOBAL: G L O B A L
	;
PERSISTENT: P E R S I S T E N T
	;
//--------------------------------------------------------------//
//IDENTIFIERS
NAME: Sharp (Alpha | Num)+
	;
PATH: Dollar (Alphanum | [*?\\] | Quoted | '...' | '..' | '/')*
	;
/*
 PATH: Dollar Level | Dollar Level ('/' Level)+;
 fragment Level: Level_name | Quoted;
 fragment
 Level_name: (Alphanum | [*?\\])* ;
 */
/*
 PATH: Dollar ->more, mode(PATH_NAME) ;
 
 mode PATH_NAME;
 Levels
 : Level_name ( '/' Level_name)*
 ->more 
 ;
 
 Level_name : (Alphanum | [*?/\\])* ->more;
 
 Level_exit: (WSchar | NLchar) -> skip,
 PopMode;
 */

ID: Alphanum
	;
QUOTED_ID: Quoted
	;
RESOURCE: '~' Alphanum '~'
	;
//--------------------------------------------------------------//
//OPERATORS
EQ: '='
	;
COMPARE: ('==' | '<' | '>' | '<=' | '>=' | '!=')
	;
ASSIGN: ('+=' | '-=' | '*=' | '/=')
	;
UNARY_MINUS: '-' {this.followed()}?
	;
MINUS: '-'
	;
PLUS: '+'
	;
PROD: '*'
	;
DIV: '/'
	;
POW: '^'
	;
//--------------------------------------------------------------//
//SYMBOLS
SHARP: Sharp
	;
COMMA: ','
	;
GLOB: '::'
	;
COLON: ':' //{this.preceeded()}? ':';
	;
DOT: '.'
	;
DOTDOT: '..'
	;
AMP: '&'
	;
QUESTION: '?'
	;
// BACKSLASH : Backslash; DOLLAR: Dollar;
//--------------------------------------------------------------//
// CODE STRUCTURE
// PAREN_PAIR: '()' ;
LPAREN: '('
	;
RPAREN: ')'
	;
LBRACE: '{'
	;
RBRACE: '}'
	;
LBRACK: '['
	;
RBRACK: ']'
	;
//--------------------------------------------------------------//
//WHITESPACE
WS: ( WSchar | Backslash WSchar* [\r\n\f]+)+ -> channel(HIDDEN)
	;
//NEW LINES
NL
	: NLchar+ //-> channel(NEWLINE_CHANNEL)
	;
//--------------------------------------------------------------//
// fragment Nleft : [\r\n] ; wihitewhitespacespace with newlines, around operators, is meaningless
fragment NLeft
	: [\r\n] [ \t\r\n]+ //-> channel(HIDDEN)
	;
fragment Nright
	: [ \t\r\n]+ [\r\n] //-> channel(HIDDEN)
	;
fragment WSchar: [ \t]
	;
fragment NLchar: [\r\n] | Semicolon
	;
//--------------------------------------------------------------//
fragment Float: Int [.] (Int Cnot?)? | [.] Int Cnot?
	;
fragment Cnot: ( [eEdD] ([+-]? Int)? | [LP] )
	;
fragment Hex: '0' [xX] (Num | [aAfF])+
	;
fragment Int: Num+
	;
fragment String_regular: '"' (~["\r\n] | '\\"')* '"'
	;
fragment String_verbatim: '@"' ~["]* '"'
	;
fragment Quoted: '\'' (~['] | '\\\'')* '\''
	;
//--------------------------------------------------------------//
fragment Void
	: U N D E F I N E D
	| U N S U P P L I E D
	| S I L E N T V A L U E
	| O K
	;
// BASIC FRAGMENTS
fragment Num: [0-9]
	;
fragment Alpha: [_\p{L}]
	;
fragment Alphanum: Alpha (Alpha | Num)*
	;
//--------------------------------------------------------------//
//LETTERS
fragment A: [aA]
	;
fragment B: [bB]
	;
fragment C: [cC]
	;
fragment D: [dD]
	;
fragment E: [eE]
	;
fragment F: [fF]
	;
fragment G: [gG]
	;
fragment H: [hH]
	;
fragment I: [iI]
	;
fragment J: [jJ]
	;
fragment K: [kK]
	;
fragment L: [lL]
	;
fragment M: [mM]
	;
fragment N: [nN]
	;
fragment O: [oO]
	;
fragment P: [pP]
	;
fragment Q: [qQ]
	;
fragment R: [rR]
	;
fragment S: [sS]
	;
fragment T: [tT]
	;
fragment U: [uU]
	;
fragment V: [vV]
	;
fragment W: [wW]
	;
fragment X: [xX]
	;
fragment Y: [yY]
	;
fragment Z: [zZ]
	;
//--------------------------------------------------------------//
// Character ranges
/*
 fragment NameChar:
 NameStartChar
 | '0' .. '9'
 | '_'
 | '\u00B7'
 | '\u0300' .. '\u036F'
 |
 '\u203F' .. '\u2040'
 ;
 
 fragment NameStartChar:
 'A' .. 'Z'
 | 'a' .. 'z'
 | '\u00C0' ..
 '\u00D6'
 | '\u00D8' .. '\u00F6'
 | '\u00F8' .. '\u02FF'
 | '\u0370' .. '\u037D'
 | '\u037F' ..
 '\u1FFF'
 | '\u200C' .. '\u200D'
 | '\u2070' .. '\u218F'
 | '\u2C00' .. '\u2FEF'
 | '\u3001' ..
 '\uD7FF'
 | '\uF900' .. '\uFDCF'
 | '\uFDF0' .. '\uFFFD'
 // ignores | ['\u10000-'\uEFFFF]
 ;
 */
fragment Backslash: '\\'
	;
fragment Semicolon: ';'
	;
fragment Dollar: '$'
	;
fragment Sharp : '#'
	;
/*
 fragment Question : '?';
 fragment Slash : '/';
 fragment Excl : '!';
 fragment Colon : ':';
 fragment DColon : '::';
 fragment SQuote : '\'';
 fragment DQuote : '"';
 fragment LParen : '(';
 fragment RParen : ')';
 fragment LBrace : '{';
 fragment RBrace : '}';
 fragment LBrack : '[';
 fragment RBrack : ']';
 fragment Lt : '<';
 fragment Gt : '>';
 fragment Equal : '=';
 fragment Compare : '==';
 fragment Astr : '*';
 fragment Plus : '+';
 fragment Minus : '-';
 fragment Comma : ',';
 fragment Dot : '.';
 fragment Range : '..';
 fragment Amp : '&';
 fragment Tilde : '~';
 fragment Pow : '^';
 */
// Comment this rule out to allow the error to be propagated to the parser
ERRCHAR: . -> channel (HIDDEN)
	;