import nearley from 'nearley';
import { Token } from 'moo';
import { emmitTokenValue } from './backend/tokenSpecimens';
import { TokenizeStream } from './backend/TokenizeStream';

const grammar = require('./backend/grammar');
const mxsTokenizer = require('./backend/mooTokenize');
// import grammar from './backend/grammar';
// import mxLexer from './backend/mooTokenize.js';
//-----------------------------------------------------------------------------------
// const replaceWithWS = (str: string) => [...str].reduce((acc, next) => (acc + ' '), '');
// const uniqueArray = (x:any[]) => [...new Set(x.map(item => item.type || item.literal))];
const uniqueArray = (array: any[]) => [...new Map(array.map(item => [item['type'] || item['literal'], item])).values()];
//-----------------------------------------------------------------------------------
export class parserOptions
{
	recovery = false;
	attemps? = 10;
	memoryLimit? = 0.9;
}
export interface parserResult
{
	result?: any | any[]
	error?: ParserError
}
interface Dictionary<T> { [key: string]: T }

type ErrorDetail = {
	token?: Token;
	expected: Dictionary<string>[];
};
/**
 * ParserError extends js Error
 */
export class ParserError extends Error
{
	constructor(message: string)
	{
		super(message);
		// 👇️ because we are extending a built-in class
		Object.setPrototypeOf(this, ParserError.prototype);
	}
	name: string = 'parse_error';
	recoverable!: boolean;
	description?: string;
	token?: Token;
	tokens: Token[] = [];
	details?: ErrorDetail[];
}

//-----------------------------------------------------------------------------------
const reportSuccess = (toks: Token[]) =>
{
	let newErr = new ParserError('Parser failed. Partial parsing has been recovered.');
	newErr.name = 'ERR_RECOVER';
	newErr.recoverable = true;
	newErr.tokens = toks;
	// newErr.details = errorReport;
	return newErr;
};
const reportFailure = (toks: Token[]) =>
{
	let newErr = new ParserError('Parser failed. Unrecoverable errors.');
	newErr.name = 'ERR_FATAL';
	newErr.recoverable = false;
	newErr.tokens = toks;
	// newErr.details = errorReport;
	return newErr;
};
const formatErrorMessage = (token: Token) =>
{
	let syntaxError =
		`Syntax error at line: ${token.line} column: ${token.col}`;
	let tokenDisplay =
		`Unexpected ${token.type ? token.type.toUpperCase() : ''} token: ${JSON.stringify(token.value !== undefined ? token.value : token)}`;

	return syntaxError.concat('\n', tokenDisplay);
};

const generateParserError = (err: any) =>
{
	let newErr = new ParserError("");
	newErr = Object.assign(newErr, err)
	newErr.message = formatErrorMessage(err.token);
	newErr.name = 'ERR_FATAL';
	newErr.recoverable = false;
	newErr.token = err.token;
	newErr.tokens = [err.token];
	newErr.description = err.message;
	return newErr;
}
//-----------------------------------------------------------------------------------
export function declareParser()
{
	return new nearley.Parser(
		nearley.Grammar.fromCompiled(grammar),
		{
			keepHistory: true
		});
}
//-----------------------------------------------------------------------------------
/**
 * Get a list of possible error corections
 * @param parserInstance 
 */
/*
function PossibleTokens(parserInstance: nearley.Parser)
{
	var possibleTokens: any[] = [];
	var lastColumnIndex = parserInstance.table.length - 2;
	var lastColumn = parserInstance.table[lastColumnIndex];
	var expectantStates = lastColumn.states
		.filter(function (state: { rule: { symbols: { [x: string]: any } }; dot: string | number })
		{
			var nextSymbol = state.rule.symbols[state.dot];
			return nextSymbol && typeof nextSymbol !== 'string';
		});
	// Display a "state stack" for each expectant state
	// - which shows you how this state came to be, step by step.
	// If there is more than one derivation, we only display the first one.
	var stateStacks = expectantStates
		.map((state: any) =>
		{
			return parserInstance.buildFirstStateStack(state, []);
		});
	// Display each state that is expecting a terminal symbol next.
	stateStacks.forEach(function (stateStack: any[])
	{
		var state = stateStack[0];
		var nextSymbol = state.rule.symbols[state.dot];
		possibleTokens.push(nextSymbol);
	});
	return possibleTokens;
}
*/
function PossibleTokens(ParserInstance: nearley.Parser)
{
	var lastColumnIndex = ParserInstance.table.length - 2;
	var lastColumn = ParserInstance.table[lastColumnIndex];
	var expectantStates = lastColumn.states
		.filter(function (state: nearley.LexerState)
		{
			var nextSymbol = state.rule.symbols[state.dot];
			return nextSymbol && typeof nextSymbol !== "string";
		});
	if (expectantStates.length === 0) {
		//No viable alternatives
	} else {
		var stateStacks = expectantStates
			.map(function (state: nearley.LexerState)
			{
				return ParserInstance.buildFirstStateStack(state, []) || [state];
			}, ParserInstance);
		var symbolAlternatives = [];
		stateStacks.forEach(function (stateStack: any)
		{
			var state = stateStack[0];
			var nextSymbol = state.rule.symbols[state.dot];
			/*
			if (
				nextSymbol.type != "ws"
				&& nextSymbol.type != "newline"
				&& nextSymbol.type != "comment_SL"
				&& nextSymbol.type != "comment_BLK"
				) {symbolAlternatives.push(nextSymbol);}
			// */
			symbolAlternatives.push(nextSymbol);
		}, ParserInstance);
	}
	return symbolAlternatives;
}
//-----------------------------------------------------------------------------------
/**
 * Parser
 * @param source Data to parse 
 * @param parserInstance Nearley parser instance
 */
export function parse(source: string, parserInstance: nearley.Parser): parserResult
{
	try {
		parserInstance.feed(source);
		return {
			result: parserInstance.results[0],
			error: undefined
		};
	} catch (err: any) {
		throw generateParserError(err);
	}
}
/**
 * Parser with Error recovery
 * @param source Data to parse
 * @param parserInstance Async Parser with Error recovery
 */
export function parseWithErrors(source: string, parserInstance: nearley.Parser, options: parserOptions): parserResult
{
	let src = TokenizeStream(mxsTokenizer, source);
	let state = parserInstance.save();
	// let errorState: any;

	let badTokens: moo.Token[] = [];
	// let errorReport: any[] = [];

	function parserIterator(src: Token[])
	{
		let next = 0;
		// let attemp = 0;
		return {
			next: function ()
			{
				if (next < src.length) {
					try {
						parserInstance.feed(src[next++].value);
						state = parserInstance.save();
						return { done: false };
					} catch (err: any) {
						// on error, the parser state is the previous token.
						// Error unrelated to bad tokens
						if (!err.token) { throw (err); }
						// collect bad tokens
						badTokens.push(err.token);

						// /*
						// Problem: the token feed breaks the parser. Beed a propper way to backtrack and catch errors
						let tokenAlternatives = uniqueArray(PossibleTokens(parserInstance)!);
						// errorReport.push({token:src[next], alternatives: this.PossibleTokens(mxsParser) });
						// copy error token
						let specimen = { ...err.token };

						let nextToken = 0;
						function parserErrorIterator(err: any)
						{
							return {
								next: function ()
								{
									if (nextToken < tokenAlternatives.length) {
										// emmit the possible next token ...
										let currentTokentAlt = tokenAlternatives[nextToken++];
										if (currentTokentAlt.type) {
											let altTokenValue: string = emmitTokenValue(err.token.value.length)[currentTokentAlt.type as keyof typeof emmitTokenValue];
											let altToken = {
												text: altTokenValue,
												value: altTokenValue,
												type: currentTokentAlt.type,
											};
											Object.assign(specimen, altToken);
										} else { specimen = { ...currentTokentAlt }; }


										// assign alternative
										/*
										// replace the faulty token with a filler value
										let filler = replaceWithWS(specimen.text);
										let altToken: moo.Token =
										{
											text: filler,
											value: filler,
											type: 'ws'
										});
										*/

										try {
											// backtrack: restore parser state
											// parserInstance.restore(state);
											// attemp to parse token
											parserInstance.feed(specimen);
											//pass
											return { done: true, value: specimen };
										} catch (err) {
											//this is not working, try next token
											// nextToken++;
											// backtrack: restore parser state
											parserInstance.restore(state);
											return { done: false };
										}
									} else {
										// no viable results
										return { done: true, value: null };
									}
								}
							};
						}

						let it = parserErrorIterator(err);
						let result = it.next();
						while (!result.done) { result = it.next(); }
						if (result.done && result.value) {
							// advance the parser one token
							next++
							return { value: null, done: false };
						} else {
							// no valid token alternatives, abort parsing
							return { value: null, done: true };
						}
					}
				} else {
					// parser finished
					return { value: parserInstance.results, done: true };
				}
			}
		};
	}
	//Iterator
	let it = parserIterator(src);
	let result = it.next();
	while (!result.done) { result = it.next(); }

	return {
		result: result.value,
		error: result.value ? reportSuccess(badTokens) : reportFailure(badTokens)
	};
}