# @preprocessor typescript
@{%
	const mxLexer = require('./mooTokenize.js');
    // Utilities
    const $empty = '';

    const flatten = arr => arr != null ? arr.flat().filter(e => e != null) : [];

    const collectSub = (arr, index) => arr != null ? arr.map(e => e[index]) : [];

    const filterNull = arr => arr != null ? arr.filter(e => e != null) : [];

    const tokenType = (t, newytpe) => {t.type = newytpe; return t;};

    const merge = (...args) => {
        let res = [].concat(...args).filter(e => e != null);
        return res.length === 0 ? null : res;
    };

    const convertToken = (token, newtype) => {
        let node = {...token};
            node.type = newtype;
        return node;
    };
    // Offset is not reilable, changed to line - character
    const getLoc = (start, end) => {
        if (!start) {return null;}

        // for this to work start must be a token
        let startOffset = start.range ? start.range.start : {line: start.line, character: start.col};
        let endOffset;

        if (!end) {
            if (start.range) {
                endOffset = start.range.end;
            } else {
                // for this to work end must be a token
                endOffset = {
                    line: start.line,
                    character: (start.text != null ? start.col + start.text.length : start.col)
                };                
            }
        } else {
            if (end.range) {
                endOffset = end.range.end;
            } else {
                // for this to work end must be a token
                endOffset = {
                    line: end.line,
                    character: (end.text != null ? end.col + (end.text.length - 1) : end.col)                
                };
            }
        }
        return ({start: startOffset, end: endOffset});
    };

    const addLoc = (a, ...loc) => {
        let last = loc[loc.length - 1];
        
        if (last.range) {
            if (last.range.end) {
                a.range.end.line = last.range.end.line;
                a.range.end.character = last.range.end.character;
            }
        }
    };
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
        -> simple_expr    {% id %} # RANGE OK
        | variable_decl   {% id %} # RANGE OK
        | assignment      {% id %} # RANGE OK
        | if_expr         {% id %} # RANGE OK
        | while_loop      {% id %} # RANGE OK
        | do_loop         {% id %} # RANGE OK
        | for_loop        {% id %} # RANGE OK
        | loop_exit       {% id %} # RANGE OK
        | case_expr       {% id %} # RANGE OK
        | struct_def      {% id %} # RANGE OK
        | try_expr        {% id %} # RANGE OK
        | function_def    {% id %} # RANGE OK
        | fn_return       {% id %} # RANGE OK
        | context_expr    {% id %} # RANGE OK
        | utility_def     {% id %} # RANGE OK
        | rollout_def     {% id %} # RANGE OK
        | tool_def        {% id %} # RANGE OK
        | rcmenu_def      {% id %} # RANGE OK
        | macroscript_def {% id %} # RANGE OK
        | plugin_def      {% id %} # RANGE OK
        | change_handler  {% id %}
        # | set_context     {% id %}
#---------------------------------------------------------------
    simple_expr
        -> math_expr   {% id %} # RANGE OK
        | compare_expr {% id %} # RANGE OK
        | logical_expr {% id %} # RANGE OK
        # | operand      {% id %}
        # fn_call | operand | u_operand | passthrough math expression
#---------------------------------------------------------------
# EXPRESSIONS - RECURSION!
    expr_seq
        -> LPAREN _expr_seq RPAREN
            {% d => ({
                type: 'BlockStatement',
                body: d[1],
                range: getLoc(d[0], d[2])
            })%}
        | "(" _ ")"
            {% d => ({
                type: 'BlockStatement',
                body: [],
                range: getLoc(d[0], d[2])
            })%}
   
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
            range: getLoc(d[0][0], d[5])
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
        range: getLoc(d[0][0], d[6])
    })%}
    
    rcmenu_sep -> (%kw_separator __) var_name (_ parameter):?
    {% d => ({
        type:   'EntityRcmenu_separator',
        id:     d[1],
        params: flatten(d[2]),
    })%}
    
    rcmenu_item -> (%kw_menuitem __) var_name _ string (_ parameter):*
    {% d => ({
        type:   'EntityRcmenu_menuitem',
        id:     d[1],
        label:  d[3],
        params: flatten(d[4]),
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
                id:         d[3],
                params:     flatten(d[4]),
                body:       d[7],
                range:    getLoc(d[0][0], d[8])
            })%}

    plugin_clauses
        -> plugin_clause (EOL plugin_clause):* {% d => merge(...d) %}

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
                range: getLoc(d[0][0], d[6])
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
                range:  getLoc(d[0][0], d[6])
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
                range:  getLoc(d[0][0], d[8])
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
                range:  getLoc(d[0][0], d[8])
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
                range:getLoc(d[0][0], d[5])
            })%}
    
    group_clauses
        -> group_clauses EOL rollout_item {% d => merge(d[0], d[2]) %}
        | rollout_item
        # | null
    #---------------------------------------------------------------
    rollout_item
        -> %kw_uicontrols __ var_name ( _ operand):? ( _ parameter):*
            {% d => {
             let res = {
                    type:   'EntityRolloutControl',
                    class:  d[0],
                    id:     d[2],
                    text:   (d[3] != null ? d[3][1] : null),
                    params: flatten(d[4]),
                    range:  getLoc(d[0])
                };
                addLoc(res, d[2]);
                return res;
            }%}
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
                range:  getLoc(d[0][0], d[6])
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
                //range:  getLoc(d[0][0], d[1])
                range: getLoc(d[0][0], d[5])
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
                id:       d[1].event,
                args:     d[1],
                modifier: d[3],
                body:     d[5],
                range:    getLoc(d[0][0], d[1].event)
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
#---------------------------------------------------------------
# CHANGE HANDLER -- WHEN CONSTRUCTOR
    change_handler
        -> %kw_when __ var_name __ operand __ var_name __
          (when_param _ | when_param _ when_param _):? (var_name __):?
          %kw_do _ expr
        {% d=> ({
            type:'WhenStatement',
            args: filterNull( [].concat(d[2],d[4],d[6],d[8],d[9]) ),
            body:d[12],
            range: getLoc(d[0], d[12])
        })%}
        | %kw_when __ operand __ var_name __
          (when_param _ | when_param _ when_param _):? (var_name _):?
          %kw_do _ expr
        {% d=> ({
            type:'WhenStatement',
            args:filterNull( [].concat(d[2],d[4],d[6],d[7]) ),
            body:d[10],
            range: getLoc(d[0], d[10])
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
            {% d => {
                let params = d[4].map(x => x[1]);
                let res = {
                    ...d[0],
                    id:     d[2],
                    args:   (d[3].map(x => x[1])),
                    params: params,
                    body:   d[6],
                };
                addLoc(res, d[6]);
                return res;
            }%}
         | function_decl __ var_name (_ var_name):+ (_ "=" _) expr
            {% d => {
                let args = d[3].map(x => x[1]);
                let res = {
                    ...d[0],
                    id:     d[2],
                    args:   args,
                    params: [],
                    body:   d[5],
                };
                addLoc(res, d[5]);
                return res;
            }%}
         | function_decl __ var_name (_ fn_params):+ (_ "=" _) expr
            {% d => {
                let res = {
                    ...d[0],
                    id:     d[2],
                    args:   [],
                    params: (d[3].map(x => x[1])),
                    body:   d[5],
                };
                addLoc(res, d[5])
            }%}
         | function_decl __ var_name (_ "=" _) expr
            {% d => {
                let res = {
                    ...d[0],
                    id:     d[2],
                    args:   [],
                    params: [],
                    body:   d[4],
                };
                addLoc(res, d[4]);
                return res;
            }%}
    function_decl
        -> (%kw_mapped __):?  %kw_function
            {% d => ({
                type:   'Function',
                mapped: (d[0] != null),
                keyword: d[1],
                range: (getLoc(d[0] != null ? d[0][0] : d[1]))
            })%}

    # This is for parameter declaration 
    fn_params
        -> parameter  {% id %}
        | param_name  {% id %}
#---------------------------------------------------------------
# FUNCTION RETURN
    fn_return -> %kw_return _ expr
        {% d => ({
            type: 'FunctionReturn',
            body: d[2]
            range: getLoc(d[0], d[2])
        })%}
#===============================================================
# CONTEXT EXPRESSION -- TODO: FINISH LOCATION
    # set_context -> %kw_set _ context
    #---------------------------------------------------------------
    context_expr -> context ( (_S "," _) context ):* _ expr
        {% d => ({
            type: 'ContextStatement',
            context: merge(d[0], collectSub(d[1], 1)),
            body: d[3],
            range : getLoc(d[0], d[3])
        })%}

    context
        -> %kw_at __ (%kw_level | %kw_time) _ operand
            {% d => ({
                type: 'ContextExpression',
                prefix : null,
                context: d[0],
                args: [].concat(d[2][0], d[4]),
                range: getLoc(d[0], d[4])
            })%}
        | %kw_in _ operand
            {% d => ({
                type: 'ContextExpression',
                prefix : null,
                context: d[0],
                args: [d[2]],
                range: getLoc(d[0], d[2])
            })%}
        | (%kw_in __):? %kw_coordsys _ (%kw_local | operand)
            {% d => ({
                type: 'ContextExpression',
                prefix : (d[0] != null ? d[0][0] : null),
                context: d[1],
                args: d[3],
                range: getLoc(d[0] != null ? d[0][0] : d[1], d[3][0])
            })%}
        | %kw_about _ (%kw_coordsys | operand)
            {% d => ({
                type: 'ContextExpression',
                prefix : null,
                context: d[0],
                args: d[2],
                range: getLoc(d[0], d[0][0])
            })%}
        | (%kw_with __):? %kw_context _ (logical_expr | bool)
            {% d => ({
                type: 'ContextExpression',
                prefix : (d[0] != null ? d[0][0] : null),
                context: d[1],
                args: d[3]
            })%}
        | %kw_with __ %kw_defaultAction _ ("#logmsg"|"#logtofile"|"#abort")
            {% d => ({
                type: 'ContextExpression',
                prefix : d[0],
                context: d[2],
                args: d[4],
                range: getLoc(d[0]d, d[4][0])
            })%}
        | (%kw_with __):? %kw_undo _ ( undo_label _ ):? (logical_expr | bool)
            {% d => ({
                type: 'ContextExpression',
                prefix : (d[0] != null ? d[0][0] : null),
                context: d[1],
                args: (filterNull(d[3])).concat(d[4]),
                range: getLoc(d[0] != null ? d[0][0] : d[1], d[4][0])
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
                range: getLoc(d[0][0], d[8])
            })%}

    case_src -> expr _  {% d => d[0] %} | __ {% id %}

    case_item
        -> (factor | %params) (":" _) expr
            {% d => ({
                type:'CaseClause',
                case: d[0][0],
                body: d[2],
                range: getLoc(d[0][0], d[2])
            })%}
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
                range: getLoc(d[0][0], d[10])
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
        -> %kw_exit
            {% d => ({
                type : 'LoopExit',
                body:  null,
                range: getLoc(d[0])
            })%}
        | %kw_exit (__ %kw_with _) expr
            {% d => ({
                type : 'LoopExit',
                body:  d[2],
                range: getLoc(d[0], d[2])
            })%}
#---------------------------------------------------------------
# DO LOOP --- OK
    do_loop -> (%kw_do _) expr (_ %kw_while _) expr
        {% d => ({
            type: 'DoWhileStatement',
            body: d[1],
            test: d[3],
            range: getLoc(d[0][0], d[3])
        })%}
#---------------------------------------------------------------
# WHILE LOOP --- OK
    while_loop -> (%kw_while _S) expr (_S %kw_do _) expr
        {% d => ({
            type: 'WhileStatement',
            test: d[1],
            body: d[3],
            range: getLoc(d[0][0], d[3])
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
                range: getLoc(d[0][0], d[5])
            })%}
        | (%kw_if _) expr (_ %kw_then _) expr (_ %kw_else _) expr
            {% d => ({
                type:       'IfStatement',
                test:       d[1],
                consequent: d[3],
                alternate:  d[5],
                range: getLoc(d[0][0], d[5])
            })%}
    if_action
        -> %kw_do  {% id %}
        | %kw_then {% id %}
#---------------------------------------------------------------
# TRY EXPRESSION -- OK
    try_expr -> (%kw_try _) expr (_ %kw_catch _) expr
    {% d => ({
        type:      'TryStatement',
        body:     d[1],
        finalizer: d[3],
        range: getLoc(d[0][0], d[3])
    })%}
#---------------------------------------------------------------
# VARIABLE DECLARATION --- OK
    variable_decl
        -> kw_decl _ decl_list
            {% d => {
                let res = {
                    type: 'VariableDeclaration',
                    ...d[0],
                    decls: d[2],
                };
                addLoc(res, ...decl_list);
                return res;
            }%}

    kw_decl
        -> %kw_local {% d => ({modifier:null, scope: d[0], range:getLoc(d[0])}) %}
        | %kw_global {% d => ({modifier:null, scope: d[0], range:getLoc(d[0])}) %}
        | %kw_persistent __ %kw_global {% d => ({modifier: d[0], scope: d[2], range:getLoc(d[0], d[2])}) %}
    # Direct assignment on declaration
    # TODO: LOCATION

    decl_list
    -> decl_list (_S "," _) decl  {% d => [].concat(d[0], d[2]) %}
    | decl

    decl
        -> var_name
            {% d => ({
                type:'Declaration',
                id:d[0], value:d[0],
                range:getLoc(d[0])
            }) %}
        | assignment
            {% d => ({
                type:'Declaration',
                id:d[0].operand,
                value: d[0],
                range:getLoc(d[0].operand)
            }) %}
#---------------------------------------------------------------
#ASSIGNEMENT --- OK
    assignment
    -> destination (_S %assign _) expr
        {% d => ({
            type:     'AssignmentExpression',
            operand:  d[0],
            operator: d[1][1],
            value:    d[2],
            range: getLoc(d[0], d[2])
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
                    right:    d[2],
                    range: getLoc( Array.isArray(d[0]) ? d[0][0] : d[0], d[4] ) 
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
                    right:    d[4],
                    range: getLoc( Array.isArray(d[0]) ? d[0][0] : d[0], d[4] ) 
                })%}
            | prod {% id %}
        prod -> prod _S ("*"|"/") _ exp
                {% d => ({
                    type:     'MathExpression',
                    operator: d[2][0],
                    left:     d[0],
                    right:    d[4],
                    range: getLoc( Array.isArray(d[0]) ? d[0][0] : d[0], d[4] ) 
                })%}
            | exp {% id %}
        exp -> as _S "^" _ exp
                {% d => ({
                    type:     'MathExpression',
                    operator: d[2],
                    left:     d[0],
                    right:    d[4],
                    range: getLoc( Array.isArray(d[0]) ? d[0][0] : d[0], d[4] )
                })%}
            | as {% id %}
        as -> math_operand _S %kw_as _ var_name
                {% d => ({
                    type:     'MathExpression',
                    operator: d[2],
                    left:     d[0],
                    right:    d[4],
                    range: getLoc(d[0], d[4])
                })%}
            | math_operand {% id %}

        #   | uny {% id %}
        # uny -> "-" _  math_operand
        #         {% d => ({
        #             type: 'UnaryExpression',
        #             operator: d[0],
        #             right:    d[2]
        #         }) %}

    # fn_call | operand | u_operand | passthrough math expression
    # FIXME: fn_call should be passed to operand? I've done it this way to avoid operator ambiguity...
    math_operand
        -> operand   {% id %}
        | u_operand  {% id %}
        | fn_call    {% id %}
#---------------------------------------------------------------
# LOGIC EXPRESSION --- OK
    logical_expr
        -> logical_expr _S %kw_compare _  (logical_operand | not_operand)
        {% d => ({
            type :    'LogicalExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4][0],
            range: getLoc(d[0], d[4][0])
        }) %}
        | logical_operand _S %kw_compare _  (logical_operand | not_operand)
        {% d => ({
            type :    'LogicalExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4][0],
            range: getLoc(d[0], d[4][0])
        }) %}
        | not_operand {% id %}

    not_operand -> %kw_not _ logical_operand
        {% d => ({
            type :    'LogicalExpression',
            operator: d[0],
            right:    d[2],
            range: getLoc(d[0], d[2])
        }) %}

    logical_operand
        -> math_expr   {% id %}
        | compare_expr {% id %}
#---------------------------------------------------------------
# COMPARE EXPRESSION --- OK
    compare_expr
        -> compare_operand _S %comparison _ compare_operand
        {% d => ({
            type:     'LogicalExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4],
            range: getLoc(d[0], d[4])
        }) %}

    compare_operand
        -> math_expr {% id %}
#---------------------------------------------------------------
# FUNCTION CALL --- OK
    fn_call
        -> call_caller _S call_args (_S call_params):?
        {% d => ({
            type:  'CallExpression',
            calle: d[0],
            args:  merge(d[2], d[3]),
            range: getLoc(d[0], d[3] != null ? d[3][1] : d[2])
        })%}
        | call_caller _S call_params
            {% d => ({
                type:  'CallExpression',
                calle: d[0],
                args:  d[2],
                range: getLoc(d[0], d[2])
            })%}

    call_params
        -> call_params _S parameter {% d => [].concat(d[0], d[2]) %}
        | parameter

    call_args
        -> call_args _S call_arg {% d => [].concat(d[0], d[2]) %}
        | call_arg

    call_arg
        # ->  __ u_operand {% d => d[1] %}
        ->  u_operand {% id %}
        | operand {% id %}

    call_caller -> operand {% id %}
#---------------------------------------------------------------
# PARAMETER CALL --- OK
    parameter
        -> param_name _ (operand | u_operand)
            {% d => {
                    let res = {
                    type: 'ParameterAssignment',
                    param: d[0],
                    value: d[2][0],
                    range: getLoc (d[0], d[2][0])
                };            
                return res;
            }%}

    param_name
        -> %param ":"
            {% d => ({
                type:'Parameter',
                value: d[0],
                range: getLoc(d[0], d[2])
            }) %}
    
    # needs keyword override
    # param_kw
        # -> var_name   {% id %}
        # | %kw_about         {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_as            {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_at            {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_bool          {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_by            {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_case          {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_catch         {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_collect       {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_compare       {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_context       {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_coordsys      {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_defaultAction {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_do            {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_else          {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_exit          {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_for           {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_from          {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_function      {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_global        {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_group         {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_if            {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_in            {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_level         {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_local         {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_macroscript   {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_mapped        {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_menuitem      {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_not           {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_null          {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_objectset     {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_of            {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_on            {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_parameters    {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_persistent    {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_plugin        {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_rcmenu        {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_return        {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_rollout       {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_scope         {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_separator     {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_set           {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_struct        {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_submenu       {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_then          {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_time          {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_to            {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_tool          {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_try           {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_uicontrols    {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_undo          {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_utility       {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_when          {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_where         {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_while         {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
        # | %kw_with          {% d => ({ type: 'Identifier', value: d[0], range: getLoc(d[0]) }) %}
#---------------------------------------------------------------
# ACCESSOR - PROPERTY --- OK
    property
        -> operand %delimiter var_name
            {% d => ({
                type:     'AccessorProperty',
                operand:  d[0],
                property: d[2],
                range:    getLoc(d[0], d[2])
            })%}
#---------------------------------------------------------------
# ACCESSOR - INDEX --- OK
    index -> operand _ P_START expr P_END
        {% d => ({
            type:    'AccessorIndex',
            operand: d[0],
            index:   d[3],
            range:   getLoc(d[2], d[4])
        })%}
#---------------------------------------------------------------
# OPERANDS --- OK
    u_operand
        -> "-" _ operand
            {% d => ({
                type: 'UnaryExpression',
                operator: d[0],
                right:    d[1],
                range: getLoc(d[0], d[1])
            }) %}
    operand
        -> factor     {% id %} # RANGE OK
        | property    {% id %} # RANGE OK
        | index       {% id %} # RANGE OK
#---------------------------------------------------------------
# FACTORS --- OK
   factor
        -> string    {% id %} # RANGE OK
        | number     {% id %} # RANGE OK
        | path_name  {% id %} # RANGE OK
        | name_value {% id %} # RANGE OK
        | var_name   {% id %} # RANGE OK
        | bool       {% id %} # RANGE OK
        | void       {% id %} # RANGE OK
        | time       {% id %} # RANGE OK
        | array      {% id %} # RANGE OK
        | bitarray   {% id %} # RANGE OK
        | point4     {% id %} # RANGE OK
        | point3     {% id %} # RANGE OK
        | point2     {% id %} # RANGE OK
        | "?" {% d => ({type: 'Keyword', value: d[0]}, range: getLoc(d[0])) %} # RANGE OK
        | %error     {% id %}
        # HERE IS WHERE THE ITERATION HAPPENS
        | expr_seq   {% id %} # RANGE OK
#===============================================================
# VALUES
#===============================================================
# POINTS --- OK
    point4
        -> P_START expr (_S "," _) expr (_S "," _) expr (_S "," _) expr P_END
        {% d => ({
            type: 'ObjectPoint4',
            elements: [].concat(d[1], d[3], d[5], d[7]),
            range: getLoc(d[0], d[8])
        }) %}

    point3
        -> P_START expr (_S "," _) expr (_S "," _) expr P_END
        {% d => ({
            type: 'ObjectPoint3',
            elements: [].concat(d[1], d[3], d[5]),
            range: getLoc(d[0], d[6])
        }) %}
 
    point2
        -> P_START expr (_S "," _) expr P_END
        {% d => ({
            type: 'ObjectPoint2',
            elements: [].concat(d[1], d[3]),
            range: getLoc(d[0], d[4])
        }) %}

    P_START -> "[" _  {% d => d[0] %}
    P_END   -> _ "]"  {% d => d[1] %}
#===============================================================
# ARRAY --- OK
    array
        -> %arraydef _ %rparen
            {% d => ({
                type:      'ObjectArray',
                elements:  [],
                range:       getLoc(d[0], d[2])
            }) %}
        | (%arraydef _) array_expr (_ %rparen)
            {% d => ({
                type:     'ObjectArray',
                elements: d[1],
                range:      getLoc(d[0][0], d[2][1])
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
            range:      getLoc(d[0], d[2])
        }) %}
    | ( %bitarraydef _) bitarray_expr (_ %rbrace)
        {% d => ({
            type:     'ObjectBitArray',
            elements: d[1],
            range:      getLoc(d[0][0], d[2][1])
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
        {% d => ({
            type: 'Identifier',
            value: d[0],
            range: getLoc(d[0])
        }) %}
    var_type
        -> %identity      {% id %}
         | %global_typed  {% id %}
         | %typed_iden    {% id %}
         | kw_reserved    {% id %}

# CONTEXTUAL KEYWORDS...
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
        {% d => ({ type: 'Literal', value: d[0], range:getLoc(d[0]) }) %}
    # Bool
    bool
        -> %kw_bool
        {% d => ({ type: 'Literal', value: d[0], range:getLoc(d[0]) }) %}
        | %kw_on
        {% d => ({ type: 'Literal', value: d[0], range:getLoc(d[0]) }) %}
    # Void values
    void -> %kw_null
        {% d => ({ type: 'Literal', value: d[0], range:getLoc(d[0]) }) %}
    #---------------------------------------------------------------
    # Numbers
    number -> number_types
        {% d => ({ type: 'Literal', value: d[0], range:getLoc(d[0]) }) %}
    number_types
        -> %number  {% id %}
         | %hex     {% id %}
    # string
    string -> %string
        {% d => ({ type: 'Literal', value: d[0], range:getLoc(d[0]) }) %}
    # names
    name_value -> %name
        {% d => ({ type: 'Literal', value: d[0], range:getLoc(d[0]) }) %}
    #Resources
    resource -> %locale
        {% d => ({ type: 'Literal', value: d[0], range:getLoc(d[0]) }) %}
    #---------------------------------------------------------------
    # PATH NAME
    # THIS JUST CAPTURES ALL THE LEVEL PATH IN ONE TOKEN....
    path_name -> %path
        {% d => ({ type: 'Identifier', value: d[0], range:getLoc(d[0]) }) %}
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
    # zero or any whitespace
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