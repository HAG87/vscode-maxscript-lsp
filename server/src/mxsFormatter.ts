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
import { rangeUtil } from './lib/astUtils';
//@ts-ignore
import IndentationLexer from 'moo-indentation-lexer';
//-----------------------------------------------------------------------------------
/*
	// Create an indentation-aware lexer using the lexer
	const lexer = new IndentationLexer({
		lexer: mooLexer,
		indentationType: 'WS',
		newlineType: 'NL',
		commentType: 'comment',
		indentName: 'indent',
		dedentName: 'dedent',
		enclosingPunctuations: { '[': ']', '<': '>' },   // defaults {}, () and []
		separators: [',']
	})
*/
//-----------------------------------------------------------------------------------

// note: keywords could be used to indent, at start or end of line. this will require a per-line aproach... split the documents in lines, and feed the tokenizer one line at the time.

//-----------------------------------------------------------------------------------
const filterCurrent = ['newline', 'delimiter', 'lbracket', 'emptyparens', 'emptybraces', 'bitrange'];
const filterAhead = ['newline', 'delimiter', 'sep', 'ws', 'lbracket', 'rbracket', 'emptyparens', 'emptybraces', 'bitrange'];

const IndentTokens = ['lparen', 'arraydef', 'lbracket', 'lbrace', 'bitarraydef'];
const UnIndentTokens = ['rparen', 'rbracket', 'rbrace'];
//-----------------------------------------------------------------------------------
const INDENT_PATTERN = '\t';
//-----------------------------------------------------------------------------------
// Helpers
const getPos = (line: number, col: number) => Position.create(line, col);
//-----------------------------------------------------------------------------------

interface SimpleFormatterActions
{
	wsReIndent: (t: Token, i: number) => TextEdit | undefined
	wsIndent: (t: Token, i: number) => TextEdit | undefined
	wsClean: (t: Token) => TextEdit | undefined
	wsAdd: (t: Token) => TextEdit | undefined
}
//-----------------------------------------------------------------------------------
function mxsSimpleTextEditFormatter(document: TextDocument | string, action: SimpleFormatterActions)
{
	return new Promise<TextEdit[]>((resolve, reject) =>
	{
		let source = typeof document === 'string' ? document :document.getText();

		let indentation = 0;
		let edits: TextEdit[] = [];
		let prevLine: number = 1;

		// token stream. if this fail will throw an error
		let tokenizedSource: Token[] = mxsTokenizer(source, undefined, mooTokenizer);
		// return if no results
		if (tokenizedSource && !tokenizedSource.length) { reject(edits); }
		// add to results
		let Add = (res: TextEdit | undefined) => { if (res) { edits.push(res); } };

		// main loop
		for (let i = 0; i < tokenizedSource.length; i++) {
			// current token
			let ctok = tokenizedSource[i];
			// next token
			let ntok = tokenizedSource[i + 1];

			// failsafe, stop typescript from complain
			if (ctok.type === undefined) { continue; }

			// decrease indentation
			if (ntok !== undefined && UnIndentTokens.includes(ntok.type!) && indentation >= 0) { indentation--; }

			// reindent at newline. skip empty lines
			if (ctok.line > prevLine && ctok.type !== 'newline') {
				if (ctok.type === 'ws') {
					// if token is 'ws', replace
					Add(action.wsReIndent(ctok, indentation));
				} else {
					// if not 'ws', insert
					Add(action.wsIndent(ctok, indentation));
				}
			} else {
				// tokens belonging to the same line
				// clean whitespace
				// TODO: check for illegal whitespaces
				if (ctok.type === 'ws') {
					if (/^[\s\t]{2,}$/m.test(ctok.toString())) {
						Add(action.wsClean(ctok));
					}
					// skip last token
				} else if (ntok !== undefined) {
					// insert whitespaces
					// skip tokens where whitespace btw doesn't apply
					let fCurrent = filterCurrent.includes(ctok.type!);
					let fNext = filterAhead.includes(ntok.type!);

					if (!fCurrent && !fNext) {
						// deal with missing whitespaces
						Add(action.wsAdd(ctok));
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


interface SimpleFormatterSettings
{
	IndentOnly: boolean
}
/**
 * Simple code formater: context unaware, just reflow whitespace and indentation of balanced pairs 
 * @param document vscode document to format
 */
export async function mxsSimpleDocumentFormatter(document: TextDocument, settings: SimpleFormatterSettings)
{
	let TextEditActions: SimpleFormatterActions =
	{
		wsReIndent: (t, i) => TextEdit.replace(rangeUtil.getTokenRange(t), INDENT_PATTERN.repeat(i)),
		wsIndent: (t, i) => TextEdit.insert(getPos(t.line - 1, t.col - 1), INDENT_PATTERN.repeat(i)),

		wsClean: t => !settings.IndentOnly ? TextEdit.replace(rangeUtil.getTokenRange(t), ' ') : undefined,
		wsAdd: t => !settings.IndentOnly ? TextEdit.insert(getPos(t.line - 1, t.col + t.text.length - 1), ' ') : undefined,
	};

	return await mxsSimpleTextEditFormatter(document.getText(), TextEditActions);
}

/**
 * Simple code formater: context unaware. Range formatting -- UNFINISHED
 * @param document
 * @param range
 */
export async function mxsSimpleRangeFormatter(document: TextDocument, range: Range, settings: SimpleFormatterSettings)
{
	// positions
	// let start = range.start;
	// let end = range.end;
	// offsets --- use only line offset
	let offLine = range.start.line;
	// let offChar = range.start.character;

	/*
	TODO:
	- This needs to be context-aware... 
	- keep existent indentation
	*/
	let TextEditActions: SimpleFormatterActions =
	{
		wsReIndent: (t, i) => TextEdit.replace(rangeUtil.getTokenRange(t), '\t'.repeat(i)),
		wsIndent  : (t, i) => TextEdit.insert(getPos(t.line + offLine - 1, t.col - 1), '\t'.repeat(i)),
		wsClean   : t => !settings.IndentOnly ? TextEdit.replace(rangeUtil.getTokenRange(t), ' '): undefined,
		wsAdd     : t => !settings.IndentOnly ? TextEdit.insert(getPos(t.line + offLine - 1, t.col + t.value.length - 1), ' ') : undefined,
	};

	return await mxsSimpleTextEditFormatter(document.getText(range), TextEditActions);
}