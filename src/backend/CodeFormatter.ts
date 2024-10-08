import { CharStream, CommonTokenStream, Token } from 'antlr4ng';

import { mxsLexer } from '../parser/mxsLexer.js';
import { ICodeFormatSettings } from '../types.js';

export interface IformatterResult
{
	code: string;
	start: number;
	stop: number;
	// offset: number;
}

const defaultFormatSettings: ICodeFormatSettings =
{
	indentChar: '\t',
	newLineChar: '\r\n',
	exprEndChar: ';',
	lineContinuationChar: '\\',
	whitespaceChar: ' ',

	codeblock: {
		parensInNewLine: true,
		newlineAllways: false,
		spaced: true,
	},
	statements: {
		useLineBreaks: true,
		optionalWhitespace: false
	},
	list: {
		useLineBreaks: false
	}
}

enum codeTypes
{
	ASSIGN,
	COMMA,
	DOT,
	COLON,
	ID,
	KEYWORD,
	LINE_BREAK,
	NUMBER,
	OPERATOR,
	SHARP,
	SYMBOL,
	VALUE,
	WHITESPACE,
	LPAREN,
	RPAREN,
	LBRACE,
	RBRACE,
	LINE_COMMENT,
	BLOCK_COMMENT,
	LINE_CONTINUATION,
}

const tokenToCodeType = new Map<number, codeTypes>([
	[mxsLexer.BLOCK_COMMENT, codeTypes.BLOCK_COMMENT],
	[mxsLexer.LINE_COMMENT, codeTypes.LINE_COMMENT],
	[mxsLexer.STRING, codeTypes.VALUE],
	[mxsLexer.NUMBER, codeTypes.NUMBER],
	[mxsLexer.TIMEVAL, codeTypes.NUMBER],
	[mxsLexer.TRUE, codeTypes.VALUE],
	[mxsLexer.FALSE, codeTypes.VALUE],
	[mxsLexer.AND, codeTypes.KEYWORD],
	[mxsLexer.AS, codeTypes.KEYWORD],
	[mxsLexer.AT, codeTypes.KEYWORD],
	[mxsLexer.BY, codeTypes.KEYWORD],
	[mxsLexer.CASE, codeTypes.KEYWORD],
	[mxsLexer.CATCH, codeTypes.KEYWORD],
	[mxsLexer.COLLECT, codeTypes.KEYWORD],
	[mxsLexer.DO, codeTypes.KEYWORD],
	[mxsLexer.ELSE, codeTypes.KEYWORD],
	[mxsLexer.EXIT, codeTypes.KEYWORD],
	[mxsLexer.FOR, codeTypes.KEYWORD],
	[mxsLexer.FROM, codeTypes.KEYWORD],
	[mxsLexer.IF, codeTypes.KEYWORD],
	[mxsLexer.IN, codeTypes.KEYWORD],
	[mxsLexer.OF, codeTypes.KEYWORD],
	[mxsLexer.ON, codeTypes.KEYWORD],
	[mxsLexer.OFF, codeTypes.KEYWORD],
	[mxsLexer.OR, codeTypes.KEYWORD],
	[mxsLexer.RETURN, codeTypes.KEYWORD],
	[mxsLexer.SET, codeTypes.KEYWORD],
	[mxsLexer.THEN, codeTypes.KEYWORD],
	[mxsLexer.TO, codeTypes.KEYWORD],
	[mxsLexer.TRY, codeTypes.KEYWORD],
	[mxsLexer.WHEN, codeTypes.KEYWORD],
	[mxsLexer.WHERE, codeTypes.KEYWORD],
	[mxsLexer.WHILE, codeTypes.KEYWORD],
	[mxsLexer.WITH, codeTypes.KEYWORD],
	[mxsLexer.NOT, codeTypes.KEYWORD],
	[mxsLexer.PUBLIC, codeTypes.KEYWORD],
	[mxsLexer.PRIVATE, codeTypes.KEYWORD],
	[mxsLexer.ABOUT, codeTypes.KEYWORD],
	[mxsLexer.COORDSYS, codeTypes.KEYWORD],
	[mxsLexer.LEVEL, codeTypes.KEYWORD],
	[mxsLexer.TIME, codeTypes.KEYWORD],
	[mxsLexer.UNDO, codeTypes.KEYWORD],
	[mxsLexer.CHANGE, codeTypes.KEYWORD],
	[mxsLexer.DELETED, codeTypes.KEYWORD],
	[mxsLexer.DefaultAction, codeTypes.KEYWORD],
	[mxsLexer.ANIMATE, codeTypes.KEYWORD],
	[mxsLexer.DontRepeatMessages, codeTypes.KEYWORD],
	[mxsLexer.MacroRecorderEmitterEnabled, codeTypes.KEYWORD],
	[mxsLexer.MXScallstackCaptureEnabled, codeTypes.KEYWORD],
	[mxsLexer.PrintAllElements, codeTypes.KEYWORD],
	[mxsLexer.QUIET, codeTypes.KEYWORD],
	[mxsLexer.REDRAW, codeTypes.KEYWORD],
	[mxsLexer.Group, codeTypes.KEYWORD],
	[mxsLexer.MacroScript, codeTypes.KEYWORD],
	[mxsLexer.Rollout, codeTypes.KEYWORD],
	[mxsLexer.Tool, codeTypes.KEYWORD],
	[mxsLexer.Utility, codeTypes.KEYWORD],
	[mxsLexer.RCmenu, codeTypes.KEYWORD],
	[mxsLexer.Parameters, codeTypes.KEYWORD],
	[mxsLexer.Plugin, codeTypes.KEYWORD],
	[mxsLexer.Attributes, codeTypes.KEYWORD],
	[mxsLexer.Angle, codeTypes.ID],
	[mxsLexer.Bitmap, codeTypes.ID],
	[mxsLexer.Button, codeTypes.ID],
	[mxsLexer.CheckBox, codeTypes.ID],
	[mxsLexer.CheckButton, codeTypes.ID],
	[mxsLexer.ColorPicker, codeTypes.ID],
	[mxsLexer.ComboBox, codeTypes.ID],
	[mxsLexer.CurveControl, codeTypes.ID],
	[mxsLexer.DotnetControl, codeTypes.ID],
	[mxsLexer.DropdownList, codeTypes.ID],
	[mxsLexer.EditText, codeTypes.ID],
	[mxsLexer.GroupBox, codeTypes.ID],
	[mxsLexer.Hyperlink, codeTypes.ID],
	[mxsLexer.ImgTag, codeTypes.ID],
	[mxsLexer.Label, codeTypes.ID],
	[mxsLexer.ListBox, codeTypes.ID],
	[mxsLexer.MapButton, codeTypes.ID],
	[mxsLexer.MaterialButton, codeTypes.ID],
	[mxsLexer.MultilistBox, codeTypes.ID],
	[mxsLexer.PickButton, codeTypes.ID],
	[mxsLexer.PopupBenu, codeTypes.ID],
	[mxsLexer.Progressbar, codeTypes.ID],
	[mxsLexer.RadioButtons, codeTypes.ID],
	[mxsLexer.Slider, codeTypes.ID],
	[mxsLexer.Spinner, codeTypes.ID],
	[mxsLexer.Subrollout, codeTypes.ID],
	[mxsLexer.Timer, codeTypes.ID],
	[mxsLexer.Separator, codeTypes.ID],
	[mxsLexer.MenuItem, codeTypes.ID],
	[mxsLexer.SubMenu, codeTypes.ID],
	[mxsLexer.MAPPED, codeTypes.KEYWORD],
	[mxsLexer.FN, codeTypes.KEYWORD],
	[mxsLexer.STRUCT, codeTypes.KEYWORD],
	[mxsLexer.LOCAL, codeTypes.KEYWORD],
	[mxsLexer.GLOBAL, codeTypes.KEYWORD],
	[mxsLexer.PERSISTENT, codeTypes.KEYWORD],
	[mxsLexer.NAME, codeTypes.VALUE],
	[mxsLexer.PATH, codeTypes.VALUE],
	[mxsLexer.ID, codeTypes.ID],
	[mxsLexer.QUOTED_ID, codeTypes.ID],
	[mxsLexer.RESOURCE, codeTypes.VALUE],
	[mxsLexer.EQ, codeTypes.ASSIGN],
	[mxsLexer.COMPARE, codeTypes.OPERATOR],
	[mxsLexer.ASSIGN, codeTypes.ASSIGN],
	[mxsLexer.UNARY_MINUS, codeTypes.OPERATOR],
	[mxsLexer.MINUS, codeTypes.OPERATOR],
	[mxsLexer.PLUS, codeTypes.OPERATOR],
	[mxsLexer.PROD, codeTypes.OPERATOR],
	[mxsLexer.DIV, codeTypes.OPERATOR],
	[mxsLexer.POW, codeTypes.OPERATOR],
	[mxsLexer.SHARP, codeTypes.SHARP],
	[mxsLexer.COMMA, codeTypes.COMMA],
	[mxsLexer.GLOB, codeTypes.KEYWORD],
	[mxsLexer.COLON, codeTypes.COLON],
	[mxsLexer.DOTDOT, codeTypes.OPERATOR],
	[mxsLexer.DOT, codeTypes.DOT],
	[mxsLexer.AMP, codeTypes.SYMBOL],
	[mxsLexer.QUESTION, codeTypes.SYMBOL],
	[mxsLexer.LPAREN, codeTypes.LPAREN],
	[mxsLexer.RPAREN, codeTypes.RPAREN],
	[mxsLexer.LBRACE, codeTypes.LBRACE],
	[mxsLexer.RBRACE, codeTypes.RBRACE],
	[mxsLexer.LBRACK, codeTypes.SYMBOL],
	[mxsLexer.RBRACK, codeTypes.SYMBOL],
	[mxsLexer.WS, codeTypes.WHITESPACE],
	[mxsLexer.NL, codeTypes.LINE_BREAK],

]);

class codeToken
{
	val: string;
	type: codeTypes;
	pos: number;
	indent?: number;

	constructor(val: string, type: codeTypes, pos: number)
	{
		this.val = val;
		this.type = type;
		this.pos = pos;
	}
	public check(type: codeTypes): boolean
	{
		return this.type === type;
	}
}

class codeBlock
{
	vals: (codeToken | codeBlock)[];
	indent: number;
	start?: codeToken;
	end?: codeToken;

	constructor(val?: codeToken, indent?: number)
	{
		this.vals = val ? [val] : [];
		this.indent = indent ?? 0;
	}
	get first(): codeToken | codeBlock
	{
		return this.vals[0];
	}
	get last(): codeToken | codeBlock
	{
		return this.vals[this.vals.length - 1];
	}
	public hasLineBreaks(): boolean
	{
		let res = false;
		for (const val of this.vals) {
			if (val instanceof codeBlock) {
				if (!res) {
					res = val.hasLineBreaks();
				}
			} else if (val.check(codeTypes.LINE_BREAK)) {
				res = true;
			}
		}
		return res;
	}

	public startsWithNL(): boolean
	{
		return (this.first instanceof codeToken && this.first.check(codeTypes.LINE_BREAK));
	}

	public endsWithNL(): boolean
	{
		return (this.last instanceof codeToken && this.last.check(codeTypes.LINE_BREAK));
	}

	public isEmpty(): boolean
	{
		return this.vals.length === 0;
	}
	public canBeMultiline(): boolean
	{
		return this.vals.length > 1;
	}

	public flatten(options: ICodeFormatSettings = defaultFormatSettings): codeToken[]
	{
		function dfs(node: codeBlock, parent?: codeBlock): codeToken[]
		{
			const result: codeToken[] = [];
			//-----------------------------------------------------
			// main loop to visit children
			for (let i = 0; i <= node.vals.length - 1; i++) {
				//----------------------------
				const item = node.vals[i];
				const next = i < node.vals.length ? node.vals[i + 1] : null;
				const prev = i > 0 ? node.vals[i - 1] : null;
				//----------------------------
				if (item instanceof codeToken) {

					// track indent
					item.indent = node.indent;

					result.push(item)
					// indent
					if (item.check(codeTypes.LINE_BREAK) && next instanceof codeToken) {
						result.push(new codeToken(options.indentChar.repeat(node.indent), codeTypes.WHITESPACE, item.pos));
					}
				} else {
					// blockNode
					const hasLinebreaks = item.hasLineBreaks();
					//----------------------------------
					const inner = dfs(item, node);
					// const inner = val.parse(options);
					//----------------------------------
					if (!item.isEmpty()) {

						// block start
						// look for invalid positions
						if (
							result[result.length - 1] &&
							!result[result.length - 1]?.check(codeTypes.SHARP) &&
							!result[result.length - 1]?.check(codeTypes.LINE_BREAK)
						) {

							if (hasLinebreaks && options.codeblock.parensInNewLine) {
								result.push(
									new codeToken(options.newLineChar, codeTypes.LINE_BREAK, result[result.length - 1].pos),
									// indent
									new codeToken(options.indentChar.repeat(node.indent), codeTypes.WHITESPACE, result[result.length - 1].pos)
								);
							} else if (!result[result.length - 1].check(codeTypes.WHITESPACE)) {
								result.push(new codeToken(
									options.whitespaceChar,
									codeTypes.WHITESPACE,
									result[result.length - 1].pos)
								);
							}
						}
						// wrap the content
						if (item.start && item.end && inner[inner.length - 1]) {
							// start paren
							//----------------------------------
							result.push(item.start);
							//----------------------------------						
							if (hasLinebreaks || (item.canBeMultiline() && options.codeblock.newlineAllways)) {
								// before inner
								if (!item.startsWithNL()) {
									result.push(new codeToken(options.newLineChar, codeTypes.LINE_BREAK, item.start.pos));
								}
								//----------------------------------
								result.push(...inner);
								//----------------------------------
								// after inner
								if (!item.endsWithNL()) {
									result.push(new codeToken(options.newLineChar, codeTypes.LINE_BREAK, inner[inner.length - 1].pos));
								}
								// indent
								result.push(new codeToken(options.indentChar.repeat(node.indent), codeTypes.WHITESPACE, inner[inner.length - 1].pos));
							} else {
								result.push(new codeToken(options.whitespaceChar, codeTypes.WHITESPACE, item.start.pos));
								//----------------------------------
								result.push(...inner);
								//----------------------------------
								result.push(new codeToken(options.whitespaceChar, codeTypes.WHITESPACE, inner[inner.length - 1].pos));
							}
							//----------------------------------
							result.push(item.end);
							//----------------------------------
						} else {
							//----------------------------------
							result.push(...inner);
							//----------------------------------
						}
					} else {
						if (item.start && item.end) {
							result.push(item.start);
							result.push(item.end);
						}
					}
					// block end
					// look for invalid positions
					// add ending newlines and indent only when the block is followed by a token,
					// blockNodes siblings will be addressed on the blockNode start				
					if (
						next instanceof codeToken &&
						!next.check(codeTypes.LINE_BREAK) &&
						!(next.val.startsWith(',') || next.val.startsWith('.'))
					) {
						if (hasLinebreaks) {
							result.push(
								new codeToken(options.newLineChar, codeTypes.LINE_BREAK, result[result.length - 1].pos),
								// indent
								new codeToken(options.indentChar.repeat(node.indent), codeTypes.WHITESPACE, result[result.length - 1].pos)
							);
						} else {
							result.push(new codeToken(options.whitespaceChar, codeTypes.WHITESPACE, result[result.length - 1].pos));
						}
					}
				}
			}
			//-----------------------------------------------------
			// console.log(result);
			return result;
		}
		//---------------------------------------------------------
		return dfs(this);
	}

	toString(options: ICodeFormatSettings): string
	toString(options: ICodeFormatSettings, start: number, stop: number): string
	toString(options: ICodeFormatSettings = defaultFormatSettings, start?: number, stop?: number): string
	{
		let result = this.flatten(options)

		if (start && stop && start < stop) {
			// rectify positions
			const startIndex = result.findIndex(item => item.pos >= start);
			const stopPos = result.slice().reverse().find(item => item.pos <= stop);
			const stopIndex = result.findIndex(item => item.pos === stopPos!.pos);
			// get open parens
			/*
			let openParens: codeToken[] = [];
			for (let [index, item] of result.entries()){
				if (index === startIndex) break;
				if (item.check(codeTypes.LPAREN)) openParens.push(item);
				if (item.check(codeTypes.RPAREN)) openParens.pop();
			}
			// */

			/*
			const _start = result[startIndex].pos;
			const _stop = result[stopIndex].pos;
			let rectify: number = _start;
			for (let i = startIndex - 1; i >= 0; i--) {
				// console.log(result[i]);
				if (result[i].check(codeTypes.LINE_BREAK) || result[i].check(codeTypes.WHITESPACE)) {
					rectify = result[i].pos;
				} else break;
			}
			result = result.filter(result => result.pos >= rectify && result.pos <= stop);
			//	result = result.filter(result => result.pos >= start && result.pos <= stop);
			// */

			/*
			let filterResult: codeToken[] = [];
			for(let item of result) {
				// if (item.pos < start) { continue; }
				// filterResult.push(item);
				// if (item.pos >= stop) { break; }

				if (item.pos >= start && item.pos <= stop) {
					filterResult.push(item);
				}
				if (item.pos >= stop) {
					// filterResult.push(item);
					break;
				}
			}
			if (filterResult[0].indent) {
				filterResult.unshift(
					new codeToken(
						options.indentChar.repeat(filterResult[0].indent),
						codeTypes.WHITESPACE,
						filterResult[0].pos));
			}
			return filterResult.reduce((acc: string, curr: codeToken) => { return acc += curr.val; }, '');	
			// */

			result = result.slice(startIndex, stopIndex + 1);
			// /*
			if (result[0].indent) {
				result.unshift(
					new codeToken(
						options.indentChar.repeat(result[0].indent),
						codeTypes.WHITESPACE,
						result[0].pos));
			}
			// */
		}
		return result.reduce((acc: string, curr: codeToken) => { return acc += curr.val; }, '');
	}
}

/**
 * Fallback class to provide simple formatting options when the parser is not available
 * format entire document
 * format range
 */
export class mxsSimpleFormatter
{
	options: ICodeFormatSettings;

	private tokenStream: CommonTokenStream;
	private tokens: Token[];
	// outputPipeline: (string | string[])[] = [];
	//TODO: add options!
	public constructor(grammarOrTokens: string | CommonTokenStream, options?: ICodeFormatSettings)
	{
		if (typeof grammarOrTokens === "string") {
			const lexer = new mxsLexer(CharStream.fromString(grammarOrTokens));
			lexer.removeErrorListeners();
			this.tokenStream = new CommonTokenStream(lexer);
			this.tokenStream.fill();
			this.tokens = this.tokenStream.getTokens();
		} else {
			this.tokenStream = grammarOrTokens;
			this.tokens = grammarOrTokens.getTokens();
		}
		this.options = options || defaultFormatSettings;
	}

	/**
	 * Returns the index for the token which covers the given character index.
	 * If no token can be found for that position return the EOF token index.
	 *
	 * @param charIndex The character index to examine.
	 * @param first If this is true the search behavior is changed and returns the first token on the line
	 *              where the found token is on.
	 *
	 * @returns The index of the token as requested.
	 */
	private tokenFromIndex(charIndex: number, first: boolean): number
	{
		// Sanity checks first.
		if (charIndex < 0) {
			return 0;
		}
		if (charIndex >= this.tokens[0].inputStream!.size) {
			return this.tokens.length - 1;
		}

		for (let i = 0; i < this.tokens.length; ++i) {
			const token = this.tokens[i];
			if (token.start > charIndex) {
				if (i === 0) {
					return i;
				}
				--i;

				if (!first) {
					return i;
				}

				const row = this.tokens[i].line;
				while (i > 0 && this.tokens[i - 1].line === row) {
					--i;
				}

				return i;
			}
		}

		return this.tokens.length - 1;
	}

	private nextRealToken(source: Token[], index: number, stop?: number): Token | undefined
	{
		const limit = stop ?? source.length - 1;
		for (let i = index; i <= limit; i++) {
			const currToken = source[i];
			if (currToken.type === mxsLexer.EOF) {
				return;
			}
			if (currToken.type !== mxsLexer.WS &&
				currToken.type !== mxsLexer.NL
			) {
				return currToken;
			}
		}
		return;
	}
	private tokensTillEOL(source: Token[], index: number): number
	{
		const currline = source[index].line;
		// let test = source[index].text!;
		let count = 0;
		for (let i = index + 1; i < source.length; i++) {
			// console.log(`${currline} - ${source[i].line}`);
			const currToken = source[i];
			if (currToken.type === mxsLexer.NL ||
				currToken.type === mxsLexer.WS
			) {
				continue;
			}
			if (source[i].line !== currline) {
				// console.log(`ret: ${test} :: ${count}`);
				return count;
			}
			count++;
		}
		return count;
	}

	private emmit(token: Token): codeToken
	private emmit(token: Token, text: string, type: number): codeToken

	private emmit(token: Token, text?: string, type?: number): codeToken
	{
		return new codeToken(
			text ?? token.text!,
			type ?? tokenToCodeType.get(token.type)!,
			token.start
		);
	}

	private formattingTree(tokens: Token[]): codeBlock
	{
		// options
		const opt = this.options;
		// list: { useLineBreaks: true }
		// const afterCommaChar = opt.list.useLineBreaks ? opt.newLineChar : opt.whitespaceChar;
		// statements: { useLineBreaks: true, }
		const afterKeyword = opt.statements.useLineBreaks;
		//---------------------------------------------------------
		const root: codeBlock = new codeBlock();
		const stack: codeBlock[] = [root];
		const cStack = () => stack[stack.length - 1];
		let indentation = 0;
		//---------------------------------------------------------
		// for (let i = start; i <= stop; i++) {
		// for (const [i, currToken] of this.tokens.entries()) {
		for (let i = 0; i < tokens.length; i++) {
			const currToken = tokens[i];
			const prevToken = tokens[i - 1];
			const nextToken = tokens[i + 1];
			//---------------------------------------------------------
			if (currToken.type === mxsLexer.EOF) {
				return root;
			}
			//---------------------------------------------------------
			if (i === 0) {
				if (currToken.type === mxsLexer.NL) {
					cStack().vals.push(this.emmit(currToken, opt.newLineChar, codeTypes.LINE_BREAK));
				}
			}
			//---------------------------------------------------------
			// last token
			if (!nextToken) {
				switch (currToken.type) {
					case mxsLexer.NL:
					case mxsLexer.WS:
						break;
					case mxsLexer.RBRACE:
					case mxsLexer.RPAREN:
						{
							indentation--;
							cStack().end = this.emmit(currToken);
							//new atom(currToken.text!, currToken.type === mxsLexer.RPAREN ? atomTypes.RPAREN : atomTypes.RBRACE, currToken.start);
							stack.pop();
						}
						break;
					default:
						cStack().vals.push(this.emmit(currToken));
						break;
				}
				return root;
			}
			//---------------------------------------------------------
			switch (currToken.type) {
				case mxsLexer.LINE_COMMENT:
					cStack().vals.push(this.emmit(currToken));
					cStack().vals.push(this.emmit(currToken, opt.newLineChar, codeTypes.LINE_BREAK));
					break;
				// /*
				case mxsLexer.BLOCK_COMMENT:
					cStack().vals.push(this.emmit(currToken));
					if (nextToken.type === mxsLexer.NL) {
						cStack().vals.push(this.emmit(currToken, opt.newLineChar, codeTypes.LINE_BREAK));
					}
					break;
				// */
				case mxsLexer.LBRACE:
				case mxsLexer.LPAREN:
					{
						//indentation
						indentation++;
						// const node = new blockNode(currToken.text!, indentation);
						const node = new codeBlock(undefined, indentation);
						node.start = this.emmit(currToken);
						cStack().vals.push(node);
						//-------------------------
						stack.push(node);
						//-------------------------
						// new line after
						if (nextToken.type === mxsLexer.NL) {
							cStack().vals.push(this.emmit(currToken, opt.newLineChar, codeTypes.LINE_BREAK));
						}
					}
					break;
				case mxsLexer.RBRACE:
				case mxsLexer.RPAREN:
					{
						//indentation
						indentation--;
						// cStack().vals.push(currToken.text!);
						cStack().end = this.emmit(currToken);
						//-------------------------
						stack.pop();
						//-------------------------
						if (nextToken.type === mxsLexer.NL) {
							const next = this.nextRealToken(tokens, i + 2);
							switch (next?.type) {
								case mxsLexer.RPAREN:
								case mxsLexer.RBRACE:
									break;
								default:
									cStack().vals.push(this.emmit(currToken, opt.newLineChar, codeTypes.LINE_BREAK));
									break;
							}
						}
					}
					break;
				//---------------------------------------------------------
				// tokens that increase indentation, when sigle expression is next
				// case mxsLexer.OF:
				// case mxsLexer.RETURN:
				case mxsLexer.COLLECT:
				case mxsLexer.DO:
				case mxsLexer.ELSE:
				case mxsLexer.TRY:
				case mxsLexer.CATCH:
				case mxsLexer.THEN:
				case mxsLexer.WHERE:
				case mxsLexer.WHILE:
					{
						cStack().vals.push(this.emmit(currToken));
						if (nextToken.type !== mxsLexer.LPAREN) {

							if (afterKeyword && this.tokensTillEOL(tokens, i) > 1) {
								cStack().vals.push(this.emmit(currToken, opt.newLineChar, codeTypes.LINE_BREAK));
								cStack().vals.push(new codeToken(opt.indentChar, codeTypes.WHITESPACE, currToken.start));
							} else {
								cStack().vals.push(this.emmit(currToken, opt.whitespaceChar, codeTypes.WHITESPACE));
							}
						}
					}
					break;
				//---------------------------------------------------------
				case mxsLexer.WS:
					{
						// line continuation handling
						if (currToken.text && currToken.text.includes(opt.lineContinuationChar)) {
							cStack().vals.push(
								new codeToken(opt.lineContinuationChar, codeTypes.LINE_CONTINUATION, currToken.start),
								this.emmit(currToken, opt.newLineChar, codeTypes.LINE_BREAK)
							);
						}
					}
					break;
				case mxsLexer.NL:
					//...
					/*
					switch (nextToken.type) {
						case mxsLexer.RPAREN:
						case mxsLexer.LPAREN:
						case mxsLexer.RBRACE:
						case mxsLexer.LBRACE:
							break;
						default:
							cStack().vals.push(opt.newLineChar);
							// cStack().vals.push(opt.indentChar);
							break;
					}
					// */
					break;
				//---------------------------------------------------------
				case mxsLexer.AMP:
				case mxsLexer.DOT:
				case mxsLexer.DOTDOT:
				case mxsLexer.GLOB:
				case mxsLexer.LBRACK:
				case mxsLexer.SHARP:
				case mxsLexer.UNARY_MINUS:
					cStack().vals.push(this.emmit(currToken));
					break;
				case mxsLexer.PROD:
					{
						cStack().vals.push(this.emmit(currToken));
						// find the prev token that is not ws..
						if (prevToken) {
							switch (prevToken.type) {
								case mxsLexer.COMMA:
								case mxsLexer.DOT:
								case mxsLexer.EQ:
								case mxsLexer.LBRACE:
								case mxsLexer.LBRACK:
								case mxsLexer.LPAREN:
								case mxsLexer.NL:
									break;
								default:
									cStack().vals.push(this.emmit(currToken, opt.whitespaceChar, codeTypes.WHITESPACE));
									break;
							}
						}
					}
					break;
				//---------------------------------------------------------
				case mxsLexer.ON:
				case mxsLexer.EQ:
					{
						cStack().vals.push(this.emmit(currToken));

						if (nextToken.type === mxsLexer.NL) {
							const next = this.nextRealToken(tokens, i + 2);
							if (next?.type !== mxsLexer.LPAREN) {
								cStack().vals.push(this.emmit(currToken, opt.newLineChar, codeTypes.LINE_BREAK));
							}
						} else {
							cStack().vals.push(this.emmit(currToken, opt.whitespaceChar, codeTypes.WHITESPACE));
						}
					}
					break;
				case mxsLexer.COMMA:
					{
						cStack().vals.push(this.emmit(currToken));
						cStack().vals.push(
							nextToken.type === mxsLexer.NL
								? this.emmit(currToken, opt.newLineChar, codeTypes.LINE_BREAK)
								: opt.list.useLineBreaks
									? this.emmit(currToken, opt.newLineChar, codeTypes.LINE_BREAK)
									: this.emmit(currToken, opt.whitespaceChar, codeTypes.WHITESPACE)
						);
					}
					break;
				//---------------------------------------------------------
				default:
					{
						cStack().vals.push(this.emmit(currToken));

						switch (nextToken.type) {
							case mxsLexer.COMMA:
							case mxsLexer.DOT:
							case mxsLexer.DOTDOT:
							case mxsLexer.LBRACK:
							case mxsLexer.LPAREN:
							case mxsLexer.RBRACE:
							case mxsLexer.RBRACK:
							case mxsLexer.RPAREN:
								break;
							case mxsLexer.COLON:
								{
									if (currToken.type === mxsLexer.NUMBER) {
										cStack().vals.push(this.emmit(currToken, opt.whitespaceChar, codeTypes.WHITESPACE));
									}
								}
								break;
							case mxsLexer.NL:
								{
									// look further up
									const next = this.nextRealToken(tokens, i + 2);
									// /*
									switch (next?.type) {
										case mxsLexer.RPAREN:
										case mxsLexer.LPAREN:
										case mxsLexer.RBRACE:
										case mxsLexer.LBRACE:
											break;
										default:
											cStack().vals.push(this.emmit(currToken, opt.newLineChar, codeTypes.LINE_BREAK));
											break;
									}
									// */
								}
								break;
							case mxsLexer.ELSE:
							case mxsLexer.WHERE:
							case mxsLexer.WHILE:
								cStack().vals.push(
									afterKeyword
										? this.emmit(currToken, opt.newLineChar, codeTypes.LINE_BREAK)
										: this.emmit(currToken, opt.whitespaceChar, codeTypes.WHITESPACE)
								);
								break;
							default:
								// mandatory whitespace
								cStack().vals.push(this.emmit(currToken, opt.whitespaceChar, codeTypes.WHITESPACE));
								break;
						}
					}
					break;
			}
		}
		return root;
	}

	// get tokens within range
	public formatRange(start: number, stop: number): IformatterResult
	{
		// format the entire doc
		const activeTokens = this.tokens.filter(token => token.type !== mxsLexer.WS);
		// produce the tree
		const codeTree = this.formattingTree(activeTokens);
		// derive the code TODO: limit range
		const code: string = codeTree.toString(this.options, start, stop);
		// console.log('---------------------------');
		// console.log(JSON.stringify(code));
		// new offset
		/*
		const startPos = activeTokens[0].start;
		const stopPos = activeTokens[activeTokens.length - 1].stop;
		const offset = startPos + (code.length - 1);
		return { code, start: startPos, stop: stopPos, offset };
		*/
		return { code, start, stop };
	}

	public formatTokenRange(start?: number, stop?: number): IformatterResult
	{
		let activeTokens = this.tokenStream.getTokens(start, stop);
		activeTokens = activeTokens.filter(token => token.type !== mxsLexer.WS);
		// produce the tree
		const codeTree = this.formattingTree(activeTokens);
		// derive the code TODO: limit range
		const code: string = codeTree.toString(this.options);
		// console.log(JSON.stringify(code));
		// new offset
		const startPos = activeTokens[0].start;
		const stopPos = activeTokens[activeTokens.length - 1].stop;
		// const offset = startPos + (code.length - 1);
		return { code, start: startPos, stop: stopPos };
	}
}