import { CharStream, CommonTokenStream, Token, TokenStream } from "antlr4ng";
import { mxsLexer } from "../parser/mxsLexer.js";
import { IMaxScriptSettings } from "../settings.js";
// import { ILexicalRange } from "../types.js";

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
			parensInNewLine: false,
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
		for (let i = 0; i < this.tokens.length; i++) {
			const prevToken = i > 0 ? this.tokens[i - 1] : null;
			const currToken = this.tokens[i];
			const nextToken = i < this.tokens.length ? this.tokens[i + 1] : null;
			// console.log(currToken.type);
			switch (currToken.type) {
				case mxsLexer.EOF:
					// return here
					return root;
				//---------------------------------------------------------
				case mxsLexer.LBRACE:
				case mxsLexer.LPAREN:
					{
						//indentation?
						indentation++;
						// const node = new blockNode(currToken.text!, indentation);
						const node = new blockNode(undefined, indentation);
						node.start = currToken.text!;
						cStack().vals.push(node);
						stack.push(node);
					}
					break;
				case mxsLexer.RBRACE:
				case mxsLexer.RPAREN:
					{
						//indentation?
						indentation--;
						cStack().end = currToken.text!;
						// cStack().vals.push(currToken.text!);
						stack.pop();
					}
					break;
				//---------------------------------------------------------
				// tokens that increase indentation, when sigle expression is next
				// case mxsLexer.OF:
				// case mxsLexer.RETURN:
				// case mxsLexer.WITH:				
				case mxsLexer.THEN:
				case mxsLexer.DO:
				case mxsLexer.COLLECT:
					{
						cStack().vals.push(currToken.text!);
						// /*
						if (afterKeyword) {
							// if (nextToken && nextToken.type !== mxsLexer.NL) {
							cStack().vals.push(opt.newLineChar);
							// }

							cStack().vals.push(opt.indentChar);

						} else {
							cStack().vals.push(opt.whitespaceChar);
						}
						// */
						// cStack().vals.push(opt.whitespaceChar);
					}
					break;
				// case mxsLexer.THEN:
				case mxsLexer.ELSE:
					{
						// /*
						if (afterKeyword) {
							/*
							let emmitNL = true;
							if (prevToken && nextToken) {
								switch (prevToken.type) {
									case mxsLexer.NL:
										emmitNL = false;
										break;
								}

								switch (nextToken.type) {
									case mxsLexer.NL:
										emmitNL = false;
										break;
								}
							}
							if (emmitNL) { cStack().vals.push(opt.newLineChar); }
							cStack().vals.push(currToken.text!);
							if (emmitNL) { cStack().vals.push(opt.newLineChar); }
							*/
							// cStack().vals.push(opt.newLineChar, opt.indentChar);
							cStack().vals.push(opt.newLineChar);
							cStack().vals.push(currToken.text!);
							cStack().vals.push(opt.newLineChar);
							cStack().vals.push(opt.indentChar);
						} else {
							cStack().vals.push(currToken.text!);
							cStack().vals.push(opt.whitespaceChar);
						}
						// */
						// cStack().vals.push(currToken.text!);
						// cStack().vals.push(opt.whitespaceChar);
					}
					break;
				// case mxsLexer.ON:
				//---------------------------------------------------------				
				case mxsLexer.WS:
					{
						// line continuation handling
						if (currToken.text && currToken.text.length > 1 && currToken.text.includes(opt.lineContinuationChar)) {
							cStack().vals.push(opt.lineContinuationChar, opt.newLineChar);
						}
					}
					break;
				case mxsLexer.NL:
					{
						//TODO: FIX FOR THEN ELSE...
						if (currToken.text && currToken.text.includes(';')) {
							cStack().vals.push(opt.lineEndChar, opt.whitespaceChar);
						} else {
							// /*
							if (nextToken && prevToken) {
								let emmit = true;
								switch (prevToken.type) {
									case mxsLexer.NL:
									case mxsLexer.LBRACE:
									case mxsLexer.LPAREN:
										// case mxsLexer.RBRACE:
										// case mxsLexer.RPAREN:
										emmit = false;
										break;
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
									case mxsLexer.NL:
									case mxsLexer.LBRACE:
									case mxsLexer.LPAREN:
									case mxsLexer.RBRACE:
									case mxsLexer.RPAREN:
										emmit = false;
										break;
									case mxsLexer.ELSE:
									case mxsLexer.THEN:
									case mxsLexer.DO:
									case mxsLexer.COLLECT:
										if (afterKeyword) {
											emmit = false;
										}
										break;
								}
								if (emmit) {
									cStack().vals.push(opt.newLineChar);
								}
							}
							// */
						}
					}
					break;
				//---------------------------------------------------------
				case mxsLexer.DOT:
				case mxsLexer.DOTDOT:
				case mxsLexer.SHARP:
				case mxsLexer.GLOB:
				case mxsLexer.LBRACK:
				case mxsLexer.AMP:
				case mxsLexer.SHARP:
					{
						cStack().vals.push(currToken.text!);
					}
					break;
				//---------------------------------------------------------
				case mxsLexer.EQ:
					{
						cStack().vals.push(currToken.text!);
						// here we sould add NL in functions...
						cStack().vals.push(opt.whitespaceChar);
					}
					break;
				//---------------------------------------------------------
				case mxsLexer.UNARY_MINUS:
					{
						cStack().vals.push(currToken.text!);
					}
					break;
				case mxsLexer.COMMA:
					{
						cStack().vals.push(currToken.text!);
						cStack().vals.push(afterCommaChar);
					}
					break;
				//---------------------------------------------------------
				default:
					{
						//TODO: mandatory whitespace
						cStack().vals.push(currToken.text!);
						// /*
						switch (nextToken?.type) {
							case mxsLexer.COLON:
								{
									if (currToken.type === mxsLexer.NUMBER) {
										cStack().vals.push(opt.whitespaceChar);
									}
								}
								break;
							case mxsLexer.RBRACE:
							case mxsLexer.LBRACK:
							case mxsLexer.RBRACK:
							case mxsLexer.DOT:
							case mxsLexer.DOTDOT:
							case mxsLexer.COMMA:
							case mxsLexer.NL:
							case mxsLexer.LPAREN:
							case mxsLexer.RPAREN:
								break;
							default:
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
					// add linebreaks or whitespace?
					if (inner.length > 2) {

						const linebreak = val.hasLineBreaks();
						const nextToken = node.vals[i + 1];

						if (
							!result.endsWith('#') &&
							result.length > 0 &&
							!(result.endsWith(opt.newLineChar) || result.endsWith(opt.lineEndChar))
						) {
							if (linebreak && opt.codeblock.parensInNewLine) {
								result += opt.newLineChar;
								result += opt.indentChar.repeat(node.indent);
							} else if (!result.endsWith(opt.whitespaceChar)) {
								result += opt.whitespaceChar;
							}
						}

						result += inner;
						// line break after, this is after adding the parens
						if (
							typeof nextToken === 'string' &&
							nextToken.length > 0 &&
							!(nextToken.endsWith(opt.newLineChar) || nextToken.endsWith(opt.lineEndChar))
						) {
							if (linebreak) {
								result += opt.newLineChar;
								result += opt.indentChar.repeat(node.indent);
							} else if (!result.endsWith(opt.whitespaceChar)) {
								result += opt.whitespaceChar;
							}
						}
					} else {
						// empty parens
						result += inner;
					}
					//...
				}
			}
			// console.log(JSON.stringify(result));
			// console.log('-----------------------------------');
			// console.log(result.endsWith(opt.newLineChar) || result.endsWith(opt.lineEndChar));
			// wrap the block
			// /*
			const nodeLineBreaks = node.hasLineBreaks();
			if (node.start.length > 0) {
				let preStart = '', posStart = '';
				if (
					nodeLineBreaks ||
					(node.vals.length > 0 && opt.codeblock.newlineAllways)
				) {
					// const indentrep = parent ? parent.indent : (node.indent !== 0 ? node.indent - 1 : 0);
					// const preindent = opt.indentChar.repeat(indentrep);
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
					// end
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
		if (start && stop) {
			//limit the tokens to the range
			this.tokens = this.tokenStream.getTokens(start, stop);
		}

		//filter WS tokens...
		this.tokens = this.tokens.filter(token => token.type !== mxsLexer.WS);

		const startPos = this.tokens[0].start;
		const stopPos = this.tokens[this.tokens.length - 1].stop;

		// console.log(`${_start.start} - ${_stop.stop}`);

		// produce the tree
		const codeTree = this.formattingTree();
		// derive the code
		const code = this.codeFromTree(codeTree);
		// new offset
		const offset = startPos + (code.length - 1);

		//return
		// console.log(code);
		// console.log(JSON.stringify(code));
		// start token position
		// stop token position
		// offsets
		return { code, start: startPos, stop: stopPos, offset };
	}

}