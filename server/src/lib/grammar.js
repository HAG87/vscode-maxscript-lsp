// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

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

    const flatten = arr => arr != null ? arr.flat().filter(e => e != null) : [];

    const collectSub = (arr, index) => arr != null ? arr.map(e => e[index]) : [];

    const filterNull = arr => arr != null ? arr.filter(e => e != null) : [];

    const tokenType = (t, newytpe) => {t.type = newytpe; return t;};

    const merge = (...args) => {
        let res = [];
        args.forEach( elem => {
            if (Array.isArray(elem)) {
                // console.log(elem);
                // res.push(...elem);
                res = res.concat.apply(res, elem);
            } else {
                res.push(elem);
            }
        });
        //let res = [].concat(...args).filter(e => e != null);

        return res.length ? res.filter(e => e != null) : null;
    };

    const convertToken = (token, newtype) => {
        let node = {...token};
            node.type = newtype;
        return node;
    };
    // Offset is not reilable, changed to line - character
    const getLoc = (start, end) => {
        if (!start) {return null;}

        let startOffset;
        let endOffset;
        
        // start could be an array...TODO: how to deal with nested arrays?
        let first = Array.isArray(start) ? start[0] : start;

        if (!first) {return null;}

        startOffset = first.range ? first.range.start : {line: first.line, character: first.col};

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
           // console.log(last);
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
            /*else {
                // undefined nodes????
                console.log(end);
            }//*/
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

        if (!last) {return;}

        if (!last.range) {return;}
        if (!last.range.end) {return;}

        let temp = { start: {...a.range.start}, end: {...last.range.end} };
        Object.assign(a.range, temp);
    };
    // parser configuration
    //let capture_ws = false;
    //let capture_comments = false;
    //----------------------------------------------------------
    // RULES
    //----------------------------------------------------------
    const Literal = d => ({ type: 'Literal', value: d[0], range:getLoc(d[0]) });
    const Identifier = d => ({ type: 'Identifier', value: d[0], range:getLoc(d[0]) });
var grammar = {
    Lexer: mxLexer,
    ParserRules: [
    {"name": "Main", "symbols": ["_", "_expr_seq", "_"], "postprocess": d => d[1]},
    {"name": "expr", "symbols": ["SIMPLE_EXPR"], "postprocess": id},
    {"name": "expr", "symbols": ["VARIABLE_DECL"], "postprocess": id},
    {"name": "expr", "symbols": ["ASSIGNMENT"], "postprocess": id},
    {"name": "expr", "symbols": ["IF_EXPR"], "postprocess": id},
    {"name": "expr", "symbols": ["WHILE_LOOP"], "postprocess": id},
    {"name": "expr", "symbols": ["DO_LOOP"], "postprocess": id},
    {"name": "expr", "symbols": ["FOR_LOOP"], "postprocess": id},
    {"name": "expr", "symbols": ["LOOP_EXIT"], "postprocess": id},
    {"name": "expr", "symbols": ["CASE_EXPR"], "postprocess": id},
    {"name": "expr", "symbols": ["STRUCT_DEF"], "postprocess": id},
    {"name": "expr", "symbols": ["TRY_EXPR"], "postprocess": id},
    {"name": "expr", "symbols": ["FUNCTION_DEF"], "postprocess": id},
    {"name": "expr", "symbols": ["FN_RETURN"], "postprocess": id},
    {"name": "expr", "symbols": ["CONTEXT_EXPR"], "postprocess": id},
    {"name": "expr", "symbols": ["ROLLOUT_DEF"], "postprocess": id},
    {"name": "expr", "symbols": ["TOOL_DEF"], "postprocess": id},
    {"name": "expr", "symbols": ["RCMENU_DEF"], "postprocess": id},
    {"name": "expr", "symbols": ["MACROSCRIPT_DEF"], "postprocess": id},
    {"name": "expr", "symbols": ["PLUGIN_DEF"], "postprocess": id},
    {"name": "expr", "symbols": ["CHANGE_HANDLER"], "postprocess": id},
    {"name": "SIMPLE_EXPR", "symbols": ["MATH_EXPR"], "postprocess": id},
    {"name": "SIMPLE_EXPR", "symbols": ["COMPARE_EXPR"], "postprocess": id},
    {"name": "SIMPLE_EXPR", "symbols": ["LOGICAL_EXPR"], "postprocess": id},
    {"name": "expr_seq", "symbols": ["LPAREN", "_expr_seq", "RPAREN"], "postprocess":  d => ({
            type: 'BlockStatement',
            body: d[1],
            range: getLoc(d[0], d[2])
        })},
    {"name": "expr_seq", "symbols": [{"literal":"("}, "_", {"literal":")"}], "postprocess":  d => ({
            type: 'EmptyParens',
            body: [],
            range: getLoc(d[0], d[2])
        })},
    {"name": "_expr_seq$ebnf$1", "symbols": []},
    {"name": "_expr_seq$ebnf$1$subexpression$1", "symbols": ["EOL", "expr"]},
    {"name": "_expr_seq$ebnf$1", "symbols": ["_expr_seq$ebnf$1", "_expr_seq$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_expr_seq", "symbols": ["expr", "_expr_seq$ebnf$1"], "postprocess": d => merge(...d)},
    {"name": "RCMENU_DEF$subexpression$1", "symbols": [(mxLexer.has("kw_rcmenu") ? {type: "kw_rcmenu"} : kw_rcmenu), "__"]},
    {"name": "RCMENU_DEF$ebnf$1", "symbols": ["rcmenu_clauses"], "postprocess": id},
    {"name": "RCMENU_DEF$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "RCMENU_DEF", "symbols": ["RCMENU_DEF$subexpression$1", "VAR_NAME", "_", "LPAREN", "RCMENU_DEF$ebnf$1", "RPAREN"], "postprocess":  d => ({
            type: 'EntityRcmenu',
            id:   d[1],
            body: d[4],
            range: getLoc(d[0][0], d[5])
        })},
    {"name": "rcmenu_clauses$ebnf$1", "symbols": []},
    {"name": "rcmenu_clauses$ebnf$1$subexpression$1", "symbols": ["EOL", "rcmenu_clause"]},
    {"name": "rcmenu_clauses$ebnf$1", "symbols": ["rcmenu_clauses$ebnf$1", "rcmenu_clauses$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "rcmenu_clauses", "symbols": ["rcmenu_clause", "rcmenu_clauses$ebnf$1"], "postprocess": d => merge(...d)},
    {"name": "rcmenu_clause", "symbols": ["VARIABLE_DECL"], "postprocess": id},
    {"name": "rcmenu_clause", "symbols": ["FUNCTION_DEF"], "postprocess": id},
    {"name": "rcmenu_clause", "symbols": ["STRUCT_DEF"], "postprocess": id},
    {"name": "rcmenu_clause", "symbols": ["EVENT_HANDLER"], "postprocess": id},
    {"name": "rcmenu_clause", "symbols": ["rcmenu_submenu"], "postprocess": id},
    {"name": "rcmenu_clause", "symbols": ["rcmenu_sep"], "postprocess": id},
    {"name": "rcmenu_clause", "symbols": ["rcmenu_item"], "postprocess": id},
    {"name": "rcmenu_submenu$subexpression$1", "symbols": [(mxLexer.has("kw_submenu") ? {type: "kw_submenu"} : kw_submenu), "_"]},
    {"name": "rcmenu_submenu$ebnf$1$subexpression$1", "symbols": ["_", "parameter_seq"]},
    {"name": "rcmenu_submenu$ebnf$1", "symbols": ["rcmenu_submenu$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "rcmenu_submenu$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rcmenu_submenu$ebnf$2", "symbols": ["rcmenu_clauses"], "postprocess": id},
    {"name": "rcmenu_submenu$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rcmenu_submenu", "symbols": ["rcmenu_submenu$subexpression$1", "string", "rcmenu_submenu$ebnf$1", "_", "LPAREN", "rcmenu_submenu$ebnf$2", "RPAREN"], "postprocess":  d => ({
            type:   'EntityRcmenu_submenu',
            label:  d[1],
            params: fd[2] != null ? d[2][1] : null,
            body:   d[5],
            range: getLoc(d[0][0], d[6])
        })},
    {"name": "rcmenu_sep$subexpression$1", "symbols": [(mxLexer.has("kw_separator") ? {type: "kw_separator"} : kw_separator), "__"]},
    {"name": "rcmenu_sep$ebnf$1", "symbols": ["parameter_seq"], "postprocess": id},
    {"name": "rcmenu_sep$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rcmenu_sep", "symbols": ["rcmenu_sep$subexpression$1", "VAR_NAME", "_", "rcmenu_sep$ebnf$1"], "postprocess":  d => {
            let res = {
                type:   'EntityRcmenu_separator',
                id:     d[1],
                params: d[3],
                range: getLoc(d[0][0])
            };
            addLoc(res, d[3]);
            return res;
        }},
    {"name": "rcmenu_item$subexpression$1", "symbols": [(mxLexer.has("kw_menuitem") ? {type: "kw_menuitem"} : kw_menuitem), "__"]},
    {"name": "rcmenu_item$ebnf$1", "symbols": ["parameter_seq"], "postprocess": id},
    {"name": "rcmenu_item$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rcmenu_item", "symbols": ["rcmenu_item$subexpression$1", "VAR_NAME", "_", "string", "_", "rcmenu_item$ebnf$1"], "postprocess":  d => {
            let res = {
                type:   'EntityRcmenu_menuitem',
                id:     d[1],
                label:  d[3],
                params: d[5],
                range: getLoc(d[0][0])
            };
            addLoc(res, d[5]);
            return res;
        }},
    {"name": "PLUGIN_DEF$subexpression$1", "symbols": [(mxLexer.has("kw_plugin") ? {type: "kw_plugin"} : kw_plugin), "__"]},
    {"name": "PLUGIN_DEF$ebnf$1$subexpression$1", "symbols": ["_", "parameter_seq"]},
    {"name": "PLUGIN_DEF$ebnf$1", "symbols": ["PLUGIN_DEF$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "PLUGIN_DEF$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "PLUGIN_DEF", "symbols": ["PLUGIN_DEF$subexpression$1", "VAR_NAME", "__", "VAR_NAME", "PLUGIN_DEF$ebnf$1", "_", "LPAREN", "plugin_clauses", "RPAREN"], "postprocess":  d => ({
            type:       'EntityPlugin',
            superclass: d[1],
            class:      d[3],
            id:         d[3],
            params:     d[4] != null ? d[4][1] : null,
            body:       d[7],
            range:    getLoc(d[0][0], d[8])
        })},
    {"name": "plugin_clauses$ebnf$1", "symbols": []},
    {"name": "plugin_clauses$ebnf$1$subexpression$1", "symbols": ["EOL", "plugin_clause"]},
    {"name": "plugin_clauses$ebnf$1", "symbols": ["plugin_clauses$ebnf$1", "plugin_clauses$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "plugin_clauses", "symbols": ["plugin_clause", "plugin_clauses$ebnf$1"], "postprocess": d => merge(...d)},
    {"name": "plugin_clause", "symbols": ["VARIABLE_DECL"], "postprocess": id},
    {"name": "plugin_clause", "symbols": ["FUNCTION_DEF"], "postprocess": id},
    {"name": "plugin_clause", "symbols": ["STRUCT_DEF"], "postprocess": id},
    {"name": "plugin_clause", "symbols": ["TOOL_DEF"], "postprocess": id},
    {"name": "plugin_clause", "symbols": ["ROLLOUT_DEF"], "postprocess": id},
    {"name": "plugin_clause", "symbols": ["EVENT_HANDLER"], "postprocess": id},
    {"name": "plugin_clause", "symbols": ["plugin_parameter"], "postprocess": id},
    {"name": "plugin_parameter$subexpression$1", "symbols": [(mxLexer.has("kw_parameters") ? {type: "kw_parameters"} : kw_parameters), "__"]},
    {"name": "plugin_parameter$ebnf$1$subexpression$1", "symbols": ["_", "parameter_seq"]},
    {"name": "plugin_parameter$ebnf$1", "symbols": ["plugin_parameter$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "plugin_parameter$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "plugin_parameter$ebnf$2", "symbols": ["param_clauses"], "postprocess": id},
    {"name": "plugin_parameter$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "plugin_parameter", "symbols": ["plugin_parameter$subexpression$1", "VAR_NAME", "plugin_parameter$ebnf$1", "_", "LPAREN", "plugin_parameter$ebnf$2", "RPAREN"], "postprocess":  d => ({
            type:   'EntityPlugin_params',
            id:     d[1],
            params: d[2] != null ? d[2][1] : null,
            body:   d[5],
            range: getLoc(d[0][0], d[6])
        })},
    {"name": "param_clauses$ebnf$1", "symbols": []},
    {"name": "param_clauses$ebnf$1$subexpression$1", "symbols": ["EOL", "param_clause"]},
    {"name": "param_clauses$ebnf$1", "symbols": ["param_clauses$ebnf$1", "param_clauses$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "param_clauses", "symbols": ["param_clause", "param_clauses$ebnf$1"], "postprocess": d => merge(...d)},
    {"name": "param_clause", "symbols": ["param_defs"], "postprocess": id},
    {"name": "param_clause", "symbols": ["EVENT_HANDLER"], "postprocess": id},
    {"name": "param_defs$ebnf$1", "symbols": ["parameter_seq"], "postprocess": id},
    {"name": "param_defs$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "param_defs", "symbols": ["VAR_NAME", "_", "param_defs$ebnf$1"], "postprocess":  d => {
            let res = {
                type:   'PluginParam',
                id:     d[0],
                params: d[2],
                range: getLoc(d[0])
            };
            addLoc(res, d[2]);
            return res;
        }},
    {"name": "TOOL_DEF$subexpression$1", "symbols": [(mxLexer.has("kw_tool") ? {type: "kw_tool"} : kw_tool), "__"]},
    {"name": "TOOL_DEF$ebnf$1$subexpression$1", "symbols": ["_", "parameter_seq"]},
    {"name": "TOOL_DEF$ebnf$1", "symbols": ["TOOL_DEF$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "TOOL_DEF$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "TOOL_DEF", "symbols": ["TOOL_DEF$subexpression$1", "VAR_NAME", "TOOL_DEF$ebnf$1", "_", "LPAREN", "tool_clauses", "RPAREN"], "postprocess":  d => ({
            type:   'EntityTool',
            id:     d[1],
            params: d[2] != null ? d[2][1] : null,
            body:   d[5],
            range:  getLoc(d[0][0], d[6])
        })},
    {"name": "tool_clauses$ebnf$1", "symbols": []},
    {"name": "tool_clauses$ebnf$1$subexpression$1", "symbols": ["EOL", "tool_clause"]},
    {"name": "tool_clauses$ebnf$1", "symbols": ["tool_clauses$ebnf$1", "tool_clauses$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "tool_clauses", "symbols": ["tool_clause", "tool_clauses$ebnf$1"], "postprocess": d => merge(...d)},
    {"name": "tool_clause", "symbols": ["VARIABLE_DECL"], "postprocess": id},
    {"name": "tool_clause", "symbols": ["FUNCTION_DEF"], "postprocess": id},
    {"name": "tool_clause", "symbols": ["STRUCT_DEF"], "postprocess": id},
    {"name": "tool_clause", "symbols": ["EVENT_HANDLER"], "postprocess": id},
    {"name": "ROLLOUT_DEF$subexpression$1", "symbols": ["uistatement_def", "__"]},
    {"name": "ROLLOUT_DEF$ebnf$1$subexpression$1", "symbols": ["_", "parameter_seq"]},
    {"name": "ROLLOUT_DEF$ebnf$1", "symbols": ["ROLLOUT_DEF$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "ROLLOUT_DEF$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "ROLLOUT_DEF", "symbols": ["ROLLOUT_DEF$subexpression$1", "VAR_NAME", "_", "unary_operand", "ROLLOUT_DEF$ebnf$1", "_", "LPAREN", "rollout_clauses", "RPAREN"], "postprocess":  d => ({
            type:   d[0][0].type === 'kw_rollout' ? 'EntityRollout' : 'EntityUtility',
            id:     d[1],
            title:  d[3],
            params: d[4] != null ? d[4][1] : null,
            body:   d[7],
            range:  getLoc(d[0][0], d[8])
        })},
    {"name": "uistatement_def", "symbols": [(mxLexer.has("kw_rollout") ? {type: "kw_rollout"} : kw_rollout)], "postprocess": id},
    {"name": "uistatement_def", "symbols": [(mxLexer.has("kw_utility") ? {type: "kw_utility"} : kw_utility)], "postprocess": id},
    {"name": "rollout_clauses$ebnf$1", "symbols": []},
    {"name": "rollout_clauses$ebnf$1$subexpression$1", "symbols": ["EOL", "rollout_clause"]},
    {"name": "rollout_clauses$ebnf$1", "symbols": ["rollout_clauses$ebnf$1", "rollout_clauses$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "rollout_clauses", "symbols": ["rollout_clause", "rollout_clauses$ebnf$1"], "postprocess": d => merge(...d)},
    {"name": "rollout_clause", "symbols": ["VARIABLE_DECL"], "postprocess": id},
    {"name": "rollout_clause", "symbols": ["FUNCTION_DEF"], "postprocess": id},
    {"name": "rollout_clause", "symbols": ["STRUCT_DEF"], "postprocess": id},
    {"name": "rollout_clause", "symbols": ["item_group"], "postprocess": id},
    {"name": "rollout_clause", "symbols": ["rollout_item"], "postprocess": id},
    {"name": "rollout_clause", "symbols": ["EVENT_HANDLER"], "postprocess": id},
    {"name": "rollout_clause", "symbols": ["TOOL_DEF"], "postprocess": id},
    {"name": "rollout_clause", "symbols": ["ROLLOUT_DEF"], "postprocess": id},
    {"name": "item_group$subexpression$1", "symbols": [(mxLexer.has("kw_group") ? {type: "kw_group"} : kw_group), "_"]},
    {"name": "item_group", "symbols": ["item_group$subexpression$1", "string", "_", "LPAREN", "group_clauses", "RPAREN"], "postprocess":  d => ({
            type: 'EntityRolloutGroup',
            id:   d[1],
            body: d[4],
            range:getLoc(d[0][0], d[5])
        })},
    {"name": "group_clauses", "symbols": ["group_clauses", "EOL", "rollout_item"], "postprocess": d => merge(d[0], d[2])},
    {"name": "group_clauses", "symbols": ["rollout_item"]},
    {"name": "rollout_item$ebnf$1$subexpression$1", "symbols": ["_", "unary_operand"]},
    {"name": "rollout_item$ebnf$1", "symbols": ["rollout_item$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "rollout_item$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rollout_item$ebnf$2$subexpression$1", "symbols": ["_", "parameter_seq"]},
    {"name": "rollout_item$ebnf$2", "symbols": ["rollout_item$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "rollout_item$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rollout_item", "symbols": [(mxLexer.has("kw_uicontrols") ? {type: "kw_uicontrols"} : kw_uicontrols), "__", "VAR_NAME", "rollout_item$ebnf$1", "rollout_item$ebnf$2"], "postprocess":  d => {
         let res = {
                type:   'EntityRolloutControl',
                class:  d[0],
                id:     d[2],
                text:   d[3] != null ? d[3][1] : null,
                params: d[4] != null ? d[4][1] : null,
                range:  getLoc(d[0])
            };
            if (d[4] != null) { addLoc(res, d[4][1]); }
            else if (d[3] != null) { addLoc(res, d[3][1]); }
            return res;
        }},
    {"name": "MACROSCRIPT_DEF$subexpression$1", "symbols": [(mxLexer.has("kw_macroscript") ? {type: "kw_macroscript"} : kw_macroscript), "__"]},
    {"name": "MACROSCRIPT_DEF$ebnf$1", "symbols": []},
    {"name": "MACROSCRIPT_DEF$ebnf$1$subexpression$1", "symbols": ["_", "macro_script_param"]},
    {"name": "MACROSCRIPT_DEF$ebnf$1", "symbols": ["MACROSCRIPT_DEF$ebnf$1", "MACROSCRIPT_DEF$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "MACROSCRIPT_DEF$ebnf$2", "symbols": ["macro_script_body"], "postprocess": id},
    {"name": "MACROSCRIPT_DEF$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "MACROSCRIPT_DEF", "symbols": ["MACROSCRIPT_DEF$subexpression$1", "VAR_NAME", "MACROSCRIPT_DEF$ebnf$1", "_", "LPAREN", "MACROSCRIPT_DEF$ebnf$2", "RPAREN"], "postprocess":  d => ({
            type:   'EntityMacroscript',
            id:     d[1],
            params: flatten(d[2]),
            body:   d[5],
            range:  getLoc(d[0][0], d[6])
        })},
    {"name": "macro_script_param$subexpression$1", "symbols": ["unary_operand"]},
    {"name": "macro_script_param$subexpression$1", "symbols": ["resource"]},
    {"name": "macro_script_param", "symbols": ["param_name", "_", "macro_script_param$subexpression$1"], "postprocess":  d => ({
            type: 'ParameterAssignment',
            param: d[0],
            value: d[2][0]
        })},
    {"name": "macro_script_body$ebnf$1", "symbols": []},
    {"name": "macro_script_body$ebnf$1$subexpression$1", "symbols": ["EOL", "macro_script_clause"]},
    {"name": "macro_script_body$ebnf$1", "symbols": ["macro_script_body$ebnf$1", "macro_script_body$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "macro_script_body", "symbols": ["macro_script_clause", "macro_script_body$ebnf$1"], "postprocess": d => merge(...d)},
    {"name": "macro_script_clause", "symbols": ["expr"], "postprocess": id},
    {"name": "macro_script_clause", "symbols": ["EVENT_HANDLER"], "postprocess": id},
    {"name": "STRUCT_DEF$subexpression$1", "symbols": [(mxLexer.has("kw_struct") ? {type: "kw_struct"} : kw_struct), "__"]},
    {"name": "STRUCT_DEF", "symbols": ["STRUCT_DEF$subexpression$1", "VAR_NAME", "_", "LPAREN", "struct_members", "RPAREN"], "postprocess":  d => ({
            type: 'Struct',
            id:   d[1],
            body: flatten(d[4]),
            range: getLoc(d[0][0], d[5])
        })},
    {"name": "struct_members$ebnf$1", "symbols": []},
    {"name": "struct_members$ebnf$1$subexpression$1", "symbols": ["LIST_SEP", "struct_member"]},
    {"name": "struct_members$ebnf$1", "symbols": ["struct_members$ebnf$1", "struct_members$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "struct_members", "symbols": ["struct_member", "struct_members$ebnf$1"], "postprocess": d => merge(...d)},
    {"name": "struct_member", "symbols": ["decl"], "postprocess": id},
    {"name": "struct_member", "symbols": ["FUNCTION_DEF"], "postprocess": id},
    {"name": "struct_member", "symbols": ["EVENT_HANDLER"], "postprocess": id},
    {"name": "struct_member", "symbols": ["str_scope", "__", "struct_member"], "postprocess": d => [].concat(d[0], d[2])},
    {"name": "str_scope", "symbols": [(mxLexer.has("kw_scope") ? {type: "kw_scope"} : kw_scope)], "postprocess":  d => ({
            type:'StructScope',
            value: d[0]
        }) },
    {"name": "EVENT_HANDLER$subexpression$1", "symbols": [(mxLexer.has("kw_on") ? {type: "kw_on"} : kw_on), "__"]},
    {"name": "EVENT_HANDLER", "symbols": ["EVENT_HANDLER$subexpression$1", "event_args", "__", "event_action", "_", "expr"], "postprocess":  d => ({
            type:     'Event',
            id:       d[1].target || d[1].event,
            args:     d[1],
            modifier: d[3],
            body:     d[5],
            range:    getLoc(d[0][0], d[5])
        }) },
    {"name": "event_action", "symbols": [(mxLexer.has("kw_do") ? {type: "kw_do"} : kw_do)], "postprocess": id},
    {"name": "event_action", "symbols": [(mxLexer.has("kw_return") ? {type: "kw_return"} : kw_return)], "postprocess": id},
    {"name": "event_args", "symbols": ["VAR_NAME"], "postprocess":  d => ({
            type: 'EventArgs',
            event: d[0]
        }) },
    {"name": "event_args", "symbols": ["VAR_NAME", "__", "VAR_NAME"], "postprocess":  d => ({
            type: 'EventArgs',
            target: d[0],
            event: d[2]
        }) },
    {"name": "event_args$ebnf$1$subexpression$1", "symbols": ["__", "VAR_NAME"]},
    {"name": "event_args$ebnf$1", "symbols": ["event_args$ebnf$1$subexpression$1"]},
    {"name": "event_args$ebnf$1$subexpression$2", "symbols": ["__", "VAR_NAME"]},
    {"name": "event_args$ebnf$1", "symbols": ["event_args$ebnf$1", "event_args$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "event_args", "symbols": ["VAR_NAME", "__", "VAR_NAME", "event_args$ebnf$1"], "postprocess":  d => ({
            type:   'EventArgs',
            target: d[0],
            event:  d[2],
            args:   flatten(d[3])
        }) },
    {"name": "CHANGE_HANDLER$ebnf$1$subexpression$1", "symbols": ["when_param", "_"]},
    {"name": "CHANGE_HANDLER$ebnf$1$subexpression$1", "symbols": ["when_param", "_", "when_param", "_"]},
    {"name": "CHANGE_HANDLER$ebnf$1", "symbols": ["CHANGE_HANDLER$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "CHANGE_HANDLER$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "CHANGE_HANDLER$ebnf$2$subexpression$1", "symbols": ["VAR_NAME", "__"]},
    {"name": "CHANGE_HANDLER$ebnf$2", "symbols": ["CHANGE_HANDLER$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "CHANGE_HANDLER$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "CHANGE_HANDLER", "symbols": [(mxLexer.has("kw_when") ? {type: "kw_when"} : kw_when), "__", "VAR_NAME", "__", "unary_operand", "__", "VAR_NAME", "__", "CHANGE_HANDLER$ebnf$1", "CHANGE_HANDLER$ebnf$2", (mxLexer.has("kw_do") ? {type: "kw_do"} : kw_do), "_", "expr"], "postprocess":  d=> ({
            type:  'WhenStatement',
            args:  merge(...d.slice(2,10)),
            body:  d[12],
            range: getLoc(d[0], d[12])
        })},
    {"name": "CHANGE_HANDLER$ebnf$3$subexpression$1", "symbols": ["when_param", "_"]},
    {"name": "CHANGE_HANDLER$ebnf$3$subexpression$1", "symbols": ["when_param", "_", "when_param", "_"]},
    {"name": "CHANGE_HANDLER$ebnf$3", "symbols": ["CHANGE_HANDLER$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "CHANGE_HANDLER$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "CHANGE_HANDLER$ebnf$4$subexpression$1", "symbols": ["VAR_NAME", "_"]},
    {"name": "CHANGE_HANDLER$ebnf$4", "symbols": ["CHANGE_HANDLER$ebnf$4$subexpression$1"], "postprocess": id},
    {"name": "CHANGE_HANDLER$ebnf$4", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "CHANGE_HANDLER", "symbols": [(mxLexer.has("kw_when") ? {type: "kw_when"} : kw_when), "__", "unary_operand", "__", "VAR_NAME", "__", "CHANGE_HANDLER$ebnf$3", "CHANGE_HANDLER$ebnf$4", (mxLexer.has("kw_do") ? {type: "kw_do"} : kw_do), "_", "expr"], "postprocess":  d=> ({
            type:  'WhenStatement',
            args:  merge(...d.slice(2,8)),
            body:  d[10],
            range: getLoc(d[0], d[10])
        })},
    {"name": "when_param", "symbols": ["param_name", "_", "name_value"], "postprocess":  d => ({
            type: 'ParameterAssignment',
            param: d[0],
            value: d[2],
        })},
    {"name": "FUNCTION_DEF$ebnf$1$subexpression$1", "symbols": ["_", "VAR_NAME"]},
    {"name": "FUNCTION_DEF$ebnf$1", "symbols": ["FUNCTION_DEF$ebnf$1$subexpression$1"]},
    {"name": "FUNCTION_DEF$ebnf$1$subexpression$2", "symbols": ["_", "VAR_NAME"]},
    {"name": "FUNCTION_DEF$ebnf$1", "symbols": ["FUNCTION_DEF$ebnf$1", "FUNCTION_DEF$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FUNCTION_DEF$ebnf$2$subexpression$1", "symbols": ["_", "fn_params"]},
    {"name": "FUNCTION_DEF$ebnf$2", "symbols": ["FUNCTION_DEF$ebnf$2$subexpression$1"]},
    {"name": "FUNCTION_DEF$ebnf$2$subexpression$2", "symbols": ["_", "fn_params"]},
    {"name": "FUNCTION_DEF$ebnf$2", "symbols": ["FUNCTION_DEF$ebnf$2", "FUNCTION_DEF$ebnf$2$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FUNCTION_DEF$subexpression$1", "symbols": ["_", {"literal":"="}, "_"]},
    {"name": "FUNCTION_DEF", "symbols": ["function_decl", "__", "VAR_NAME", "FUNCTION_DEF$ebnf$1", "FUNCTION_DEF$ebnf$2", "FUNCTION_DEF$subexpression$1", "expr"], "postprocess":  d => {
            let res = {
                ...d[0],
                id:     d[2],
                args:   d[3].map(x => x[1]),
                params: d[4].map(x => x[1]),
                body:   d[6],
            };
            addLoc(res, d[6]);
            return res;
        }},
    {"name": "FUNCTION_DEF$ebnf$3$subexpression$1", "symbols": ["_", "VAR_NAME"]},
    {"name": "FUNCTION_DEF$ebnf$3", "symbols": ["FUNCTION_DEF$ebnf$3$subexpression$1"]},
    {"name": "FUNCTION_DEF$ebnf$3$subexpression$2", "symbols": ["_", "VAR_NAME"]},
    {"name": "FUNCTION_DEF$ebnf$3", "symbols": ["FUNCTION_DEF$ebnf$3", "FUNCTION_DEF$ebnf$3$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FUNCTION_DEF$subexpression$2", "symbols": ["_", {"literal":"="}, "_"]},
    {"name": "FUNCTION_DEF", "symbols": ["function_decl", "__", "VAR_NAME", "FUNCTION_DEF$ebnf$3", "FUNCTION_DEF$subexpression$2", "expr"], "postprocess":  d => {
            let res = {
                ...d[0],
                id:     d[2],
                args:   d[3].map(x => x[1]),
                params: [],
                body:   d[5],
            };
            addLoc(res, d[5]);
            return res;
        }},
    {"name": "FUNCTION_DEF$ebnf$4$subexpression$1", "symbols": ["_", "fn_params"]},
    {"name": "FUNCTION_DEF$ebnf$4", "symbols": ["FUNCTION_DEF$ebnf$4$subexpression$1"]},
    {"name": "FUNCTION_DEF$ebnf$4$subexpression$2", "symbols": ["_", "fn_params"]},
    {"name": "FUNCTION_DEF$ebnf$4", "symbols": ["FUNCTION_DEF$ebnf$4", "FUNCTION_DEF$ebnf$4$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FUNCTION_DEF$subexpression$3", "symbols": ["_", {"literal":"="}, "_"]},
    {"name": "FUNCTION_DEF", "symbols": ["function_decl", "__", "VAR_NAME", "FUNCTION_DEF$ebnf$4", "FUNCTION_DEF$subexpression$3", "expr"], "postprocess":  d => {
            let res = {
                ...d[0],
                id:     d[2],
                args:   [],
                params: d[3].map(x => x[1]),
                body:   d[5],
            };
            addLoc(res, d[5])
            return res;
        }},
    {"name": "FUNCTION_DEF$subexpression$4", "symbols": ["_", {"literal":"="}, "_"]},
    {"name": "FUNCTION_DEF", "symbols": ["function_decl", "__", "VAR_NAME", "FUNCTION_DEF$subexpression$4", "expr"], "postprocess":  d => {
            let res = {
                ...d[0],
                id:     d[2],
                args:   [],
                params: [],
                body:   d[4],
            };
            addLoc(res, d[4]);
            return res;
        }},
    {"name": "function_decl$ebnf$1$subexpression$1", "symbols": [(mxLexer.has("kw_mapped") ? {type: "kw_mapped"} : kw_mapped), "__"]},
    {"name": "function_decl$ebnf$1", "symbols": ["function_decl$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "function_decl$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "function_decl", "symbols": ["function_decl$ebnf$1", (mxLexer.has("kw_function") ? {type: "kw_function"} : kw_function)], "postprocess":  d => ({
            type:   'Function',
            modifier: d[0] != null ? d[0][0] : null,
            keyword: d[1],
            range: getLoc(d[0] != null ? d[0][0] : d[1])
        })},
    {"name": "fn_params", "symbols": ["parameter"], "postprocess": id},
    {"name": "fn_params", "symbols": ["param_name"], "postprocess": id},
    {"name": "FN_RETURN", "symbols": [(mxLexer.has("kw_return") ? {type: "kw_return"} : kw_return), "_", "expr"], "postprocess":  d => ({
            type: 'FunctionReturn',
            body: d[2],
            range: getLoc(d[0], d[2])
        })},
    {"name": "CONTEXT_EXPR$ebnf$1", "symbols": []},
    {"name": "CONTEXT_EXPR$ebnf$1$subexpression$1", "symbols": ["LIST_SEP", "context"]},
    {"name": "CONTEXT_EXPR$ebnf$1", "symbols": ["CONTEXT_EXPR$ebnf$1", "CONTEXT_EXPR$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "CONTEXT_EXPR", "symbols": ["context", "CONTEXT_EXPR$ebnf$1", "_", "expr"], "postprocess":  d => ({
            type:    'ContextStatement',
            context: merge(d[0], flatten(d[1])),
            body:    d[3],
            range:   getLoc(d[0], d[3])
        })},
    {"name": "context$subexpression$1", "symbols": [(mxLexer.has("kw_level") ? {type: "kw_level"} : kw_level)]},
    {"name": "context$subexpression$1", "symbols": [(mxLexer.has("kw_time") ? {type: "kw_time"} : kw_time)]},
    {"name": "context", "symbols": [(mxLexer.has("kw_at") ? {type: "kw_at"} : kw_at), "__", "context$subexpression$1", "_", "unary_operand"], "postprocess":  d => ({
            type:    'ContextExpression',
            prefix :  null,
            context: d[0],
            args:    [].concat(d[2][0], d[4]),
            range:   getLoc(d[0], d[4])
        })},
    {"name": "context", "symbols": [(mxLexer.has("kw_in") ? {type: "kw_in"} : kw_in), "_", "unary_operand"], "postprocess":  d => ({
            type:    'ContextExpression',
            prefix : null,
            context: d[0],
            args:    [d[2]],
            range:   getLoc(d[0], d[2])
        })},
    {"name": "context$ebnf$1$subexpression$1", "symbols": [(mxLexer.has("kw_in") ? {type: "kw_in"} : kw_in), "__"]},
    {"name": "context$ebnf$1", "symbols": ["context$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "context$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$subexpression$2", "symbols": [(mxLexer.has("kw_local") ? {type: "kw_local"} : kw_local)]},
    {"name": "context$subexpression$2", "symbols": ["unary_operand"]},
    {"name": "context", "symbols": ["context$ebnf$1", (mxLexer.has("kw_coordsys") ? {type: "kw_coordsys"} : kw_coordsys), "_", "context$subexpression$2"], "postprocess":  d => ({
            type: 'ContextExpression',
            prefix : (d[0] != null ? d[0][0] : null),
            context: d[1],
            args:    d[3],
            range:   getLoc(d[0] != null ? d[0][0] : d[1], d[3][0])
        })},
    {"name": "context$subexpression$3", "symbols": [(mxLexer.has("kw_coordsys") ? {type: "kw_coordsys"} : kw_coordsys)]},
    {"name": "context$subexpression$3", "symbols": ["unary_operand"]},
    {"name": "context", "symbols": [(mxLexer.has("kw_about") ? {type: "kw_about"} : kw_about), "_", "context$subexpression$3"], "postprocess":  d => ({
            type: 'ContextExpression',
            prefix : null,
            context: d[0],
            args:    d[2],
            range:   getLoc(d[0], d[0][0])
        })},
    {"name": "context$ebnf$2$subexpression$1", "symbols": [(mxLexer.has("kw_with") ? {type: "kw_with"} : kw_with), "__"]},
    {"name": "context$ebnf$2", "symbols": ["context$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "context$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$subexpression$4", "symbols": ["LOGICAL_EXPR"]},
    {"name": "context$subexpression$4", "symbols": ["bool"]},
    {"name": "context", "symbols": ["context$ebnf$2", (mxLexer.has("kw_context") ? {type: "kw_context"} : kw_context), "_", "context$subexpression$4"], "postprocess":  d => ({
            type: 'ContextExpression',
            prefix : (d[0] != null ? d[0][0] : null),
            context: d[1],
            args:    d[3]
        })},
    {"name": "context$subexpression$5", "symbols": [{"literal":"#logmsg"}]},
    {"name": "context$subexpression$5", "symbols": [{"literal":"#logtofile"}]},
    {"name": "context$subexpression$5", "symbols": [{"literal":"#abort"}]},
    {"name": "context", "symbols": [(mxLexer.has("kw_with") ? {type: "kw_with"} : kw_with), "__", (mxLexer.has("kw_defaultAction") ? {type: "kw_defaultAction"} : kw_defaultAction), "_", "context$subexpression$5"], "postprocess":  d => ({
            type: 'ContextExpression',
            prefix : d[0],
            context: d[2],
            args:    d[4],
            range:   getLoc(d[0], d[4][0])
        })},
    {"name": "context$ebnf$3$subexpression$1", "symbols": [(mxLexer.has("kw_with") ? {type: "kw_with"} : kw_with), "__"]},
    {"name": "context$ebnf$3", "symbols": ["context$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "context$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$ebnf$4$subexpression$1", "symbols": ["undo_label", "_"]},
    {"name": "context$ebnf$4", "symbols": ["context$ebnf$4$subexpression$1"], "postprocess": id},
    {"name": "context$ebnf$4", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$subexpression$6", "symbols": ["LOGICAL_EXPR"]},
    {"name": "context$subexpression$6", "symbols": ["bool"]},
    {"name": "context", "symbols": ["context$ebnf$3", (mxLexer.has("kw_undo") ? {type: "kw_undo"} : kw_undo), "_", "context$ebnf$4", "context$subexpression$6"], "postprocess":  d => ({
            type:    'ContextExpression',
            prefix : (d[0] != null ? d[0][0] : null),
            context: d[1],
            args:    (filterNull(d[3])).concat(d[4]),
            range:   getLoc(d[0] != null ? d[0][0] : d[1], d[4][0])
        })},
    {"name": "undo_label", "symbols": ["string"], "postprocess": id},
    {"name": "undo_label", "symbols": ["parameter"], "postprocess": id},
    {"name": "undo_label", "symbols": ["VAR_NAME"], "postprocess": id},
    {"name": "CASE_EXPR$subexpression$1", "symbols": [(mxLexer.has("kw_case") ? {type: "kw_case"} : kw_case), "_"]},
    {"name": "CASE_EXPR$ebnf$1", "symbols": []},
    {"name": "CASE_EXPR$ebnf$1$subexpression$1", "symbols": ["EOL", "case_item"]},
    {"name": "CASE_EXPR$ebnf$1", "symbols": ["CASE_EXPR$ebnf$1", "CASE_EXPR$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "CASE_EXPR", "symbols": ["CASE_EXPR$subexpression$1", "case_src", (mxLexer.has("kw_of") ? {type: "kw_of"} : kw_of), "_", "LPAREN", "case_item", "CASE_EXPR$ebnf$1", "RPAREN"], "postprocess":  d => ({
            type:  'CaseStatement',
            test:  d[1],
            cases: merge(d[5], flatten(d[6])),
            range: getLoc(d[0][0], d[7])
        })},
    {"name": "case_src", "symbols": ["expr", "_"], "postprocess": d => d[0]},
    {"name": "case_src", "symbols": ["__"], "postprocess": id},
    {"name": "case_item$subexpression$1", "symbols": ["_", {"literal":":"}, "_"]},
    {"name": "case_item", "symbols": ["factor", "case_item$subexpression$1", "expr"], "postprocess":  d => ({
            type:  'CaseClause',
            case:  d[0],
            body:  d[2],
            range: getLoc(d[0][0], d[2])
        })},
    {"name": "FOR_LOOP$subexpression$1", "symbols": [(mxLexer.has("kw_for") ? {type: "kw_for"} : kw_for), "__"]},
    {"name": "FOR_LOOP$ebnf$1$subexpression$1", "symbols": ["_", "for_sequence"]},
    {"name": "FOR_LOOP$ebnf$1", "symbols": ["FOR_LOOP$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "FOR_LOOP$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FOR_LOOP", "symbols": ["FOR_LOOP$subexpression$1", "for_index", "_S", "for_iterator", "_S", "expr", "FOR_LOOP$ebnf$1", "_", "for_action", "_", "expr"], "postprocess":  d => ({
            type:     'ForStatement',
            index:     d[1],
            iteration: d[3],
            value:     d[5],
            sequence:  filterNull(d[6]),
            action:    d[8],
            body:      d[10],
            range:     getLoc(d[0][0], d[10])
        })},
    {"name": "for_sequence$ebnf$1$subexpression$1", "symbols": ["_", "for_by"]},
    {"name": "for_sequence$ebnf$1", "symbols": ["for_sequence$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "for_sequence$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_sequence$ebnf$2$subexpression$1", "symbols": ["_", "for_while"]},
    {"name": "for_sequence$ebnf$2", "symbols": ["for_sequence$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "for_sequence$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_sequence$ebnf$3$subexpression$1", "symbols": ["_", "for_where"]},
    {"name": "for_sequence$ebnf$3", "symbols": ["for_sequence$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "for_sequence$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_sequence", "symbols": ["for_to", "for_sequence$ebnf$1", "for_sequence$ebnf$2", "for_sequence$ebnf$3"], "postprocess":  d => ({
            type:  'ForLoopSequence',
            to:    d[0],
            by:    filterNull(d[1]),
            while: filterNull(d[2]),
            where: filterNull(d[3])
        })},
    {"name": "for_sequence$ebnf$4$subexpression$1", "symbols": ["for_while", "_"]},
    {"name": "for_sequence$ebnf$4", "symbols": ["for_sequence$ebnf$4$subexpression$1"], "postprocess": id},
    {"name": "for_sequence$ebnf$4", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_sequence", "symbols": ["for_sequence$ebnf$4", "for_where"], "postprocess":  d => ({
            type:  'ForLoopSequence',
            to:    null,
            by:    null,
            while: filterNull(d[0]),
            where: d[1]
        })},
    {"name": "for_sequence", "symbols": ["for_while"], "postprocess":  d => ({
            type:  'ForLoopSequence',
            to:    null,
            by:    null,
            while: d[0],
            where: null
        })},
    {"name": "for_index", "symbols": ["VAR_NAME", "_S", "LIST_SEP", "_", "VAR_NAME", "_S", "LIST_SEP", "_", "VAR_NAME"], "postprocess":  d=> ({
            type: 'ForLoopIndex',
            variable: d[0],
            index_name: d[4],
            filtered_index_name: d[8]
        })},
    {"name": "for_index", "symbols": ["VAR_NAME", "_S", "LIST_SEP", "_", "VAR_NAME"], "postprocess":  d=> ({
            type: 'ForLoopIndex',
            variable: d[0],
            index_name: d[4],
            filtered_index_name: null
        })},
    {"name": "for_index", "symbols": ["VAR_NAME"], "postprocess":  d=> ({
            type: 'ForLoopIndex',
            variable: d[0],
            index_name: null,
            filtered_index_name: null
        })},
    {"name": "for_iterator", "symbols": [{"literal":"="}], "postprocess": id},
    {"name": "for_iterator", "symbols": [(mxLexer.has("kw_in") ? {type: "kw_in"} : kw_in)], "postprocess": id},
    {"name": "for_to", "symbols": [(mxLexer.has("kw_to") ? {type: "kw_to"} : kw_to), "_S", "expr"], "postprocess": d => d[2]},
    {"name": "for_by", "symbols": [(mxLexer.has("kw_by") ? {type: "kw_by"} : kw_by), "_S", "expr"], "postprocess": d => d[2]},
    {"name": "for_where", "symbols": [(mxLexer.has("kw_where") ? {type: "kw_where"} : kw_where), "_S", "expr"], "postprocess": d => d[2]},
    {"name": "for_while", "symbols": [(mxLexer.has("kw_while") ? {type: "kw_while"} : kw_while), "_S", "expr"], "postprocess": d => d[2]},
    {"name": "for_action", "symbols": [(mxLexer.has("kw_do") ? {type: "kw_do"} : kw_do)], "postprocess": id},
    {"name": "for_action", "symbols": [(mxLexer.has("kw_collect") ? {type: "kw_collect"} : kw_collect)], "postprocess": id},
    {"name": "LOOP_EXIT", "symbols": [(mxLexer.has("kw_exit") ? {type: "kw_exit"} : kw_exit)], "postprocess":  d => ({
            type : 'LoopExit',
            body:  null,
            range: getLoc(d[0])
        })},
    {"name": "LOOP_EXIT$subexpression$1", "symbols": ["__", (mxLexer.has("kw_with") ? {type: "kw_with"} : kw_with), "_"]},
    {"name": "LOOP_EXIT", "symbols": [(mxLexer.has("kw_exit") ? {type: "kw_exit"} : kw_exit), "LOOP_EXIT$subexpression$1", "expr"], "postprocess":  d => ({
            type : 'LoopExit',
            body:  d[2],
            range: getLoc(d[0], d[2])
        })},
    {"name": "DO_LOOP$subexpression$1", "symbols": [(mxLexer.has("kw_do") ? {type: "kw_do"} : kw_do), "_"]},
    {"name": "DO_LOOP$subexpression$2", "symbols": ["_", (mxLexer.has("kw_while") ? {type: "kw_while"} : kw_while), "_"]},
    {"name": "DO_LOOP", "symbols": ["DO_LOOP$subexpression$1", "expr", "DO_LOOP$subexpression$2", "expr"], "postprocess":  d => ({
            type:  'DoWhileStatement',
            body:  d[1],
            test:  d[3],
            range: getLoc(d[0][0], d[3])
        })},
    {"name": "WHILE_LOOP$subexpression$1", "symbols": [(mxLexer.has("kw_while") ? {type: "kw_while"} : kw_while), "_S"]},
    {"name": "WHILE_LOOP$subexpression$2", "symbols": ["_S", (mxLexer.has("kw_do") ? {type: "kw_do"} : kw_do), "_"]},
    {"name": "WHILE_LOOP", "symbols": ["WHILE_LOOP$subexpression$1", "expr", "WHILE_LOOP$subexpression$2", "expr"], "postprocess":  d => ({
            type:  'WhileStatement',
            test:  d[1],
            body:  d[3],
            range: getLoc(d[0][0], d[3])
        })},
    {"name": "IF_EXPR$subexpression$1", "symbols": [(mxLexer.has("kw_if") ? {type: "kw_if"} : kw_if), "_"]},
    {"name": "IF_EXPR", "symbols": ["IF_EXPR$subexpression$1", "expr", "_", "if_action", "_", "expr"], "postprocess":  d => ({
            type:       'IfStatement',
            test:       d[1],
            operator:   d[3],
            consequent: d[5],
            range:      getLoc(d[0][0], d[5])
        })},
    {"name": "IF_EXPR$subexpression$2", "symbols": [(mxLexer.has("kw_if") ? {type: "kw_if"} : kw_if), "_"]},
    {"name": "IF_EXPR$subexpression$3", "symbols": ["_", (mxLexer.has("kw_then") ? {type: "kw_then"} : kw_then), "_"]},
    {"name": "IF_EXPR$subexpression$4", "symbols": ["_", (mxLexer.has("kw_else") ? {type: "kw_else"} : kw_else), "_"]},
    {"name": "IF_EXPR", "symbols": ["IF_EXPR$subexpression$2", "expr", "IF_EXPR$subexpression$3", "expr", "IF_EXPR$subexpression$4", "expr"], "postprocess":  d => ({
            type:       'IfStatement',
            test:       d[1],
            operator:   d[2][1],
            consequent: d[3],
            alternate:  d[5],
            range:      getLoc(d[0][0], d[5])
        })},
    {"name": "if_action", "symbols": [(mxLexer.has("kw_do") ? {type: "kw_do"} : kw_do)], "postprocess": id},
    {"name": "if_action", "symbols": [(mxLexer.has("kw_then") ? {type: "kw_then"} : kw_then)], "postprocess": id},
    {"name": "TRY_EXPR$subexpression$1", "symbols": [(mxLexer.has("kw_try") ? {type: "kw_try"} : kw_try), "_"]},
    {"name": "TRY_EXPR$subexpression$2", "symbols": ["_", (mxLexer.has("kw_catch") ? {type: "kw_catch"} : kw_catch), "_"]},
    {"name": "TRY_EXPR", "symbols": ["TRY_EXPR$subexpression$1", "expr", "TRY_EXPR$subexpression$2", "expr"], "postprocess":  d => ({
            type:      'TryStatement',
            body:      d[1],
            finalizer: d[3],
            range:     getLoc(d[0][0], d[3])
        })},
    {"name": "VARIABLE_DECL", "symbols": ["kw_decl", "_", "decl_list"], "postprocess":  d => {
            let res = {
                type: 'VariableDeclaration',
                ...d[0],
                decls: d[2],
            };
            addLoc(res, ...d[2]);
            return res;
        }},
    {"name": "kw_decl", "symbols": [(mxLexer.has("kw_local") ? {type: "kw_local"} : kw_local)], "postprocess": d => ({modifier:null, scope: d[0], range:getLoc(d[0])})},
    {"name": "kw_decl", "symbols": [(mxLexer.has("kw_global") ? {type: "kw_global"} : kw_global)], "postprocess": d => ({modifier:null, scope: d[0], range:getLoc(d[0])})},
    {"name": "kw_decl", "symbols": [(mxLexer.has("kw_persistent") ? {type: "kw_persistent"} : kw_persistent), "__", (mxLexer.has("kw_global") ? {type: "kw_global"} : kw_global)], "postprocess": d => ({modifier: d[0], scope: d[2], range:getLoc(d[0], d[2])})},
    {"name": "decl_list$ebnf$1", "symbols": []},
    {"name": "decl_list$ebnf$1$subexpression$1", "symbols": ["LIST_SEP", "decl"]},
    {"name": "decl_list$ebnf$1", "symbols": ["decl_list$ebnf$1", "decl_list$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "decl_list", "symbols": ["decl", "decl_list$ebnf$1"], "postprocess": d => merge(...d)},
    {"name": "decl", "symbols": ["VAR_NAME"], "postprocess":  d => ({
            type:     'Declaration',
            id:       d[0],
            operator: null,
            value:    null,
            range:    getLoc(d[0])
        }) },
    {"name": "decl", "symbols": ["ASSIGNMENT"], "postprocess":  d => {
            let res = {...d[0]};
            res.type = 'Declaration';
            res.id = res.operand;
            delete res.operand;
            return res;
        } },
    {"name": "ASSIGNMENT$subexpression$1", "symbols": ["_S", (mxLexer.has("assign") ? {type: "assign"} : assign), "_"]},
    {"name": "ASSIGNMENT", "symbols": ["destination", "ASSIGNMENT$subexpression$1", "expr"], "postprocess":  d => ({
            type:     'AssignmentExpression',
            operand:  d[0],
            operator: d[1][1],
            value:    d[2],
            range: getLoc(d[0], d[2])
        })},
    {"name": "destination", "symbols": ["VAR_NAME"], "postprocess": id},
    {"name": "destination", "symbols": ["property"], "postprocess": id},
    {"name": "destination", "symbols": ["index"], "postprocess": id},
    {"name": "destination", "symbols": ["path_name"], "postprocess": id},
    {"name": "MATH_EXPR", "symbols": ["rest"], "postprocess": id},
    {"name": "rest", "symbols": ["rest", "minus_opt", "sum"], "postprocess":  d => ({
            type:     'MathExpression',
            operator: d[1],
            left:     d[0],
            right:    d[2],
            range: getLoc(Array.isArray(d[0]) ? d[0][0] : d[0], d[2] ) 
        })},
    {"name": "rest", "symbols": ["sum"], "postprocess": id},
    {"name": "minus_opt", "symbols": ["_S_", {"literal":"-"}, "__"], "postprocess": d => d[1]},
    {"name": "minus_opt", "symbols": [{"literal":"-"}, "__"], "postprocess": d => d[0]},
    {"name": "minus_opt", "symbols": [{"literal":"-"}], "postprocess": id},
    {"name": "sum", "symbols": ["sum", "_S", {"literal":"+"}, "_", "prod"], "postprocess":  d => ({
            type:     'MathExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4],
            range: getLoc( Array.isArray(d[0]) ? d[0][0] : d[0], d[4] ) 
        })},
    {"name": "sum", "symbols": ["prod"], "postprocess": id},
    {"name": "prod$subexpression$1", "symbols": [{"literal":"*"}]},
    {"name": "prod$subexpression$1", "symbols": [{"literal":"/"}]},
    {"name": "prod", "symbols": ["prod", "_S", "prod$subexpression$1", "_", "exp"], "postprocess":  d => ({
            type:     'MathExpression',
            operator: d[2][0],
            left:     d[0],
            right:    d[4],
            range: getLoc( Array.isArray(d[0]) ? d[0][0] : d[0], d[4] ) 
        })},
    {"name": "prod", "symbols": ["exp"], "postprocess": id},
    {"name": "exp", "symbols": ["as", "_S", {"literal":"^"}, "_", "exp"], "postprocess":  d => ({
            type:     'MathExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4],
            range: getLoc( Array.isArray(d[0]) ? d[0][0] : d[0], d[4] )
        })},
    {"name": "exp", "symbols": ["as"], "postprocess": id},
    {"name": "as", "symbols": ["math_operand", "_S", (mxLexer.has("kw_as") ? {type: "kw_as"} : kw_as), "__", "VAR_NAME"], "postprocess":  d => ({
            type:     'MathExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4],
            range: getLoc(d[0], d[4])
        })},
    {"name": "as", "symbols": ["math_operand"], "postprocess": id},
    {"name": "math_operand", "symbols": ["unary_operand"], "postprocess": id},
    {"name": "math_operand", "symbols": ["FN_CALL"], "postprocess": id},
    {"name": "LOGICAL_EXPR$subexpression$1", "symbols": ["logical_operand"]},
    {"name": "LOGICAL_EXPR$subexpression$1", "symbols": ["not_operand"]},
    {"name": "LOGICAL_EXPR", "symbols": ["LOGICAL_EXPR", "_S", (mxLexer.has("kw_compare") ? {type: "kw_compare"} : kw_compare), "_", "LOGICAL_EXPR$subexpression$1"], "postprocess":  d => ({
            type :    'LogicalExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4][0],
            range: getLoc(d[0], d[4][0])
        }) },
    {"name": "LOGICAL_EXPR$subexpression$2", "symbols": ["logical_operand"]},
    {"name": "LOGICAL_EXPR$subexpression$2", "symbols": ["not_operand"]},
    {"name": "LOGICAL_EXPR", "symbols": ["logical_operand", "_S", (mxLexer.has("kw_compare") ? {type: "kw_compare"} : kw_compare), "_", "LOGICAL_EXPR$subexpression$2"], "postprocess":  d => ({
            type :    'LogicalExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4][0],
            range: getLoc(d[0], d[4][0])
        }) },
    {"name": "LOGICAL_EXPR", "symbols": ["not_operand"], "postprocess": id},
    {"name": "not_operand", "symbols": [(mxLexer.has("kw_not") ? {type: "kw_not"} : kw_not), "_", "logical_operand"], "postprocess":  d => ({
            type :    'LogicalExpression',
            operator: d[0],
            right:    d[2],
            range: getLoc(d[0], d[2])
        }) },
    {"name": "logical_operand", "symbols": ["unary_operand"], "postprocess": id},
    {"name": "logical_operand", "symbols": ["COMPARE_EXPR"], "postprocess": id},
    {"name": "logical_operand", "symbols": ["FN_CALL"], "postprocess": id},
    {"name": "COMPARE_EXPR", "symbols": ["COMPARE_EXPR", "_S", (mxLexer.has("comparison") ? {type: "comparison"} : comparison), "_", "compare_operand"], "postprocess":  d => ({
            type:     'LogicalExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4],
            range: getLoc(d[0], d[4])
        }) },
    {"name": "COMPARE_EXPR", "symbols": ["compare_operand", "_S", (mxLexer.has("comparison") ? {type: "comparison"} : comparison), "_", "compare_operand"], "postprocess":  d => ({
            type:     'LogicalExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4],
            range: getLoc(d[0], d[4])
        }) },
    {"name": "compare_operand", "symbols": ["MATH_EXPR"], "postprocess": id},
    {"name": "FN_CALL$ebnf$1", "symbols": ["call_params"], "postprocess": id},
    {"name": "FN_CALL$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FN_CALL", "symbols": ["call_caller", "call_args", "FN_CALL$ebnf$1"], "postprocess":  d => {
            let args = merge(d[1], d[2]);
            let res = {
                type:  'CallExpression',
                calle: d[0],
                args:  args,
                range: null
            };
            res.range = getLoc(d[0], args);
            return res;
        } },
    {"name": "FN_CALL", "symbols": ["call_caller", "call_params"], "postprocess":  d => ({
            type:  'CallExpression',
            calle: d[0],
            args:  d[1],
            range: getLoc(d[0], d[1])
        })},
    {"name": "call_params$ebnf$1$subexpression$1", "symbols": ["_S", "parameter"]},
    {"name": "call_params$ebnf$1", "symbols": ["call_params$ebnf$1$subexpression$1"]},
    {"name": "call_params$ebnf$1$subexpression$2", "symbols": ["_S", "parameter"]},
    {"name": "call_params$ebnf$1", "symbols": ["call_params$ebnf$1", "call_params$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "call_params", "symbols": ["call_params$ebnf$1"], "postprocess": d => merge(...d)},
    {"name": "call_args$ebnf$1$subexpression$1", "symbols": ["_S_", "unary_only_operand"]},
    {"name": "call_args$ebnf$1$subexpression$1", "symbols": ["_S", "operand"]},
    {"name": "call_args$ebnf$1", "symbols": ["call_args$ebnf$1$subexpression$1"]},
    {"name": "call_args$ebnf$1$subexpression$2", "symbols": ["_S_", "unary_only_operand"]},
    {"name": "call_args$ebnf$1$subexpression$2", "symbols": ["_S", "operand"]},
    {"name": "call_args$ebnf$1", "symbols": ["call_args$ebnf$1", "call_args$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "call_args", "symbols": ["call_args$ebnf$1"], "postprocess": d => merge(...d)},
    {"name": "call_caller", "symbols": ["unary_operand"], "postprocess": id},
    {"name": "parameter_seq$ebnf$1", "symbols": []},
    {"name": "parameter_seq$ebnf$1$subexpression$1", "symbols": ["_", "parameter"]},
    {"name": "parameter_seq$ebnf$1", "symbols": ["parameter_seq$ebnf$1", "parameter_seq$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "parameter_seq", "symbols": ["parameter", "parameter_seq$ebnf$1"], "postprocess": d => merge(...d)},
    {"name": "parameter", "symbols": ["param_name", "_", "unary_operand"], "postprocess":  d => ({
            type: 'ParameterAssignment',
            param: d[0],
            value: d[2],
            range: getLoc (d[0], d[2])
        }) },
    {"name": "param_name", "symbols": ["VAR_NAME", {"literal":":"}], "postprocess":  d => ({
            type:'Parameter',
            value: d[0],
            range: getLoc(d[0], d[1])
        }) },
    {"name": "param_name", "symbols": ["kw_override", {"literal":":"}], "postprocess":  d => ({
            type:'Parameter',
            value: d[0],
            range: getLoc(d[0], d[1])
        }) },
    {"name": "property$subexpression$1", "symbols": ["VAR_NAME"]},
    {"name": "property$subexpression$1", "symbols": ["void"]},
    {"name": "property$subexpression$1", "symbols": ["kw_override"]},
    {"name": "property", "symbols": ["operand", (mxLexer.has("delimiter") ? {type: "delimiter"} : delimiter), "property$subexpression$1"], "postprocess":  d => ({
            type:     'AccessorProperty',
            operand:  d[0],
            property: d[2][0],
            range:    getLoc(d[0], d[2])
        })},
    {"name": "index", "symbols": ["operand", "_", "LBRACKET", "expr", "RBRACKET"], "postprocess":  d => ({
            type:    'AccessorIndex',
            operand: d[0],
            index:   d[3],
            range:   getLoc(d[2], d[4])
        })},
    {"name": "unary_only_operand", "symbols": [{"literal":"-"}, "operand"], "postprocess":  d => ({
            type: 'UnaryExpression',
            operator: d[0],
            right:    d[1],
            range: getLoc(d[0], d[1])
        }) },
    {"name": "unary_operand", "symbols": [{"literal":"-"}, "_", "unary_operand"], "postprocess":  d => ({
            type: 'UnaryExpression',
            operator: d[0],
            right:    d[2],
            range: getLoc(d[0], d[2])
        }) },
    {"name": "unary_operand", "symbols": ["operand"], "postprocess": id},
    {"name": "operand", "symbols": ["factor"], "postprocess": id},
    {"name": "operand", "symbols": ["property"], "postprocess": id},
    {"name": "operand", "symbols": ["index"], "postprocess": id},
    {"name": "factor", "symbols": ["string"], "postprocess": id},
    {"name": "factor", "symbols": ["number"], "postprocess": id},
    {"name": "factor", "symbols": ["path_name"], "postprocess": id},
    {"name": "factor", "symbols": ["name_value"], "postprocess": id},
    {"name": "factor", "symbols": ["VAR_NAME"], "postprocess": id},
    {"name": "factor", "symbols": ["bool"], "postprocess": id},
    {"name": "factor", "symbols": ["void"], "postprocess": id},
    {"name": "factor", "symbols": ["time"], "postprocess": id},
    {"name": "factor", "symbols": ["array"], "postprocess": id},
    {"name": "factor", "symbols": ["bitarray"], "postprocess": id},
    {"name": "factor", "symbols": ["point4"], "postprocess": id},
    {"name": "factor", "symbols": ["point3"], "postprocess": id},
    {"name": "factor", "symbols": ["point2"], "postprocess": id},
    {"name": "factor", "symbols": [{"literal":"?"}], "postprocess": d => ({type: 'Keyword', value: d[0], range: getLoc(d[0]) })},
    {"name": "factor", "symbols": [(mxLexer.has("error") ? {type: "error"} : error)], "postprocess": id},
    {"name": "factor", "symbols": ["expr_seq"], "postprocess": id},
    {"name": "point4", "symbols": ["LBRACKET", "expr", "LIST_SEP", "expr", "LIST_SEP", "expr", "LIST_SEP", "expr", "RBRACKET"], "postprocess":  d => ({
            type: 'ObjectPoint4',
            elements: [].concat(d[1], d[3], d[5], d[7]),
            range: getLoc(d[0], d[8])
        }) },
    {"name": "point3", "symbols": ["LBRACKET", "expr", "LIST_SEP", "expr", "LIST_SEP", "expr", "RBRACKET"], "postprocess":  d => ({
            type: 'ObjectPoint3',
            elements: [].concat(d[1], d[3], d[5]),
            range: getLoc(d[0], d[6])
        }) },
    {"name": "point2", "symbols": ["LBRACKET", "expr", "LIST_SEP", "expr", "RBRACKET"], "postprocess":  d => ({
            type: 'ObjectPoint2',
            elements: [].concat(d[1], d[3]),
            range: getLoc(d[0], d[4])
        }) },
    {"name": "array", "symbols": [(mxLexer.has("arraydef") ? {type: "arraydef"} : arraydef), "_", (mxLexer.has("rparen") ? {type: "rparen"} : rparen)], "postprocess":  d => ({
            type:      'ObjectArray',
            elements:  [],
            range:       getLoc(d[0], d[2])
        }) },
    {"name": "array$subexpression$1", "symbols": [(mxLexer.has("arraydef") ? {type: "arraydef"} : arraydef), "_"]},
    {"name": "array$subexpression$2", "symbols": ["_", (mxLexer.has("rparen") ? {type: "rparen"} : rparen)]},
    {"name": "array", "symbols": ["array$subexpression$1", "array_expr", "array$subexpression$2"], "postprocess":  d => ({
            type:     'ObjectArray',
            elements: d[1],
            range:      getLoc(d[0][0], d[2][1])
        }) },
    {"name": "array_expr$ebnf$1", "symbols": []},
    {"name": "array_expr$ebnf$1$subexpression$1", "symbols": ["LIST_SEP", "expr"]},
    {"name": "array_expr$ebnf$1", "symbols": ["array_expr$ebnf$1", "array_expr$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "array_expr", "symbols": ["expr", "array_expr$ebnf$1"], "postprocess": d => merge(...d)},
    {"name": "bitarray", "symbols": [(mxLexer.has("bitarraydef") ? {type: "bitarraydef"} : bitarraydef), "_", (mxLexer.has("rbrace") ? {type: "rbrace"} : rbrace)], "postprocess":  d => ({
            type:     'ObjectBitArray',
            elements: [],
            range:    getLoc(d[0], d[2])
        }) },
    {"name": "bitarray$subexpression$1", "symbols": [(mxLexer.has("bitarraydef") ? {type: "bitarraydef"} : bitarraydef), "_"]},
    {"name": "bitarray$subexpression$2", "symbols": ["_", (mxLexer.has("rbrace") ? {type: "rbrace"} : rbrace)]},
    {"name": "bitarray", "symbols": ["bitarray$subexpression$1", "bitarray_expr", "bitarray$subexpression$2"], "postprocess":  d => ({
            type:     'ObjectBitArray',
            elements: d[1],
            range:    getLoc(d[0][0], d[2][1])
        }) },
    {"name": "bitarray_expr$ebnf$1", "symbols": []},
    {"name": "bitarray_expr$ebnf$1$subexpression$1", "symbols": ["LIST_SEP", "bitarray_item"]},
    {"name": "bitarray_expr$ebnf$1", "symbols": ["bitarray_expr$ebnf$1", "bitarray_expr$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "bitarray_expr", "symbols": ["bitarray_item", "bitarray_expr$ebnf$1"], "postprocess": d => merge(...d)},
    {"name": "bitarray_item$subexpression$1", "symbols": ["_S", (mxLexer.has("bitrange") ? {type: "bitrange"} : bitrange), "_"]},
    {"name": "bitarray_item", "symbols": ["expr", "bitarray_item$subexpression$1", "expr"], "postprocess": d => ({type: 'BitRange', start: d[0], end: d[2]})},
    {"name": "bitarray_item", "symbols": ["expr"], "postprocess": id},
    {"name": "LIST_SEP", "symbols": ["_S", (mxLexer.has("sep") ? {type: "sep"} : sep), "_"], "postprocess": d => null},
    {"name": "LPAREN", "symbols": [(mxLexer.has("lparen") ? {type: "lparen"} : lparen), "_"], "postprocess": d => d[0]},
    {"name": "RPAREN", "symbols": ["_", (mxLexer.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": d => d[1]},
    {"name": "LBRACKET", "symbols": [(mxLexer.has("lbracket") ? {type: "lbracket"} : lbracket), "_"], "postprocess": d => d[0]},
    {"name": "RBRACKET", "symbols": ["_", (mxLexer.has("rbracket") ? {type: "rbracket"} : rbracket)], "postprocess": d => d[1]},
    {"name": "VAR_NAME", "symbols": ["var_type"], "postprocess": Identifier},
    {"name": "var_type", "symbols": [(mxLexer.has("identity") ? {type: "identity"} : identity)], "postprocess": id},
    {"name": "var_type", "symbols": [(mxLexer.has("global_typed") ? {type: "global_typed"} : global_typed)], "postprocess": id},
    {"name": "var_type", "symbols": [(mxLexer.has("typed_iden") ? {type: "typed_iden"} : typed_iden)], "postprocess": id},
    {"name": "var_type", "symbols": ["kw_reserved"], "postprocess": id},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_uicontrols") ? {type: "kw_uicontrols"} : kw_uicontrols)], "postprocess": id},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_group") ? {type: "kw_group"} : kw_group)], "postprocess": id},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_level") ? {type: "kw_level"} : kw_level)], "postprocess": id},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_menuitem") ? {type: "kw_menuitem"} : kw_menuitem)], "postprocess": id},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_objectset") ? {type: "kw_objectset"} : kw_objectset)], "postprocess": id},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_separator") ? {type: "kw_separator"} : kw_separator)], "postprocess": id},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_submenu") ? {type: "kw_submenu"} : kw_submenu)], "postprocess": id},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_time") ? {type: "kw_time"} : kw_time)], "postprocess": id},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_set") ? {type: "kw_set"} : kw_set)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_uicontrols") ? {type: "kw_uicontrols"} : kw_uicontrols)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_group") ? {type: "kw_group"} : kw_group)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_level") ? {type: "kw_level"} : kw_level)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_menuitem") ? {type: "kw_menuitem"} : kw_menuitem)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_objectset") ? {type: "kw_objectset"} : kw_objectset)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_separator") ? {type: "kw_separator"} : kw_separator)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_submenu") ? {type: "kw_submenu"} : kw_submenu)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_time") ? {type: "kw_time"} : kw_time)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_set") ? {type: "kw_set"} : kw_set)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_parameters") ? {type: "kw_parameters"} : kw_parameters)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_dontcollect") ? {type: "kw_dontcollect"} : kw_dontcollect)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_continue") ? {type: "kw_continue"} : kw_continue)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_rollout") ? {type: "kw_rollout"} : kw_rollout)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_plugin") ? {type: "kw_plugin"} : kw_plugin)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_rcmenu") ? {type: "kw_rcmenu"} : kw_rcmenu)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_tool") ? {type: "kw_tool"} : kw_tool)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_to") ? {type: "kw_to"} : kw_to)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_collect") ? {type: "kw_collect"} : kw_collect)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_return") ? {type: "kw_return"} : kw_return)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_throw") ? {type: "kw_throw"} : kw_throw)], "postprocess": id},
    {"name": "path_name", "symbols": [(mxLexer.has("path") ? {type: "path"} : path)], "postprocess": Identifier},
    {"name": "time", "symbols": [(mxLexer.has("time") ? {type: "time"} : time)], "postprocess": Literal},
    {"name": "bool", "symbols": [(mxLexer.has("kw_bool") ? {type: "kw_bool"} : kw_bool)], "postprocess": Literal},
    {"name": "bool", "symbols": [(mxLexer.has("kw_on") ? {type: "kw_on"} : kw_on)], "postprocess": Literal},
    {"name": "void", "symbols": [(mxLexer.has("kw_null") ? {type: "kw_null"} : kw_null)], "postprocess": Literal},
    {"name": "number", "symbols": ["number_types"], "postprocess": Literal},
    {"name": "number_types", "symbols": [(mxLexer.has("number") ? {type: "number"} : number)], "postprocess": id},
    {"name": "number_types", "symbols": [(mxLexer.has("hex") ? {type: "hex"} : hex)], "postprocess": id},
    {"name": "string", "symbols": [(mxLexer.has("string") ? {type: "string"} : string)], "postprocess": Literal},
    {"name": "name_value", "symbols": [(mxLexer.has("name") ? {type: "name"} : name)], "postprocess": Literal},
    {"name": "resource", "symbols": [(mxLexer.has("locale") ? {type: "locale"} : locale)], "postprocess": Literal},
    {"name": "EOL$ebnf$1", "symbols": []},
    {"name": "EOL$ebnf$1", "symbols": ["EOL$ebnf$1", "junk"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "EOL$subexpression$1", "symbols": [(mxLexer.has("newline") ? {type: "newline"} : newline)]},
    {"name": "EOL$subexpression$1", "symbols": [(mxLexer.has("statement") ? {type: "statement"} : statement)]},
    {"name": "EOL", "symbols": ["EOL$ebnf$1", "EOL$subexpression$1", "_S"], "postprocess": d => null},
    {"name": "_S_$ebnf$1", "symbols": ["ws"]},
    {"name": "_S_$ebnf$1", "symbols": ["_S_$ebnf$1", "ws"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_S_", "symbols": ["_S_$ebnf$1"], "postprocess": d => null},
    {"name": "_S$ebnf$1", "symbols": []},
    {"name": "_S$ebnf$1", "symbols": ["_S$ebnf$1", "ws"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_S", "symbols": ["_S$ebnf$1"], "postprocess": d => null},
    {"name": "__$ebnf$1", "symbols": []},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", "junk"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["wsl", "__$ebnf$1"], "postprocess": d => null},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "junk"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": d => null},
    {"name": "ws", "symbols": [(mxLexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "ws", "symbols": [(mxLexer.has("comment_BLK") ? {type: "comment_BLK"} : comment_BLK)]},
    {"name": "wsl", "symbols": [(mxLexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "wsl", "symbols": [(mxLexer.has("newline") ? {type: "newline"} : newline)]},
    {"name": "wsl", "symbols": [(mxLexer.has("comment_BLK") ? {type: "comment_BLK"} : comment_BLK)]},
    {"name": "wsl", "symbols": [(mxLexer.has("statement") ? {type: "statement"} : statement)]},
    {"name": "junk", "symbols": [(mxLexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "junk", "symbols": [(mxLexer.has("newline") ? {type: "newline"} : newline)]},
    {"name": "junk", "symbols": [(mxLexer.has("statement") ? {type: "statement"} : statement)]},
    {"name": "junk", "symbols": [(mxLexer.has("comment_BLK") ? {type: "comment_BLK"} : comment_BLK)]},
    {"name": "junk", "symbols": [(mxLexer.has("comment_SL") ? {type: "comment_SL"} : comment_SL)]}
]
  , ParserStart: "Main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
