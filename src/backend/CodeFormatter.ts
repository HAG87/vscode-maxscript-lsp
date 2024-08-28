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
};


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

	/*
	private isEmptyBlock(index: number): boolean
	{
		for (let i = index + 1; i < this.tokens.length; i++) {
			switch (this.tokens[i].type) {
				case mxsLexer.WS:
					break;
				case mxsLexer.RPAREN:
					return true;
				default:
					return false;
			}
		}
		return false;
	}

	private isSingleLineBlock(index: number): boolean
	{
		for (let i = index; i < this.tokens.length; i++) {
			switch (this.tokens[i].type) {
				case mxsLexer.NL:
					return false;
				case mxsLexer.RPAREN:
					return true;
				default:
					break;
			}
		}
		return false;
	}
	*/

	private nextRealToken(index: number, stop?: number): Token | undefined
	{
		const limit = stop ?? this.tokens.length;
		for (let i = index; i < limit; i++) {
			const currToken = this.tokens[i];
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

	private formattingTree(): blockNode
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
		for (let i = 0; i < this.tokens.length; i++) {
			const currToken = this.tokens[i];
			const prevToken = i > 0 ? this.tokens[i - 1] : null;
			const nextToken = i < this.tokens.length ? this.tokens[i + 1] : null;

			if (currToken.type === mxsLexer.EOF) {
				return root;
			}

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

			switch (currToken.type) {
				//---------------------------------------------------------
				case mxsLexer.LBRACE:
				case mxsLexer.LPAREN:
					{
						//indentation
						indentation++;
						// const node = new blockNode(currToken.text!, indentation);
						const node = new blockNode(undefined, indentation);
						node.start = currToken.text!;
						cStack().vals.push(node);
						stack.push(node);

						switch (nextToken.type) {
							case mxsLexer.NL:
								// case mxsLexer.RBRACE:										
								// 	break;
								// default:
								cStack().vals.push(opt.newLineChar);
								break;
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

						/*
						let nextRealToken = null;
						for (let f = i; f < this.tokens.length; f++) {
							if (this.tokens[f].type !== mxsLexer.NL) {
								nextRealToken = this.tokens[f];
								break; 
							}
						}
						// */
						// /*
						//TODO: ERROR ) \n )
						stack.pop();
						switch (nextToken.type) {
							case mxsLexer.NL:
								const next = this.nextRealToken(i + 2);
								switch (next?.type) {
									case mxsLexer.RPAREN:
									case mxsLexer.RBRACE:
										break;
									default:
										cStack().vals.push(opt.newLineChar);
										break;
								}
								// if (next?.type !== mxsLexer.RPAREN)
								// cStack().vals.push(opt.newLineChar);
								// cStack().vals.push(opt.indentChar);
								break;
						}
						// */
						
					}
					break;
				//---------------------------------------------------------
				// tokens that increase indentation, when sigle expression is next
				// case mxsLexer.OF:
				/*
				case mxsLexer.ON:
				{
					cStack().vals.push(currToken.text!);
					switch (nextToken.type) {
						case mxsLexer.ID:
						case mxsLexer.NUMBER:
						case mxsLexer.NAME:
						case mxsLexer.TIME:
						case mxsLexer.PATH:
							{
								cStack().vals.push(opt.whitespaceChar);
							}
							break;
						case mxsLexer.LPAREN:	
						{
							if (afterKeyword) {
								cStack().vals.push(opt.newLineChar);
								cStack().vals.push(opt.indentChar);
							} else {
								cStack().vals.push(opt.whitespaceChar);
							}
						}
						break;

					}					
				}
				break;
				*/
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
					/*
					{
						//TODO: FIX FOR THEN ELSE...
						if (currToken.text && currToken.text.includes(';')) {
							cStack().vals.push(opt.lineEndChar, opt.whitespaceChar);
						} else {
							let emmit = true;
							// /
							switch (prevToken.type) {
								// case mxsLexer.NL:
								// case mxsLexer.LBRACE:
								// case mxsLexer.LPAREN:
									// case mxsLexer.RBRACE:
									// case mxsLexer.RPAREN:
									// emmit = false;
									// break;
								case mxsLexer.ELSE:
								case mxsLexer.THEN:
								case mxsLexer.DO:
								case mxsLexer.COLLECT:
									if (afterKeyword) {
										emmit = false;
									}
									break;
							}
							switch (nextToken.type) {
								// case mxsLexer.NL:
								// case mxsLexer.LBRACE:
								// case mxsLexer.LPAREN:
								// case mxsLexer.RBRACE:
								// case mxsLexer.RPAREN:
									// emmit = false;
									// break;
								case mxsLexer.ELSE:
								case mxsLexer.THEN:
								case mxsLexer.DO:
								case mxsLexer.COLLECT:
									if (afterKeyword) {
										emmit = false;
									}
									break;
							}
							// /
							if (emmit) {
								cStack().vals.push(opt.newLineChar);
							}
						}
					}
					*/
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
						// here we sould add NL in functions...
						// console.log(nextToken.type === mxsLexer.NL);

						if (nextToken.type === mxsLexer.NL) {
							const next = this.nextRealToken(i + 1);
							// console.log(next?.text!);
							if (next && next.type !== mxsLexer.LPAREN) {
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
						// /*
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
									const next = this.nextRealToken(i + 2);
									// look further up
									if (next?.type !== mxsLexer.RPAREN && next?.type !== mxsLexer.RBRACE) {
										cStack().vals.push(opt.newLineChar); // cStack().vals.push(opt.indentChar);
									}
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
						// */
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
					// indent
					if (val === opt.newLineChar) {
						result += opt.indentChar.repeat(node.indent);
					}
				} else {
					const inner = dfs(<blockNode>val, node);

					let before = ''; let after = '';

					// add linebreaks or whitespace?
					const linebreak = val.hasLineBreaks();
					const nextToken = node.vals[i + 1];

					if (inner.length > 2) {
						if (
							!result.endsWith('#') &&
							result.length > 0 &&
							!(result.endsWith(opt.newLineChar) || result.endsWith(opt.lineEndChar))
						) {
							if (linebreak && opt.codeblock.parensInNewLine) {
								before = opt.newLineChar;
								before += opt.indentChar.repeat(node.indent);
							} else if (!result.endsWith(opt.whitespaceChar)) {
								before = opt.whitespaceChar;
							}
						}
						// /*
						if (
							typeof nextToken === 'string' &&
							nextToken.length > 0 &&
							!(nextToken.endsWith(opt.newLineChar) || nextToken.endsWith(opt.lineEndChar))
						) {
							// console.log(JSON.stringify(nextToken));
							if (linebreak) {
								after = opt.newLineChar;
								after += opt.indentChar.repeat(node.indent);
							}// else if (!result.endsWith(opt.whitespaceChar)) {
							after = opt.whitespaceChar;
							//}
						}
						// */
						// after = opt.newLineChar;
						// after += opt.indentChar.repeat(node.indent);
					}

					let innerBefore = ''; let innerAfter = '';

					if (inner.length > 0 && val.start.length > 0 && val.end.length > 0) {
						if (linebreak || opt.codeblock.newlineAllways) {
							if (!inner.startsWith(opt.newLineChar)) {
								innerBefore = opt.newLineChar
							}
							innerBefore += opt.indentChar.repeat(val.indent);
							// const indentrep = parent ? parent.indent : (node.indent !== 0 ? node.indent - 1 : 0);
							// const preindent = opt.indentChar.repeat(indentrep);

							if (!inner.endsWith(opt.newLineChar)) {
								// console.log(JSON.stringify(inner, undefined));
								innerAfter = opt.newLineChar;
								// innerAfter += 'pipi';
							}
							innerAfter += opt.indentChar.repeat(node.indent);

						} else if (opt.codeblock.spaced) {
							innerBefore = opt.whitespaceChar;
							innerAfter = opt.whitespaceChar;
						}
					}
					// result += before; result += val.start; result += innerBefore; result += inner; result += innerAfter; result += val.end; result += after;
					result += `${before}${val.start}${innerBefore}${inner}${innerAfter}${val.end}${after}`;
					// result += `${before}${val.start}${innerBefore}${inner}${val.end}${after}`;
				}
			}
			/*
			const nodeLineBreaks = node.hasLineBreaks();
			if (node.start.length > 0) {
				let preStart = '', posStart = '';
				if (
					node.vals.length > 0 ||
					( nodeLineBreaks || opt.codeblock.newlineAllways)
				) {
					posStart = opt.newLineChar + opt.indentChar.repeat(node.indent);
				} else if (node.vals.length > 0 && opt.codeblock.spaced) {
					posStart = opt.whitespaceChar;
				}
				result = `${node.start}${posStart}${result}`;
			}
			if (node.end.length > 0) {
				let preEnd = '', posEnd = '';
				if (
					nodeLineBreaks ||
					(node.vals.length > 0 && opt.codeblock.newlineAllways)
				) {
					const indentrep = parent ? parent.indent : (node.indent !== 0 ? node.indent - 1 : 0);
					const preindent = opt.indentChar.repeat(indentrep);
					preEnd = opt.newLineChar + preindent;
				} else if (node.vals.length > 0 && opt.codeblock.spaced) {
					preEnd = opt.whitespaceChar;
				}
				result = `${result}${preEnd}${node.end}`;
			}
			//*/
			return result;
		}
		//---------------------------------------------------------
		return dfs(root);
	}

	// get tokens within range
	public formatRange(start?: number, stop?: number): IformatterResult
	{
		/*
		const startIndex = start ? this.tokenFromIndex(start, false) : 0;
		const stopIndex = stop ? this.tokenFromIndex(stop, false) : this.tokens.length - 1;
		let activeTokens = this.tokenStream.getTokens(start, stop);
		activeTokens = activeTokens.filter(token => token.type !== mxsLexer.WS);
		const startPos = activeTokens[0].start;
		const stopPos = activeTokens[activeTokens.length - 1].stop;

		const codeTree = this.formattingTree(activeTokens);

		//...
		*/
		if (start && stop) {
			//limit the tokens to the range
			this.tokens = this.tokenStream.getTokens(start, stop);
		}

		//filter WS tokens...
		this.tokens = this.tokens.filter(token => token.type !== mxsLexer.WS);

		// produce the tree
		const codeTree = this.formattingTree();
		// derive the code
		const code = this.codeFromTree(codeTree);

		// new offset
		const startPos = this.tokens[0].start;
		const stopPos = this.tokens[this.tokens.length - 1].stop;
		const offset = startPos + (code.length - 1);

		//return
		return { code, start: startPos, stop: stopPos, offset };
	}

}