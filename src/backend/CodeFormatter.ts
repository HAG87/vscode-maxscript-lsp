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
	children: (codeToken | codeBlock)[];
	indent: number;
	start?: codeToken;
	end?: codeToken;

	constructor(val?: codeToken, indent?: number)
	{
		this.children = val ? [val] : [];
		this.indent = indent ?? 0;
	}
	get first(): codeToken | codeBlock
	{
		return this.children[0];
	}
	get last(): codeToken | codeBlock
	{
		return this.children[this.children.length - 1];
	}
	public hasLineBreaks(): boolean
	{
		let res = false;
		for (const val of this.children) {
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
		return this.children.length === 0;
	}
	public canBeMultiline(): boolean
	{
		return this.children.length > 3;
	}

	private flatten(): codeToken[]
	{
		const result: codeToken[] = [];
		for (const val of this.children) {
			if (val instanceof codeBlock) {
				if (val.start) {
					result.push(val.start);
				}
				result.push(...val.flatten());
				if (val.end) {
					result.push(val.end);
				}
			} else {
				result.push(val);
			}
		}
		return result;
	}
	toString(start?: number, stop?: number): string
	{
		let result = this.flatten()
		if (start && stop && start < stop) {
			// rectify positions
			const startIndex = result.findIndex(item => item.pos >= start);
			const stopPos = result.slice().reverse().find(item => item.pos <= stop);
			const stopIndex = result.findIndex(item => item.pos === stopPos!.pos);

			result = result.slice(startIndex, stopIndex + 1);
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
	/**
	 * Gets the next token that is not whitespace or newline
	 * @param source the token stream
	 * @param index start position
	 * @param stop? end position
	 * @returns the token or undefined if not found
	 */
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
	/**
	 * Search for tokens until the end of the line, return the number of non whitespace tokens
	 * @param source the token stream
	 * @param index start position
	 * @returns tokens count
	 */
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
	private emmit(token: Token, text: string, type: number, position: number): codeToken
	private emmit(token: Token, text?: string, type?: number, position?: number): codeToken
	{
		return new codeToken(
			text ?? token.text!,
			type ?? tokenToCodeType.get(token.type)!,
			position ?? token.stop
		);
	}

	private formattingTree(tokens: Token[], options: ICodeFormatSettings): codeBlock
	{
		const root: codeBlock = new codeBlock();
		const stack: codeBlock[] = [root];
		const cStack = () => stack[stack.length - 1];
		let indentation = 0;
		//---------------------------------------------------------
		// for (let i = start; i <= stop; i++) {
		// for (const [i, currToken] of this.tokens.entries()) {
		for (let i = 0; i < tokens.length; i++) {
			const currToken = tokens[i];
			const prevToken = tokens[i - 1] ?? null;
			const nextToken = tokens[i + 1] ?? null;
			//---------------------------------------------------------
			if (currToken.type === mxsLexer.EOF) {
				return root;
			}
			//---------------------------------------------------------
			// first token
			if (i === 0) {
				if (currToken.type === mxsLexer.NL) {
					// console.log(this.emmit(currToken, options.newLineChar, codeTypes.LINE_BREAK));
					// console.log(cStack().vals);
					cStack().children.push(this.emmit(currToken, options.newLineChar, codeTypes.LINE_BREAK));
					continue;
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
						cStack().children.push(this.emmit(currToken));
						break;
				}
				return root;
			}
			//---------------------------------------------------------
			//TODO: write a semantic function that adds the newline and indentation here.
			switch (currToken.type) {
				case mxsLexer.LINE_COMMENT:
					cStack().children.push(this.emmit(currToken));
					cStack().children.push(this.emmit(currToken, options.newLineChar, codeTypes.LINE_BREAK));
					break;
				// /*
				case mxsLexer.BLOCK_COMMENT:
					{
						cStack().children.push(this.emmit(currToken));
						if (nextToken.type === mxsLexer.NL) {
							cStack().children.push(this.emmit(currToken, options.newLineChar, codeTypes.LINE_BREAK));
						} else {
							cStack().children.push(this.emmit(currToken, options.whitespaceChar, codeTypes.WHITESPACE));
						}
					}
					break;
				// */
				case mxsLexer.LBRACE:
				case mxsLexer.LPAREN:
					{
						//TODO: I have some data about the context of the codeblock here, I could handle the whitespace.
						//indentation
						indentation++;
						// const node = new blockNode(currToken.text!, indentation);
						// create new codeblock
						const node = new codeBlock(undefined, indentation);
						// codeblock start token
						node.start = this.emmit(currToken);
						// push codeblock as child of the current codeblock
						cStack().children.push(node);
						//-------------------------
						// push to the stack.
						stack.push(node);
						//-------------------------
						// new line after, if the next token is a new line. this will maintain new lines in the codeblock
						// /*
						if (nextToken.type === mxsLexer.NL) {
							cStack().children.push(this.emmit(currToken, options.newLineChar, codeTypes.LINE_BREAK));
						}
						// */
					}
					break;
				case mxsLexer.RBRACE:
				case mxsLexer.RPAREN:
					{
						//TODO: I could handle the wrapping whitespace at the end of the codeblock
						//indentation
						indentation--;
						cStack().end = this.emmit(currToken);
						//-------------------------
						stack.pop();
						//-------------------------
						// line termination
						if (nextToken.type === mxsLexer.NL) {
							const next = this.nextRealToken(tokens, i + 2);
							if (next) {
								switch (next.type) {
									case mxsLexer.RPAREN:
									case mxsLexer.RBRACE:
										break;
									default:
										cStack().children.push(this.emmit(currToken, options.newLineChar, codeTypes.LINE_BREAK));
										break;
								}
							}
						}
					}
					break;
				//---------------------------------------------------------
				// tokens that increase indentation, when sigle expression is next
				// case mxsLexer.RETURN:
				// case mxsLexer.OF:
				case mxsLexer.COLLECT:
				case mxsLexer.DO:
				case mxsLexer.ELSE:
				case mxsLexer.TRY:
				case mxsLexer.CATCH:
				case mxsLexer.THEN:
				case mxsLexer.WHERE:
				case mxsLexer.WHILE:
					{
						cStack().children.push(this.emmit(currToken));

						const nextRealToken = this.nextRealToken(tokens, i + 1);
						// if (options.statements.useLineBreaks && (nextToken.type !== mxsLexer.LPAREN || this.tokensTillEOL(tokens, i) > 1)) {
						if (options.statements.useLineBreaks && (nextRealToken && nextRealToken.type !== mxsLexer.LPAREN)) {
							if (options.statements.useLineBreaks) {
								cStack().children.push(this.emmit(currToken, options.newLineChar, codeTypes.LINE_BREAK));
								cStack().children.push(this.emmit(currToken, options.indentChar, codeTypes.WHITESPACE));
							} else {
								cStack().children.push(this.emmit(currToken, options.whitespaceChar, codeTypes.WHITESPACE));
							}
						}
						// } else { cStack().vals.push(this.emmit(currToken, options.whitespaceChar, codeTypes.WHITESPACE)); }
					}
					break;
				//---------------------------------------------------------
				case mxsLexer.WS:
					{
						// FIXME: line continuation handling. for this to work I need to disable the whitespace tokens filtering
						if (currToken.text && currToken.text.includes(options.lineContinuationChar)) {
							cStack().children.push(
								this.emmit(currToken, options.lineContinuationChar, codeTypes.LINE_CONTINUATION),
								// FIXME: the current method has a problem with this linebreak. it breaks the expressions flow
								this.emmit(currToken, options.newLineChar, codeTypes.LINE_BREAK)
							);
						}
					}
					break;
				case mxsLexer.NL:
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
					cStack().children.push(this.emmit(currToken));
					break;
				case mxsLexer.PROD:
					{
						cStack().children.push(this.emmit(currToken));
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
									cStack().children.push(this.emmit(currToken, options.whitespaceChar, codeTypes.WHITESPACE));
									break;
							}
						}
					}
					break;
				//---------------------------------------------------------
				case mxsLexer.ON:
				case mxsLexer.EQ:
					{
						cStack().children.push(this.emmit(currToken));
						// NOTE: nextToken ommits whitespace
						if (nextToken.type === mxsLexer.NL) {
							// const next = this.nextRealToken(tokens, i + 2);
							if (this.nextRealToken(tokens, i + 2)?.type !== mxsLexer.LPAREN && options.statements.useLineBreaks) {
								cStack().children.push(this.emmit(currToken, options.newLineChar, codeTypes.LINE_BREAK));
							} else {
								cStack().children.push(this.emmit(currToken, options.whitespaceChar, codeTypes.WHITESPACE));
							}
						} else {
							// check cStack() ??? ===> cStack().vals.length - 1
							// console.log(this.nextRealToken(tokens, i + 1)?.text);
							cStack().children.push(this.emmit(currToken, options.whitespaceChar, codeTypes.WHITESPACE));
						}
					}
					break;
				case mxsLexer.COMMA:
					{
						cStack().children.push(this.emmit(currToken));
						if (nextToken.type === mxsLexer.NL || options.list.useLineBreaks) {
							cStack().children.push(this.emmit(currToken, options.newLineChar, codeTypes.LINE_BREAK));
						} else {
							cStack().children.push(this.emmit(currToken, options.whitespaceChar, codeTypes.WHITESPACE));
						}
					}
					break;
				//---------------------------------------------------------
				default:
					{
						cStack().children.push(this.emmit(currToken));

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
										cStack().children.push(this.emmit(currToken, options.whitespaceChar, codeTypes.WHITESPACE));
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
											cStack().children.push(this.emmit(currToken, options.newLineChar, codeTypes.LINE_BREAK));
											break;
									}
									// */
								}
								break;
							case mxsLexer.ELSE:
							case mxsLexer.WHERE:
							case mxsLexer.WHILE:
								cStack().children.push(
									options.statements.useLineBreaks
										? this.emmit(currToken, options.newLineChar, codeTypes.LINE_BREAK)
										: this.emmit(currToken, options.whitespaceChar, codeTypes.WHITESPACE)
								);
								break;
							default:
								// mandatory whitespace
								cStack().children.push(this.emmit(currToken, options.whitespaceChar, codeTypes.WHITESPACE));
								break;
						}
					}
					break;
			}
		}
		return root;
	}

	private flattenCodeTree(node: codeBlock, options: ICodeFormatSettings = defaultFormatSettings): codeToken[]
	{
		const getLastRealToken = (tokenCollection: codeToken[]): codeToken | undefined =>
		{
			let prevToken: codeToken | undefined = undefined;
			let counter = tokenCollection.length - 1;

			do {
				if (
					tokenCollection[counter].type !== codeTypes.LINE_BREAK &&
					tokenCollection[counter].type !== codeTypes.WHITESPACE
				) {
					prevToken = tokenCollection[counter];
					break;
				}
				counter--;
			} while (counter >= 0 /* || prevToken === undefined */);

			return prevToken
		}
		function dfs(node: codeBlock, parent?: codeBlock): codeToken[]
		{
			const result: codeToken[] = [];
			let signalMultiLine = false;
			const stringIndent = new RegExp(`[\\r\\n]+[${options.whitespaceChar}${options.indentChar}]{0,${node.indent}}`);
			//-----------------------------------------------------
			// /*
			if (node.start) {
				result.push(node.start);
				// whitespace after block start
				if (node.hasLineBreaks() || (node.canBeMultiline() && options.codeblock.newlineAllways)) {
					signalMultiLine = true;
					if (!node.startsWithNL()) {
						result.push(new codeToken(options.newLineChar, codeTypes.LINE_BREAK, node.start.pos));
					}
					result.push(new codeToken(options.indentChar.repeat(node.indent), codeTypes.WHITESPACE, node.start.pos));
				} else if (!node.isEmpty()) {
					result.push(new codeToken(options.whitespaceChar, codeTypes.WHITESPACE, node.start.pos));
				}
			}
			// */
			//-----------------------------------------------------
			// main loop to visit children
			for (let i = 0; i <= node.children.length - 1; i++) {
				//----------------------------
				const child = node.children[i];
				const next = i < node.children.length ? node.children[i + 1] : null;
				// const prev = i > 0 ? node.vals[i - 1] : null;
				//----------------------------
				if (child instanceof codeToken) {
					// result.push(child);					
					if (child.type === codeTypes.BLOCK_COMMENT) {
						child.val =
							child.val.split(stringIndent)
								.join(options.newLineChar + options.indentChar.repeat(node.indent));
						result.push(child);
					} else {
						result.push(child);
					}
					// add indentation
					if (child.type === codeTypes.LINE_BREAK && (i < node.children.length - 1)) {
						result.push(new codeToken(options.indentChar.repeat(node.indent ?? 0), codeTypes.WHITESPACE, child.pos ?? 0));
					}
					// if (next instanceof codeToken) { //... } else { // ... }
				} else {
					//----------------------------
					let lastResult = result[result.length - 1] ?? null;
					const hasLineBreaks = child.hasLineBreaks();
					//----------------------------
					const inner = dfs(child, node);
					//----------------------------
					// whitespace before block start
					// check prior token
					// /*
					if (lastResult) {
						switch (lastResult.type) {
							// case codeTypes.WHITESPACE:
							case codeTypes.SHARP:
							case codeTypes.LINE_BREAK:
								break;
							default:
								{
									if (child.hasLineBreaks() && options.codeblock.parensInNewLine) {
										const prevToken = getLastRealToken(result);
										if (prevToken && (prevToken.type !== codeTypes.LINE_COMMENT && prevToken.type !== codeTypes.BLOCK_COMMENT)) {
											result.push(
												new codeToken(options.newLineChar, codeTypes.LINE_BREAK, lastResult.pos)
											);
											result.push(
												new codeToken(options.indentChar.repeat(node.indent), codeTypes.WHITESPACE, lastResult.pos)
											);
										}
									}
									//FIXME: functioncall () -> Thats why Im handling the whitespace in the formatingTree instead of here
									/*
									else if (lastResult.type !== codeTypes.WHITESPACE) {
										result.push( new codeToken(options.whitespaceChar, codeTypes.WHITESPACE, lastResult.pos) );
									}
									*/
								}
								break;
						}
					}
					// */
					// block contents
					//----------------------------
					result.push(...inner);
					//----------------------------
					// /*
					// block end: look ahead
					lastResult = result[result.length - 1] ?? 0;
					if (next instanceof codeToken) {
						switch (next.type) {
							case codeTypes.LINE_BREAK:
							case codeTypes.COMMA:
							case codeTypes.DOT:
							case codeTypes.OPERATOR:
								break;
							default:
								{
									if (hasLineBreaks) {
										result.push(
											new codeToken(options.newLineChar, codeTypes.LINE_BREAK, lastResult.pos)
										);
										result.push(
											new codeToken(options.indentChar.repeat(node.indent), codeTypes.WHITESPACE, lastResult.pos)
										);
									} else {
										result.push(
											new codeToken(options.whitespaceChar, codeTypes.WHITESPACE, lastResult.pos)
										);
									}
								}
								break;
						}
					}
					// */
				}
				// -- end block add --
			}
			//-----------------------------------------------------
			// /*
			if (node.end) {
				// only for parens?
				//whitespace before block end
				if (signalMultiLine) {
					if (!node.endsWithNL()) {
						result.push(new codeToken(options.newLineChar, codeTypes.LINE_BREAK, node.end.pos));
					}
					result.push(new codeToken(options.indentChar.repeat(node.indent - 1), codeTypes.WHITESPACE, node.end.pos));
				} else if (!node.isEmpty()) {
					result.push(new codeToken(options.whitespaceChar, codeTypes.WHITESPACE, node.end.pos));
				}
				result.push(node.end);
			}
			//	*/
			//-----------------------------------------------------
			return result;
		}
		//---------------------------------------------------------
		return dfs(node);
	}

	private tokensToString(tokenStream: codeToken[], options: ICodeFormatSettings): string
	private tokensToString(tokenStream: codeToken[], options: ICodeFormatSettings, start: number, stop: number): string
	private tokensToString(tokenStream: codeToken[], options: ICodeFormatSettings = defaultFormatSettings, start?: number, stop?: number): string
	{
		if (start && stop && start < stop) {
			// rectify positions
			const startIndex = tokenStream.findIndex(item => item.pos >= start);
			const stopPos = tokenStream.slice().reverse().find(item => item.pos <= stop);
			const stopIndex = tokenStream.findIndex(item => item.pos === stopPos!.pos);


			tokenStream = tokenStream.slice(startIndex, stopIndex + 1);
			// /*
			// TODO: move this to the flatten function
			if (tokenStream[0].indent) {
				tokenStream.unshift(
					new codeToken(
						options.indentChar.repeat(tokenStream[0].indent),
						codeTypes.WHITESPACE,
						tokenStream[0].pos));
			}
			// */
		}
		return tokenStream.reduce((acc: string, curr: codeToken) => { return acc += curr.val; }, '');
	}

	// get tokens within range
	public formatRange(start: number, stop: number): IformatterResult
	{
		// format the entire doc
		const activeTokens = this.tokens.filter(token => token.type !== mxsLexer.WS);

		// produce the tree
		// const codeTree = this.formattingTree(this.tokens, this.options); // disable filtering
		const codeTree = this.formattingTree(activeTokens, this.options);
		
		// flatten the tree
		const codeTokens = this.flattenCodeTree(codeTree, this.options);
		
		// derive the code
		const code: string = this.tokensToString(codeTokens, this.options, start, stop);

		return { code, start, stop };
	}

	//FIXME: error when the file starts with a comment or a blank line, it doesn't work at all.
	public formatTokenRange(start?: number, stop?: number): IformatterResult
	{
		const activeTokens =
			this.tokenStream.getTokens(start, stop)
				.filter(token => token.type !== mxsLexer.WS); // comment to disable filtering

		// produce the tree
		const codeTree = this.formattingTree(activeTokens, this.options);

		// flatten the tree
		const codeTokens = this.flattenCodeTree(codeTree, this.options);

		// derive the code
		const code: string = this.tokensToString(codeTokens, this.options);

		// console.log(code);
		// console.log(JSON.stringify(code));
		// new offset
		const startPos = activeTokens[0].start;
		const stopPos = activeTokens[activeTokens.length - 1].stop;
		// const offset = startPos + (code.length - 1);
		return { code, start: startPos, stop: stopPos };
	}
}