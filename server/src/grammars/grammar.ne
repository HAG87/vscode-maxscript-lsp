# @preprocessor typescript
@{%
    const mxLexer = require('./mooTokenize.js');
    // Utilities
    function getNested(obj, ...args) {
        return args.reduce((obj, level) => obj && obj[level], obj)
    }

    function checkNested(obj, level,  ...rest) {
        if (obj === undefined) return false
        if (rest.length == 0 && obj.hasOwnProperty(level)) return true
        return checkNested(obj[level], ...rest)
    }

    //function flatten(x) { return x != null ? x.flat().filter(e => e != null) : []; }
    const flatten = arr => arr != null ? arr.flat(2).filter(e => e != null) : [];

    const collectSub = (arr, index) => arr != null ? arr.map(e => e[index]) : [];

    const filterNull = arr => arr != null ? arr.filter(e => e != null) : [];

    const merge = (...args) => {
        /*
        let res = [];
        args.forEach( elem => {
            if (Array.isArray(elem)) {
                res = res.concat.apply(res, elem);
            } else {
                res.push(elem);
            }
        });
        return res.length ? res.filter(e => e != null) : null;
        //*/
        // return [].concat(...args).filter(e => e != null);
         return args.reduce((acc, val) => acc.concat(val), []).filter(e => e != null);
    }

    // Offset is not reilable, changed to line - character
    const getLoc = (start, end) => {
        if (!start) {return null;}
        
        // start could be an array...TODO: how to deal with nested arrays?
        let first = Array.isArray(start) ? start[0] : start;

        if (!first) {return null;}

        let startOffset = first.range ? first.range.start : {line: first.line, character: first.col};
        let endOffset;

        if (!end) {
            if (first.range) {
                endOffset = first.range.end;
            } else {
                endOffset = {
                    line: first.line,
                    character: (first.text != null ? first.col + first.text.length : first.col)
                };                
            }
        } else {
            // end could be an array...
            let last = Array.isArray(end) ? end[end.length-1] : end;

            if (last) {
                if (last.range) {
                    endOffset = last.range.end;
                } else {
                    endOffset = {
                        line: last.line,
                        character: (last.text != null ? last.col + last.text.length : last.col)                
                    };
                }
            }
        }
        
        let range = {
            start: startOffset,
            end: endOffset
        };
        return range;
    };

    const addLoc = (a, ...loc) => {
        if (!a.range || !loc) {return;}

        let last = loc[loc.length - 1];
        
        if (Array.isArray(last)) {
            last = last[last.length - 1]
        }

        if (!last || !last.range || !last.range.end) {return;}

        let temp = {
            start: {...a.range.start},
            end: {...last.range.end}
        };

        Object.assign(a.range, temp);
    };
    // parser configuration
    //let capture_ws = false;
    //let capture_comments = false;
    //----------------------------------------------------------
    // RULES
    //----------------------------------------------------------
    // EXPERIMENT: THIS WILL DROP MOO TOKENS, REDUCING THE TREE SIZE
    // const Literal = (x, d) => ({ type: 'Literal', kind: d, value: x[0].value, range:getLoc(x[0]) });
    const Std = (x, b, r) => ({ type: x, body: b, range: r});
    const Literal = x => ({ type: 'Literal', value: x[0], range:getLoc(x[0]) });
    const Identifier = x => ({ type: 'Identifier', value: x[0], range:getLoc(x[0]) });
%}
# USING MOO LEXER
@lexer mxLexer
#===============================================================
# ENTRY POINT
Main -> _ _expr_seq:? _ {% d => d[1] %}
#---------------------------------------------------------------
# Expressions main recursion
    # _EXPR -> expr (EOL expr):*    {% flatten %}
    
    # _EXPR
    #     -> _EXPR EOL expr {% d => [].concat(d[0], d[2])%}
    #     | expr
# ---------------------------------------------------------------
# EXPRESSIONS LIST --- OK
    expr
        -> MATH_EXPR      {% id %}
        | COMPARE_EXPR    {% id %}
        | LOGICAL_EXPR    {% id %}
        | VARIABLE_DECL   {% id %}
        | ASSIGNMENT      {% id %}
        | ATTRIBUTES_DEF  {% id %}
        | IF_EXPR         {% id %}
        | WHILE_LOOP      {% id %}
        | DO_LOOP         {% id %}
        | FOR_LOOP        {% id %}
        | LOOP_EXIT       {% id %}
        | CASE_EXPR       {% id %}
        | STRUCT_DEF      {% id %}
        | TRY_EXPR        {% id %}
        | FUNCTION_DEF    {% id %}
        | FN_RETURN       {% id %}
        | CONTEXT_EXPR    {% id %}
        | rollout_def     {% id %}
        | TOOL_DEF        {% id %}
        | RCMENU_DEF      {% id %}
        | MACROSCRIPT_DEF {% id %}
        | PLUGIN_DEF      {% id %}
        | CHANGE_HANDLER  {% id %}
        # | event_handler  {% id %}
        # | rollout_item   {% id %}
#---------------------------------------------------------------
# EXPRESSIONS - RECURSION! IN FACCTOR
    expr_seq
        -> LPAREN _expr_seq RPAREN
            {% d => ({
                type: 'BlockStatement',
                body: d[1],
                range: getLoc(d[0], d[2])
            })%}
        | "(" _ ")"
            {% d => ({
                type: 'EmptyParens',
                body: [],
                range: getLoc(d[0], d[2])
            })%}
   
    _expr_seq
        -> expr (EOL expr):* {% flatten %}
        # -> _expr_seq EOL expr {% d => [].concat(d[0], d[2]) %}
        # | expr #{% id %}
#===============================================================
# DEFINITIONS
#===============================================================
# RC MENU DEFINITION -- OK
    RCMENU_DEF
        -> (%kw_rcmenu __ ) VAR_NAME _
            LPAREN
                rcmenu_clauses:?
            RPAREN
        {% d => ({
            type: 'EntityRcmenu',
            id:   d[1],
            body: d[4],
            range: getLoc(d[0][0], d[5])
        })%}
    
    rcmenu_clauses -> rcmenu_clause (EOL rcmenu_clause):* {% flatten %}

    # rcmenu_clauses
    #     -> rcmenu_clauses EOL rcmenu_clause {% d => [].concat(d[0], d[2]) %}
    #     | rcmenu_clause

    rcmenu_clause
        -> VARIABLE_DECL {% id %}
        | FUNCTION_DEF   {% id %}
        | STRUCT_DEF     {% id %}
        | event_handler  {% id %}
        | rcmenu_submenu {% id %}
        | rcmenu_sep     {% id %}
        | rcmenu_item    {% id %}
    
    rcmenu_submenu
        -> (%kw_submenu _) STRING ( _ parameter):* _
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
            
    rcmenu_sep
        -> (%kw_separator __ ) VAR_NAME ( _ parameter):*
        {% d => {
            let res = {
                type:   'EntityRcmenu_separator',
                id:     d[1],
                params: flatten(d[2]),
                range: getLoc(d[0][0], d[1])
            };
            addLoc(res, res.params);
            return res;
        }%}
    
    rcmenu_item
        -> (%kw_menuitem __ ) VAR_NAME _ STRING ( _ parameter):*
        {% d => {
            let res = {
                type:   'EntityRcmenu_menuitem',
                id:     d[1],
                label:  d[3],
                params: flatten(d[4]),
                range: getLoc(d[0][0], d[3])
            };
            addLoc(res, res.params);
            return res;
        }%}
#---------------------------------------------------------------
# ATTRIBUTES DEFINITION
# attributes <name> [version:n] [silentErrors:t/f] [initialRollupState:0xnnnnn] [remap:#(<old_param_names_array>, <new_param_names_array>)]
    ATTRIBUTES_DEF
        -> (%kw_attributes __ ) VAR_NAME ( _ parameter):* _
        LPAREN
            attributes_clauses
        RPAREN
        {% d => ({
            type:   'EntityAttributes',
            id:     d[1],
            params: flatten(d[2]),
            body:   d[5],
            range:  getLoc(d[0][0], d[6])
        })%}

    attributes_clauses -> attributes_clause (EOL attributes_clause):* {% flatten %}

    attributes_clause
        -> VARIABLE_DECL {% id %}
        | event_handler  {% id %}
        | PARAM_DEF      {% id %}
        | rollout_def    {% id %}
#---------------------------------------------------------------
# PLUGIN DEFINITION --- OK
    PLUGIN_DEF
        -> (%kw_plugin __ ) VAR_NAME __ VAR_NAME ( _ parameter):* _
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

    plugin_clauses -> plugin_clause (EOL plugin_clause):* {% flatten %}

    plugin_clause
        -> VARIABLE_DECL  {% id %}
        | FUNCTION_DEF    {% id %}
        | STRUCT_DEF      {% id %}
        | TOOL_DEF        {% id %}
        | rollout_def     {% id %}
        | event_handler   {% id %}
        | PARAM_DEF       {% id %}
    #---------------------------------------------------------------
    PARAM_DEF
        -> (%kw_parameters __ ) VAR_NAME ( _ parameter):* _
            LPAREN
                param_clauses:?
            RPAREN
            {% d => ({
                type:   'EntityPlugin_params',
                id:     d[1],
                params: flatten(d[2]),
                body:   d[5],
                range: getLoc(d[0][0], d[6])
            })%}

    param_clauses -> param_clause (EOL param_clause):* {% flatten %}

    # param_clauses
    #     -> param_clauses EOL param_clause {% d => [].concat(d[0], d[2]) %}
    #     | param_clause

    param_clause
        -> param_defs   {% id %}
        | event_handler {% id %}

    param_defs -> VAR_NAME ( _ parameter):*
    {% d => {
        let res = {
            type:   'PluginParam',
            id:     d[0],
            params: flatten(d[1]),
            range: getLoc(d[0])
        };
        addLoc(res, res.params);
        return res;
    }%}
#---------------------------------------------------------------
# TOOL - MOUSE TOOL DEFINITION --- OK
    TOOL_DEF
        -> %kw_tool __ VAR_NAME ( _ parameter):* _
            LPAREN
                tool_clauses
            RPAREN
            {% d => ({
                type:   'EntityTool',
                id:     d[2],
                params: flatten(d[3]),
                body:   d[6],
                range:  getLoc(d[0], d[7])
            })%}
    
    tool_clauses -> tool_clause (EOL tool_clause):* {% flatten %}
    
    tool_clause
        -> VARIABLE_DECL {% id %}
        | FUNCTION_DEF   {% id %}
        | STRUCT_DEF     {% id %}
        | event_handler  {% id %}
#---------------------------------------------------------------
# ROLLOUT / UTILITY DEFINITION --- OK
        rollout_def
        -> (uistatement_def __ ) VAR_NAME _ operand ( _ parameter):* _
            LPAREN
                rollout_clauses
            RPAREN
            {% d => ({
                type:   d[0][0].type === 'kw_rollout' ? 'EntityRollout' : 'EntityUtility',
                id:     d[1],
                title:  d[3],
                params: flatten(d[4]),
                body:   d[7],
                range:  getLoc(d[0][0], d[8])
            })%}
    #---------------------------------------------------------------
    uistatement_def -> %kw_rollout {% id %} | %kw_utility {% id %}
    # rollout_clauses
    #    -> LPAREN _rollout_clause RPAREN {% d => d[1] %}
    #     | "(" _ ")" {% d => null %}

    rollout_clauses -> rollout_clause (EOL rollout_clause):* {% flatten %}

    # rollout_clauses
    #     -> rollout_clauses EOL rollout_clause {% d => [].concat(d[0], d[2]) %}
    #     | rollout_clause
    
    rollout_clause
        -> VARIABLE_DECL {% id %}
        | FUNCTION_DEF   {% id %}
        | STRUCT_DEF     {% id %}
        | item_group     {% id %}
        | rollout_item   {% id %}
        | event_handler  {% id %}
        | TOOL_DEF       {% id %}
        | rollout_def    {% id %}
    #---------------------------------------------------------------
    item_group
        -> %kw_group _ STRING _
            LPAREN
                group_clauses
            RPAREN
            {% d => ({
                type: 'EntityRolloutGroup',
                id:   d[2],
                body: d[5],
                range:getLoc(d[0], d[6])
            })%}
    
    group_clauses
        -> group_clauses EOL rollout_item {% d => merge(d[0], d[2]) %}
        | rollout_item
        # | null
    #---------------------------------------------------------------
    rollout_item
        -> %kw_uicontrols __ VAR_NAME ( _ operand):? ( _ parameter):*
            {% d => {
             let res = {
                    type:   'EntityRolloutControl',
                    class:  d[0],
                    id:     d[2],
                    text:   d[3] != null ? d[3][1] : null,
                    params: flatten(d[4]),
                    range:  getLoc(d[0])
                };
                if (res.params != null) { addLoc(res, res.params); }
                else if (res.text != null) { addLoc(res, res.text); }
                return res;
            }%}
#---------------------------------------------------------------
# MACROSCRIPT --- SHOULD AVOID LEFT RECURSION ?
    MACROSCRIPT_DEF
        -> (%kw_macroscript __ ) VAR_NAME ( _ macro_script_param):* _
            LPAREN
                macro_script_body:?
            RPAREN
            {% d => ({
                type:   'EntityMacroscript',
                id:     d[1],
                params: flatten(d[2]),
                body:   d[5],
                range:  getLoc(d[0][0], d[6])
            })%}

    macro_script_param
        -> param_name _ ( operand | RESOURCE )
            {% d => ({
                type: 'ParameterAssignment',
                param: d[0],
                value: d[2][0]
            })%}

    macro_script_body -> macro_script_clause ( EOL macro_script_clause ):* {% flatten %}

    # macro_script_body
    #    -> macro_script_body EOL macro_script_clause {% d => [].concat(d[0], d[2]) %}
    #    | macro_script_clause

    macro_script_clause
        -> expr         {% id %}
        | event_handler {% id %}
#---------------------------------------------------------------
# STRUCT DEFINITION --- OK
    # TODO: FINISH LOCATION
    STRUCT_DEF
        -> (%kw_struct __ ) VAR_NAME _
            LPAREN
                struct_members
            RPAREN
            {% d => ({
                type: 'Struct',
                id:   d[1],
                body: flatten(d[4]),
                range: getLoc(d[0][0], d[5])
            })%}

    struct_members -> struct_member ( LIST_SEP struct_member ):* {% flatten %}

    struct_member
        -> decl          {% id %}
        | FUNCTION_DEF   {% id %}
        | event_handler  {% id %}
        # this ensures that no scope modifier is followed by a comma!
        | str_scope __ struct_member {% d => [].concat(d[0], d[2]) %}
    #---------------------------------------------------------------
    str_scope -> %kw_scope
        {% d => ({
            type:'StructScope',
            value: d[0]
        }) %}        
#===============================================================
# EVENT HANDLER --- OK
    # TODO: FINISH LOCATION
    event_handler
        -> (%kw_on __ ) event_args __ (%kw_do | %kw_return) _ expr
            {% d => ({
                type:     'Event',
                id:       d[1].target || d[1].event,
                args:     d[1],
                modifier: d[3][0],
                body:     d[5],
                range:    getLoc(d[0][0], d[5])
            }) %}

    event_args
        -> VAR_NAME
            {% d => ({
                type: 'EventArgs',
                event: d[0]
            }) %}
        | VAR_NAME __ VAR_NAME
            {% d => ({
                type: 'EventArgs',
                target: d[0],
                event: d[2]
            }) %}
        | VAR_NAME __ VAR_NAME ( __ VAR_NAME):+
            {% d => ({
                type:   'EventArgs',
                target: d[0],
                event:  d[2],
                args:   flatten(d[3])
            }) %}
#---------------------------------------------------------------
# CHANGE HANDLER -- WHEN CONSTRUCTOR -- OK
    CHANGE_HANDLER
        -> %kw_when __ (VAR_NAME | kw_override) __ operand __ VAR_NAME __ (parameter _):* operand:? _ %kw_do _ expr
            {% d=> ({
                type:  'WhenStatement',
                args:  merge(...d.slice(2,9)),
                body:  d[13],
                range: getLoc(d[0], d[13])
            })%}
        | %kw_when __ operand __ VAR_NAME __ (parameter _):* operand:? _ %kw_do _ expr
            {% d=> ({
                type:  'WhenStatement',
                args:  merge(...d.slice(2,7)),
                body:  d[11],
                range: getLoc(d[0], d[11])
            })%}

    # when_param -> param_name _ NAME_VALUE
    #     {% d => ({
    #         type: 'ParameterAssignment',
    #         param: d[0],
    #         value: d[2],
    #     })%}
#---------------------------------------------------------------
# FUNCTION DEFINITION --- OK
    FUNCTION_DEF
        -> function_decl __ VAR_NAME (_ VAR_NAME):+ (_ fn_params):+ (_ "=" _) expr
            {% d => {
                let res = {
                    ...d[0],
                    id:     d[2],
                    args:   d[3].map(x => x[1]),
                    params: d[4].map(x => x[1]),
                    body:   d[6],
                };
                addLoc(res, d[6]);
                return res;
            }%}
         | function_decl __ VAR_NAME (_ VAR_NAME):+ (_ "=" _) expr
            {% d => {
                let res = {
                    ...d[0],
                    id:     d[2],
                    args:   d[3].map(x => x[1]),
                    params: [],
                    body:   d[5],
                };
                addLoc(res, d[5]);
                return res;
            }%}
         | function_decl __ VAR_NAME (_ fn_params):+ (_ "=" _) expr
            {% d => {
                let res = {
                    ...d[0],
                    id:     d[2],
                    args:   [],
                    params: d[3].map(x => x[1]),
                    body:   d[5],
                };
                addLoc(res, d[5])
                return res;
            }%}
         | function_decl __ VAR_NAME (_ "=" _) expr
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
        -> (%kw_mapped __ ):?  %kw_function
            {% d => ({
                type:   'Function',
                modifier: d[0] != null ? d[0][0] : null,
                keyword: d[1],
                range: getLoc(d[0] != null ? d[0][0] : d[1])
            })%}

    # This is for parameter declaration 
    fn_params
        -> parameter  {% id %}
        | param_name  {% id %}
#---------------------------------------------------------------
# FUNCTION RETURN --- OK
    FN_RETURN -> %kw_return _ expr
        {% d => ({
            type: 'FunctionReturn',
            body: d[2],
            range: getLoc(d[0], d[2])
        })%}
#===============================================================
# CONTEXT EXPRESSION --- OK
    # set_context -> %kw_set _ context
    #---------------------------------------------------------------
    CONTEXT_EXPR ->
        context ( LIST_SEP context ):* _ expr
            {% d => ({
                type:    'ContextStatement',
                context: merge(d[0], flatten(d[1])),
                body:    d[3],
                range:   getLoc(d[0], d[3])
            })%}

    # at level <node> || at time <time>
    # in <node>

    # [ in ] coordsys <coordsys>
    # about <center_spec>

    # [ with ] animate <boolean> 
    # [ with ] redraw <boolean>
    # [ with ] quiet <boolean>
    # [ with ] redraw <boolean>
    # [ with ] printAllElements <boolean>

    # [ with ] MXSCallstackCaptureEnabled <boolean>
    # [ with ] dontRepeatMessages <boolean>
    # [ with ] macroRecorderEmitterEnabled <boolean>

    # [ with ] defaultAction <action>
    # [ with ] undo <boolean>

    context
        -> %kw_at __ (%kw_level | %kw_time) _ operand
            {% d => ({
                type:    'ContextExpression',
                prefix :  d[0],
                context: d[2][0],
                args:    d[4],
                range:   getLoc(d[0], d[4])
            })%}
        | %kw_in _ operand
            {% d => ({
                type:    'ContextExpression',
                prefix : null,
                context: d[0],
                args:    d[2],
                range:   getLoc(d[0], d[2])
            })%}
        | (%kw_in __ ):? %kw_coordsys _ (%kw_local | operand)
            {% d => ({
                type: 'ContextExpression',
                prefix : (d[0] != null ? d[0][0] : null),
                context: d[1],
                args:    d[3][0],
                range:   getLoc(d[0] != null ? d[0][0] : d[1], d[3][0])
            })%}
        | %kw_about _ (%kw_coordsys | operand)
            {% d => ({
                type: 'ContextExpression',
                prefix : d[0],
                context: d[2][0],
                args:    null,
                range:   getLoc(d[0], d[2][0])
            })%}
        | %kw_context _ (LOGICAL_EXPR | BOOL)
            {% d => ({
                type: 'ContextExpression',
                prefix : null,
                context: d[0],
                args:    d[2][0],
                range: getLoc(d[0],d[2][0])
            })%}
        | (%kw_with __):? %kw_context _ (LOGICAL_EXPR | BOOL)
            {% d => ({
                type: 'ContextExpression',
                prefix :(d[0] != null ? d[0][0] : null),
                context: d[1],
                args:    d[3][0],
                range: getLoc(d[0] != null ? d[0][0] : d[1],d[3][0])
            })%}
        | (%kw_with __):? %kw_defaultAction _ ("#logmsg"|"#logtofile"|"#abort")
            {% d => ({
                type: 'ContextExpression',
                prefix :  (d[0] != null ? d[0][0] : null),
                context: d[1],
                args:    d[3][0],
                range:   getLoc(d[0] != null ? d[0][0] : d[1], d[3][0])
            })%}
        | (%kw_with __ ):? %kw_undo _ ( undo_label _ ):? (LOGICAL_EXPR | BOOL)
            {% d => ({
                type:    'ContextExpression',
                prefix : (d[0] != null ? d[0][0] : null),
                context: d[1],
                args:    (filterNull(d[3])).concat(d[4]),
                range:   getLoc(d[0] != null ? d[0][0] : d[1], d[4][0])
            })%}

        undo_label -> STRING {% id %} | parameter {% id %} | VAR_NAME {% id %}
#---------------------------------------------------------------
# CASE EXPRESSION --- OK
    CASE_EXPR
        -> (%kw_case _) case_src %kw_of _
            LPAREN
                case_item
                (EOL case_item):*
            RPAREN
            {% d => ({
                type:  'CaseStatement',
                test:  d[1],
                cases: merge(d[5], flatten(d[6])),
                range: getLoc(d[0][0], d[7])
            })%}

    case_src -> expr _  {% id %} | __ {% id %}

    case_item
        -> factor (_ ":" _) expr
            {% d => ({
                type:  'CaseClause',
                case:  d[0],
                body:  d[2],
                range: getLoc(d[0], d[2])
            })%}
#---------------------------------------------------------------
# FOR EXPRESSION --- OK # TODO: FINISH LOCATION
    FOR_LOOP
        -> (%kw_for __ ) for_index _S for_iterator _S expr ( _ for_sequence ):? _ for_action _ expr
            {% d => ({
                type:     'ForStatement',
                index:     d[1],
                iteration: d[3],
                value:     d[5],
                sequence:  filterNull(d[6]),
                action:    d[8],
                body:      d[10],
                range:     getLoc(d[0][0], d[10])
            })%}

    for_sequence
        -> for_to (_ for_by):? (_ for_while):? (_ for_where):?
            {% d => ({
                type:  'ForLoopSequence',
                to:    d[0],
                by:    filterNull(d[1]),
                while: filterNull(d[2]),
                where: filterNull(d[3])
            })%}
        | (for_while _):? for_where
            {% d => ({
                type:  'ForLoopSequence',
                to:    null,
                by:    null,
                while: filterNull(d[0]),
                where: d[1]
            })%}
        | for_while
            {% d => ({
                type:  'ForLoopSequence',
                to:    null,
                by:    null,
                while: d[0],
                where: null
            })%}
            
    # for <var_name> [, <index_name>[, <filtered_index_name>]] ( in | = )<sequence> ( do | collect ) <expr>
    for_index ->
        VAR_NAME _S LIST_SEP _ VAR_NAME _S LIST_SEP _ VAR_NAME
            {% d=> ({
                type: 'ForLoopIndex',
                variable: d[0],
                index_name: d[4],
                filtered_index_name: d[8]
            })%}
        | VAR_NAME _S LIST_SEP _ VAR_NAME
            {% d=> ({
                type: 'ForLoopIndex',
                variable: d[0],
                index_name: d[4],
                filtered_index_name: null
            })%}
        | VAR_NAME
            {% d=> ({
                type: 'ForLoopIndex',
                variable: d[0],
                index_name: null,
                filtered_index_name: null
            })%}
    
    for_iterator -> "=" {% id %} | %kw_in {% id %}

    for_to    -> %kw_to    _S expr {% d => d[2] %}
    for_by    -> %kw_by    _S expr {% d => d[2] %}
    for_where -> %kw_where _S expr {% d => d[2] %}
    for_while -> %kw_while _S expr {% d => d[2] %}

    for_action -> %kw_do {% id %} | %kw_collect {% id %}
#---------------------------------------------------------------
# LOOP EXIT EXPRESSION --- OK
    LOOP_EXIT
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
    DO_LOOP -> %kw_do _ expr _ %kw_while _ expr
        {% d => ({
            type:  'DoWhileStatement',
            body:  d[2],
            test:  d[6],
            range: getLoc(d[0], d[6])
        })%}
#---------------------------------------------------------------
# WHILE LOOP --- OK
    WHILE_LOOP -> (%kw_while _S) expr (_S %kw_do _) expr
        {% d => ({
            type:  'WhileStatement',
            test:  d[1],
            body:  d[3],
            range: getLoc(d[0][0], d[3])
        })%}
#---------------------------------------------------------------
# IF EXPRESSION --- OK
    IF_EXPR
        -> (%kw_if _) expr _ if_action _ expr
            {% d => ({
                type:       'IfStatement',
                test:       d[1],
                operator:   d[3],
                consequent: d[5],
                range:      getLoc(d[0][0], d[5])
            })%}
        | (%kw_if _) expr (_ %kw_then _) expr (_ %kw_else _) expr
            {% d => ({
                type:       'IfStatement',
                test:       d[1],
                operator:   d[2][1],
                consequent: d[3],
                alternate:  d[5],
                range:      getLoc(d[0][0], d[5])
            })%}
    if_action
        -> %kw_do  {% id %}
        | %kw_then {% id %}
#---------------------------------------------------------------
# TRY EXPRESSION -- OK
    TRY_EXPR 
        -> %kw_try _ expr _ %kw_catch _ expr
            {% d => ({
                type:      'TryStatement',
                body:      d[2],
                finalizer: d[6],
                range:     getLoc(d[0], d[6])
            })%}
#---------------------------------------------------------------
# VARIABLE DECLARATION --- OK
    VARIABLE_DECL
        -> kw_decl _ decl_list
            {% d => {
                let res = {
                    type: 'VariableDeclaration',
                    ...d[0],
                    decls: d[2],
                };
                addLoc(res, ...d[2]);
                return res;
            }%}

    kw_decl
        -> %kw_local {% d => ({modifier:null, scope: d[0], range:getLoc(d[0])}) %}
        | %kw_global {% d => ({modifier:null, scope: d[0], range:getLoc(d[0])}) %}
        | %kw_persistent __ %kw_global {% d => ({modifier: d[0], scope: d[2], range:getLoc(d[0], d[2])}) %}

    decl_list -> decl (LIST_SEP decl):*  {% flatten %}
    # decl_list -> decl  | decl_list LIST_SEP decl  {% flatten %}
    
    decl
        -> VAR_NAME  {% id %}
        | ASSIGNMENT {% id %}
    # decl
    #     -> VAR_NAME
    #         {% d => ({
    #             type:     'Declaration',
    #             id:       d[0],
    #             operator: null,
    #             value:    null,
    #             range:    getLoc(d[0])
    #         }) %}
    #     | ASSIGNMENT
    #         {% d => {
    #             let res = {...d[0]};
    #             res.type = 'Declaration';
    #             res.id = res.operand;
    #             delete res.operand;
    #             return res;
    #         } %}
#---------------------------------------------------------------
#ASSIGNMENT --- OK
    ASSIGNMENT
    -> destination _S %assign _ expr
        {% d => ({
            type:     'AssignmentExpression',
            operand:  d[0],
            operator: d[2],
            value:    d[4],
            range: getLoc(d[0], d[4])
        })%}

    destination
        -> VAR_NAME {% id %}
        | property  {% id %}
        | index     {% id %}
        | PATH_NAME {% id %}
#---------------------------------------------------------------
# MATH EXPRESSION ---  OK
    # MATH_EXPR
    #     -> MATH_EXPR _ ("^"|"*"|"/"|"+"|"-") _ (uny | as)
    #             {% d => ({
    #                 type:     'MathExpression',
    #                 operator: d[2][0],
    #                 left:     d[0],
    #                 right:    d[4][0],
    #                 range: getLoc(
    #                     Array.isArray(d[0]) ? d[0][0] : d[0],
    #                     Array.isArray(d[4]) ? d[4][0] : d[4])
    #             })%}
    #     | (uny | as) _  ("^"|"*"|"/"|"+"|"-") _ (uny | as)
    #             {% d => ({
    #                 type:     'MathExpression',
    #                 operator: d[2][0],
    #                 left:     d[0][0],
    #                 right:    d[4][0],
    #                 range: getLoc(
    #                     Array.isArray(d[0]) ? d[0][0] : d[0],
    #                     Array.isArray(d[4]) ? d[4][0] : d[4])
    #             })%}
    #     | as {% id %}
    #     | math_operand {% id %}
    #     uny 
    #         -> _S "-" _ uny
    #             {% d => ({
    #                 type: '--UnaryExpression',
    #                 operator: d[0],
    #                 right:    d[2],
    #                 range: getLoc(d[0], d[2])
    #             }) %}
    #         | math_operand {% id %}
    #TODO: MATH SHOULD NOT BE PASSTHROUGH!!!
    MATH_EXPR -> rest {% id %}

        rest -> rest minus_opt sum
                {% d => ({
                    type:     'MathExpression',
                    operator: d[1],
                    left:     d[0],
                    right:    d[2],
                    range: getLoc(Array.isArray(d[0]) ? d[0][0] : d[0], d[2] ) 
                })%}
            | sum {% id %}    
    
        minus_opt 
        -> _S_ "-" __ {% d => d[1] %}
        | "-" __      {% id %}
        | "-"         {% id %}
    
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
            
        # TYPE CONVERSION
        as -> math_operand _S %kw_as __ VAR_NAME
                {% d => ({
                    type:     'MathExpression',
                    operator: d[2],
                    left:     d[0],
                    right:    d[4],
                    range: getLoc(d[0], d[4])
                })%}
            # | uny {% id %}
            | math_operand {% id %}

        # FN_CALL | operand | operand | passthrough math expression
        math_operand
            -> operand   {% id %}
            | FN_CALL          {% id %}
#---------------------------------------------------------------
# LOGIC EXPRESSION --- OK
    LOGICAL_EXPR
        -> LOGICAL_EXPR _S %kw_compare _  (logical_operand | not_operand)
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
        -> operand {% id %}
        | COMPARE_EXPR {% id %}
        | FN_CALL   {% id %}
#---------------------------------------------------------------
# COMPARE EXPRESSION --- OK
    COMPARE_EXPR
        -> COMPARE_EXPR _S %comparison _ compare_operand
        {% d => ({
            type:     'LogicalExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4],
            range: getLoc(d[0], d[4])
        }) %}
        | compare_operand _S %comparison _ compare_operand
        {% d => ({
            type:     'LogicalExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4],
            range: getLoc(d[0], d[4])
        }) %}

    compare_operand
        -> MATH_EXPR {% id %}
        # -> operand {% id %}
        # | MATH_EXPR {% id %}
        # | FN_CALL {% id %}
#---------------------------------------------------------------
# FUNCTION CALL --- OK
    FN_CALL
        -> call_caller call_args call_params:?
            {% d => {
                let args = merge(d[1], d[2]);
                let res = {
                    type:  'CallExpression',
                    calle: d[0],
                    args:  args,
                    range: null
                };
                res.range = getLoc(d[0], res.args);
                return res;
            } %}
        | call_caller call_params
            {% d => ({
                type:  'CallExpression',
                calle: d[0],
                args:  d[1],
                range: getLoc(d[0], d[1])
            })%}
        # | call_caller {% id %}
        # | call_caller _S "(" ")"
        #     {% d => ({
        #         type:  'CallExpression',
        #         calle: d[0],
        #         args:  null,
        #         range: getLoc(d[0], d[3])
        #     })%}

    call_params
        -> (_S parameter):+ {% flatten %}

    call_args
        -> ( _S operand):+ {% flatten %}

    call_caller
        -> operand {% id %}
        # -> VAR_NAME {% id %}
        # | property  {% id %}
        # | index     {% id %}
#---------------------------------------------------------------
# PARAMETER CALL --- OK
    parameter
        -> param_name _ operand
            {% d => ({
                type: 'ParameterAssignment',
                param: d[0],
                value: d[2],
                range: getLoc (d[0], d[2])
            }) %}

    param_name
        -> VAR_NAME ":"
            {% d => ({
                type:'Parameter',
                value: d[0],
                range: getLoc(d[0], d[1])
            }) %}
        | kw_override ":"
            {% d => ({
                type:'Parameter',
                value: d[0],
                range: getLoc(d[0], d[1])
            }) %}
#---------------------------------------------------------------
# ACCESSOR - PROPERTY --- OK
    property
        -> operand %delimiter (VAR_NAME | VOID | kw_override)
            {% d => ({
                type:     'AccessorProperty',
                operand:  d[0],
                property: d[2][0],
                range:    getLoc(d[0], d[2])
            })%}
#---------------------------------------------------------------
# ACCESSOR - INDEX --- OK
    index -> operand _ LBRACKET expr RBRACKET
        {% d => ({
            type:    'AccessorIndex',
            operand: d[0],
            index:   d[3],
            range:   getLoc(d[2], d[4])
        })%}
#---------------------------------------------------------------
# OPERANDS --- OK
    operand
        -> factor     {% id %}
        | property    {% id %}
        | index       {% id %}
        | "-" _ operand
        {% d => ({
            type: 'UnaryExpression',
            operator: d[0],
            right:    d[2],
            range: getLoc(d[0], d[2])
        }) %}
#---------------------------------------------------------------
# FACTORS --- OK
   factor
        -> STRING    {% id %}
        | NUMBER     {% id %}
        | PATH_NAME  {% id %}
        | NAME_VALUE {% id %}
        | VAR_NAME   {% id %}
        | BOOL       {% id %}
        | VOID       {% id %}
        | TIME       {% id %}
        | array      {% id %}
        | bitarray   {% id %}
        | point4     {% id %}
        | point3     {% id %}
        | point2     {% id %}
        | "?" {% d => ({type: 'Keyword', value: d[0], range: getLoc(d[0]) })%}
        | %error     {% id %}
        # BLOCKSTATEMENT
        # TODO: UNARY SHOULD BE HERE!
        | expr_seq   {% id %}
#===============================================================
# VALUES
#===============================================================
# POINTS --- OK
    point4
        -> LBRACKET expr LIST_SEP expr LIST_SEP expr LIST_SEP expr RBRACKET
            {% d => ({
                type: 'ObjectPoint4',
                elements: [].concat(d[1], d[3], d[5], d[7]),
                range: getLoc(d[0], d[8])
            }) %}

    point3
        -> LBRACKET expr LIST_SEP expr LIST_SEP expr RBRACKET
            {% d => ({
                type: 'ObjectPoint3',
                elements: [].concat(d[1], d[3], d[5]),
                range: getLoc(d[0], d[6])
            }) %}
 
    point2
        -> LBRACKET expr LIST_SEP expr RBRACKET
            {% d => ({
                type: 'ObjectPoint2',
                elements: [].concat(d[1], d[3]),
                range: getLoc(d[0], d[4])
            }) %}
#===============================================================
# ARRAY --- OK
    array
        -> (%arraydef _) array_expr:? (_ %rparen)
            {% d => ({
                type:     'ObjectArray',
                elements: filterNull(d[1]),
                range:      getLoc(d[0][0], d[2][1])
            }) %}

        array_expr -> expr ( LIST_SEP expr ):*  {% flatten %}
#---------------------------------------------------------------
# BITARRAY --- OK
    bitarray
    -> ( %bitarraydef _) bitarray_expr:? RBRACE
        {% d => ({
            type:     'ObjectBitArray',
            elements: filterNull(d[1]),
            range:    getLoc(d[0][0], d[2])
        }) %}

    bitarray_expr -> bitarray_item ( LIST_SEP bitarray_item ):*  {% flatten %}

    # TODO: Fix groups
    bitarray_item
        -> expr (_S %bitrange _) expr
            {% d => ({
                type: 'BitRange',
                range: getLoc(d[0], d[2])
            }) %}
        | expr {% id %}
#===============================================================
# UTILITIES
    LIST_SEP -> _S %sep _ {% d => null %}
    #PARENS
    LPAREN ->  %lparen _    {% id %}
    RPAREN ->  _ %rparen    {% d => d[1] %}

    LBRACKET -> %lbracket _  {% id %}
    RBRACKET -> _ %rbracket  {% d => d[1] %}

    LBRACE -> %lbrace _  {% id %}
    RBRACE -> _ %rbrace  {% d => d[1] %}
#===============================================================
# VARNAME --- IDENTIFIERS --- OK
    # some keywords can be VAR_NAME too...
    VAR_NAME
        -> %identity      {% Identifier %}
         | %global_typed %identity
         {% d => ({
            type: 'Identifier_global',
            value: d[1],
            range: getLoc(d[0], d[1])
        }) %}
         | kw_reserved    {% Identifier %}

# CONTEXTUAL KEYWORDS...can be used as identifiers outside the context...
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

    kw_override
        -> %kw_attributes  {% id %}
        | %kw_uicontrols   {% id %}
        | %kw_group        {% id %}
        | %kw_level        {% id %}
        | %kw_menuitem     {% id %}
        | %kw_objectset    {% id %}
        | %kw_separator    {% id %}
        | %kw_submenu      {% id %}
        | %kw_time         {% id %}
        | %kw_set          {% id %}
        | %kw_parameters   {% id %}
        | %kw_dontcollect  {% id %}
        | %kw_continue     {% id %}
        | %kw_rollout      {% id %}
        | %kw_plugin       {% id %}
        | %kw_rcmenu       {% id %}
        | %kw_tool         {% id %}
        | %kw_to           {% id %}
        | %kw_collect      {% id %}
        | %kw_return       {% id %}
        | %kw_throw        {% id %}
#===============================================================
# PATH NAME
    # THIS JUST CAPTURES ALL THE LEVEL PATH IN ONE TOKEN....
    PATH_NAME -> %path {% Identifier %}
#---------------------------------------------------------------
# TOKENS
    # Time
    TIME -> %time          {% Literal %} #{% d => Literal(d, 'time') %}
    # Bool
    BOOL
        -> %kw_bool        {% Literal %} #{% d => Literal(d, 'boolean') %}
        | %kw_on           {% Literal %} #{% d => Literal(d, 'boolean') %}
    # Void values
    VOID -> %kw_null       {% Literal %} #{% d => Literal(d, 'void') %}
    #---------------------------------------------------------------
    # Numbers
    NUMBER
        -> %number  {% Literal %}
        | %hex      {% Literal %}
    # String
    STRING -> %string      {% Literal %}
    # Names
    NAME_VALUE -> %name    {% Literal %}
    #Resource
    RESOURCE -> %locale    {% Literal %}
#===============================================================
# WHITESPACE AND NEW LINES
    # comments are skipped in the parse tree!   

    # MANDATORY EOL
    EOL -> junk:* ( %newline | %statement ) _S {% d => null %}    
    # MANDATORY WHITESPACE | one or more whitespace
    _S_ -> ws:+ {% d => null %}
    # OPTIONAL WHITESPACE | zero or any whitespace
    _S -> ws:* {% d => null %}
    # MANDATORY WHITESPACE NL | one or more whitespace with NL
    __ -> wsl junk:* {% d => null %}
    # OPTIONAL WHITESPACE NL | zero or any whitespace with NL
    _ -> junk:*  {% d => null %}


    #_SL_ -> wsl {% d => null %} | _SL_ junk {% d => null %}
    # one or more whitespace
    #_S_ -> ws {% d => null %} | _S_ ws  {% d => null %}
    # zero or any whitespace
    #_S -> null | _S ws  {% d => null %}
    # one or more whitespace with NL
    #__ -> ws {% d => null %} | __ junk {% d => null %}
    # zero or any withespace with NL
    #_ -> null | _ junk  {% d => null %}


    ws -> %ws | %comment_BLK
    wsl ->  %ws | %newline | %comment_BLK | %statement

    junk
        -> %ws
        | %newline
        | %statement
        | %comment_BLK
        | %comment_SL
#---------------------------------------------------------------
