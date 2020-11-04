# @preprocessor typescript
@{%
	const mxLexer = require('./mooTokenize.js');
    // Utilities
    const $empty = '';

    const flatten = arr => arr != null ? arr.flat().filter(e => e != null) : [];

    const collectSub = (arr, index) => arr != null ? arr.map(e => e[index]) : [];

    const filterNull = arr => arr != null ? arr.filter(e => e != null) : [];

    const tokenType = (t, newytpe) => {t.type = newytpe; return t;}

    const merge = (a, ...b) => {
        if (a == null) {return null;}
        return b != null ? [].concat(a, ...b).filter(e => e != null) : [].concat(a).filter(e => e != null);
    }

    const convertToken = (token, newtype) => {
        let node = {...token};
            node.type = newtype;
        return node;
    }
    // Offset is not reilable, changed to line - col
    const getLoc = (start, end) => {
        if (!start) {return null;}

        let startOffset = start.loc ? start.loc.start : {line: start.line, col: start.col};
        let endOffset;

        if (!end) {
            if (start.loc) {
                endOffset = start.loc.end;
            } else {
                endOffset = {
                    line: start.line,
                    col: (start.text != null ? start.col + (start.text.length - 1): start.col)
                };                
            }
        } else {
            if (end.loc) {
                endOffset = end.loc.end;
            } else {
                endOffset = {
                    line: end.line,
                    col: (end.text != null ? end.col + (end.text.length - 1) : end.col)                
                };
            }
        }
        return ({start: startOffset, end: endOffset});
    }
    // parser configuration
    //let capture_ws = false;
    //let capture_comments = false;
%}
# USING MOO LEXER
@lexer mxLexer
#===============================================================
# ENTRY POINT
Main -> _ _expr_seq _ {% d => d[1] %}
#---------------------------------------------------------------
# Expressions main recursion
    # _EXPR -> expr (EOL expr):*    {% d => merge(...d) %}
    
    # _EXPR
    #     -> _EXPR EOL expr {% d => [].concat(d[0], d[2])%}
    #     | expr
# ---------------------------------------------------------------
# EXPRESSIONS LIST --- OK
    expr
        -> simple_expr    {% id %}
        | variable_decl   {% id %}
        | assignment      {% id %}
        | if_expr         {% id %}
        | while_loop      {% id %}
        | do_loop         {% id %}
        | for_loop        {% id %}
        | loop_exit       {% id %}
        | case_expr       {% id %}
        | struct_def      {% id %}
        | try_expr        {% id %}
        | function_def    {% id %}
        | fn_return       {% id %}
        | context_expr    {% id %}
        # | set_context     {% id %}
        | utility_def     {% id %}
        | rollout_def     {% id %}
        | tool_def        {% id %}
        | rcmenu_def      {% id %}
        | macroscript_def {% id %}
        | plugin_def      {% id %}
        | change_handler  {% id %}
#---------------------------------------------------------------
    simple_expr
        -> math_expr   {% id %}
        | compare_expr {% id %}
        | logical_expr {% id %}
        # | operand      {% id %}
        # -> operand      {% id %}
#---------------------------------------------------------------
# EXPRESSIONS - RECURSION!
    expr_seq
        -> LPAREN _expr_seq RPAREN
            # {% d => d[1] %}
            {% d => ({
                type: 'BlockStatement',
                body: d[1],
                //loc: getLoc(d[0], d[2])
            })%}
        | "(" _ ")"
            {% d => ({
                type: 'BlockStatement',
                body: [],
                //loc: getLoc(d[0], d[2])
            })%}
   
    # _expr_seq -> expr  (EOL expr):*
    # {% d => ({
    #     type: 'BlockStatement',
    #     body: merge(d[0], d[1])
    # })%}

    _expr_seq
        -> _expr_seq EOL expr {% d => [].concat(d[0], d[2]) %}
        | expr #{% id %}
#===============================================================
# DEFINITIONS
#===============================================================
# RC MENU DEFINITION - OK
    rcmenu_def
        -> (%kw_rcmenu __) var_name _
            LPAREN
                rcmenu_clauses:?
            RPAREN
        {% d => ({
            type: 'EntityRcmenu',
            id:   d[1],
            body: d[4],
            loc: getLoc(d[0][0], d[5])
        })%}
    
    rcmenu_clauses
        -> rcmenu_clauses EOL rcmenu_clause {% d => [].concat(d[0], d[2]) %}
        | rcmenu_clause {% id %}

    rcmenu_clause
        -> variable_decl {% id %}
        | function_def   {% id %}
        | struct_def     {% id %}
        | event_handler  {% id %}
        | rcmenu_submenu {% id %}
        | rcmenu_sep     {% id %}
        | rcmenu_item    {% id %}
    
    rcmenu_submenu
        -> (%kw_submenu _) string (_ parameter):? _
            LPAREN
                rcmenu_clauses:?
            RPAREN
    {% d => ({
        type:   'EntityRcmenu_submenu',
        label:  d[1],
        params: flatten(d[2]),
        body:   d[5],
        loc: getLoc(d[0][0], d[6])
    })%}
    
    rcmenu_sep -> (%kw_separator __) var_name (_ rcmenu_param):?
    {% d => ({
        type:   'EntityRcmenu_separator',
        id:     d[1],
        params: flatten(d[2]),
    })%}
    
    rcmenu_item -> (%kw_menuitem __) var_name _ string (_ rcmenu_param):*
    {% d => ({
        type:   'EntityRcmenu_menuitem',
        id:     d[1],
        label:  d[3],
        params: flatten(d[4]),
    })%}
    
    rcmenu_param -> param_name _ (operand | function_def)
        {% d => ({
            type: 'ParameterAssignment',
            param: d[0],
            value: d[2],
        })%}
#---------------------------------------------------------------
# PLUGIN DEFINITION --- OK
    plugin_def
        -> (%kw_plugin __) var_name __ var_name  (_ parameter):* _
            LPAREN
                plugin_clauses
            RPAREN
            {% d => ({
                type:       'EntityPlugin',
                superclass: d[1],
                class:      d[3],
                params:     flatten(d[4]),
                body:       d[7],
                loc:    getLoc(d[0][0], d[8])
            })%}

    plugin_clauses
        -> plugin_clause (EOL plugin_clause):* {% d => merge(d[0], d[1]) %}

    # plugin_clauses
        # -> plugin_clauses EOL plugin_clause {% d => [].concat(d[0], d[2]) %}
        # | plugin_clause {% id %}
        # | null

    plugin_clause
        -> variable_decl    {% id %}
        | function_def      {% id %}
        | struct_def        {% id %}
        | tool_def          {% id %}
        | rollout_def       {% id %}
        | event_handler     {% id %}
        | plugin_parameter  {% id %}
    #---------------------------------------------------------------
    plugin_parameter
        -> (%kw_parameters __) var_name (_ parameter):* _
            LPAREN
                param_clauses:?
            RPAREN
            {% d => ({
                type:   'EntityPlugin_params',
                id:     d[1],
                params: flatten(d[2]),
                body:   d[5] || [],
                loc: getLoc(d[0][0], d[6])
            })%}

    param_clauses
        -> param_clauses EOL param_clause {% d => [].concat(d[0], d[2]) %}
        | param_clause
        # | null

    param_clause
        -> param_defs   {% id %}
        | event_handler {% id %}

    param_defs -> var_name (_ parameter):*
    {% d => ({
            type:   'PluginParam',
            id:     d[0],
            params: flatten(d[1])
    })%}
#---------------------------------------------------------------
# TOOL - MOUSE TOOL DEFINITION - OK
    tool_def
        -> (%kw_tool __) var_name (_ parameter):* _
            LPAREN
                tool_clauses
            RPAREN
            {% d => ({
                type:   'EntityTool',
                id:     d[1],
                params: flatten(d[2]),
                body:   d[5],
                loc:    getLoc(d[0][0], d[6])
            })%}
    
    tool_clauses -> tool_clause (EOL tool_clause):* {% d => merge(...d) %}
    
    tool_clause
        -> variable_decl {% id %}
        | function_def   {% id %}
        | struct_def     {% id %}
        | event_handler  {% id %}
#---------------------------------------------------------------
# UTILITY DEFINITION -- OK
    utility_def
        -> (%kw_utility __) var_name _ operand (_ parameter):* _
            LPAREN
                utility_clauses
            RPAREN
            {% d => ({
                type:   'EntityUtility',
                id:     d[1],
                title:  d[3],
                params: flatten(d[4]),
                body:   d[7],
                loc:    getLoc(d[0][0], d[8])
            })%}
   
    utility_clauses -> utility_clause (EOL utility_clause):* {% d => merge(...d) %}

    utility_clause
        -> rollout_clause  {% id %}
        | rollout_def      {% id %}
#---------------------------------------------------------------
# ROLLOUT DEFINITION --- OK
    rollout_def
        -> (%kw_rollout  __) var_name _ operand (_ parameter):* _
            LPAREN
                rollout_clauses
            RPAREN
            {% d => ({
                type:   'EntityRollout',
                id:     d[1],
                title:  d[3],
                params: flatten(d[4]),
                body:   d[7],
                loc:    getLoc(d[0][0], d[8])
            })%}
    #---------------------------------------------------------------
    # rollout_clauses
    #    -> LPAREN _rollout_clause RPAREN {% d => d[1] %}
    #     | "(" _ ")" {% d => null %}

    rollout_clauses -> rollout_clause (EOL rollout_clause):* {% d => merge(...d) %}

    #rollout_clauses
    #    -> rollout_clauses EOL rollout_clause {% d => [].concat(d[0], d[2]) %}
    #    | rollout_clause
    
    rollout_clause
        -> variable_decl {% id %}
        | function_def   {% id %}
        | struct_def     {% id %}
        | item_group     {% id %}
        | rollout_item   {% id %}
        | event_handler  {% id %}
        | tool_def       {% id %}
        | rollout_def    {% id %}
    #---------------------------------------------------------------
    item_group
        -> (%kw_group _) string _
            LPAREN
                group_clauses
            RPAREN
            {% d => ({
                type: 'EntityRolloutGroup',
                id:   d[1],
                body: d[4],
                loc:getLoc(d[0][0], d[5])
            })%}
    
    group_clauses
        -> group_clauses EOL rollout_item {% d => [].concat(d[0], d[2]) %}
        | rollout_item
        # | null
    #---------------------------------------------------------------
    rollout_item
        -> %kw_uicontrols __ var_name ( _ operand):? ( _ parameter):*
            {% d => ({
                type:   'EntityRolloutControl',
                class:  d[0],
                id:     d[2],
                text:   (d[3] != null ? d[3][1] : null),
                params: flatten(d[4])
            })%}
#---------------------------------------------------------------
# MACROSCRIPT --- SHOULD AVOID LEFT RECURSION ?
    macroscript_def
        -> (%kw_macroscript __) var_name ( _ macro_script_param):* _
            LPAREN
                (macro_script_body):?
            RPAREN
            {% d => ({
                type:   'EntityMacroscript',
                id:     d[1],
                params: flatten(d[2]),
                body:   d[5] || [],
                loc:    getLoc(d[0][0], d[6])
            })%}

    macro_script_param
        -> param_name _ ( operand | resource )
            {% d => ({
                type: 'ParameterAssignment',
                param: d[0],
                value: d[2][0]
            })%}

    macro_script_body -> macro_script_clause ( EOL macro_script_clause ):* {% d => merge(...d) %}

    # macro_script_body
        # -> null
        # | macro_script_clause
        # | macro_script_body EOL macro_script_clause {% d => [].concat(d[0], d[2]) %}

    macro_script_clause
        -> expr         {% id %}
        | event_handler {% id %}
#---------------------------------------------------------------
# STRUCT DEFINITION --- OK
    # TODO: FINISH LOCATION
    struct_def
        -> (%kw_struct __ ) var_name _
            LPAREN
                struct_members
            RPAREN
            {% d => ({
                type: 'Struct',
                id:   d[1],
                body: d[4],
                loc:  getLoc(d[0][0], d[5])
            })%}
    struct_members
        -> struct_members (_ "," _) _struct_member {% d => [].concat(d[0], d[2])%}
        | _struct_member

    _struct_member
    -> str_scope _EOL_ struct_member {% d => [].concat(d[0], d[2]) %}
    | struct_member {% id %}
    | str_scope     {% id %}

    str_scope -> %kw_scope
        {% d => ({
            type:'StructScope',
            value: d[0]
        }) %}
    #---------------------------------------------------------------
    struct_member
        -> decl          {% id %}
        | function_def   {% id %}
        | event_handler  {% id %}
#===============================================================
# EVENT HANDLER --- OK
    # TODO: FINISH LOCATION
    event_handler
        -> (%kw_on __) event_args __ event_action _ expr
            {% d => ({
                type:     'Event',
                args:     d[1],
                modifier: d[3],
                body:     d[5]
            }) %}

    event_action -> %kw_do {% id %} | %kw_return {% id %}

    event_args
        -> var_name
            {% d => ({type: 'EventArgs', event: d[0]}) %}
        | var_name __ var_name
            {% d => ({type: 'EventArgs', target: d[0], event: d[2]}) %}
        | var_name __ var_name ( __ var_name):+
            {% d => ({
                type: 'EventArgs',
                target: d[0],
                event: d[2],
                args: flatten(d[3])}
            )%}
# CHANGE HANDLER -- WHEN CONSTRUCTOR
    change_handler
        -> %kw_when __ var_name __ operand __ var_name __
          (when_param _ | when_param _ when_param _):? (var_name __):?
          %kw_do _ expr
        {% d=> ({
            type:'WhenStatement',
            args: filterNull( [].concat(d[2],d[4],d[6],d[8],d[9]) ),
            body:d[12],
            loc:getLoc(d[0])
        })%}
        | %kw_when __ operand __ var_name __
          (when_param _ | when_param _ when_param _):? (var_name _):?
          %kw_do _ expr
        {% d=> ({
            type:'WhenStatement',
            args:filterNull( [].concat(d[2],d[4],d[6],d[7]) ),
            body:d[10],
            loc:getLoc(d[0])
        })%}

    when_param -> param_name _ name_value
        {% d => ({
            type: 'ParameterAssignment',
            param: d[0],
            value: d[2],
        })%}
#---------------------------------------------------------------
# FUNCTION DEFINITION --- OK
    function_def
        -> function_decl __ var_name (_ var_name):+ (_ fn_params):+ (_ "=" _) expr
            {% d => ({
                ...d[0],
                id:     d[2],
                args:   (d[3].map(x => x[1])),
                params: (d[4].map(x => x[1])),
                body:   d[6],

            })%}
         | function_decl __ var_name (_ var_name):+ (_ "=" _) expr
            {% d => ({
                ...d[0],
                id:     d[2],
                args:   (d[3].map(x => x[1])),
                params: [],
                body:   d[5],
            })%}
         | function_decl __ var_name (_ fn_params):+ (_ "=" _) expr
            {% d => ({
                ...d[0],
                id:     d[2],
                args:   [],
                params: (d[3].map(x => x[1])),
                body:   d[5],
            })%}
         | function_decl __ var_name (_ "=" _) expr
            {% d => ({
                ...d[0],
                id:     d[2],
                args:   [],
                params: [],
                body:   d[4],
            })%}

    function_decl -> (%kw_mapped __):?  %kw_function
        {% d => ({
            type:   'Function',
            mapped: (d[0] != null),
            keyword: d[1],
            loc: (getLoc(d[0] != null ? d[0][0] : d[1]))
        })%}

    fn_params
        -> parameter  {% id %}
        | param_name
                {% d => ({
            type: 'ParameterAssignment',
            param: d[0],
            value: null,
        })%}
#---------------------------------------------------------------
# FUNCTION RETURN
    fn_return -> %kw_return _ expr:?
        {% d => ({
            type: 'FunctionReturn',
            body: d[2]
        })%}
#===============================================================
# CONTEXT EXPRESSION -- TODO: FINISH LOCATION
    # set_context -> %kw_set _ context
    #---------------------------------------------------------------
    context_expr -> context ( (_S "," _) context ):* _ expr
        {% d => ({
            type: 'ContextStatement',
            context: merge(d[0], collectSub(d[1], 1)),
            body: d[3]
        })%}

    context
        -> %kw_at __ (%kw_level | %kw_time) _ (operand)
            {% d => ({
                type: 'ContextExpression',
                prefix : $empty,
                context: d[0],
                args: d[2].concat(d[4])
            })%}
        | %kw_in _ (operand)
            {% d => ({
                type: 'ContextExpression',
                prefix : $empty,
                context: d[0],
                args: d[2]
            })%}
        | (%kw_in __):? %kw_coordsys _ (%kw_local | operand)
            {% d => ({
                type: 'ContextExpression',
                prefix : (d[0] != null ? d[0][0] : $empty),
                context: d[1],
                args: d[3]
            })%}
        | %kw_about _ (%kw_coordsys | operand)
            {% d => ({
                type: 'ContextExpression',
                prefix : $empty,
                context: d[0],
                args: d[2]
            })%}
        | (%kw_with __):? %kw_context _ (logical_expr | bool)
            {% d => ({
                type: 'ContextExpression',
                prefix : (d[0] != null ? d[0][0] : $empty),
                context: d[1],
                args: d[3]
            })%}
        | %kw_with __ %kw_defaultAction _ ("#logmsg"|"#logtofile"|"#abort")
            {% d => ({
                type: 'ContextExpression',
                prefix : d[0],
                context: d[2],
                args: d[4]
            })%}
        | (%kw_with __):? %kw_undo _ ( undo_label _ ):? (logical_expr | bool)
            {% d => ({
                type: 'ContextExpression',
                prefix : (d[0] != null ? d[0][0] : $empty),
                context: d[1],
                args: (filterNull(d[3])).concat(d[4])
            })%}

        undo_label -> string {% id %} | parameter {% id %} | var_name {% id %}
#---------------------------------------------------------------
# CASE EXPRESSION --- OK
    case_expr
        -> (%kw_case _)  case_src %kw_of _
            LPAREN
                case_item
                (EOL case_item):*
                # EOL:?
            RPAREN
            {% d => ({
                type:  'CaseStatement',
                test:  d[1],
                cases: merge(d[5], flatten(d[6])),
                loc:   getLoc(d[0][0], d[8])
            })%}

    case_src -> expr _  {% d => d[0] %} | __ {% id %}

    case_item
        -> (factor | %params) (":" _) expr
        {% d => ({type:'CaseClause', case: d[0][0], body: d[2] })%}
#---------------------------------------------------------------
# FOR EXPRESSION --- OK # TODO: FINISH LOCATION
    for_loop
        -> (%kw_for __) var_name _S for_iterator _S expr ( _ for_sequence ):? _ for_action _ expr
            {% d => ({
                type:     'ForStatement',
                variable:  d[1],
                iteration: d[3],
                value:     d[5],
                sequence: filterNull(d[6]),
                action:    d[8],
                body:      d[10],
                loc: getLoc(d[0][0])
            })%}

    for_sequence
        -> for_to (_ for_by):? (_ for_while):? (_ for_where):?
        {% d => ({
            type: 'ForLoopSequence',
            to: d[0],
            by: filterNull(d[1]),
            while: filterNull(d[2]),
            where: filterNull(d[3])
        })%}
        | (for_while _):? for_where
        {% d => ({
           type: 'ForLoopSequence',
           to: [],
           by: [],
           while: filterNull(d[0]),
           where: d[1]
       })%}

    for_iterator -> "=" {% id %} | %kw_in {% id %}

    for_to    -> (%kw_to _S)    expr {% d => d[1] %}
    for_by    -> (%kw_by _S)    expr {% d => d[1] %}
    for_where -> (%kw_where _S) expr {% d => d[1] %}
    for_while -> (%kw_while _S) expr {% d => d[1] %}

    for_action -> %kw_do {% id %} | %kw_collect {% id %}
#---------------------------------------------------------------
# LOOP EXIT EXPRESSION --- OK
    loop_exit
        -> %kw_exit {% id %}
        | %kw_exit (__ %kw_with _) expr
            {% d => ({
                type : 'LoopExit',
                body:  d[2],
                loc: getLoc(d[0])
            })%}
#---------------------------------------------------------------
# DO LOOP --- OK
    # TODO: FINISH LOCATION
    do_loop -> (%kw_do _) expr (_ %kw_while _) expr
        {% d => ({
            type: 'DoWhileStatement',
            body: d[1],
            test: d[3],
            loc: getLoc(d[0][0])
        })%}
#---------------------------------------------------------------
# WHILE LOOP --- OK
    # TODO: FINISH LOCATION
    while_loop -> (%kw_while _S) expr (_S %kw_do _) expr
        {% d => ({
            type: 'WhileStatement',
            test: d[1],
            body: d[3],
            loc: getLoc(d[0][0])
        })%}
#---------------------------------------------------------------
# IF EXPRESSION --- OK
    if_expr
        -> (%kw_if _) expr _ if_action _ expr
            {% d => ({
                type:       'IfStatement',
                test:       d[1],
                operator:   d[3],
                consequent: d[5],
                loc: getLoc(d[0][0])
            })%}
        | (%kw_if _) expr (_ %kw_then _) expr (_ %kw_else _) expr
            {% d => ({
                type:       'IfStatement',
                test:       d[1],
                consequent: d[3],
                alternate:  d[5],
                loc: getLoc(d[0][0])
            })%}
    if_action
        -> %kw_do  {% id %}
        | %kw_then {% id %}
#---------------------------------------------------------------
# TRY EXPRESSION -- OK # TODO: FINISH LOCATION
    try_expr -> (%kw_try _) expr (_ %kw_catch _) expr
    {% d => ({
        type:      'TryStatement',
        block:     d[1],
        finalizer: d[3],
        loc: getLoc(d[0][0])
    })%}
    kw_try -> %kw_try _ {% d => d[0] %}
#---------------------------------------------------------------
# VARIABLE DECLARATION --- OK
    variable_decl
        -> kw_decl _ decl_args
            {% d => ({
                type: 'VariableDeclaration',
                ...d[0],
                decls: d[2],
                loc: getLoc(d[0])
            })%}

    kw_decl
        -> %kw_local {% d => ({modifier:null, scope: d[0], loc:getLoc(d[0])}) %}
        | %kw_global {% d => ({modifier:null, scope: d[0], loc:getLoc(d[0])}) %}
        | %kw_persistent __ %kw_global {% d => ({modifier: d[0], scope: d[2], loc:getLoc(d[0], d[2])})%}
    # Direct assignment on declaration
    # TODO: LOCATION
    decl_args
        -> decl
        | decl ( (_S "," _) decl ):+ {% d =>{ return merge(d[0], collectSub(d[1], 1)); }%}
    decl
        -> var_name                {% d => ({type:'Declaration', id:d[0]}) %}
        | var_name (_S "=" _) expr {% d => ({type:'Declaration', id:d[0], value: d[2]}) %}
#---------------------------------------------------------------
#ASSIGNEMENT --- OK
    assignment
    -> destination (_S %assign _) expr
        {% d => ({
            type:     'AssignmentExpression',
            operator: d[1][1],
            operand:  d[0],
            value:    d[2]
        })%}

    destination
        -> var_name {% id %}
        | property  {% id %}
        | index     {% id %}
        | path_name {% id %}
#---------------------------------------------------------------
# MATH EXPRESSION ---  OK
    math_expr -> rest {% id %}

    rest -> rest minus_ws sum
            {% d => ({
                type:     'MathExpression',
                operator: d[1],
                left:     d[0],
                right:    d[2]
            })%}
    | sum {% id %}

    minus_ws
        -> "-" {% id %}
        | "-" __ {% d => d[0] %}
        | __ "-" __ {% d => d[1] %}

    sum -> sum _S "+" _ prod
            {% d => ({
                type:     'MathExpression',
                operator: d[2],
                left:     d[0],
                right:    d[4]
            })%}
        | prod {% id %}
    prod -> prod _S ("*"|"/") _ exp
            {% d => ({
                type:     'MathExpression',
                operator: d[2][0],
                left:     d[0],
                right:    d[4]
            })%}
        | exp {% id %}
    exp -> as _S "^" _ exp
            {% d => ({
                type:     'MathExpression',
                operator: d[2],
                left:     d[0],
                right:    d[4]
            })%}
        | as {% id %}
    as -> as _S %kw_as _ var_name
            {% d => ({
                type:     'MathExpression',
                operator: d[2],
                left:     d[0],
                right:    d[4]
            })%}
        | uny {% id %}

    uny -> "-" _  math_operand
            {% d => ({
                type: 'UnaryExpression',
                operator: d[0],
                right:    d[2]
            }) %}
        | math_operand {% id %}

    math_operand
        -> operand   {% id %}
        | fn_call    {% id %}
#---------------------------------------------------------------
# LOGIC EXPRESSION --- OK
    logical_expr
        -> logical_expr _S %kw_compare _  (logical_operand | not_operand)
        {% d => ({
            type :    'LogicalExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4][0]
        }) %}
        | logical_operand _S %kw_compare _  (logical_operand | not_operand)
        {% d => ({
            type :    'LogicalExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4][0]
        }) %}
        | not_operand {% id %}

    not_operand -> %kw_not _ logical_operand
        {% d => ({
            type :    'LogicalExpression',
            operator: d[0],
            right:    d[2]
        }) %}

    logical_operand
        -> operand     {% id %}
        | compare_expr {% id %}
        | fn_call      {% id %}
#---------------------------------------------------------------
# COMPARE EXPRESSION --- OK
    compare_expr
        -> compare_operand _S %comparison _ compare_operand
        {% d => ({
            type:     'LogicalExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4]
        }) %}

    compare_operand
        -> math_expr {% id %}
        # | operand    {% id %}
        # | fn_call    {% id %}
#---------------------------------------------------------------
# FUNCTION CALL --- OK
    fn_call
        -> call_caller _S call_args (_S call_params):?
        {% d => ({
            type:  'CallExpression',
            calle: d[0],
            args:  merge(d[2], d[3])
        })%}
        | call_caller _S call_params
            {% d => ({
                type:  'CallExpression',
                calle: d[0],
                args:  d[2]
            })%}

    call_params
        -> call_params _S parameter {% d => [].concat(d[0], d[2]) %}
        | parameter

    call_args
        -> call_args _S call_arg {% d => [].concat(d[0], d[2]) %}
        | call_arg

    call_arg
        ->  __ u_operand
            {% d => d[1] %}
        | operand {% id %}

    call_caller -> operand {% id %}
#---------------------------------------------------------------
# PARAMETER CALL --- OK
    parameter -> param_name _ (operand | u_operand)
        {% d => ({
            type: 'ParameterAssignment',
            param: d[0],
            value: d[2][0],
            //loc: d[0].loc
        })%}
    param_name -> param_kw _S ":" {% d => ({type:'Identifier', value:d[0]}) %}
    param_kw
        -> var_name   {% id %}
        | %kw_rollout {% id %}
        | %kw_plugin  {% id %}
        | %kw_rcmenu  {% id %}
        | %kw_tool    {% id %}
        | %kw_to      {% id %}
        | %kw_utility {% id %}
#---------------------------------------------------------------
# ACCESSOR - PROPERTY --- OK #TODO: Avoid capturing operand?
    property -> operand %delimiter var_name
        {% d => ({
            type:     'AccessorProperty',
            operand:  d[0],
            property: d[2],
            //loc:      getLoc(d[0], d[1])
        })%}
#---------------------------------------------------------------
# ACCESSOR - INDEX --- #TODO: Avoid capturing operand?
    index -> operand _ p_start expr p_end
        {% d => ({
            type:    'AccessorIndex',
            operand: d[0],
            index:   d[3],
            //loc:     getLoc(d[0], d[4])
        })%}
#---------------------------------------------------------------
# OPERANDS --- OK
    u_operand
        -> "-" operand
            {% d => ({
                type: 'UnaryExpression',
                operator: d[0],
                right:    d[1]
            }) %}
        # | operand {% id %}

    operand
        -> factor     {% id %}
        | property    {% id %}
        | index       {% id %}
#---------------------------------------------------------------
# FACTORS --- OK?
   factor
        -> string    {% id %}
        | number     {% id %}
        | path_name  {% id %}
        | name_value {% id %}
        | var_name   {% id %}
        | bool       {% id %}
        | void       {% id %}
        | time       {% id %}
        | array      {% id %}
        | bitarray   {% id %}
        | point4     {% id %}
        | point3     {% id %}
        | point2     {% id %}
        | expr_seq   {% id %} # HERE IS WHERE THE ITERATION HAPPENS
        | "?" {% d => ({type: 'Keyword', value: d[0]}) %}
        | %error     {% id %}
#===============================================================
# VALUES
#===============================================================
# POINTS
    point4
        -> p_start expr (_S "," _) expr (_S "," _) expr (_S "," _) expr p_end
        {% d => ({
            type: 'ObjectPoint4',
            elements: [].concat(d[1], d[3], d[5], d[7]),
            loc: getLoc(d[0], d[8])
        }) %}
    point3
        -> p_start expr (_S "," _) expr (_S "," _) expr p_end
        {% d => ({
            type: 'ObjectPoint3',
            elements: [].concat(d[1], d[3], d[5]),
            loc: getLoc(d[0], d[6])
        }) %}
    point2
        -> p_start expr (_S "," _) expr p_end
        {% d => ({
            type: 'ObjectPoint2',
            elements: [].concat(d[1], d[3]),
            loc: getLoc(d[0], d[4])
        }) %}

    p_start -> "[" _  {% d => d[0]%}
    p_end   -> _ "]" {% d => d[1]%}
#===============================================================
# ARRAY --- OK
    array
        -> %arraydef _ %rparen
            {% d => ({
                type:      'ObjectArray',
                elements:  [],
                loc:       getLoc(d[0], d[2])
            }) %}
        | (%arraydef _) array_expr (_ %rparen)
            {% d => ({
                type:     'ObjectArray',
                elements: d[1],
                loc:      getLoc(d[0][0], d[2][1])
            }) %}

        array_expr
         -> array_expr (_ "," _) expr {% d => [].concat(d[0], d[2]) %}
         | expr
#---------------------------------------------------------------
# BITARRAY --- OK
    bitarray
    -> %bitarraydef _ %rbrace
        {% d => ({
            type:     'ObjectBitArray',
            elements: [],
            loc:      getLoc(d[0], d[2])
        }) %}
    | ( %bitarraydef _) bitarray_expr (_ %rbrace)
        {% d => ({
            type:     'ObjectBitArray',
            elements: d[1],
            loc:      getLoc(d[0][0], d[2][1])
        }) %}

    bitarray_expr
    -> bitarray_expr (_ "," _) bitarray_item {% d => [].concat(d[0], d[2]) %}
    | bitarray_item

    # TODO: Fix groups
    bitarray_item
        -> expr (_S %bitrange _) expr {% d => ({type: 'BitRange', start: d[0], end: d[2]}) %}
        | expr {% id %}
#===============================================================
# VARNAME --- IDENTIFIERS --- OK
    # some keywords can be var_name too...
    var_name -> var_type
        {% d => ({ type: 'Identifier', value: d[0] }) %}
    var_type
        -> %identity      {% id %}
         | %global_typed  {% id %}
         | %typed_iden    {% id %}
         | kw_reserved    {% id %}
# RESERVED KEYWORDS
    kw_reserved
        -> %kw_uicontrols  {% id %}
        | %kw_group        {% id %}
        | %kw_level        {% id %}
        | %kw_menuitem     {% id %}
        | %kw_objectset    {% id %}
        | %kw_separator    {% id %}
        | %kw_submenu      {% id %}
        | %kw_time         {% id %}
        | %kw_set          {% id %}
        # | %kw_parameters   {% id %}
        # | %kw_dontcollect  {% id %}
        # | %kw_continue     {% id %}
        # | %kw_rollout
        # | %kw_plugin
        # | %kw_rcmenu
        # | %kw_tool
        # | %kw_to
        # | %kw_collect
        # | %kw_return
        # | %kw_throw
#===============================================================
# TOKENS
    # time
    time -> %time
        {% d => ({ type: 'Literal', value: d[0] }) %}
    # Bool
    bool
        -> %kw_bool
        {% d => ({ type: 'Literal', value: d[0] }) %}
        | %kw_on
        {% d => ({ type: 'Literal', value: d[0] }) %}
    # Void values
    void -> %kw_null
        {% d => ({ type: 'Literal', value: d[0] }) %}
    #---------------------------------------------------------------
    # Numbers
    number -> number_types
        {% d => ({ type: 'Literal', value: d[0] }) %}
    number_types
        -> %number  {% id %}
         | %hex     {% id %}
    # string
    string -> %string
        {% d => ({ type: 'Literal', value: d[0] }) %}
    # names
    name_value -> %name
        {% d => ({ type: 'Literal', value: d[0] }) %}
    #Resources
    resource -> %locale
        {% d => ({ type: 'Literal', value: d[0] }) %}
    #---------------------------------------------------------------
    # PATH NAME
    # THIS JUST CAPTURES ALL THE LEVEL PATH IN ONE TOKEN....
    path_name -> %path
        {% d => ({ type: 'Identifier', value: d[0] }) %}
#===============================================================
#PARENS
    LPAREN ->  %lparen _    {% d => d[0] %}
    RPAREN ->  ___ %rparen  {% d => d[1] %}
#===============================================================
# WHITESPACE AND NEW LINES
    # comments are skipped in the parse tree!   
    _EOL_
        -> _EOL_ (junk | %statement) {% d => null %}
        | wsl {% d => null %}
        | %statement {% d => null %}

    EOL -> _eol:* ( %newline | %statement ) _S {% d => null %}

    _eol
    -> %ws
    | %statement
    | %newline
    | %comment_BLK
    | %comment_SL

    _SL_ -> wsl {% d => null %} | _SL_ junk {% d => null %}
    # one or more whitespace
    _S_ -> ws {% d => null %} | _S_ ws  {% d => null %}
    # zero or any withespace
    _S -> null | _S ws  {% d => null %}
    # one or more whitespace with NL
    __ -> ws {% d => null %} | __ junk {% d => null %}
    # zero or any withespace with NL
    _ -> null | _ junk  {% d => null %}
    # this is for optional EOL
    ___ -> null | ___ (junk | %statement)  {% d => null %}

    ws -> %ws | %comment_BLK

    wsl ->  %ws | %newline | %comment_BLK

    junk
        -> %ws
        | %newline
        | %comment_BLK
        | %comment_SL
#---------------------------------------------------------------