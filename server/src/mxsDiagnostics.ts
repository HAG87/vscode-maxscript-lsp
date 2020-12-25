'use strict';
import
{
	Diagnostic,
	DiagnosticSeverity,
	// DiagnosticRelatedInformation,
} from 'vscode-languageserver';
//--------------------------------------------------------------------------------
import moo from 'moo';
import { tokenDefinitions } from './schema/mxsTokenDefs';
import { rangeUtil } from './lib/astUtils';
//--------------------------------------------------------------------------------
interface Dictionary<T> { [key: string]: T }

type ErrorDetail = {
	token?: moo.Token;
	expected: Dictionary<string>[];

};

/**
 * ParserError extends js Error
 */
export class ParserError extends Error
{
	constructor(message?: string)
	{
		// 'Error' breaks prototype chain here
		super(message);
		// restore prototype chain
		const actualProto = new.target.prototype;
		Object.setPrototypeOf(this, actualProto);
	}
	name: string = 'parse_error';
	recoverable!: boolean;
	tokens: moo.Token[] = [];
	details: ErrorDetail[] = [];
}
//--------------------------------------------------------------------------------
/**
 * Diagnostics collection.
 */
export const mxsDiagnosticCollection: Diagnostic[] = [];
//--------------------------------------------------------------------------------
const tokenListToValues = (tokenList: Dictionary<string>[]): string[] =>
	[...new Set((tokenList).map(item => item.type))];

/**
 * Provide a message that list possible solutions
 * @param tokenList List of possible tokens
 */
function correctionList(tokenList: Dictionary<string>[]): string
{
	// get a list of the types
	let list = tokenListToValues(tokenList);
	let tokenDesc = list.map((item: string) => tokenDefinitions[item]).sort();
	// map the types to description...
	let str = 'It was expected one of the followings:\n - ' + tokenDesc.join('\n - ');
	return str;
}

/**
 * Provides a basic syntax error diagnostic.
 * @param document Document that emiited the parsing error
 * @param error parser error type
 */
export function provideParserDiagnostic(error: ParserError): Diagnostic[]
{
	const tokenList = [...error.tokens];
	let diagnostics: Diagnostic[];
	diagnostics = tokenList.map(
		t =>
		{
			let vsRange = rangeUtil.getTokenRange(t);
			let diag = Diagnostic.create(
				vsRange,
				`Unexpected \"${t}\".`,
				DiagnosticSeverity.Error
			);
			diag.source = 'MaxScript';
			// DISABLED: List of possible tokens
			/*
				diag.code = error.name;
				let list = tokenListToValues(error.alternatives);
				let tokenDesc: string[] = list.map(item => tokenDefinitions[item]).sort();
				diag.relatedInformation = tokenDesc.map( item => new DiagnosticRelatedInformation(new Location(document.uri, vsRange), item));
			*/
			return diag;
		});
	return diagnostics;
}

/**
 * Provides bad token diagnosys based on lexer error token
 * @param document current document
 * @param CST parsed CST
 */
export function provideTokenDiagnostic(errTokens: moo.Token[]): Diagnostic[]
{
	if (!errTokens) { return []; }
	let diagnostics: Diagnostic[] = errTokens.map(
		t => ({
			// code: 'ERR_TOKEN',
			message: `Unexpected token: ${t.text}`,
			range: rangeUtil.getTokenRange(t),
			severity: DiagnosticSeverity.Warning,
			source: 'MaxScript'
		}));
	return diagnostics;
}