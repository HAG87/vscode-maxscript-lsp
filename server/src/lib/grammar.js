// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

    //Tokens
    /*
    const moo = require('moo');
    const tokens = require('./mooTokenize.js');
    let mxLexer = moo.compile(tokens);
    */
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

    const merge = (...args) => args.reduce((acc, val) => acc.concat(val), []).filter(e => e != null);

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
        
        return {
            start: startOffset,
            end: endOffset
        };
    };

    const addLoc = (a, ...loc) => {
        if (!a.range || !loc) {return;}

        let last = loc[loc.length - 1];
        
        if (Array.isArray(last)) {
            last = last[last.length - 1]
        }

        if (!last || !last.range || !last.range.end) {return;}

        Object.assign(
            a.range,
            {
                start: {...a.range.start},
                end: {...last.range.end}
            });
        return;
    };
    //----------------------------------------------------------
    // RULES
    //----------------------------------------------------------
    const Literal = x => ({ type: 'Literal', value: x[0], range:getLoc(x[0]) });
    const Identifier = x => ({ type: 'Identifier', value: x[0], range:getLoc(x[0]) });
var grammar = {
    Lexer: mxLexer,
    ParserRules: [
    {"name": "Main$ebnf$1", "symbols": []},
    {"name": "Main$ebnf$1", "symbols": ["Main$ebnf$1", "junk"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Main$ebnf$2", "symbols": ["_expr_seq"], "postprocess": id},
    {"name": "Main$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Main$ebnf$3", "symbols": []},
    {"name": "Main$ebnf$3", "symbols": ["Main$ebnf$3", "junk"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Main", "symbols": ["Main$ebnf$1", "Main$ebnf$2", "Main$ebnf$3"], "postprocess": d => d[1]},
    {"name": "expr", "symbols": ["MATH_EXPR"], "postprocess": id},
    {"name": "expr", "symbols": ["COMPARE_EXPR"], "postprocess": id},
    {"name": "expr", "symbols": ["LOGICAL_EXPR"], "postprocess": id},
    {"name": "expr", "symbols": ["VARIABLE_DECL"], "postprocess": id},
    {"name": "expr", "symbols": ["ASSIGNMENT"], "postprocess": id},
    {"name": "expr", "symbols": ["ATTRIBUTES_DEF"], "postprocess": id},
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
    {"name": "expr", "symbols": ["rollout_def"], "postprocess": id},
    {"name": "expr", "symbols": ["TOOL_DEF"], "postprocess": id},
    {"name": "expr", "symbols": ["RCMENU_DEF"], "postprocess": id},
    {"name": "expr", "symbols": ["MACROSCRIPT_DEF"], "postprocess": id},
    {"name": "expr", "symbols": ["PLUGIN_DEF"], "postprocess": id},
    {"name": "expr", "symbols": ["CHANGE_HANDLER"], "postprocess": id},
    {"name": "expr_seq", "symbols": ["LPAREN", "_expr_seq", "RPAREN"], "postprocess":  d => ({
            type: 'BlockStatement',
            body: d[1],
            range: getLoc(d[0], d[2])
        })},
    {"name": "expr_seq$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "expr_seq$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "expr_seq", "symbols": [{"literal":"("}, "expr_seq$ebnf$1", {"literal":")"}], "postprocess":  d => ({
            type: 'EmptyParens',
            body: [],
            range: getLoc(d[0], d[2])
        })},
    {"name": "_expr_seq$ebnf$1", "symbols": []},
    {"name": "_expr_seq$ebnf$1$subexpression$1", "symbols": ["EOL", "expr"]},
    {"name": "_expr_seq$ebnf$1", "symbols": ["_expr_seq$ebnf$1", "_expr_seq$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_expr_seq", "symbols": ["expr", "_expr_seq$ebnf$1"], "postprocess": flatten},
    {"name": "RCMENU_DEF$subexpression$1", "symbols": [(mxLexer.has("kw_rcmenu") ? {type: "kw_rcmenu"} : kw_rcmenu), "__"]},
    {"name": "RCMENU_DEF$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "RCMENU_DEF$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "RCMENU_DEF$ebnf$2", "symbols": ["rcmenu_clauses"], "postprocess": id},
    {"name": "RCMENU_DEF$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "RCMENU_DEF", "symbols": ["RCMENU_DEF$subexpression$1", "VAR_NAME", "RCMENU_DEF$ebnf$1", "LPAREN", "RCMENU_DEF$ebnf$2", "RPAREN"], "postprocess":  d => ({
            type: 'EntityRcmenu',
            id:   d[1],
            body: d[4],
            range: getLoc(d[0][0], d[5])
        })},
    {"name": "rcmenu_clauses$ebnf$1", "symbols": []},
    {"name": "rcmenu_clauses$ebnf$1$subexpression$1", "symbols": ["EOL", "rcmenu_clause"]},
    {"name": "rcmenu_clauses$ebnf$1", "symbols": ["rcmenu_clauses$ebnf$1", "rcmenu_clauses$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "rcmenu_clauses", "symbols": ["rcmenu_clause", "rcmenu_clauses$ebnf$1"], "postprocess": flatten},
    {"name": "rcmenu_clause", "symbols": ["VARIABLE_DECL"], "postprocess": id},
    {"name": "rcmenu_clause", "symbols": ["FUNCTION_DEF"], "postprocess": id},
    {"name": "rcmenu_clause", "symbols": ["STRUCT_DEF"], "postprocess": id},
    {"name": "rcmenu_clause", "symbols": ["event_handler"], "postprocess": id},
    {"name": "rcmenu_clause", "symbols": ["rcmenu_submenu"], "postprocess": id},
    {"name": "rcmenu_clause", "symbols": ["rcmenu_sep"], "postprocess": id},
    {"name": "rcmenu_clause", "symbols": ["rcmenu_item"], "postprocess": id},
    {"name": "rcmenu_submenu$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "rcmenu_submenu$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rcmenu_submenu$subexpression$1", "symbols": [(mxLexer.has("kw_submenu") ? {type: "kw_submenu"} : kw_submenu), "rcmenu_submenu$subexpression$1$ebnf$1"]},
    {"name": "rcmenu_submenu$ebnf$1", "symbols": []},
    {"name": "rcmenu_submenu$ebnf$1$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "rcmenu_submenu$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rcmenu_submenu$ebnf$1$subexpression$1", "symbols": ["rcmenu_submenu$ebnf$1$subexpression$1$ebnf$1", "parameter"]},
    {"name": "rcmenu_submenu$ebnf$1", "symbols": ["rcmenu_submenu$ebnf$1", "rcmenu_submenu$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "rcmenu_submenu$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "rcmenu_submenu$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rcmenu_submenu$ebnf$3", "symbols": ["rcmenu_clauses"], "postprocess": id},
    {"name": "rcmenu_submenu$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rcmenu_submenu", "symbols": ["rcmenu_submenu$subexpression$1", "STRING", "rcmenu_submenu$ebnf$1", "rcmenu_submenu$ebnf$2", "LPAREN", "rcmenu_submenu$ebnf$3", "RPAREN"], "postprocess":  d => ({
            type:   'EntityRcmenu_submenu',
            label:  d[1],
            params: flatten(d[2]),
            body:   d[5],
            range: getLoc(d[0][0], d[6])
        })},
    {"name": "rcmenu_sep$subexpression$1", "symbols": [(mxLexer.has("kw_separator") ? {type: "kw_separator"} : kw_separator), "__"]},
    {"name": "rcmenu_sep$ebnf$1", "symbols": []},
    {"name": "rcmenu_sep$ebnf$1$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "rcmenu_sep$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rcmenu_sep$ebnf$1$subexpression$1", "symbols": ["rcmenu_sep$ebnf$1$subexpression$1$ebnf$1", "parameter"]},
    {"name": "rcmenu_sep$ebnf$1", "symbols": ["rcmenu_sep$ebnf$1", "rcmenu_sep$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "rcmenu_sep", "symbols": ["rcmenu_sep$subexpression$1", "VAR_NAME", "rcmenu_sep$ebnf$1"], "postprocess":  d => {
            let res = {
                type:   'EntityRcmenu_separator',
                id:     d[1],
                params: flatten(d[2]),
                range: getLoc(d[0][0], d[1])
            };
            addLoc(res, res.params);
            return res;
        }},
    {"name": "rcmenu_item$subexpression$1", "symbols": [(mxLexer.has("kw_menuitem") ? {type: "kw_menuitem"} : kw_menuitem), "__"]},
    {"name": "rcmenu_item$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "rcmenu_item$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rcmenu_item$ebnf$2", "symbols": []},
    {"name": "rcmenu_item$ebnf$2$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "rcmenu_item$ebnf$2$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rcmenu_item$ebnf$2$subexpression$1", "symbols": ["rcmenu_item$ebnf$2$subexpression$1$ebnf$1", "parameter"]},
    {"name": "rcmenu_item$ebnf$2", "symbols": ["rcmenu_item$ebnf$2", "rcmenu_item$ebnf$2$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "rcmenu_item", "symbols": ["rcmenu_item$subexpression$1", "VAR_NAME", "rcmenu_item$ebnf$1", "STRING", "rcmenu_item$ebnf$2"], "postprocess":  d => {
            let res = {
                type:   'EntityRcmenu_menuitem',
                id:     d[1],
                label:  d[3],
                params: flatten(d[4]),
                range: getLoc(d[0][0], d[3])
            };
            addLoc(res, res.params);
            return res;
        }},
    {"name": "ATTRIBUTES_DEF$subexpression$1", "symbols": [(mxLexer.has("kw_attributes") ? {type: "kw_attributes"} : kw_attributes), "__"]},
    {"name": "ATTRIBUTES_DEF$ebnf$1", "symbols": []},
    {"name": "ATTRIBUTES_DEF$ebnf$1$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "ATTRIBUTES_DEF$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "ATTRIBUTES_DEF$ebnf$1$subexpression$1", "symbols": ["ATTRIBUTES_DEF$ebnf$1$subexpression$1$ebnf$1", "parameter"]},
    {"name": "ATTRIBUTES_DEF$ebnf$1", "symbols": ["ATTRIBUTES_DEF$ebnf$1", "ATTRIBUTES_DEF$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ATTRIBUTES_DEF$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "ATTRIBUTES_DEF$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "ATTRIBUTES_DEF", "symbols": ["ATTRIBUTES_DEF$subexpression$1", "VAR_NAME", "ATTRIBUTES_DEF$ebnf$1", "ATTRIBUTES_DEF$ebnf$2", "LPAREN", "attributes_clauses", "RPAREN"], "postprocess":  d => ({
            type:   'EntityAttributes',
            id:     d[1],
            params: flatten(d[2]),
            body:   d[5],
            range:  getLoc(d[0][0], d[6])
        })},
    {"name": "attributes_clauses$ebnf$1", "symbols": []},
    {"name": "attributes_clauses$ebnf$1$subexpression$1", "symbols": ["EOL", "attributes_clause"]},
    {"name": "attributes_clauses$ebnf$1", "symbols": ["attributes_clauses$ebnf$1", "attributes_clauses$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "attributes_clauses", "symbols": ["attributes_clause", "attributes_clauses$ebnf$1"], "postprocess": flatten},
    {"name": "attributes_clause", "symbols": ["VARIABLE_DECL"], "postprocess": id},
    {"name": "attributes_clause", "symbols": ["event_handler"], "postprocess": id},
    {"name": "attributes_clause", "symbols": ["PARAM_DEF"], "postprocess": id},
    {"name": "attributes_clause", "symbols": ["rollout_def"], "postprocess": id},
    {"name": "PLUGIN_DEF$subexpression$1", "symbols": [(mxLexer.has("kw_plugin") ? {type: "kw_plugin"} : kw_plugin), "__"]},
    {"name": "PLUGIN_DEF$ebnf$1", "symbols": []},
    {"name": "PLUGIN_DEF$ebnf$1$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "PLUGIN_DEF$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "PLUGIN_DEF$ebnf$1$subexpression$1", "symbols": ["PLUGIN_DEF$ebnf$1$subexpression$1$ebnf$1", "parameter"]},
    {"name": "PLUGIN_DEF$ebnf$1", "symbols": ["PLUGIN_DEF$ebnf$1", "PLUGIN_DEF$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "PLUGIN_DEF$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "PLUGIN_DEF$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "PLUGIN_DEF", "symbols": ["PLUGIN_DEF$subexpression$1", "VAR_NAME", "__", "VAR_NAME", "PLUGIN_DEF$ebnf$1", "PLUGIN_DEF$ebnf$2", "LPAREN", "plugin_clauses", "RPAREN"], "postprocess":  d => ({
            type:       'EntityPlugin',
            superclass: d[1],
            class:      d[3],
            id:         d[3],
            params:     flatten(d[4]),
            body:       d[7],
            range:    getLoc(d[0][0], d[8])
        })},
    {"name": "plugin_clauses$ebnf$1", "symbols": []},
    {"name": "plugin_clauses$ebnf$1$subexpression$1", "symbols": ["EOL", "plugin_clause"]},
    {"name": "plugin_clauses$ebnf$1", "symbols": ["plugin_clauses$ebnf$1", "plugin_clauses$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "plugin_clauses", "symbols": ["plugin_clause", "plugin_clauses$ebnf$1"], "postprocess": flatten},
    {"name": "plugin_clause", "symbols": ["VARIABLE_DECL"], "postprocess": id},
    {"name": "plugin_clause", "symbols": ["FUNCTION_DEF"], "postprocess": id},
    {"name": "plugin_clause", "symbols": ["STRUCT_DEF"], "postprocess": id},
    {"name": "plugin_clause", "symbols": ["TOOL_DEF"], "postprocess": id},
    {"name": "plugin_clause", "symbols": ["rollout_def"], "postprocess": id},
    {"name": "plugin_clause", "symbols": ["event_handler"], "postprocess": id},
    {"name": "plugin_clause", "symbols": ["PARAM_DEF"], "postprocess": id},
    {"name": "PARAM_DEF$subexpression$1", "symbols": [(mxLexer.has("kw_parameters") ? {type: "kw_parameters"} : kw_parameters), "__"]},
    {"name": "PARAM_DEF$ebnf$1", "symbols": []},
    {"name": "PARAM_DEF$ebnf$1$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "PARAM_DEF$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "PARAM_DEF$ebnf$1$subexpression$1", "symbols": ["PARAM_DEF$ebnf$1$subexpression$1$ebnf$1", "parameter"]},
    {"name": "PARAM_DEF$ebnf$1", "symbols": ["PARAM_DEF$ebnf$1", "PARAM_DEF$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "PARAM_DEF$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "PARAM_DEF$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "PARAM_DEF$ebnf$3", "symbols": ["param_clauses"], "postprocess": id},
    {"name": "PARAM_DEF$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "PARAM_DEF", "symbols": ["PARAM_DEF$subexpression$1", "VAR_NAME", "PARAM_DEF$ebnf$1", "PARAM_DEF$ebnf$2", "LPAREN", "PARAM_DEF$ebnf$3", "RPAREN"], "postprocess":  d => ({
            type:   'EntityPlugin_params',
            id:     d[1],
            params: flatten(d[2]),
            body:   d[5],
            range: getLoc(d[0][0], d[6])
        })},
    {"name": "param_clauses$ebnf$1", "symbols": []},
    {"name": "param_clauses$ebnf$1$subexpression$1", "symbols": ["EOL", "param_clause"]},
    {"name": "param_clauses$ebnf$1", "symbols": ["param_clauses$ebnf$1", "param_clauses$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "param_clauses", "symbols": ["param_clause", "param_clauses$ebnf$1"], "postprocess": flatten},
    {"name": "param_clause", "symbols": ["param_defs"], "postprocess": id},
    {"name": "param_clause", "symbols": ["event_handler"], "postprocess": id},
    {"name": "param_defs$ebnf$1", "symbols": []},
    {"name": "param_defs$ebnf$1$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "param_defs$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "param_defs$ebnf$1$subexpression$1", "symbols": ["param_defs$ebnf$1$subexpression$1$ebnf$1", "parameter"]},
    {"name": "param_defs$ebnf$1", "symbols": ["param_defs$ebnf$1", "param_defs$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "param_defs", "symbols": ["VAR_NAME", "param_defs$ebnf$1"], "postprocess":  d => {
            let res = {
                type:   'PluginParam',
                id:     d[0],
                params: flatten(d[1]),
                range: getLoc(d[0])
            };
            addLoc(res, res.params);
            return res;
        }},
    {"name": "TOOL_DEF$ebnf$1", "symbols": []},
    {"name": "TOOL_DEF$ebnf$1$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "TOOL_DEF$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "TOOL_DEF$ebnf$1$subexpression$1", "symbols": ["TOOL_DEF$ebnf$1$subexpression$1$ebnf$1", "parameter"]},
    {"name": "TOOL_DEF$ebnf$1", "symbols": ["TOOL_DEF$ebnf$1", "TOOL_DEF$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "TOOL_DEF$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "TOOL_DEF$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "TOOL_DEF", "symbols": [(mxLexer.has("kw_tool") ? {type: "kw_tool"} : kw_tool), "__", "VAR_NAME", "TOOL_DEF$ebnf$1", "TOOL_DEF$ebnf$2", "LPAREN", "tool_clauses", "RPAREN"], "postprocess":  d => ({
            type:   'EntityTool',
            id:     d[2],
            params: flatten(d[3]),
            body:   d[6],
            range:  getLoc(d[0], d[7])
        })},
    {"name": "tool_clauses$ebnf$1", "symbols": []},
    {"name": "tool_clauses$ebnf$1$subexpression$1", "symbols": ["EOL", "tool_clause"]},
    {"name": "tool_clauses$ebnf$1", "symbols": ["tool_clauses$ebnf$1", "tool_clauses$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "tool_clauses", "symbols": ["tool_clause", "tool_clauses$ebnf$1"], "postprocess": flatten},
    {"name": "tool_clause", "symbols": ["VARIABLE_DECL"], "postprocess": id},
    {"name": "tool_clause", "symbols": ["FUNCTION_DEF"], "postprocess": id},
    {"name": "tool_clause", "symbols": ["STRUCT_DEF"], "postprocess": id},
    {"name": "tool_clause", "symbols": ["event_handler"], "postprocess": id},
    {"name": "rollout_def$subexpression$1", "symbols": ["uistatement_def", "__"]},
    {"name": "rollout_def$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "rollout_def$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rollout_def$ebnf$2", "symbols": []},
    {"name": "rollout_def$ebnf$2$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "rollout_def$ebnf$2$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rollout_def$ebnf$2$subexpression$1", "symbols": ["rollout_def$ebnf$2$subexpression$1$ebnf$1", "parameter"]},
    {"name": "rollout_def$ebnf$2", "symbols": ["rollout_def$ebnf$2", "rollout_def$ebnf$2$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "rollout_def$ebnf$3", "symbols": ["__"], "postprocess": id},
    {"name": "rollout_def$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rollout_def", "symbols": ["rollout_def$subexpression$1", "VAR_NAME", "rollout_def$ebnf$1", "_OP", "rollout_def$ebnf$2", "rollout_def$ebnf$3", "LPAREN", "rollout_clauses", "RPAREN"], "postprocess":  d => ({
            type:   d[0][0].type === 'kw_rollout' ? 'EntityRollout' : 'EntityUtility',
            id:     d[1],
            title:  d[3],
            params: flatten(d[4]),
            body:   d[7],
            range:  getLoc(d[0][0], d[8])
        })},
    {"name": "uistatement_def", "symbols": [(mxLexer.has("kw_rollout") ? {type: "kw_rollout"} : kw_rollout)], "postprocess": id},
    {"name": "uistatement_def", "symbols": [(mxLexer.has("kw_utility") ? {type: "kw_utility"} : kw_utility)], "postprocess": id},
    {"name": "rollout_clauses$ebnf$1", "symbols": []},
    {"name": "rollout_clauses$ebnf$1$subexpression$1", "symbols": ["EOL", "rollout_clause"]},
    {"name": "rollout_clauses$ebnf$1", "symbols": ["rollout_clauses$ebnf$1", "rollout_clauses$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "rollout_clauses", "symbols": ["rollout_clause", "rollout_clauses$ebnf$1"], "postprocess": flatten},
    {"name": "rollout_clause", "symbols": ["VARIABLE_DECL"], "postprocess": id},
    {"name": "rollout_clause", "symbols": ["FUNCTION_DEF"], "postprocess": id},
    {"name": "rollout_clause", "symbols": ["STRUCT_DEF"], "postprocess": id},
    {"name": "rollout_clause", "symbols": ["item_group"], "postprocess": id},
    {"name": "rollout_clause", "symbols": ["rollout_item"], "postprocess": id},
    {"name": "rollout_clause", "symbols": ["event_handler"], "postprocess": id},
    {"name": "rollout_clause", "symbols": ["TOOL_DEF"], "postprocess": id},
    {"name": "rollout_clause", "symbols": ["rollout_def"], "postprocess": id},
    {"name": "item_group$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "item_group$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "item_group$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "item_group$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "item_group", "symbols": [(mxLexer.has("kw_group") ? {type: "kw_group"} : kw_group), "item_group$ebnf$1", "STRING", "item_group$ebnf$2", "LPAREN", "group_clauses", "RPAREN"], "postprocess":  d => ({
            type: 'EntityRolloutGroup',
            id:   d[2],
            body: d[5],
            range:getLoc(d[0], d[6])
        })},
    {"name": "group_clauses", "symbols": ["group_clauses", "EOL", "rollout_item"], "postprocess": d => merge(d[0], d[2])},
    {"name": "group_clauses", "symbols": ["rollout_item"]},
    {"name": "rollout_item$ebnf$1$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "rollout_item$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rollout_item$ebnf$1$subexpression$1", "symbols": ["rollout_item$ebnf$1$subexpression$1$ebnf$1", "_OP"]},
    {"name": "rollout_item$ebnf$1", "symbols": ["rollout_item$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "rollout_item$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rollout_item$ebnf$2", "symbols": []},
    {"name": "rollout_item$ebnf$2$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "rollout_item$ebnf$2$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rollout_item$ebnf$2$subexpression$1", "symbols": ["rollout_item$ebnf$2$subexpression$1$ebnf$1", "parameter"]},
    {"name": "rollout_item$ebnf$2", "symbols": ["rollout_item$ebnf$2", "rollout_item$ebnf$2$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "rollout_item", "symbols": [(mxLexer.has("kw_uicontrols") ? {type: "kw_uicontrols"} : kw_uicontrols), "__", "VAR_NAME", "rollout_item$ebnf$1", "rollout_item$ebnf$2"], "postprocess":  d => {
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
        }},
    {"name": "MACROSCRIPT_DEF$subexpression$1", "symbols": [(mxLexer.has("kw_macroscript") ? {type: "kw_macroscript"} : kw_macroscript), "__"]},
    {"name": "MACROSCRIPT_DEF$ebnf$1", "symbols": []},
    {"name": "MACROSCRIPT_DEF$ebnf$1$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "MACROSCRIPT_DEF$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "MACROSCRIPT_DEF$ebnf$1$subexpression$1", "symbols": ["MACROSCRIPT_DEF$ebnf$1$subexpression$1$ebnf$1", "macro_script_param"]},
    {"name": "MACROSCRIPT_DEF$ebnf$1", "symbols": ["MACROSCRIPT_DEF$ebnf$1", "MACROSCRIPT_DEF$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "MACROSCRIPT_DEF$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "MACROSCRIPT_DEF$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "MACROSCRIPT_DEF$ebnf$3", "symbols": ["macro_script_body"], "postprocess": id},
    {"name": "MACROSCRIPT_DEF$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "MACROSCRIPT_DEF", "symbols": ["MACROSCRIPT_DEF$subexpression$1", "VAR_NAME", "MACROSCRIPT_DEF$ebnf$1", "MACROSCRIPT_DEF$ebnf$2", "LPAREN", "MACROSCRIPT_DEF$ebnf$3", "RPAREN"], "postprocess":  d => ({
            type:   'EntityMacroscript',
            id:     d[1],
            params: flatten(d[2]),
            body:   d[5],
            range:  getLoc(d[0][0], d[6])
        })},
    {"name": "macro_script_param$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "macro_script_param$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "macro_script_param$subexpression$1", "symbols": ["OP"]},
    {"name": "macro_script_param$subexpression$1", "symbols": ["RESOURCE"]},
    {"name": "macro_script_param", "symbols": ["param_name", "macro_script_param$ebnf$1", "macro_script_param$subexpression$1"], "postprocess":  d => ({
            type: 'ParameterAssignment',
            param: d[0],
            value: d[2][0]
        })},
    {"name": "macro_script_body$ebnf$1", "symbols": []},
    {"name": "macro_script_body$ebnf$1$subexpression$1", "symbols": ["EOL", "macro_script_clause"]},
    {"name": "macro_script_body$ebnf$1", "symbols": ["macro_script_body$ebnf$1", "macro_script_body$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "macro_script_body", "symbols": ["macro_script_clause", "macro_script_body$ebnf$1"], "postprocess": flatten},
    {"name": "macro_script_clause", "symbols": ["expr"], "postprocess": id},
    {"name": "macro_script_clause", "symbols": ["event_handler"], "postprocess": id},
    {"name": "STRUCT_DEF$subexpression$1", "symbols": [(mxLexer.has("kw_struct") ? {type: "kw_struct"} : kw_struct), "__"]},
    {"name": "STRUCT_DEF$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "STRUCT_DEF$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "STRUCT_DEF", "symbols": ["STRUCT_DEF$subexpression$1", "VAR_NAME", "STRUCT_DEF$ebnf$1", "LPAREN", "struct_members", "RPAREN"], "postprocess":  d => ({
            type: 'Struct',
            id:   d[1],
            body: flatten(d[4]),
            range: getLoc(d[0][0], d[5])
        })},
    {"name": "struct_members$ebnf$1", "symbols": []},
    {"name": "struct_members$ebnf$1$subexpression$1", "symbols": ["COMMA", "struct_member"]},
    {"name": "struct_members$ebnf$1", "symbols": ["struct_members$ebnf$1", "struct_members$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "struct_members", "symbols": ["struct_member", "struct_members$ebnf$1"], "postprocess": flatten},
    {"name": "struct_member", "symbols": ["decl"], "postprocess": id},
    {"name": "struct_member", "symbols": ["FUNCTION_DEF"], "postprocess": id},
    {"name": "struct_member", "symbols": ["event_handler"], "postprocess": id},
    {"name": "struct_member", "symbols": ["str_scope", "__", "struct_member"], "postprocess": d => [].concat(d[0], d[2])},
    {"name": "str_scope", "symbols": [(mxLexer.has("kw_scope") ? {type: "kw_scope"} : kw_scope)], "postprocess":  d => ({
            type:'StructScope',
            value: d[0]
        }) },
    {"name": "event_handler$subexpression$1", "symbols": [(mxLexer.has("kw_on") ? {type: "kw_on"} : kw_on), "__"]},
    {"name": "event_handler$subexpression$2", "symbols": [(mxLexer.has("kw_do") ? {type: "kw_do"} : kw_do)]},
    {"name": "event_handler$subexpression$2", "symbols": [(mxLexer.has("kw_return") ? {type: "kw_return"} : kw_return)]},
    {"name": "event_handler$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "event_handler$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "event_handler", "symbols": ["event_handler$subexpression$1", "event_args", "__", "event_handler$subexpression$2", "event_handler$ebnf$1", "expr"], "postprocess":  d => ({
            type:     'Event',
            id:       d[1].target || d[1].event,
            args:     d[1],
            modifier: d[3][0],
            body:     d[5],
            range:    getLoc(d[0][0], d[5])
        }) },
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
    {"name": "CHANGE_HANDLER$ebnf$1$subexpression$1", "symbols": ["VAR_NAME"]},
    {"name": "CHANGE_HANDLER$ebnf$1$subexpression$1", "symbols": ["kw_override"]},
    {"name": "CHANGE_HANDLER$ebnf$1", "symbols": ["CHANGE_HANDLER$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "CHANGE_HANDLER$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "CHANGE_HANDLER$ebnf$2", "symbols": []},
    {"name": "CHANGE_HANDLER$ebnf$2$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "CHANGE_HANDLER$ebnf$2$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "CHANGE_HANDLER$ebnf$2$subexpression$1", "symbols": ["parameter", "CHANGE_HANDLER$ebnf$2$subexpression$1$ebnf$1"]},
    {"name": "CHANGE_HANDLER$ebnf$2", "symbols": ["CHANGE_HANDLER$ebnf$2", "CHANGE_HANDLER$ebnf$2$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "CHANGE_HANDLER$ebnf$3", "symbols": ["_OP"], "postprocess": id},
    {"name": "CHANGE_HANDLER$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "CHANGE_HANDLER$ebnf$4", "symbols": ["__"], "postprocess": id},
    {"name": "CHANGE_HANDLER$ebnf$4", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "CHANGE_HANDLER$ebnf$5", "symbols": ["__"], "postprocess": id},
    {"name": "CHANGE_HANDLER$ebnf$5", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "CHANGE_HANDLER", "symbols": [(mxLexer.has("kw_when") ? {type: "kw_when"} : kw_when), "__", "CHANGE_HANDLER$ebnf$1", "__", "_OP", "__", "VAR_NAME", "__", "CHANGE_HANDLER$ebnf$2", "CHANGE_HANDLER$ebnf$3", "CHANGE_HANDLER$ebnf$4", (mxLexer.has("kw_do") ? {type: "kw_do"} : kw_do), "CHANGE_HANDLER$ebnf$5", "expr"], "postprocess":  d=> ({
            type:  'WhenStatement',
            args:  merge(...d.slice(2,9)),
            body:  d[13],
            range: getLoc(d[0], d[13])
        })},
    {"name": "FUNCTION_DEF$ebnf$1$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "FUNCTION_DEF$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FUNCTION_DEF$ebnf$1$subexpression$1", "symbols": ["FUNCTION_DEF$ebnf$1$subexpression$1$ebnf$1", "VAR_NAME"]},
    {"name": "FUNCTION_DEF$ebnf$1", "symbols": ["FUNCTION_DEF$ebnf$1$subexpression$1"]},
    {"name": "FUNCTION_DEF$ebnf$1$subexpression$2$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "FUNCTION_DEF$ebnf$1$subexpression$2$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FUNCTION_DEF$ebnf$1$subexpression$2", "symbols": ["FUNCTION_DEF$ebnf$1$subexpression$2$ebnf$1", "VAR_NAME"]},
    {"name": "FUNCTION_DEF$ebnf$1", "symbols": ["FUNCTION_DEF$ebnf$1", "FUNCTION_DEF$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FUNCTION_DEF$ebnf$2$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "FUNCTION_DEF$ebnf$2$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FUNCTION_DEF$ebnf$2$subexpression$1", "symbols": ["FUNCTION_DEF$ebnf$2$subexpression$1$ebnf$1", "fn_params"]},
    {"name": "FUNCTION_DEF$ebnf$2", "symbols": ["FUNCTION_DEF$ebnf$2$subexpression$1"]},
    {"name": "FUNCTION_DEF$ebnf$2$subexpression$2$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "FUNCTION_DEF$ebnf$2$subexpression$2$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FUNCTION_DEF$ebnf$2$subexpression$2", "symbols": ["FUNCTION_DEF$ebnf$2$subexpression$2$ebnf$1", "fn_params"]},
    {"name": "FUNCTION_DEF$ebnf$2", "symbols": ["FUNCTION_DEF$ebnf$2", "FUNCTION_DEF$ebnf$2$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FUNCTION_DEF$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "FUNCTION_DEF$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FUNCTION_DEF$subexpression$1$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "FUNCTION_DEF$subexpression$1$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FUNCTION_DEF$subexpression$1", "symbols": ["FUNCTION_DEF$subexpression$1$ebnf$1", {"literal":"="}, "FUNCTION_DEF$subexpression$1$ebnf$2"]},
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
    {"name": "FUNCTION_DEF$ebnf$3$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "FUNCTION_DEF$ebnf$3$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FUNCTION_DEF$ebnf$3$subexpression$1", "symbols": ["FUNCTION_DEF$ebnf$3$subexpression$1$ebnf$1", "VAR_NAME"]},
    {"name": "FUNCTION_DEF$ebnf$3", "symbols": ["FUNCTION_DEF$ebnf$3$subexpression$1"]},
    {"name": "FUNCTION_DEF$ebnf$3$subexpression$2$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "FUNCTION_DEF$ebnf$3$subexpression$2$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FUNCTION_DEF$ebnf$3$subexpression$2", "symbols": ["FUNCTION_DEF$ebnf$3$subexpression$2$ebnf$1", "VAR_NAME"]},
    {"name": "FUNCTION_DEF$ebnf$3", "symbols": ["FUNCTION_DEF$ebnf$3", "FUNCTION_DEF$ebnf$3$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FUNCTION_DEF$subexpression$2$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "FUNCTION_DEF$subexpression$2$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FUNCTION_DEF$subexpression$2$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "FUNCTION_DEF$subexpression$2$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FUNCTION_DEF$subexpression$2", "symbols": ["FUNCTION_DEF$subexpression$2$ebnf$1", {"literal":"="}, "FUNCTION_DEF$subexpression$2$ebnf$2"]},
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
    {"name": "FUNCTION_DEF$ebnf$4$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "FUNCTION_DEF$ebnf$4$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FUNCTION_DEF$ebnf$4$subexpression$1", "symbols": ["FUNCTION_DEF$ebnf$4$subexpression$1$ebnf$1", "fn_params"]},
    {"name": "FUNCTION_DEF$ebnf$4", "symbols": ["FUNCTION_DEF$ebnf$4$subexpression$1"]},
    {"name": "FUNCTION_DEF$ebnf$4$subexpression$2$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "FUNCTION_DEF$ebnf$4$subexpression$2$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FUNCTION_DEF$ebnf$4$subexpression$2", "symbols": ["FUNCTION_DEF$ebnf$4$subexpression$2$ebnf$1", "fn_params"]},
    {"name": "FUNCTION_DEF$ebnf$4", "symbols": ["FUNCTION_DEF$ebnf$4", "FUNCTION_DEF$ebnf$4$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FUNCTION_DEF$subexpression$3$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "FUNCTION_DEF$subexpression$3$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FUNCTION_DEF$subexpression$3$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "FUNCTION_DEF$subexpression$3$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FUNCTION_DEF$subexpression$3", "symbols": ["FUNCTION_DEF$subexpression$3$ebnf$1", {"literal":"="}, "FUNCTION_DEF$subexpression$3$ebnf$2"]},
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
    {"name": "FUNCTION_DEF$subexpression$4$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "FUNCTION_DEF$subexpression$4$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FUNCTION_DEF$subexpression$4$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "FUNCTION_DEF$subexpression$4$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FUNCTION_DEF$subexpression$4", "symbols": ["FUNCTION_DEF$subexpression$4$ebnf$1", {"literal":"="}, "FUNCTION_DEF$subexpression$4$ebnf$2"]},
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
    {"name": "FN_RETURN$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "FN_RETURN$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FN_RETURN", "symbols": [(mxLexer.has("kw_return") ? {type: "kw_return"} : kw_return), "FN_RETURN$ebnf$1", "expr"], "postprocess":  d => ({
            type: 'FunctionReturn',
            body: d[2],
            range: getLoc(d[0], d[2])
        })},
    {"name": "CONTEXT_EXPR$ebnf$1", "symbols": []},
    {"name": "CONTEXT_EXPR$ebnf$1$subexpression$1", "symbols": ["COMMA", "context"]},
    {"name": "CONTEXT_EXPR$ebnf$1", "symbols": ["CONTEXT_EXPR$ebnf$1", "CONTEXT_EXPR$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "CONTEXT_EXPR$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "CONTEXT_EXPR$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "CONTEXT_EXPR", "symbols": ["context", "CONTEXT_EXPR$ebnf$1", "CONTEXT_EXPR$ebnf$2", "expr"], "postprocess":  d => ({
            type:    'ContextStatement',
            context: merge(d[0], flatten(d[1])),
            body:    d[3],
            range:   getLoc(d[0], d[3])
        })},
    {"name": "context$ebnf$1$subexpression$1$subexpression$1", "symbols": [(mxLexer.has("kw_set") ? {type: "kw_set"} : kw_set)]},
    {"name": "context$ebnf$1$subexpression$1$subexpression$1", "symbols": [(mxLexer.has("kw_at") ? {type: "kw_at"} : kw_at)]},
    {"name": "context$ebnf$1$subexpression$1", "symbols": ["context$ebnf$1$subexpression$1$subexpression$1", "__"]},
    {"name": "context$ebnf$1", "symbols": ["context$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "context$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$subexpression$1", "symbols": [(mxLexer.has("kw_level") ? {type: "kw_level"} : kw_level)]},
    {"name": "context$subexpression$1", "symbols": [(mxLexer.has("kw_time") ? {type: "kw_time"} : kw_time)]},
    {"name": "context$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "context$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context", "symbols": ["context$ebnf$1", "context$subexpression$1", "context$ebnf$2", "OP"], "postprocess":  d => ({
            type:    'ContextExpression',
            prefix :  (d[0] != null ? d[0][0][0] : null),
            context: d[2][0],
            args:    d[4],
            range:   getLoc(d[0] != null ? d[0][0][0] : d[1][0], d[3])
        })},
    {"name": "context$ebnf$3$subexpression$1", "symbols": [(mxLexer.has("kw_set") ? {type: "kw_set"} : kw_set), "__"]},
    {"name": "context$ebnf$3", "symbols": ["context$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "context$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$ebnf$4", "symbols": ["__"], "postprocess": id},
    {"name": "context$ebnf$4", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context", "symbols": ["context$ebnf$3", (mxLexer.has("kw_in") ? {type: "kw_in"} : kw_in), "context$ebnf$4", "OP"], "postprocess":  d => ({
            type:    'ContextExpression',
            prefix : (d[0] != null ? d[0][0] : null),
            context: d[1],
            args:    d[3],
            range:   getLoc(d[0] != null ? d[0][0] : d[1], d[3])
        })},
    {"name": "context$ebnf$5$subexpression$1$subexpression$1", "symbols": [(mxLexer.has("kw_set") ? {type: "kw_set"} : kw_set)]},
    {"name": "context$ebnf$5$subexpression$1$subexpression$1", "symbols": [(mxLexer.has("kw_in") ? {type: "kw_in"} : kw_in)]},
    {"name": "context$ebnf$5$subexpression$1", "symbols": ["context$ebnf$5$subexpression$1$subexpression$1", "__"]},
    {"name": "context$ebnf$5", "symbols": ["context$ebnf$5$subexpression$1"], "postprocess": id},
    {"name": "context$ebnf$5", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$ebnf$6", "symbols": ["__"], "postprocess": id},
    {"name": "context$ebnf$6", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$subexpression$2", "symbols": [(mxLexer.has("kw_local") ? {type: "kw_local"} : kw_local)]},
    {"name": "context$subexpression$2", "symbols": ["OP"]},
    {"name": "context", "symbols": ["context$ebnf$5", (mxLexer.has("kw_coordsys") ? {type: "kw_coordsys"} : kw_coordsys), "context$ebnf$6", "context$subexpression$2"], "postprocess":  d => ({
            type: 'ContextExpression',
            prefix : (d[0] != null ? d[0][0][0] : null),
            context: d[1],
            args:    d[3][0],
            range:   getLoc(d[0] != null ? d[0][0][0] : d[1], d[3][0])
        })},
    {"name": "context$ebnf$7$subexpression$1", "symbols": [(mxLexer.has("kw_set") ? {type: "kw_set"} : kw_set), "__"]},
    {"name": "context$ebnf$7", "symbols": ["context$ebnf$7$subexpression$1"], "postprocess": id},
    {"name": "context$ebnf$7", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$ebnf$8", "symbols": ["__"], "postprocess": id},
    {"name": "context$ebnf$8", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$subexpression$3", "symbols": [(mxLexer.has("kw_coordsys") ? {type: "kw_coordsys"} : kw_coordsys)]},
    {"name": "context$subexpression$3", "symbols": ["OP"]},
    {"name": "context", "symbols": ["context$ebnf$7", (mxLexer.has("kw_about") ? {type: "kw_about"} : kw_about), "context$ebnf$8", "context$subexpression$3"], "postprocess":  d => ({
            type: 'ContextExpression',
            prefix : (d[0] != null ? d[0][0] : null),
            context: d[1],
            args:    d[3][0],
            range:   getLoc(d[0] != null ? d[0][0] : d[1], d[3][0])
        })},
    {"name": "context$ebnf$9$subexpression$1$subexpression$1", "symbols": [(mxLexer.has("kw_set") ? {type: "kw_set"} : kw_set)]},
    {"name": "context$ebnf$9$subexpression$1$subexpression$1", "symbols": [(mxLexer.has("kw_with") ? {type: "kw_with"} : kw_with)]},
    {"name": "context$ebnf$9$subexpression$1", "symbols": ["context$ebnf$9$subexpression$1$subexpression$1", "__"]},
    {"name": "context$ebnf$9", "symbols": ["context$ebnf$9$subexpression$1"], "postprocess": id},
    {"name": "context$ebnf$9", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$ebnf$10", "symbols": ["__"], "postprocess": id},
    {"name": "context$ebnf$10", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$subexpression$4", "symbols": ["LOGICAL_EXPR"]},
    {"name": "context$subexpression$4", "symbols": ["BOOL"]},
    {"name": "context", "symbols": ["context$ebnf$9", (mxLexer.has("kw_context") ? {type: "kw_context"} : kw_context), "context$ebnf$10", "context$subexpression$4"], "postprocess":  d => ({
            type: 'ContextExpression',
            prefix :(d[0] != null ? d[0][0][0] : null),
            context: d[1],
            args:    d[3][0],
            range: getLoc(d[0] != null ? d[0][0][0] : d[1],d[3][0])
        })},
    {"name": "context$ebnf$11$subexpression$1", "symbols": [(mxLexer.has("kw_with") ? {type: "kw_with"} : kw_with), "__"]},
    {"name": "context$ebnf$11", "symbols": ["context$ebnf$11$subexpression$1"], "postprocess": id},
    {"name": "context$ebnf$11", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$ebnf$12", "symbols": ["__"], "postprocess": id},
    {"name": "context$ebnf$12", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$subexpression$5", "symbols": [{"literal":"#logmsg"}]},
    {"name": "context$subexpression$5", "symbols": [{"literal":"#logtofile"}]},
    {"name": "context$subexpression$5", "symbols": [{"literal":"#abort"}]},
    {"name": "context", "symbols": ["context$ebnf$11", (mxLexer.has("kw_defaultAction") ? {type: "kw_defaultAction"} : kw_defaultAction), "context$ebnf$12", "context$subexpression$5"], "postprocess":  d => ({
            type: 'ContextExpression',
            prefix :  (d[0] != null ? d[0][0] : null),
            context: d[1],
            args:    d[3][0],
            range:   getLoc(d[0] != null ? d[0][0] : d[1], d[3][0])
        })},
    {"name": "context$ebnf$13$subexpression$1$subexpression$1", "symbols": [(mxLexer.has("kw_set") ? {type: "kw_set"} : kw_set)]},
    {"name": "context$ebnf$13$subexpression$1$subexpression$1", "symbols": [(mxLexer.has("kw_with") ? {type: "kw_with"} : kw_with)]},
    {"name": "context$ebnf$13$subexpression$1", "symbols": ["context$ebnf$13$subexpression$1$subexpression$1", "__"]},
    {"name": "context$ebnf$13", "symbols": ["context$ebnf$13$subexpression$1"], "postprocess": id},
    {"name": "context$ebnf$13", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$ebnf$14", "symbols": ["__"], "postprocess": id},
    {"name": "context$ebnf$14", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$ebnf$15$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "context$ebnf$15$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$ebnf$15$subexpression$1", "symbols": ["undo_label", "context$ebnf$15$subexpression$1$ebnf$1"]},
    {"name": "context$ebnf$15", "symbols": ["context$ebnf$15$subexpression$1"], "postprocess": id},
    {"name": "context$ebnf$15", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "context$subexpression$6", "symbols": ["LOGICAL_EXPR"]},
    {"name": "context$subexpression$6", "symbols": ["BOOL"]},
    {"name": "context", "symbols": ["context$ebnf$13", (mxLexer.has("kw_undo") ? {type: "kw_undo"} : kw_undo), "context$ebnf$14", "context$ebnf$15", "context$subexpression$6"], "postprocess":  d => ({
            type:    'ContextExpression',
            prefix : (d[0] != null ? d[0][0][0] : null),
            context: d[1],
            args:    (filterNull(d[3])).concat(d[4]),
            range:   getLoc(d[0] != null ? d[0][0][0] : d[1], d[4][0])
        })},
    {"name": "undo_label", "symbols": ["STRING"], "postprocess": id},
    {"name": "undo_label", "symbols": ["parameter"], "postprocess": id},
    {"name": "undo_label", "symbols": ["VAR_NAME"], "postprocess": id},
    {"name": "CASE_EXPR$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "CASE_EXPR$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "CASE_EXPR$subexpression$1", "symbols": [(mxLexer.has("kw_case") ? {type: "kw_case"} : kw_case), "CASE_EXPR$subexpression$1$ebnf$1"]},
    {"name": "CASE_EXPR$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "CASE_EXPR$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "CASE_EXPR$ebnf$2", "symbols": []},
    {"name": "CASE_EXPR$ebnf$2$subexpression$1", "symbols": ["EOL", "case_item"]},
    {"name": "CASE_EXPR$ebnf$2", "symbols": ["CASE_EXPR$ebnf$2", "CASE_EXPR$ebnf$2$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "CASE_EXPR", "symbols": ["CASE_EXPR$subexpression$1", "case_src", (mxLexer.has("kw_of") ? {type: "kw_of"} : kw_of), "CASE_EXPR$ebnf$1", "LPAREN", "case_item", "CASE_EXPR$ebnf$2", "RPAREN"], "postprocess":  d => ({
            type:  'CaseStatement',
            test:  d[1],
            cases: merge(d[5], flatten(d[6])),
            range: getLoc(d[0][0], d[7])
        })},
    {"name": "case_src$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "case_src$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "case_src", "symbols": ["expr", "case_src$ebnf$1"], "postprocess": id},
    {"name": "case_src", "symbols": ["__"], "postprocess": id},
    {"name": "case_item$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "case_item$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "case_item$subexpression$1$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "case_item$subexpression$1$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "case_item$subexpression$1", "symbols": ["case_item$subexpression$1$ebnf$1", {"literal":":"}, "case_item$subexpression$1$ebnf$2"]},
    {"name": "case_item", "symbols": ["factor", "case_item$subexpression$1", "expr"], "postprocess":  d => ({
            type:  'CaseClause',
            case:  d[0],
            body:  d[2],
            range: getLoc(d[0], d[2])
        })},
    {"name": "FOR_LOOP$subexpression$1", "symbols": [(mxLexer.has("kw_for") ? {type: "kw_for"} : kw_for), "__"]},
    {"name": "FOR_LOOP$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "FOR_LOOP$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FOR_LOOP$ebnf$2", "symbols": ["_"], "postprocess": id},
    {"name": "FOR_LOOP$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FOR_LOOP$ebnf$3$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "FOR_LOOP$ebnf$3$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FOR_LOOP$ebnf$3$subexpression$1", "symbols": ["FOR_LOOP$ebnf$3$subexpression$1$ebnf$1", "for_sequence"]},
    {"name": "FOR_LOOP$ebnf$3", "symbols": ["FOR_LOOP$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "FOR_LOOP$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FOR_LOOP$ebnf$4", "symbols": ["__"], "postprocess": id},
    {"name": "FOR_LOOP$ebnf$4", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FOR_LOOP$subexpression$2", "symbols": [(mxLexer.has("kw_do") ? {type: "kw_do"} : kw_do)]},
    {"name": "FOR_LOOP$subexpression$2", "symbols": [(mxLexer.has("kw_collect") ? {type: "kw_collect"} : kw_collect)]},
    {"name": "FOR_LOOP$ebnf$5", "symbols": ["__"], "postprocess": id},
    {"name": "FOR_LOOP$ebnf$5", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FOR_LOOP", "symbols": ["FOR_LOOP$subexpression$1", "for_index", "FOR_LOOP$ebnf$1", "for_iterator", "FOR_LOOP$ebnf$2", "expr", "FOR_LOOP$ebnf$3", "FOR_LOOP$ebnf$4", "FOR_LOOP$subexpression$2", "FOR_LOOP$ebnf$5", "expr"], "postprocess":  d => ({
            type:     'ForStatement',
            index:     d[1],
            iteration: d[3],
            value:     d[5],
            sequence:  filterNull(d[6]),
            action:    d[8][0],
            body:      d[10],
            range:     getLoc(d[0][0], d[10])
        })},
    {"name": "for_sequence$ebnf$1$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "for_sequence$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_sequence$ebnf$1$subexpression$1", "symbols": ["for_sequence$ebnf$1$subexpression$1$ebnf$1", "for_by"]},
    {"name": "for_sequence$ebnf$1", "symbols": ["for_sequence$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "for_sequence$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_sequence$ebnf$2$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "for_sequence$ebnf$2$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_sequence$ebnf$2$subexpression$1", "symbols": ["for_sequence$ebnf$2$subexpression$1$ebnf$1", "for_while"]},
    {"name": "for_sequence$ebnf$2", "symbols": ["for_sequence$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "for_sequence$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_sequence$ebnf$3$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "for_sequence$ebnf$3$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_sequence$ebnf$3$subexpression$1", "symbols": ["for_sequence$ebnf$3$subexpression$1$ebnf$1", "for_where"]},
    {"name": "for_sequence$ebnf$3", "symbols": ["for_sequence$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "for_sequence$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_sequence", "symbols": ["for_to", "for_sequence$ebnf$1", "for_sequence$ebnf$2", "for_sequence$ebnf$3"], "postprocess":  d => ({
            type:  'ForLoopSequence',
            to:    d[0],
            by:    filterNull(d[1]),
            while: filterNull(d[2]),
            where: filterNull(d[3])
        })},
    {"name": "for_sequence$ebnf$4$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "for_sequence$ebnf$4$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_sequence$ebnf$4$subexpression$1", "symbols": ["for_while", "for_sequence$ebnf$4$subexpression$1$ebnf$1"]},
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
    {"name": "for_index$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "for_index$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_index$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "for_index$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_index$ebnf$3", "symbols": ["_"], "postprocess": id},
    {"name": "for_index$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_index$ebnf$4", "symbols": ["__"], "postprocess": id},
    {"name": "for_index$ebnf$4", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_index", "symbols": ["VAR_NAME", "for_index$ebnf$1", "COMMA", "for_index$ebnf$2", "VAR_NAME", "for_index$ebnf$3", "COMMA", "for_index$ebnf$4", "VAR_NAME"], "postprocess":  d=> ({
            type: 'ForLoopIndex',
            variable: d[0],
            index_name: d[4],
            filtered_index_name: d[8]
        })},
    {"name": "for_index$ebnf$5", "symbols": ["_"], "postprocess": id},
    {"name": "for_index$ebnf$5", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_index$ebnf$6", "symbols": ["__"], "postprocess": id},
    {"name": "for_index$ebnf$6", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_index", "symbols": ["VAR_NAME", "for_index$ebnf$5", "COMMA", "for_index$ebnf$6", "VAR_NAME"], "postprocess":  d=> ({
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
    {"name": "for_to$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "for_to$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_to", "symbols": [(mxLexer.has("kw_to") ? {type: "kw_to"} : kw_to), "for_to$ebnf$1", "expr"], "postprocess": d => d[2]},
    {"name": "for_by$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "for_by$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_by", "symbols": [(mxLexer.has("kw_by") ? {type: "kw_by"} : kw_by), "for_by$ebnf$1", "expr"], "postprocess": d => d[2]},
    {"name": "for_where$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "for_where$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_where", "symbols": [(mxLexer.has("kw_where") ? {type: "kw_where"} : kw_where), "for_where$ebnf$1", "expr"], "postprocess": d => d[2]},
    {"name": "for_while$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "for_while$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "for_while", "symbols": [(mxLexer.has("kw_while") ? {type: "kw_while"} : kw_while), "for_while$ebnf$1", "expr"], "postprocess": d => d[2]},
    {"name": "LOOP_EXIT", "symbols": [(mxLexer.has("kw_exit") ? {type: "kw_exit"} : kw_exit)], "postprocess":  d => ({
            type : 'LoopExit',
            body:  null,
            range: getLoc(d[0])
        })},
    {"name": "LOOP_EXIT$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "LOOP_EXIT$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "LOOP_EXIT$subexpression$1", "symbols": ["__", (mxLexer.has("kw_with") ? {type: "kw_with"} : kw_with), "LOOP_EXIT$subexpression$1$ebnf$1"]},
    {"name": "LOOP_EXIT", "symbols": [(mxLexer.has("kw_exit") ? {type: "kw_exit"} : kw_exit), "LOOP_EXIT$subexpression$1", "expr"], "postprocess":  d => ({
            type : 'LoopExit',
            body:  d[2],
            range: getLoc(d[0], d[2])
        })},
    {"name": "DO_LOOP$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "DO_LOOP$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "DO_LOOP$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "DO_LOOP$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "DO_LOOP$ebnf$3", "symbols": ["__"], "postprocess": id},
    {"name": "DO_LOOP$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "DO_LOOP", "symbols": [(mxLexer.has("kw_do") ? {type: "kw_do"} : kw_do), "DO_LOOP$ebnf$1", "expr", "DO_LOOP$ebnf$2", (mxLexer.has("kw_while") ? {type: "kw_while"} : kw_while), "DO_LOOP$ebnf$3", "expr"], "postprocess":  d => ({
            type:  'DoWhileStatement',
            body:  d[2],
            test:  d[6],
            range: getLoc(d[0], d[6])
        })},
    {"name": "WHILE_LOOP$subexpression$1$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "WHILE_LOOP$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "WHILE_LOOP$subexpression$1", "symbols": [(mxLexer.has("kw_while") ? {type: "kw_while"} : kw_while), "WHILE_LOOP$subexpression$1$ebnf$1"]},
    {"name": "WHILE_LOOP$subexpression$2$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "WHILE_LOOP$subexpression$2$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "WHILE_LOOP$subexpression$2$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "WHILE_LOOP$subexpression$2$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "WHILE_LOOP$subexpression$2", "symbols": ["WHILE_LOOP$subexpression$2$ebnf$1", (mxLexer.has("kw_do") ? {type: "kw_do"} : kw_do), "WHILE_LOOP$subexpression$2$ebnf$2"]},
    {"name": "WHILE_LOOP", "symbols": ["WHILE_LOOP$subexpression$1", "expr", "WHILE_LOOP$subexpression$2", "expr"], "postprocess":  d => ({
            type:  'WhileStatement',
            test:  d[1],
            body:  d[3],
            range: getLoc(d[0][0], d[3])
        })},
    {"name": "IF_EXPR$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "IF_EXPR$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "IF_EXPR$subexpression$1", "symbols": [(mxLexer.has("kw_if") ? {type: "kw_if"} : kw_if), "IF_EXPR$subexpression$1$ebnf$1"]},
    {"name": "IF_EXPR$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "IF_EXPR$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "IF_EXPR$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "IF_EXPR$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "IF_EXPR", "symbols": ["IF_EXPR$subexpression$1", "expr", "IF_EXPR$ebnf$1", "if_action", "IF_EXPR$ebnf$2", "expr"], "postprocess":  d => ({
            type:       'IfStatement',
            test:       d[1],
            operator:   d[3],
            consequent: d[5],
            range:      getLoc(d[0][0], d[5])
        })},
    {"name": "IF_EXPR$subexpression$2$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "IF_EXPR$subexpression$2$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "IF_EXPR$subexpression$2", "symbols": [(mxLexer.has("kw_if") ? {type: "kw_if"} : kw_if), "IF_EXPR$subexpression$2$ebnf$1"]},
    {"name": "IF_EXPR$subexpression$3$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "IF_EXPR$subexpression$3$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "IF_EXPR$subexpression$3$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "IF_EXPR$subexpression$3$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "IF_EXPR$subexpression$3", "symbols": ["IF_EXPR$subexpression$3$ebnf$1", (mxLexer.has("kw_then") ? {type: "kw_then"} : kw_then), "IF_EXPR$subexpression$3$ebnf$2"]},
    {"name": "IF_EXPR$subexpression$4$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "IF_EXPR$subexpression$4$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "IF_EXPR$subexpression$4$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "IF_EXPR$subexpression$4$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "IF_EXPR$subexpression$4", "symbols": ["IF_EXPR$subexpression$4$ebnf$1", (mxLexer.has("kw_else") ? {type: "kw_else"} : kw_else), "IF_EXPR$subexpression$4$ebnf$2"]},
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
    {"name": "TRY_EXPR$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "TRY_EXPR$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "TRY_EXPR$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "TRY_EXPR$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "TRY_EXPR$ebnf$3", "symbols": ["__"], "postprocess": id},
    {"name": "TRY_EXPR$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "TRY_EXPR", "symbols": [(mxLexer.has("kw_try") ? {type: "kw_try"} : kw_try), "TRY_EXPR$ebnf$1", "expr", "TRY_EXPR$ebnf$2", (mxLexer.has("kw_catch") ? {type: "kw_catch"} : kw_catch), "TRY_EXPR$ebnf$3", "expr"], "postprocess":  d => ({
            type:      'TryStatement',
            body:      d[2],
            finalizer: d[6],
            range:     getLoc(d[0], d[6])
        })},
    {"name": "VARIABLE_DECL$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "VARIABLE_DECL$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "VARIABLE_DECL", "symbols": ["kw_decl", "VARIABLE_DECL$ebnf$1", "decl_list"], "postprocess":  d => {
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
    {"name": "decl_list$ebnf$1$subexpression$1", "symbols": ["COMMA", "decl"]},
    {"name": "decl_list$ebnf$1", "symbols": ["decl_list$ebnf$1", "decl_list$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "decl_list", "symbols": ["decl", "decl_list$ebnf$1"], "postprocess": flatten},
    {"name": "decl", "symbols": ["VAR_NAME"], "postprocess": id},
    {"name": "decl", "symbols": ["ASSIGNMENT"], "postprocess": id},
    {"name": "ASSIGNMENT$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "ASSIGNMENT$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "ASSIGNMENT$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "ASSIGNMENT$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "ASSIGNMENT", "symbols": ["destination", "ASSIGNMENT$ebnf$1", (mxLexer.has("assign") ? {type: "assign"} : assign), "ASSIGNMENT$ebnf$2", "expr"], "postprocess":  d => ({
            type:     'AssignmentExpression',
            operand:  d[0],
            operator: d[2],
            value:    d[4],
            range: getLoc(d[0], d[4])
        })},
    {"name": "destination", "symbols": ["VAR_NAME"], "postprocess": id},
    {"name": "destination", "symbols": ["property"], "postprocess": id},
    {"name": "destination", "symbols": ["index"], "postprocess": id},
    {"name": "destination", "symbols": ["PATH_NAME"], "postprocess": id},
    {"name": "MATH_EXPR", "symbols": ["rest"], "postprocess": id},
    {"name": "rest", "symbols": ["rest", "minus_opt", "sum"], "postprocess":  d => ({
            type:     'MathExpression',
            operator: d[1],
            left:     d[0],
            right:    d[2],
            range: getLoc(Array.isArray(d[0]) ? d[0][0] : d[0], d[2] ) 
        })},
    {"name": "rest", "symbols": ["sum"], "postprocess": id},
    {"name": "minus_opt", "symbols": ["_", {"literal":"-"}, "__"], "postprocess": d => d[1]},
    {"name": "minus_opt", "symbols": [{"literal":"-"}, "__"], "postprocess": id},
    {"name": "minus_opt", "symbols": [{"literal":"-"}], "postprocess": id},
    {"name": "sum$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "sum$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "sum$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "sum$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "sum", "symbols": ["sum", "sum$ebnf$1", {"literal":"+"}, "sum$ebnf$2", "prod"], "postprocess":  d => ({
            type:     'MathExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4],
            range: getLoc( Array.isArray(d[0]) ? d[0][0] : d[0], d[4] ) 
        })},
    {"name": "sum", "symbols": ["prod"], "postprocess": id},
    {"name": "prod$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "prod$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "prod$subexpression$1", "symbols": [{"literal":"*"}]},
    {"name": "prod$subexpression$1", "symbols": [{"literal":"/"}]},
    {"name": "prod$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "prod$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "prod", "symbols": ["prod", "prod$ebnf$1", "prod$subexpression$1", "prod$ebnf$2", "exp"], "postprocess":  d => ({
            type:     'MathExpression',
            operator: d[2][0],
            left:     d[0],
            right:    d[4],
            range: getLoc( Array.isArray(d[0]) ? d[0][0] : d[0], d[4] ) 
        })},
    {"name": "prod", "symbols": ["exp"], "postprocess": id},
    {"name": "exp$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "exp$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "exp$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "exp$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "exp", "symbols": ["as", "exp$ebnf$1", {"literal":"^"}, "exp$ebnf$2", "exp"], "postprocess":  d => ({
            type:     'MathExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4],
            range: getLoc( Array.isArray(d[0]) ? d[0][0] : d[0], d[4] )
        })},
    {"name": "exp", "symbols": ["as"], "postprocess": id},
    {"name": "as$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "as$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "as", "symbols": ["math_operand", "as$ebnf$1", (mxLexer.has("kw_as") ? {type: "kw_as"} : kw_as), "__", "VAR_NAME"], "postprocess":  d => ({
            type:     'MathExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4],
            range: getLoc(d[0], d[4])
        })},
    {"name": "as", "symbols": ["math_operand"], "postprocess": id},
    {"name": "math_operand", "symbols": ["OP"], "postprocess": id},
    {"name": "math_operand", "symbols": ["FN_CALL"], "postprocess": id},
    {"name": "LOGICAL_EXPR$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "LOGICAL_EXPR$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "LOGICAL_EXPR$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "LOGICAL_EXPR$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "LOGICAL_EXPR$subexpression$1", "symbols": ["logical_operand"]},
    {"name": "LOGICAL_EXPR$subexpression$1", "symbols": ["not_operand"]},
    {"name": "LOGICAL_EXPR", "symbols": ["LOGICAL_EXPR", "LOGICAL_EXPR$ebnf$1", (mxLexer.has("kw_compare") ? {type: "kw_compare"} : kw_compare), "LOGICAL_EXPR$ebnf$2", "LOGICAL_EXPR$subexpression$1"], "postprocess":  d => ({
            type :    'LogicalExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4][0],
            range: getLoc(d[0], d[4][0])
        }) },
    {"name": "LOGICAL_EXPR$ebnf$3", "symbols": ["_"], "postprocess": id},
    {"name": "LOGICAL_EXPR$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "LOGICAL_EXPR$ebnf$4", "symbols": ["__"], "postprocess": id},
    {"name": "LOGICAL_EXPR$ebnf$4", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "LOGICAL_EXPR$subexpression$2", "symbols": ["logical_operand"]},
    {"name": "LOGICAL_EXPR$subexpression$2", "symbols": ["not_operand"]},
    {"name": "LOGICAL_EXPR", "symbols": ["logical_operand", "LOGICAL_EXPR$ebnf$3", (mxLexer.has("kw_compare") ? {type: "kw_compare"} : kw_compare), "LOGICAL_EXPR$ebnf$4", "LOGICAL_EXPR$subexpression$2"], "postprocess":  d => ({
            type :    'LogicalExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4][0],
            range: getLoc(d[0], d[4][0])
        }) },
    {"name": "LOGICAL_EXPR", "symbols": ["not_operand"], "postprocess": id},
    {"name": "not_operand$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "not_operand$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "not_operand", "symbols": [(mxLexer.has("kw_not") ? {type: "kw_not"} : kw_not), "not_operand$ebnf$1", "logical_operand"], "postprocess":  d => ({
            type :    'LogicalExpression',
            operator: d[0],
            right:    d[2],
            range: getLoc(d[0], d[2])
        }) },
    {"name": "logical_operand", "symbols": ["OP"], "postprocess": id},
    {"name": "logical_operand", "symbols": ["COMPARE_EXPR"], "postprocess": id},
    {"name": "logical_operand", "symbols": ["FN_CALL"], "postprocess": id},
    {"name": "COMPARE_EXPR$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "COMPARE_EXPR$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "COMPARE_EXPR$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "COMPARE_EXPR$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "COMPARE_EXPR", "symbols": ["COMPARE_EXPR", "COMPARE_EXPR$ebnf$1", (mxLexer.has("comparison") ? {type: "comparison"} : comparison), "COMPARE_EXPR$ebnf$2", "compare_operand"], "postprocess":  d => ({
            type:     'LogicalExpression',
            operator: d[2],
            left:     d[0],
            right:    d[4],
            range: getLoc(d[0], d[4])
        }) },
    {"name": "COMPARE_EXPR$ebnf$3", "symbols": ["_"], "postprocess": id},
    {"name": "COMPARE_EXPR$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "COMPARE_EXPR$ebnf$4", "symbols": ["__"], "postprocess": id},
    {"name": "COMPARE_EXPR$ebnf$4", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "COMPARE_EXPR", "symbols": ["compare_operand", "COMPARE_EXPR$ebnf$3", (mxLexer.has("comparison") ? {type: "comparison"} : comparison), "COMPARE_EXPR$ebnf$4", "compare_operand"], "postprocess":  d => ({
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
                operand: d[0],
                args:  args,
                range: null
            };
            res.range = getLoc(d[0], res.args);
            return res;
        } },
    {"name": "FN_CALL", "symbols": ["call_caller", "call_params"], "postprocess":  d => ({
            type:  'CallExpression',
            operand: d[0],
            args:  d[1],
            range: getLoc(d[0], d[1])
        })},
    {"name": "call_params$ebnf$1$subexpression$1$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "call_params$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "call_params$ebnf$1$subexpression$1", "symbols": ["call_params$ebnf$1$subexpression$1$ebnf$1", "parameter"]},
    {"name": "call_params$ebnf$1", "symbols": ["call_params$ebnf$1$subexpression$1"]},
    {"name": "call_params$ebnf$1$subexpression$2$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "call_params$ebnf$1$subexpression$2$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "call_params$ebnf$1$subexpression$2", "symbols": ["call_params$ebnf$1$subexpression$2$ebnf$1", "parameter"]},
    {"name": "call_params$ebnf$1", "symbols": ["call_params$ebnf$1", "call_params$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "call_params", "symbols": ["call_params$ebnf$1"], "postprocess": flatten},
    {"name": "call_args$ebnf$1$subexpression$1$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "call_args$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "call_args$ebnf$1$subexpression$1", "symbols": ["call_args$ebnf$1$subexpression$1$ebnf$1", "UN_OP"]},
    {"name": "call_args$ebnf$1$subexpression$1$ebnf$2", "symbols": ["_"], "postprocess": id},
    {"name": "call_args$ebnf$1$subexpression$1$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "call_args$ebnf$1$subexpression$1", "symbols": ["call_args$ebnf$1$subexpression$1$ebnf$2", "_OP"]},
    {"name": "call_args$ebnf$1", "symbols": ["call_args$ebnf$1$subexpression$1"]},
    {"name": "call_args$ebnf$1$subexpression$2$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "call_args$ebnf$1$subexpression$2$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "call_args$ebnf$1$subexpression$2", "symbols": ["call_args$ebnf$1$subexpression$2$ebnf$1", "UN_OP"]},
    {"name": "call_args$ebnf$1$subexpression$2$ebnf$2", "symbols": ["_"], "postprocess": id},
    {"name": "call_args$ebnf$1$subexpression$2$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "call_args$ebnf$1$subexpression$2", "symbols": ["call_args$ebnf$1$subexpression$2$ebnf$2", "_OP"]},
    {"name": "call_args$ebnf$1", "symbols": ["call_args$ebnf$1", "call_args$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "call_args", "symbols": ["call_args$ebnf$1"], "postprocess": flatten},
    {"name": "call_caller", "symbols": ["OP"], "postprocess": id},
    {"name": "parameter$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "parameter$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "parameter", "symbols": ["param_name", "parameter$ebnf$1", "OP"], "postprocess":  d => ({
            type: 'ParameterAssignment',
            param: d[0],
            value: d[2],
            range: getLoc (d[0], d[2])
        }) },
    {"name": "param_name$subexpression$1", "symbols": ["VAR_NAME"]},
    {"name": "param_name$subexpression$1", "symbols": ["kw_override"]},
    {"name": "param_name", "symbols": ["param_name$subexpression$1", (mxLexer.has("colon") ? {type: "colon"} : colon)], "postprocess":  d => ({
            type:'Parameter',
            value: d[0][0],
            range: getLoc(d[0], d[1])
        }) },
    {"name": "property$subexpression$1", "symbols": ["VAR_NAME"]},
    {"name": "property$subexpression$1", "symbols": ["VOID"]},
    {"name": "property$subexpression$1", "symbols": ["kw_override"]},
    {"name": "property", "symbols": ["_OP", (mxLexer.has("dot") ? {type: "dot"} : dot), "property$subexpression$1"], "postprocess":  d => ({
            type:     'AccessorProperty',
            operand:  d[0],
            property: d[2][0],
            range:    getLoc(d[0], d[2])
        })},
    {"name": "index$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "index$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "index", "symbols": ["_OP", "index$ebnf$1", "LBRACKET", "expr", "RBRACKET"], "postprocess":  d => ({
            type:    'AccessorIndex',
            operand: d[0],
            index:   d[3],
            range:   getLoc(d[2], d[4])
        })},
    {"name": "UN_OP", "symbols": [{"literal":"-"}, "_OP"], "postprocess":  d => ({
            type: 'UnaryExpression',
            operator: d[0],
            right:    d[1],
            range: getLoc(d[0], d[1])
        }) },
    {"name": "OP$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "OP$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "OP", "symbols": [{"literal":"-"}, "OP$ebnf$1", "OP"], "postprocess":  d => ({
            type: 'UnaryExpression',
            operator: d[0],
            right:    d[2],
            range: getLoc(d[0], d[2])
        }) },
    {"name": "OP", "symbols": ["_OP"], "postprocess": id},
    {"name": "_OP", "symbols": ["factor"], "postprocess": id},
    {"name": "_OP", "symbols": ["property"], "postprocess": id},
    {"name": "_OP", "symbols": ["index"], "postprocess": id},
    {"name": "factor", "symbols": ["STRING"], "postprocess": id},
    {"name": "factor", "symbols": ["NUMBER"], "postprocess": id},
    {"name": "factor", "symbols": ["PATH_NAME"], "postprocess": id},
    {"name": "factor", "symbols": ["NAME_VALUE"], "postprocess": id},
    {"name": "factor", "symbols": ["VAR_NAME"], "postprocess": id},
    {"name": "factor", "symbols": ["BOOL"], "postprocess": id},
    {"name": "factor", "symbols": ["VOID"], "postprocess": id},
    {"name": "factor", "symbols": ["TIME"], "postprocess": id},
    {"name": "factor", "symbols": ["array"], "postprocess": id},
    {"name": "factor", "symbols": ["bitarray"], "postprocess": id},
    {"name": "factor", "symbols": ["point4"], "postprocess": id},
    {"name": "factor", "symbols": ["point3"], "postprocess": id},
    {"name": "factor", "symbols": ["point2"], "postprocess": id},
    {"name": "factor", "symbols": [(mxLexer.has("questionmark") ? {type: "questionmark"} : questionmark)], "postprocess": d => ({type: 'Keyword', value: d[0], range: getLoc(d[0]) })},
    {"name": "factor", "symbols": ["expr_seq"], "postprocess": id},
    {"name": "factor", "symbols": [(mxLexer.has("error") ? {type: "error"} : error)], "postprocess": id},
    {"name": "point4", "symbols": ["LBRACKET", "expr", "COMMA", "expr", "COMMA", "expr", "COMMA", "expr", "RBRACKET"], "postprocess":  d => ({
            type: 'ObjectPoint4',
            elements: [].concat(d[1], d[3], d[5], d[7]),
            range: getLoc(d[0], d[8])
        }) },
    {"name": "point3", "symbols": ["LBRACKET", "expr", "COMMA", "expr", "COMMA", "expr", "RBRACKET"], "postprocess":  d => ({
            type: 'ObjectPoint3',
            elements: [].concat(d[1], d[3], d[5]),
            range: getLoc(d[0], d[6])
        }) },
    {"name": "point2", "symbols": ["LBRACKET", "expr", "COMMA", "expr", "RBRACKET"], "postprocess":  d => ({
            type: 'ObjectPoint2',
            elements: [].concat(d[1], d[3]),
            range: getLoc(d[0], d[4])
        }) },
    {"name": "array$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "array$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "array$subexpression$1", "symbols": [(mxLexer.has("sharp") ? {type: "sharp"} : sharp), "array$subexpression$1$ebnf$1"]},
    {"name": "array$ebnf$1", "symbols": ["array_expr"], "postprocess": id},
    {"name": "array$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "array", "symbols": ["array$subexpression$1", "LPAREN", "array$ebnf$1", "RPAREN"], "postprocess":  d => ({
            type:     'ObjectArray',
            elements: d[2] != null ? d[2] : [],
            range:      getLoc(d[0][0], d[3])
        }) },
    {"name": "array_expr$ebnf$1", "symbols": []},
    {"name": "array_expr$ebnf$1$subexpression$1", "symbols": ["COMMA", "expr"]},
    {"name": "array_expr$ebnf$1", "symbols": ["array_expr$ebnf$1", "array_expr$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "array_expr", "symbols": ["expr", "array_expr$ebnf$1"], "postprocess": flatten},
    {"name": "bitarray$subexpression$1$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "bitarray$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "bitarray$subexpression$1", "symbols": [(mxLexer.has("sharp") ? {type: "sharp"} : sharp), "bitarray$subexpression$1$ebnf$1"]},
    {"name": "bitarray", "symbols": ["bitarray$subexpression$1", "LBRACE", "bitarray_expr", "RBRACE"], "postprocess":  d => ({
            type:     'ObjectBitArray',
            elements: d[2] != null ? d[2] : [],
            range:    getLoc(d[0][0], d[3])
        }) },
    {"name": "bitarray_expr$ebnf$1", "symbols": []},
    {"name": "bitarray_expr$ebnf$1$subexpression$1", "symbols": ["COMMA", "bitarray_item"]},
    {"name": "bitarray_expr$ebnf$1", "symbols": ["bitarray_expr$ebnf$1", "bitarray_expr$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "bitarray_expr", "symbols": ["bitarray_item", "bitarray_expr$ebnf$1"], "postprocess": flatten},
    {"name": "bitarray_item$subexpression$1$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "bitarray_item$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "bitarray_item$subexpression$1$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "bitarray_item$subexpression$1$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "bitarray_item$subexpression$1", "symbols": ["bitarray_item$subexpression$1$ebnf$1", (mxLexer.has("bitrange") ? {type: "bitrange"} : bitrange), "bitarray_item$subexpression$1$ebnf$2"]},
    {"name": "bitarray_item", "symbols": ["expr", "bitarray_item$subexpression$1", "expr"], "postprocess": d => ({type: 'BitRange', start: d[0], end: d[2]})},
    {"name": "bitarray_item", "symbols": ["expr"], "postprocess": id},
    {"name": "COMMA$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "COMMA$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "COMMA$ebnf$2", "symbols": ["__"], "postprocess": id},
    {"name": "COMMA$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "COMMA", "symbols": ["COMMA$ebnf$1", (mxLexer.has("comma") ? {type: "comma"} : comma), "COMMA$ebnf$2"], "postprocess": d => null},
    {"name": "LPAREN$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "LPAREN$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "LPAREN", "symbols": [(mxLexer.has("lparen") ? {type: "lparen"} : lparen), "LPAREN$ebnf$1"], "postprocess": id},
    {"name": "RPAREN$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "RPAREN$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "RPAREN", "symbols": ["RPAREN$ebnf$1", (mxLexer.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": d => d[1]},
    {"name": "LBRACKET$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "LBRACKET$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "LBRACKET", "symbols": [(mxLexer.has("lbracket") ? {type: "lbracket"} : lbracket), "LBRACKET$ebnf$1"], "postprocess": id},
    {"name": "RBRACKET$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "RBRACKET$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "RBRACKET", "symbols": ["RBRACKET$ebnf$1", (mxLexer.has("rbracket") ? {type: "rbracket"} : rbracket)], "postprocess": d => d[1]},
    {"name": "LBRACE$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "LBRACE$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "LBRACE", "symbols": [(mxLexer.has("lbrace") ? {type: "lbrace"} : lbrace), "LBRACE$ebnf$1"], "postprocess": id},
    {"name": "RBRACE$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "RBRACE$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "RBRACE", "symbols": ["RBRACE$ebnf$1", (mxLexer.has("rbrace") ? {type: "rbrace"} : rbrace)], "postprocess": d => d[1]},
    {"name": "VAR_NAME", "symbols": [(mxLexer.has("identity") ? {type: "identity"} : identity)], "postprocess": Identifier},
    {"name": "VAR_NAME", "symbols": ["kw_reserved"], "postprocess": Identifier},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_uicontrols") ? {type: "kw_uicontrols"} : kw_uicontrols)], "postprocess": id},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_group") ? {type: "kw_group"} : kw_group)], "postprocess": id},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_level") ? {type: "kw_level"} : kw_level)], "postprocess": id},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_menuitem") ? {type: "kw_menuitem"} : kw_menuitem)], "postprocess": id},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_separator") ? {type: "kw_separator"} : kw_separator)], "postprocess": id},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_submenu") ? {type: "kw_submenu"} : kw_submenu)], "postprocess": id},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_time") ? {type: "kw_time"} : kw_time)], "postprocess": id},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_tool") ? {type: "kw_tool"} : kw_tool)], "postprocess": id},
    {"name": "kw_reserved", "symbols": [(mxLexer.has("kw_set") ? {type: "kw_set"} : kw_set)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_attributes") ? {type: "kw_attributes"} : kw_attributes)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_collect") ? {type: "kw_collect"} : kw_collect)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_context") ? {type: "kw_context"} : kw_context)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_on") ? {type: "kw_on"} : kw_on)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_parameters") ? {type: "kw_parameters"} : kw_parameters)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_plugin") ? {type: "kw_plugin"} : kw_plugin)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_rcmenu") ? {type: "kw_rcmenu"} : kw_rcmenu)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_return") ? {type: "kw_return"} : kw_return)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_rollout") ? {type: "kw_rollout"} : kw_rollout)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_to") ? {type: "kw_to"} : kw_to)], "postprocess": id},
    {"name": "kw_override", "symbols": [(mxLexer.has("kw_and") ? {type: "kw_and"} : kw_and)], "postprocess": id},
    {"name": "PATH_NAME", "symbols": [(mxLexer.has("path") ? {type: "path"} : path)], "postprocess": Identifier},
    {"name": "TIME", "symbols": [(mxLexer.has("time") ? {type: "time"} : time)], "postprocess": Literal},
    {"name": "BOOL", "symbols": [(mxLexer.has("kw_bool") ? {type: "kw_bool"} : kw_bool)], "postprocess": Literal},
    {"name": "BOOL", "symbols": [(mxLexer.has("kw_on") ? {type: "kw_on"} : kw_on)], "postprocess": Literal},
    {"name": "VOID", "symbols": [(mxLexer.has("kw_null") ? {type: "kw_null"} : kw_null)], "postprocess": Literal},
    {"name": "NUMBER", "symbols": [(mxLexer.has("number") ? {type: "number"} : number)], "postprocess": Literal},
    {"name": "STRING", "symbols": [(mxLexer.has("string") ? {type: "string"} : string)], "postprocess": Literal},
    {"name": "NAME_VALUE", "symbols": [(mxLexer.has("name") ? {type: "name"} : name)], "postprocess": Literal},
    {"name": "RESOURCE", "symbols": [(mxLexer.has("locale") ? {type: "locale"} : locale)], "postprocess": Literal},
    {"name": "EOL$ebnf$1", "symbols": []},
    {"name": "EOL$ebnf$1", "symbols": ["EOL$ebnf$1", "junk"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "EOL$ebnf$2", "symbols": ["_"], "postprocess": id},
    {"name": "EOL$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "EOL", "symbols": ["EOL$ebnf$1", (mxLexer.has("newline") ? {type: "newline"} : newline), "EOL$ebnf$2"], "postprocess": d => null},
    {"name": "_$ebnf$1", "symbols": ["ws"]},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "ws"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": d => null},
    {"name": "__$ebnf$1", "symbols": []},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", "junk"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["wsl", "__$ebnf$1"], "postprocess": d => null},
    {"name": "ws", "symbols": [(mxLexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "ws", "symbols": [(mxLexer.has("comment_BLK") ? {type: "comment_BLK"} : comment_BLK)]},
    {"name": "wsl", "symbols": [(mxLexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "wsl", "symbols": [(mxLexer.has("newline") ? {type: "newline"} : newline)]},
    {"name": "wsl", "symbols": [(mxLexer.has("comment_BLK") ? {type: "comment_BLK"} : comment_BLK)]},
    {"name": "junk", "symbols": [(mxLexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "junk", "symbols": [(mxLexer.has("newline") ? {type: "newline"} : newline)]},
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
