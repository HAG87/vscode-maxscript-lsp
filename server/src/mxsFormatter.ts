import
{
	// CancellationToken,
	// TextDocumentPositionParams,
	// TextDocuments,
	// TextDocumentSyncKind,
	// TextDocumentEdit,
	TextEdit,
	Position,
	Range
} from 'vscode-languageserver';
import
{
	// Position,
	// Range,
	TextDocument
} from 'vscode-languageserver-textdocument';

import { Token } from 'moo';
import { TokenizeStream as mxsTokenizer } from './mxsParser';
import mooTokenizer from './lib/mooTokenize-formatter';

// note: keywords could be used to indent, at start or end of line. this will require a per-line aproach... split the documents in lines, and feed the tokenizer one line at the time.
const keywords = ['kw_about', 'kw_case', 'kw_catch', 'kw_collect', 'kw_compare', 'kw_context', 'kw_coordsys',
	'kw_defaultAction', 'kw_do', 'kw_else', 'kw_exit', 'kw_for', 'kw_from', 'kw_function', 'kw_group', 'kw_if',
	'kw_level', 'kw_local', 'kw_macroscript', 'kw_mapped', 'kw_menuitem', 'kw_not', 'kw_null', 'kw_objectset', 'kw_of', 'kw_on',
	'kw_parameters', 'kw_persistent', 'kw_plugin', 'kw_rcmenu', 'kw_return', 'kw_rollout', 'kw_scope', 'kw_separator', 'kw_set',
	'kw_struct', 'kw_submenu', 'kw_then', 'kw_tool', 'kw_try', 'kw_undo', 'kw_utility',
	'kw_when', 'kw_where', 'kw_while', 'kw_with'];

const filterCurrent = ['newline', 'delimiter', 'lbracket', 'emptyparens', 'emptybraces'];
const filterAhead = ['newline', 'delimiter', 'sep', 'param', 'ws', 'lbracket', 'rbracket', 'emptyparens', 'emptybraces'];

const IndentTokens = ['lparen', 'arraydef', 'lbracket', 'lbrace', 'bitarraydef'];
const UnIndentTokens = ['rparen', 'rbracket', 'rbrace'];

// Helpers
const getRange = (line: number, col: number, length: number) => Range.create(Position.create(line, col), Position.create(line, col + length));
const getPos = (line: number, col: number) => Position.create(line, col);

// this should be promisified
/**
 * Simple code formater: context unaware, just reflow whitespace and indentation of balanced pairs 
 * @param document vscode document to format
 */
export function mxsSimpleTextEditFormatter(document: TextDocument)
{
	return new Promise<TextEdit[]>((resolve, reject) =>
	{

		let indentation = 0;
		let edits: TextEdit[] = [];
		let prevLine: number = 1;

		// token stream. if this fail will throw an error
		let tokenizedSource = mxsTokenizer(document.getText(), undefined, mooTokenizer);
		// return if no results
		if (tokenizedSource && !tokenizedSource.length) {
			reject(edits);
		}
		// main loop
		for (let i = 0; i < tokenizedSource.length; i++) {
			// current token
			let ctok = tokenizedSource[i];
			// next token
			let ntok = tokenizedSource[i + 1];

			// failsafe, stop typescript from complain
			if (ctok.type === undefined) { break; }

			// decrease indentation
			if (ntok !== undefined && UnIndentTokens.includes(ntok.type!)) { indentation--; }

			// reindent at newline. skip empty lines
			if (ctok.line > prevLine && ctok.type !== 'newline') {
				// if token is 'ws', replace
				if (ctok.type === 'ws') {
					edits.push(
						TextEdit.replace(getRange(ctok.line - 1, ctok.col - 1, ctok.text.length), '\t'.repeat(indentation))
					);
				} else {
					// if not 'ws', reindent
					edits.push(
						TextEdit.insert(getPos(ctok.line - 1, ctok.col - 1), '\t'.repeat(indentation))
					);
				}
			} else {
				// tokens belonging to the same line
				// /*
				// clean whitespace
				//TODO: check for illegal whitespaces
				if (ctok.type === 'ws') {
					// /*
					if (/^[\s\t]{2,}$/m.test(ctok.toString())) {
						edits.push(
							TextEdit.replace(getRange(ctok.line - 1, ctok.col - 1, ctok.text.length), ' ')
						);
					}
					// */
					// skip last token
				} else if (ntok !== undefined) {
					/*
					// skip empty pairs
					let EmptyPair = (a:Token, b:Token) =>
						a.type === 'lparen' && b.type === 'rparen'
						|| a.type === 'arraydef' && b.type === 'rparen'
						|| a.type === 'lbracket' && b.type === 'rbracket'
						|| a.type === 'bitarraydef' && b.type === 'rbrace';
	
					// empty pair ahead..
					let emptyAhead = () => {
						let ftok = tokenizedSource[i+2];
						if (ftok !== undefined) {
							// console.log(ntok.value + ftok.value);
							console.log(EmptyPair(ntok, ftok));
						}
						return (ftok !== undefined ? EmptyPair(ntok, ftok) : false);
					};
					// */

					// insert whitespaces
					// skip tokens where whitespace btw doesn't apply
					let fCurrent = filterCurrent.includes(ctok.type!);
					let fNext = filterAhead.includes(ntok.type!);

					if (!fCurrent && !fNext) {
						// deal with missing whitespaces
						edits.push(
							TextEdit.insert(getPos(ctok.line - 1, ctok.col + ctok.value.length - 1), ' ')
						);
					}
				}
			}
			// increase indentation
			if (IndentTokens.includes(ctok.type)) { indentation++; }
			prevLine = ctok.line;
		}
		// return edits;
		resolve(edits);
	});
}