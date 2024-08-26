import { CharStream, CommonTokenStream, Token } from "antlr4ng";
import { mxsLexer } from "../parser/mxsLexer.js";
import { IMaxScriptSettings } from "../settings.js";
// import { ILexicalRange } from "../types.js";

/*
enum filterCurrenEnum
{
	assign,
	newline,
	delimiter,
	lbracket,
	emptyparens,
	emptybraces,
	bitrange,
	unaryminus
};
enum filterAheadEnum
{
	assign,
	newline,
	delimiter,
	sep,
	ws,
	lbracket,
	rbracket,
	emptyparens,
	emptybraces,
	bitrange,
	unaryminus
};


const indentTokens: Set<number> = new Set([
	mxsLexer.LPAREN,
	mxsLexer.LBRACK,
	mxsLexer.LBRACE,
]);

const unIndentTokens: Set<number> = new Set([
	mxsLexer.RPAREN,
	mxsLexer.RBRACK,
	mxsLexer.RBRACE,
]);
*/


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
		keepComments: true,
		keepEmptyLines: true,
		indentOnly: false,
		indentChar: '\t',
		whitespaceChar: ' ',
		codeblock: {
			newlineAtParens: true,
			newlineAllways: true,
			spaced: true,
		},
		statements: {
			useLineBreaks: true,
			optionalWhitespace: false
		},
		list: {
			useLineBreaks: true
		}
	}
};

/**
 * Fallback class to provide simple formatting options when the parser is not available
 */
export class mxsSimpleFormatter
{
	// use moo as basic tokenizer to format code or..
	// use the regex method.
	// use antlr tokenizer
	private tokens: Token[];

	indentation: number = 0;

	//TODO: add options!

	public constructor(grammarOrTokens: string | Token[])
	{
		if (typeof grammarOrTokens === "string") {
			const lexer = new mxsLexer(CharStream.fromString(grammarOrTokens));
			lexer.removeErrorListeners();
			const tokenStream = new CommonTokenStream(lexer);
			tokenStream.fill();
			this.tokens = tokenStream.getTokens();
		} else {
			this.tokens = grammarOrTokens;
		}
	}

	// format entire document
	// format range

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

	outputPipeline: (string | string[])[] = [];

	// get tokens within range
	public formatRange(start?: number, stop?: number)
	{
		//---------------------------------------------------------
		//filter WS tokens...
		this.tokens = this.tokens.filter(token => token.type !== mxsLexer.WS);
		//---------------------------------------------------------
		// line continuations???

		// const indentationChars = '\t';
		const indentationChars = '    ';
		const newLineChars = '\r\n';
		const lineEndChars = ';';
		const wsChar = ' ';
		const lineContinuationChar = '\\';

		let indentation = 0;

		let root: blockNode = new blockNode();

		const stack: blockNode[] = [root];

		const cStack = () => stack[stack.length - 1];

		for (let i = 0; i < this.tokens.length; i++) {
			const prevToken = i > 0 ? this.tokens[i - 1] : null;
			const currToken = this.tokens[i];
			const nextToken = i < this.tokens.length ? this.tokens[i + 1] : null;

			// console.log(currToken.type);
			switch (currToken.type) {
				// /*
				/*
				case mxsLexer.LBRACE:
					indentation++;
				case mxsLexer.RBRACE:
					indentation--;
				*/
				case mxsLexer.LBRACE:
				case mxsLexer.LPAREN:
					{
						//indentation?
						indentation++;
						const node = new blockNode(currToken.text!, indentation);
						node.start = currToken.text!;
						/*
						if (nextToken!.type !== mxsLexer.RPAREN) {
							node.vals.push(wsChar);
						}
						*/
						cStack().vals.push(node);
						stack.push(node);

						// node.val += currToken.text!;
						// cStack().vals.push(currToken.text!);
					}
					break;
				case mxsLexer.RBRACE:
				case mxsLexer.RPAREN:
					{
						//indentation?
						indentation--;

						cStack().end = currToken.text!;

						cStack().vals.push(currToken.text!);
						/*
						if (nextToken!.type !== mxsLexer.RPAREN) {
							cStack().vals.push(wsChar);
						}
							*/
						stack.pop();
					}
					break;
				// */
				//---------------------------------------------------------
				// tokens that increase indentation, when sigle expression is next
				case mxsLexer.THEN:
				case mxsLexer.DO:
				case mxsLexer.COLLECT:
					// case mxsLexer.RETURN:
					// case mxsLexer.WITH:				
					{
						cStack().vals.push(currToken.text!);
						cStack().vals.push(newLineChars);
						// later on, if the next exp is a block, closing the block decreases indentation, but if it is a single expression, newline decreases indentation.
						// indentation++;
						cStack().vals.push(indentationChars);
					}
					break;
				// case mxsLexer.THEN:
				case mxsLexer.ELSE:
					{
						cStack().vals.push(newLineChars);
						cStack().vals.push(currToken.text!);
						// later on, if the next exp is a block, closing the block decreases indentation, but if it is a single expression, newline decreases indentation.
						// indentation++;
						cStack().vals.push(newLineChars);
						cStack().vals.push(indentationChars);
					}
					break;
				// case mxsLexer.ON:
				//---------------------------------------------------------
				case mxsLexer.EOF:
					// return here
					return;
				case mxsLexer.WS:
					{
						// line continuation handling
						if (currToken.text && currToken.text.length > 1 && currToken.text.includes(lineContinuationChar)) {
							cStack().vals.push(lineContinuationChar, newLineChars);
						}
					}
					break;
				case mxsLexer.NL:
					{
						if (currToken.text && currToken.text.includes(';')) {
							cStack().vals.push(lineEndChars);
							cStack().vals.push(wsChar);
						} else {
							let emmitNL = true;
							if (prevToken && nextToken) {
								switch (prevToken.type) {
									case mxsLexer.LPAREN:
									// case mxsLexer.RPAREN:
									case mxsLexer.LBRACE:
										emmitNL = false;
										break;
								}

								switch (nextToken.type) {
									case mxsLexer.LPAREN:
									case mxsLexer.RPAREN:
									case mxsLexer.RBRACE:
										emmitNL = false;
										break;
								}
							}
							if (emmitNL) {
								cStack().vals.push(newLineChars);
							}
						}
						// should decrease indentation?
						// TODO: do not add NL when is handled elsewhere : PARENS
						/*
						if (prevToken && nextToken) {
							if (

								!(
									(prevToken.type === mxsLexer.LPAREN || prevToken.type === mxsLexer.RPAREN) &&
									(nextToken.type === mxsLexer.RPAREN || nextToken.type === mxsLexer.LPAREN)
								)
							) {
								if (prevToken.type !== mxsLexer.LPAREN && nextToken.type !== mxsLexer.RPAREN) {
									cStack().vals.push(newLineChars);
								}
							}
						} else {
							// cStack().vals.push(newLineChars);
						}
						*/
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
						cStack().vals.push(wsChar);
					}
					break;
				//---------------------------------------------------------
				case mxsLexer.UNARY_MINUS:
					{
						cStack().vals.push(currToken.text!);
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
										cStack().vals.push(wsChar);
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
								break;
							case mxsLexer.LPAREN:
								{
									// not at empty parens
									if (!(currToken.type === mxsLexer.ID && this.isEmptyBlock(i + 1))) {
										cStack().vals.push(wsChar);
									}
								}
								break;
							case mxsLexer.RPAREN:
								{

								}
								break;
							default:
								cStack().vals.push(wsChar);
								break;
						}
						// */
					}
					break;

			}
		}

		function process(root: blockNode)
		{
			function dfs(node: blockNode, parent?: blockNode)
			{
				let result = '';

				for (let i = 0; i < node.vals.length; i++) {

					let val = node.vals[i];

					if (typeof val === 'string') {
						switch (val) {
							case '(':
								{
									if (node.hasLineBreaks()) {

										result += newLineChars;
										result += indentationChars.repeat(parent!.indent ?? 0);

										result += val;
										result += newLineChars;
										result += indentationChars.repeat(node.indent);
									} else {
										result += val;
										// result += wsChar;
									}
								}
								break;
							case ')':
								{
									if (node.hasLineBreaks()) {
										result += newLineChars;
										result += indentationChars.repeat(parent!.indent ?? 0);
										result += val;
									} else {
										// result += wsChar;
										result += val;
									}
								}
								break;
							case '{':
								{
									result += val;
									if (node.hasLineBreaks()) {
										result += newLineChars;
										result += indentationChars.repeat(node.indent);
									}
								}
								break;
							case '}':
								{
									if (node.hasLineBreaks()) {
										result += newLineChars;
										result += indentationChars.repeat(parent!.indent ?? 0);
									}
									result += val;
								}
								break;
							case newLineChars:
								{
									result += val;
									result += indentationChars.repeat(node.indent);
								}
								break;
							default:
								result += val;
								break;
						}
					} else {
						result += dfs(<blockNode>val, node);
					}
				}

				return result;
			}

			return dfs(root);
		}

		let res = process(root);
		console.log('-------------------------------------');
		console.log(res);
		return res;
	}

}