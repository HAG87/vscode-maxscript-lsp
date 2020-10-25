'use strict';
import
{
	BinaryLike,
	createHash
} from 'crypto';
//-----------------------------------------------------------------------------------
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
/** MD5 hash */
function HashSource(source: BinaryLike): string
{
	return createHash('md5').update(source).digest('hex');
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

/**
 *
 * @param source String to parse
 * @param parserInstance Instance of initialized parser
 * @param tree Index of the parsed tree I want in return, results are multiple when the parser finds and ambiguity
 */
function ParseSource(source: string, parserInstance: nearley.Parser): parserResult
{
	// Set a clean state - DISABLED FOR WORKAROUND OF PROBLEM -> ERROR RECOVERY DECLARES A CLEAN PARSER INSTANCE
	// this.reset();
	try {
		parserInstance.feed(source);
		return parserInstance.results[0];
	} catch (err) {
		return ParseWithErrors(source, parserInstance);
	}
}

/**
 * Parser with error recovery
 * @param source 
 * @param parserInstance nearley parser instance
 */
function ParseWithErrors(source: string, parserInstance: nearley.Parser): parserResult
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
function ParseSourceAsync(source: string, parserInstance: nearley.Parser): Promise<parserResult>
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
function parseWithErrorsAsync(source: string, parserInstance: nearley.Parser): Promise<parserResult>
{
	let src = TokenizeStream(source);
	let state = parserInstance.save();
	let total = src.length - 1;

	let badTokens: any[] = [];
	let errorReport: any[] = [];

	let reportSuccess = () =>
	{
		// console.log('parser report! - OK');
		let newErr = new ParserError('Parser failed. Partial parsings has been recovered.');
		newErr.name = 'ERR_RECOVER';
		newErr.recoverable = true;
		newErr.tokens = badTokens;
		newErr.details = errorReport;
		return newErr;
	};
	let reportFailure = () =>
	{
		// console.log('parser report! - BAD ');
		let newErr = new ParserError('Parser failed. Unrecoverable errors.');
		newErr.name = 'ERR_FATAL';
		newErr.recoverable = false;
		newErr.tokens = badTokens;
		newErr.details = errorReport;
		return newErr;
	};

	let errParser = (callback: any) =>
	{
		let parsings = (src: import('moo').Token[], next: number, total: number): any | undefined =>
		{
			try {
				parserInstance.feed(src[next].text);
			} catch (err) {
				// catch non parsing related errors.
				if (!err.token) { throw (err); }
				badTokens.push(src[next]);
				// errorReport.push({token:src[next], alternatives: this.PossibleTokens(mxsParser) });
				let filler = replaceWithWS(err.token.text);
				err.token.text = filler;
				err.token.value = filler;
				err.token.type = 'ws';
				// src.splice(next, 1, err.token);
				src[next] = err.token;
				next -= 1;
				parserInstance.restore(state);
			}
			state = parserInstance.save();

			if (next === total) {
				if (parserInstance.results) {
					return callback(parserInstance.results[0]);
				} else {
					return callback();
				}
			} else {
				return setImmediate(() => parsings(src, next + 1, total));
			}
		};
		parsings(src, 0, total);
	};
	let parseResults = () =>
	{
		return new Promise((resolve, reject) =>
		{
			// console.log('Error recovery done.');
			try {
				errParser((res: any | undefined) => resolve(res));
			} catch (err) {
				return reject(err);
			}
		});
	};

	return new Promise((resolve, reject) =>
	{
		parseResults()
			.then((result) =>
			{
				if (result) {
					return resolve({ result: <any>result, error: reportSuccess() });
				} //else {
				return resolve({ result: undefined, error: reportFailure() });
				//}
			})
			.catch(err => reject(err));
	});
}
//-----------------------------------------------------------------------------------
/**
 * main class to manage the parser. Implements 'nearley' parser and 'moo' tokenizer
 */
export class mxsParseSource
{
	// fields
	parserInstance!: nearley.Parser;
	private __source: string;
	// private __parserState: any;
	private __parsedCST: any;
	// constructor
	constructor(source: string | undefined)
	{
		this.__source = source || '';
		this.reset();
		// this.ParseSource();
	}
	/** Declare a new parser instance */
	private _declareParser()
	{
		return new nearley.Parser(
			nearley.Grammar.fromCompiled(grammar),
			{
				keepHistory: true
			});
	}
	/** Reset the parser * */
	reset() { this.parserInstance = this._declareParser(); }

	/** get the source Stream */
	get source() { return this.__source; }

	/**	Set new source, and re-parse */
	set source(newSource)
	{
		this.__source = newSource;
		this.ParseSourceAsync();
	}
	/** Get the parsed CST, if any */
	get parsedCST() { return this.__parsedCST; }

	/**
	 * Tokenize mxs string
	 * @param {moo.lexer} lexer
	 * @param {string} source
	 */
	TokenizeStream(filter?: string[]) { return TokenizeStream(this.__source, filter); }

	/**
	 * Parser 
	 */
	ParseSourceAsync(source = this.__source): Promise<parserResult>
	{
		return new Promise((resolve, reject) =>
		{
			this.reset();
			ParseSourceAsync(source, this.parserInstance)
				.then(
					result =>
					{
						this.__parsedCST = result.result;
						resolve(result);
					},
					() =>
					{
						// console.log('PARSER HAS FAILED! ATTEMP TO RECOVER');
						this.reset();
						parseWithErrorsAsync(source, this.parserInstance)
							.then(result =>
							{
								// console.log('PARSER HAS RECOVERED FROM ERROR');
								this.__parsedCST = result.result;
								resolve(result);
							})
							.catch(error => reject(error));
					}
				)
				.catch( err => reject(err));
		});
	}
}