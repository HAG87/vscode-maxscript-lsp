'use strict';
//-----------------------------------------------------------------------------------
import { getHeapStatistics } from 'v8';
import nearley from 'nearley';
import moo from 'moo';

// import grammar from './lib/grammar';
// import mxLexer from './lib/mooTokenize.js';

const grammar = require('./lib/grammar');
const mxsTokenizer = require('./lib/mooTokenize');

import { ParserError } from './mxsDiagnostics';
//-----------------------------------------------------------------------------------
function replaceWithWS(str: string)
{
	let ref = [...str];
	return ref.reduce((acc, next) => { return acc + ' '; }, '');
}
//-----------------------------------------------------------------------------------
interface parserResult
{
	result: any | undefined
	error: ParserError | undefined
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

function declareParser()
{
	return new nearley.Parser(
		nearley.Grammar.fromCompiled(grammar),
		{
			keepHistory: true
		});
}
/**
 *
 * @param source String to parse
 * @param parserInstance Instance of initialized parser
 * @param tree Index of the parsed tree I want in return, results are multiple when the parser finds and ambiguity
 */
function parseSync(source: string, parserInstance: nearley.Parser): parserResult
{
	// Set a clean state - DISABLED FOR WORKAROUND OF PROBLEM -> ERROR RECOVERY DECLARES A CLEAN PARSER INSTANCE
	// this.reset();
	try {
		parserInstance.feed(source);
		return parserInstance.results[0];
	} catch (err) {
		return parseWithErrorsSync(source, parserInstance);
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
	let src = TokenizeStream(source);
	let state = parserInstance.save();

	let badTokens: any[] = [];
	let errorReport: any[] = [];

	// let next = 0;
	let total = src.length - 1;

	for (var next = 0; next < total; next++) {
		// while (next <= total) {
		try {
			parserInstance.feed(src[next].toString());
			// this.parserInstance.feed(src[next].text);
		} catch (err) {
			// catch non parsing related errors.
			if (!err.token) { throw err; }
			// console.log(err.token);
			badTokens.push(src[next]);
			/* DISABLED FEATURE - NEEDS OPTIMIZATION */
			// errorReport.push({token:src[next], alternatives: this.PossibleTokens(this.parserInstance) });
			let filler = replaceWithWS(err.token.text);
			err.token.text = filler;
			err.token.value = filler;
			err.token.type = 'ws';
			// src.splice(next, 1, err.token);
			src[next] = err.token;
			// console.log(src[next]);
			// console.log(badTokens);
			next--;
			parserInstance.restore(state);
		}
		state = parserInstance.save();
		next++;
	}
	let reportSuccess = () =>
	{
		let newErr = new ParserError('Parser failed. Partial parsings has been recovered.');
		newErr.name = 'ERR_RECOVER';
		newErr.recoverable = true;
		newErr.tokens = badTokens;
		newErr.details = errorReport;
		return newErr;
	};
	let reportFailure = () =>
	{
		let newErr = new ParserError('Parser failed. Unrecoverable errors.');
		newErr.name = 'ERR_FATAL';
		newErr.recoverable = false;
		newErr.tokens = badTokens;
		newErr.details = errorReport;
		return newErr;
	};
	return {
		result: parserInstance.results[0] || [],
		error: parserInstance.results[0] ? reportSuccess() : reportFailure()
	};
}

/**
 * Get a list of possible error corections
 * @param parserInstance 
 */
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
//-----------------------------------------------------------------------------------
/**
 * Async Parser
 * @param source Data to parse 
 * @param parserInstance Nearley parser instance
 */
export function parseAsync(source: string, parserInstance: nearley.Parser, ms = 5): Promise<parserResult>
{
	return new Promise((resolve, reject) =>
	{
		try {
			parserInstance.feed(source);
			resolve({ result: parserInstance.results[0], error: undefined });
		} catch (err) {
			reject({ result: undefined, error: err });
		}
	});
}

/**
 * Async Parser with Error recovery
 * @param source Data to parse
 * @param parserInstance Async Parser with Error recovery
 */
function parseWithErrorsAsync(
	source: string,
	parserInstance: nearley.Parser,
	options = { recovery: true, attemps: 10, memoryLimit: 0.9 }
): Promise<parserResult>
{
	const totalHeapSizeThreshold = getHeapStatistics().heap_size_limit * options.memoryLimit;

	let src = TokenizeStream(source);
	let state = parserInstance.save();

	let badTokens: any[] = [];
	let errorReport: any[] = [];

	let reportSuccess = () =>
	{
		let newErr = new ParserError('Parser failed. Partial parsings has been recovered.');
		newErr.name = 'ERR_RECOVER';
		newErr.recoverable = true;
		newErr.tokens = badTokens;
		newErr.details = errorReport;
		return newErr;
	};
	let reportFailure = () =>
	{
		let newErr = new ParserError('Parser failed. Unrecoverable errors.');
		newErr.name = 'ERR_FATAL';
		newErr.recoverable = false;
		newErr.tokens = badTokens;
		newErr.details = errorReport;
		return newErr;
	};

	function parserIterator(src: moo.Token[])
	{
		let next = 0;
		let attemp = 0;
		return {
			next: function ()
			{
				if (next < src.length) {
					try {

						if ((getHeapStatistics().total_heap_size) > totalHeapSizeThreshold) {
							process.exit();
						}

						parserInstance.feed(src[next++].value);
						state = parserInstance.save();
						return { done: false };
					} catch (err) {
						if (!err.token) { throw (err); }
						if (!options.recovery) { return { done: true }; }
						if (attemp++ >= options.attemps)  { return { done: true }; }
						// console.log(err.token);
						// collect bad tokens
						badTokens.push(err.token);
						// badTokens.push(src[next]);
						// create a report of possible fixes *DISBLED*
						// errorReport.push({token:src[next], alternatives: this.PossibleTokens(mxsParser) });
						// replace the faulty token with a filler value
						let filler = replaceWithWS(err.token.text);
						err.token.text = filler;
						err.token.value = filler;
						err.token.type = 'ws';
						// src.splice(next, 1, err.token);
						src[next] = err.token;
						// backtrack
						parserInstance.restore(state);
					}
				} else {
					return { value: parserInstance.results, done: true };
				}
			}
		};
	}
	/*
	let errParser = (callback: any) =>
	{
		let parsings = (
			src: moo.Token[],
			next: number,
			total: number
		): any | undefined =>
		{
			try {
				// check for memory overflow
				if ((getHeapStatistics().total_heap_size) > totalHeapSizeThreshold) {
					// console.log('memory leak');
					// reject('memory leak');
					// return callback();
					process.exit(1);
				}	
				parserInstance.feed(src[next].text);
			} catch (err) {
				if (options.recovery) {
					// catch non parsing related errors.
					if (!err.token) { throw (err); }
					// collect bad tokens
					badTokens.push(src[next]);
					// create a report of possible fixes *DISBLED*
					// errorReport.push({token:src[next], alternatives: this.PossibleTokens(mxsParser) });
					// replace the faulty token with a filler value
					let filler = replaceWithWS(err.token.text);
					err.token.text = filler;
					err.token.value = filler;
					err.token.type = 'ws';
					// src.splice(next, 1, err.token);
					src[next] = err.token;
					// backtrack
					next -= 1;
					parserInstance.restore(state);
				} else {
					return callback();
				}
			}
			state = parserInstance.save();

			if (next >= total) {
				if (parserInstance.results) {
					return callback(parserInstance.results[0]);
				} else {
					return callback();
				}
			} else {
				// setImmediate(() => parsings(src, next + 1, total));
				parsings(src, next + 1, total);
			}
		};
		parsings(src, 0, total);
	};
	//*/
	return new Promise((resolve, reject) =>
	{
		let it = parserIterator(src);
		while (!it.next()?.done) { }
		let res = it.next()?.value;
		if (res) {
			resolve({ result: <any>res, error: reportSuccess() });
		} else {
			resolve({ result: undefined, error: reportFailure() });
		}
		/*
		errParser((result: any | undefined) =>
		{
			if (result) {
				resolve({ result: <any>result, error: reportSuccess() });
			} else {
				resolve({ result: undefined, error: reportFailure() });
			}
		});
		*/
	});
}

//-----------------------------------------------------------------------------------
/**
 * Parse MaxScript code
 * @param source source code string
 * @param options recovery; enable the error recovery parser
 */
export function parseSource(source: string, options = { recovery: true, attemps: 10, memoryLimit: 0.9}): Promise<parserResult>
{
	return new Promise((resolve, reject) =>
	{
		// /*
		parseAsync(source, declareParser())
			.then(
				result => resolve(result),
				reason =>
				{
					// console.log('PARSER HAS FAILED! ATTEMP TO RECOVER');
					if (options.recovery) {
						return parseWithErrorsAsync(source, declareParser(), options);
					} else {
						reject(reason);
					}
				}
			)
			// */
		// parseWithErrorsAsync(source, declareParser(), options)
			.then(result =>
			{
				// console.log('PARSER HAS RECOVERED FROM ERROR');
				resolve(<parserResult>result);
			})
			.catch(err => reject(err));
	});
}