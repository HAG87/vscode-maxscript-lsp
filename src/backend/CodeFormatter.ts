import { CharStream, CommonTokenStream, Token } from "antlr4ng";
import { mxsLexer } from "../parser/mxsLexer.js";
import { IMaxScriptSettings } from "../settings.js";

export interface IformatterResult
{
	code: string;
	start: number;
	stop: number;
	offset: number;
}

const defaultFormatSettings: Partial<IMaxScriptSettings> =
{
	formatter: {
		indentChar: '\t',
		newLineChar: '\r\n',
		lineEndChar: ';',
		lineContinuationChar: '\\',
		whitespaceChar: ' ',

		keepComments: true,
		keepEmptyLines: true,
		indentOnly: false,

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
}

class blockNode
{
	vals: (string | blockNode)[];
	indent: number;
	start: string = '';
	end: string = '';

	constructor(val?: string, indent?: number)
	{
		this.vals = val ? [val] : [];
		this.indent = indent ?? 0;
	}
	get first(): string | blockNode
	{
		return this.vals[0];
	}
	get last(): string | blockNode
	{
		return this.vals[this.vals.length - 1];
	}
	public hasLineBreaks(): boolean
	{
		let res = false;
		for (let val of this.vals) {
			if (val instanceof blockNode) {
				if (!res) {
					res = val.hasLineBreaks();
				}
			} else if (val === '\r\n') {
				res = true;
			}
		}
		return res;
	}

	public startsWithNL(): boolean
	{
		return (typeof this.first === 'string' && this.first?.search(/[\r\n;]+[ \t]*/) >= 0);
	}
	public endsWithNL(): boolean
	{
		// const last = this.vals[this.vals.length - 1];
		return (typeof this.last === 'string' && this.last?.search(/[\r\n;]+[ \t]*/) >= 0);
	}
	public isEmpty(): boolean
	{
		return this.vals.length === 0;
	}
	public canBeMultiline(): boolean
	{
		return this.vals.length > 1;
	}

}

/**
 * Fallback class to provide simple formatting options when the parser is not available
 * format entire document
 * format range
 */
export class mxsSimpleFormatter
{
	options: Partial<IMaxScriptSettings>;

	private tokenStream: CommonTokenStream;
	private tokens: Token[];
	// outputPipeline: (string | string[])[] = [];
	//TODO: add options!
	public constructor(grammarOrTokens: string | CommonTokenStream, options?: Partial<IMaxScriptSettings>)
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

	private formattingTree(tokens: Token[]): blockNode
	{
		// options
		const opt = this.options.formatter!;
		// list: { useLineBreaks: true }
		const afterCommaChar = opt.list.useLineBreaks ? opt.newLineChar : opt.whitespaceChar;
		// statements: { useLineBreaks: true, }
		const afterKeyword = opt.statements.useLineBreaks;
		//---------------------------------------------------------
		let root: blockNode = new blockNode();
		const stack: blockNode[] = [root];
		const cStack = () => stack[stack.length - 1];
		let indentation = 0;
		//---------------------------------------------------------
		// for (let i = start; i <= stop; i++) {
		// for (const [i, currToken] of this.tokens.entries()) {
		for (let i = 0; i < tokens.length; i++) {
			const currToken = tokens[i];
			const prevToken = tokens[i - 1];
			const nextToken = tokens[i + 1];

			if (currToken.type === mxsLexer.EOF) {
				return root;
			}

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
							cStack().end = currToken.text!;
							stack.pop();
						}
						break;
					default:
						cStack().vals.push(currToken.text!);
						break;
				}
				return root;
			}

			//---------------------------------------------------------
			switch (currToken.type) {
				case mxsLexer.LINE_COMMENT:
					cStack().vals.push(currToken.text!);
					cStack().vals.push(opt.newLineChar);
					break;
				// /*
				case mxsLexer.BLOCK_COMMENT:
					if (nextToken.type === mxsLexer.NL) {
						cStack().vals.push(opt.newLineChar);
					}
					break;
				// */
				case mxsLexer.LBRACE:
				case mxsLexer.LPAREN:
					{
						//indentation
						indentation++;
						// const node = new blockNode(currToken.text!, indentation);
						const node = new blockNode(undefined, indentation);
						node.start = currToken.text!;
						cStack().vals.push(node);
						//-------------------------
						stack.push(node);
						//-------------------------
						// new line after
						if (nextToken.type === mxsLexer.NL) {
							cStack().vals.push(opt.newLineChar);
						}
					}
					break;
				case mxsLexer.RBRACE:
				case mxsLexer.RPAREN:
					{
						//indentation
						indentation--;
						// cStack().vals.push(currToken.text!);
						cStack().end = currToken.text!;
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
									cStack().vals.push(opt.newLineChar);
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
						cStack().vals.push(currToken.text!);
						if (nextToken.type !== mxsLexer.LPAREN) {
							if (afterKeyword) {
								cStack().vals.push(opt.newLineChar);
								cStack().vals.push(opt.indentChar);
							} else {
								cStack().vals.push(opt.whitespaceChar);
							}
						}
					}
					break;
				//---------------------------------------------------------				
				case mxsLexer.WS:
					{
						// line continuation handling
						if (currToken.text && currToken.text.includes(opt.lineContinuationChar)) {
							cStack().vals.push(opt.lineContinuationChar, opt.newLineChar);
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
				case mxsLexer.SHARP:
				case mxsLexer.UNARY_MINUS:
					cStack().vals.push(currToken.text!);
					break;
				case mxsLexer.PROD:
					{
						cStack().vals.push(currToken.text!);
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
									cStack().vals.push(opt.whitespaceChar);
									break;
							}
						}
					}
					break;
				//---------------------------------------------------------
				case mxsLexer.ON:
				case mxsLexer.EQ:
					{
						cStack().vals.push(currToken.text!);

						if (nextToken.type === mxsLexer.NL) {
							const next = this.nextRealToken(tokens, i + 2);
							if (next?.type !== mxsLexer.LPAREN) {
								cStack().vals.push(opt.newLineChar);
							}
						} else {
							cStack().vals.push(opt.whitespaceChar);
						}
					}
					break;
				case mxsLexer.COMMA:
					{
						cStack().vals.push(currToken.text!);
						cStack().vals.push(
							nextToken.type === mxsLexer.NL
								? opt.newLineChar
								: afterCommaChar
						);
					}
					break;
				//---------------------------------------------------------
				default:
					{
						cStack().vals.push(currToken.text!);

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
										cStack().vals.push(opt.whitespaceChar);
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
											cStack().vals.push(opt.newLineChar);
											break;
									}
									// */
								}
								break;
							case mxsLexer.ELSE:
							case mxsLexer.WHERE:
							case mxsLexer.WHILE:
								cStack().vals.push(afterKeyword ? opt.newLineChar : opt.whitespaceChar);
								break;
							default:
								// mandatory whitespace
								cStack().vals.push(opt.whitespaceChar);
								break;
						}
					}
					break;
			}
		}
		return root;
	}

	private codeFromTree(root: blockNode): string
	{
		// options
		const opt = this.options.formatter!;
		/*
		codeblock: {
			parensInNewLine: true,
			newlineAllways: true,
			spaced: true,
		}
		*/
		//---------------------------------------------------------
		function dfs(node: blockNode, parent?: blockNode)
		{
			let result = '';
			// main loop to visit children
			for (let i = 0; i < node.vals.length; i++) {
				const val = node.vals[i];

				if (typeof val === 'string') {

					result += val;
					// TODO: indent
					// if (val === opt.newLineChar) {
					if (val === opt.newLineChar && typeof node.vals[i + 1] === 'string') {
						result += opt.indentChar.repeat(node.indent);
					}
				} else {
					const inner = dfs(<blockNode>val, node);

					let before = ''; let after = '';
					let innerBefore = ''; let innerAfter = '';
					// add linebreaks or whitespace?
					const linebreak = val.hasLineBreaks();
					const nextToken = node.vals[i + 1];

					if (inner.length > 0) {

						if (
							!result.endsWith('#') &&
							!(result.endsWith(opt.newLineChar) || result.endsWith(opt.lineEndChar))
						) {

							if (linebreak && opt.codeblock.parensInNewLine) {
								before += opt.newLineChar;
								//TODO: PROBLEM AT THE START OF STRUCT WITH INDENT!!!
								before += opt.indentChar.repeat(node.indent);
							} else if (!result.endsWith(opt.whitespaceChar)) {
								before = opt.whitespaceChar;
							}
						}

						if (
							typeof nextToken === 'string' &&
							!(nextToken.endsWith(opt.newLineChar) || nextToken.endsWith(opt.lineEndChar))
						) {
							if (linebreak) {
								after = opt.newLineChar;
								after += opt.indentChar.repeat(node.indent);
							}
							after = opt.whitespaceChar;
						}

						if (val.start.length > 0 && val.end.length > 0) {
							if (linebreak || opt.codeblock.newlineAllways) {
								if (!inner.startsWith(opt.newLineChar) || !inner.startsWith(opt.newLineChar + opt.indentChar)) {
									innerBefore = opt.newLineChar
								}
								innerBefore += opt.indentChar.repeat(val.indent);

								// console.log(JSON.stringify(inner));

								if (!inner.endsWith(opt.newLineChar) || !inner.endsWith(opt.newLineChar + opt.indentChar)) {
									innerAfter = opt.newLineChar;
								}
								innerAfter += opt.indentChar.repeat(node.indent);

							} else if (opt.codeblock.spaced) {
								innerBefore = opt.whitespaceChar;
								innerAfter = opt.whitespaceChar;
							}
						}
					}
					result += `${before}${val.start}${innerBefore}${inner}${innerAfter}${val.end}${after}`;
				}
			}
			return result;
		}
		//---------------------------------------------------------
		return dfs(root);
	}

	// get tokens within range
	public formatRange(start?: number, stop?: number): IformatterResult
	{
		// /*
		// const startIndex = start ? this.tokenFromIndex(start, false) : 0;
		// const stopIndex = stop ? this.tokenFromIndex(stop, false) : this.tokens.length - 1;
		let activeTokens = this.tokenStream.getTokens(start, stop);
		activeTokens = activeTokens.filter(token => token.type !== mxsLexer.WS);

		// TODO: start values, indent, whitespace, NL, etc for the first token

		// produce the tree
		const codeTree = this.formattingTree(activeTokens);
		// derive the code
		// const code = codeTree.parse(this.options);
		const code = this.codeFromTree(codeTree);
		// new offset
		const startPos = activeTokens[0].start;
		const stopPos = activeTokens[activeTokens.length - 1].stop;
		// */

		/*
		if (start && stop) {
			//limit the tokens to the range
			this.tokens = this.tokenStream.getTokens(start, stop);
		}
		//filter WS tokens...
		this.tokens = this.tokens.filter(token => token.type !== mxsLexer.WS);		
		// produce the tree		
		const codeTree = this.formattingTree(this.tokens);
		// derive the code
		// const code = this.codeFromTree(codeTree);
		const code = codeTree.parse(this.options);		
		// new offset
		const startPos = this.tokens[0].start;
		const stopPos = this.tokens[this.tokens.length - 1].stop;
		*/
		const offset = startPos + (code.length - 1);

		//return
		return { code, start: startPos, stop: stopPos, offset };
	}

}