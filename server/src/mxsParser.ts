import nearley from 'nearley';
import { Token } from 'moo';
import { getHeapStatistics } from 'v8';
import { emmitTokenValue } from './lib/tokenSpecimens';

const grammar = require('./lib/grammar');
const mxsTokenizer = require('./lib/mooTokenize');
// import grammar from './lib/grammar';
// import mxLexer from './lib/mooTokenize.js';
//-----------------------------------------------------------------------------------
const replaceWithWS = (str: string) => [...str].reduce((acc, next) => (acc + ' '), '');
// const uniqueArray = (x:any[]) => [...new Set(x.map(item => item.type || item.literal))];
const uniqueArray = (array:any[]) => [...new Map(array.map(item => [item['type'] || item['literal'], item])).values()];
//-----------------------------------------------------------------------------------
export class parserOptions
{
	recovery = false;
	attemps = 10;
	memoryLimit = 0.9;
}
export interface parserResult
{
	result?: any
	error?: ParserError
}
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

interface Dictionary<T> { [key: string]: T }

type ErrorDetail = {
	token?: Token;
	expected: Dictionary<string>[];

};
//-----------------------------------------------------------------------------------
let reportSuccess = (toks: Token[]) =>
{
	let newErr = new ParserError('Parser failed. Partial parsing has been recovered.');
	newErr.name = 'ERR_RECOVER';
	newErr.recoverable = true;
	newErr.tokens = toks;
	// newErr.details = errorReport;
	return newErr;
};
let reportFailure = (toks: Token[]) =>
{
	let newErr = new ParserError('Parser failed. Unrecoverable errors.');
	newErr.name = 'ERR_FATAL';
	newErr.recoverable = false;
	newErr.tokens = toks;
	// newErr.details = errorReport;
	return newErr;
};
let formatErrorMessage = (token: Token) =>
{
	let syntaxError =
		`Syntax error at line: ${token.line} column: ${token.col}`;
	let tokenDisplay =
		'Unexpected ' + (token.type ? token.type.toUpperCase() + " token: " : "") + JSON.stringify(token.value !== undefined ? token.value : token);
	return syntaxError.concat('\n', tokenDisplay);
};
let generateParserError = (err: any) =>
{
	let newErr = new ParserError("");
	newErr = Object.assign(newErr, err)
	newErr.message = formatErrorMessage(err.token);
	newErr.name = 'ERR_FATAL';
	newErr.recoverable = false;
	newErr.token = err.token;
	newErr.description = err.message;
	return newErr;
}
//-----------------------------------------------------------------------------------
/**
 * Tokenize mxs string
 * @param source Data to tokenize
 * @param filter keywords to exclude in tokens
 */
export function TokenizeStream(source: string, filter?: string[], Tokenizer = mxsTokenizer): moo.Token[]
{
	if (filter instanceof Array) {
		Tokenizer.next = (next => () =>
		{
			let tok;
			// IGNORING COMMENTS....
			while ((tok = next.call(Tokenizer)) && (filter.includes)) /* empty statement */ { }
			return tok;
		})(Tokenizer.next);
	}
	// feed the tokenizer
	Tokenizer.reset(source);
	let token: moo.Token | undefined;
	let toks: moo.Token[] = [];
	while ((token = Tokenizer.next())) {
		toks.push(token);
	}
	return toks;
}
//-----------------------------------------------------------------------------------
function declareParser()
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
function PossibleTokens(ParserInstance: nearley.Parser) {
	var lastColumnIndex = ParserInstance.table.length - 2;
	var lastColumn = ParserInstance.table[lastColumnIndex];
	var expectantStates = lastColumn.states
		.filter(function(state: nearley.LexerState) {
			var nextSymbol = state.rule.symbols[state.dot];
			return nextSymbol && typeof nextSymbol !== "string";
		});
	if (expectantStates.length === 0) {
		//No viable alternatives
	} else {
		var stateStacks = expectantStates
			.map(function(state: nearley.LexerState) {
				return ParserInstance.buildFirstStateStack(state, []) || [state];
			}, ParserInstance);
		var symbolAlternatives = [];
		stateStacks.forEach(function(stateStack: any) {
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
 *
 * @param source String to parse
 * @param parserInstance Instance of initialized parser
 */
function parseSync(source: string, parserInstance: nearley.Parser): parserResult
{
	try {
		parserInstance.feed(source);
		return { result: parserInstance.results[0], error: undefined };
	} catch (err: any) {
		return { result: undefined, error: err };
	}
}
/**
 * Parser with error recovery
 * @param source 
 * @param parserInstance nearley parser instance
 */
function parseWithErrorsSync(source: string, parserInstance: nearley.Parser): parserResult
{
	// New method tokenizing the input could be a way to feed tokens to the parser
	const src = TokenizeStream(source);
	let state = parserInstance.save();

	let badTokens: moo.Token[] = [];
	// let errorReport: any[] = [];

	// let next = 0;
	let total = src.length - 1;

	for (var next = 0; next < total; next++) {
		// while (next <= total) {
		try {
			parserInstance.feed(src[next].toString());
			// this.parserInstance.feed(src[next].text);
		} catch (err: any) {
			// catch non parsing related errors.
			if (!err.token) { throw err; }
			// collect bad tokens
			badTokens.push(err.token);
			/* DISABLED FEATURE - NEEDS OPTIMIZATION */
			// errorReport.push({token:src[next], alternatives: this.PossibleTokens(this.parserInstance) });
			if (src[next]) {
				let filler = replaceWithWS(err.token.text);
				Object.assign(src[next],
					{
						text: filler,
						value: filler,
						type: 'ws'
					});
			}
			next--;
			parserInstance.restore(state);
		}
		state = parserInstance.save();
		next++;
	}

	return {
		result: parserInstance.results[0] || [],
		error: parserInstance.results[0] ? reportSuccess(badTokens) : reportFailure(badTokens)
	};
}
//-----------------------------------------------------------------------------------
/**
 * Async Parser
 * @param source Data to parse 
 * @param parserInstance Nearley parser instance
 */
export async function parseAsync(source: string, parserInstance: nearley.Parser): Promise<parserResult>
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
 * Async Parser with Error recovery
 * @param source Data to parse
 * @param parserInstance Async Parser with Error recovery
 */
async function parseWithErrorsAsync(source: string, parserInstance: nearley.Parser, options: parserOptions): Promise<parserResult>
{
	const totalHeapSizeThreshold = getHeapStatistics().heap_size_limit * options.memoryLimit;

	let src = TokenizeStream(source);
	let state = parserInstance.save();
	let errorState: any;

	let badTokens: moo.Token[] = [];
	// let errorReport: any[] = [];

	function parserIterator(src: Token[])
	{
		let next = 0;
		let attemp = 0;
		return {
			next: function ()
			{
				// Force exit if memory heap is reached ... does it works??
				if ((getHeapStatistics().total_heap_size) > totalHeapSizeThreshold) {
							// process.exit();
						return {value:null, done:true};
					}

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
						let nextToken = 0;
						function parserErrorIterator(err:any)
						{
							return {
								next: function ()
								{
									if (nextToken < tokenAlternatives.length) {
										// emmit the possible next token ...
										let currentTokentAlt = tokenAlternatives[nextToken++];
										let tokenType = currentTokentAlt.type || currentTokentAlt.literal;
										// let altToken = {...err.token, ...tokenAlternatives[nextToken++]};
										let altToken = emmitTokenValue(err.token.value.length)[tokenType as keyof typeof emmitTokenValue];
										// console.log(altToken);
										try {
											// restore parser state?
											parserInstance.restore(state);
											// attemp to parse token
											parserInstance.feed(altToken);
											//pass
											return {done:true};
										} catch (err) {
											//this is not working
											console.log(err);
											// restore parser state?
											parserInstance.restore(state);
										}
									} else {
										return {done:false};
									}
								}
							};
						}
						let it = parserErrorIterator(err);
						while (!it.next()?.done || nextToken >= tokenAlternatives.length-1) { }
						// advance the parser one token
						if (it.next()?.done) { next++ }
						//*/
						/*
						// Set max errors limit
						if (options.attemps > 0 && attemp++ >= options.attemps) { return { done: true }; }					
						// create a report of possible fixes *DISABLED TOO RESOURCES INTENSIVE*
						// errorReport.push({token:src[next], alternatives: this.PossibleTokens(mxsParser) });
						// replace the faulty token with a filler value
						if (src[next]) {
							let filler = replaceWithWS(err.token.text);
							Object.assign(src[next],
								{
									text: filler,
									value: filler,
									type: 'ws'
								});
						}
						// backtrack
						parserInstance.restore(state);
						//*/
					}
				} else {
					return { value: parserInstance.results, done: true };
				}
			}
		};
	}

	let it = parserIterator(src);
	//Iterator
	while (!it.next()?.done) { }
	let res = it.next()?.value;

	return {
		result: res,
		error: res ? reportSuccess(badTokens) : reportFailure(badTokens)
	};
}
//-----------------------------------------------------------------------------------
/**
 * Parse MaxScript code
 * @param source source code string
 * @param options recovery; enable the error recovery parser. set attemps to -1 to disable attemps limit
 */
export function parseSource(source: string, options = new parserOptions()): Promise<parserResult>
{
	return new Promise((resolve, reject) =>
	{
		// parseWithErrorsAsync(source, declareParser(), options)
		parseAsync(source, declareParser())
			.then(
				result => resolve(result),
				reason =>
				{
					// if (true) {
					if (options.recovery) {
					// if (options.recovery) {
						return parseWithErrorsAsync(source, declareParser(), options);
					} else {
						reject(reason);
					}
				}
			)
			.then(result => resolve(<parserResult>result))
			.catch(err => reject(err));
	});
}