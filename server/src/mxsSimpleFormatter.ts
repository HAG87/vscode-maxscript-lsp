import
{
	TextEdit,
	Position,
	Range
} from 'vscode-languageserver';
import
{
	TextDocument
} from 'vscode-languageserver-textdocument';

import moo from 'moo';
import { TokenizeStream as mxsTokenizer } from './mxsParser';
import { mxsFormatterLexer } from './lib/mooTokenize-formatter';
import { rangeUtil } from './lib/astUtils';
// note: keywords could be used to indent, at start or end of line. this will require a per-line aproach... split the documents in lines, and feed the tokenizer one line at the time.
//-----------------------------------------------------------------------------------
const filterCurrent =
	['assign', 'newline', 'delimiter', 'lbracket', 'emptyparens', 'emptybraces', 'bitrange', 'unaryminus'/*, 'bkslash' */];
const filterAhead =
	['assign', 'newline', 'delimiter', 'sep', 'ws', 'lbracket', 'rbracket', 'emptyparens', 'emptybraces', 'bitrange', 'unaryminus'/*, 'bkslash' */];

const IndentTokens =
	['lparen', 'arraydef', 'lbracket', 'lbrace', 'bitarraydef'];
const UnIndentTokens =
	['rparen', 'rbracket', 'rbrace'];
//-----------------------------------------------------------------------------------
// Helpers
const getPos = (line: number, col: number) => Position.create(line, col);
//-----------------------------------------------------------------------------------
// interfaces
/**
 * Code formatter options
 */
interface SimpleFormatterSettings
{
	indentOnly: boolean,
	indentChar: string
	whitespaceChar: string
}

/* let options: FormattingOptions = {
	tabSize: 5,
	insertSpaces: false,
	insertFinalNewline: true,
	trimTrailingWhitespace: true,
	trimFinalNewlines : true
}; */

const FormatterSettings:SimpleFormatterSettings = {
	indentOnly: false,
	indentChar: '\t',
	whitespaceChar: ' '
}

interface SimpleFormatterActions
{
	wsReIndent: (t: moo.Token, i: number) => TextEdit | undefined
	wsIndent: (t: moo.Token, i: number) => TextEdit | undefined
	wsClean: (t: moo.Token) => TextEdit | undefined
	wsAdd: (t: moo.Token) => TextEdit | undefined
}
//-----------------------------------------------------------------------------------
function SimpleTextEditFormatter(document: TextDocument | string, action: SimpleFormatterActions)
{
	return new Promise<TextEdit[]>((resolve, reject) =>
	{
		// console.log('Debugging formatter');
		const source = typeof document === 'string' ? document : document.getText();
		// add to results
		let Add = (res: TextEdit | undefined) => { if (res) { edits.push(res); } };

		let indentation = 0;
		let edits: TextEdit[] = [];
		let prevLine: number = 1;

		// token stream. if this fail will throw an error
		let tokenizedSource: moo.Token[] = mxsTokenizer(source, undefined, mxsFormatterLexer());
		// console.log(tokenizedSource);
		// return if no results
		if (tokenizedSource && !tokenizedSource.length) { reject(edits); }

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
					// check for line continuation !!
					Add(action.wsReIndent(ctok, indentation));
				} else {
					// if not 'ws', insert
					Add(action.wsIndent(ctok, indentation));
				}
			// } else if (ntok.type === 'bkslsh') {
				// deal with backslash here!
			} else {
				// tokens belonging to the same line
				// clean whitespace
				// TODO: check for illegal whitespaces
				if (ctok.type === 'ws' /* || ctock.type === 'bkslsh'*/) {
					if (/^[\s\t]{2,}$/m.test(ctok.toString())) {
						Add(action.wsClean(ctok));
					}
				// } else if (ntok.type === 'bkslsh') {
					// deal with backslash here!
				} else if (ntok !== undefined) {
					//console.log(ctok)
					// skip last token?
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
/*
export async function mxsStringFormatter(source: string, settings: SimpleFormatterSettings) {
	//...
}
*/
/**
 * Simple code formater: context unaware, just reflow whitespace and indentation of balanced pairs 
 * TODO: Add Reflow as an engine when parser tree is available.
 * @param document vscode document to format
 */
export async function SimpleDocumentFormatter(document: TextDocument, settings: Partial<SimpleFormatterSettings>)
{
	Object.assign(FormatterSettings, settings);

	let TextEditActions: SimpleFormatterActions =
	{
		// modify indentation
		wsReIndent: (t, i) => TextEdit.replace(rangeUtil.getTokenRange(t), FormatterSettings.indentChar.repeat(i)),
		// insert indentation
		wsIndent: (t, i) => TextEdit.insert(getPos(t.line - 1, t.col - 1), FormatterSettings.indentChar.repeat(i)),
		// clean whitespace
		wsClean: t => !FormatterSettings.indentOnly ? TextEdit.replace(rangeUtil.getTokenRange(t), ' ') : undefined,
		// insert whitespace
		wsAdd: t => !FormatterSettings.indentOnly ? TextEdit.insert(getPos(t.line - 1, t.col + t.text.length - 1), ' ') : undefined,
	};
	return await SimpleTextEditFormatter(document.getText(), TextEditActions);
}

/**
 * TODO: Simple code formater: context unaware. Range formatting -- UNFINISHED
 * @param document
 * @param range
 */
export async function SimpleRangeFormatter(document: TextDocument, range: Range, settings: Partial<SimpleFormatterSettings>)
{
	Object.assign(FormatterSettings, settings);
	// positions
	// let start = range.start;
	// let end = range.end;
	// offsets --- use only line offset
	const offLine = range.start.line;
	// let offChar = range.start.character;

	/*
	TODO:
	- This needs to be context-aware... 
	- keep existent indentation
	*/
	let TextEditActions: SimpleFormatterActions =
	{
		wsReIndent: (t, i) => TextEdit.replace(rangeUtil.getTokenRange(t), FormatterSettings.indentChar.repeat(i)),
		wsIndent: (t, i) => TextEdit.insert(getPos(t.line + offLine - 1, t.col - 1), FormatterSettings.indentChar.repeat(i)),
		wsClean: t => !FormatterSettings.indentOnly ? TextEdit.replace(rangeUtil.getTokenRange(t), ' ') : undefined,
		wsAdd: t => !FormatterSettings.indentOnly ? TextEdit.insert(getPos(t.line + offLine - 1, t.col + t.value.length - 1), ' ') : undefined,
	};
	return await SimpleTextEditFormatter(document.getText(range), TextEditActions);
}
