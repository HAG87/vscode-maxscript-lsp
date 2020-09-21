'use strict';
import
{
	Diagnostic,
	// DiagnosticRelatedInformation,
	DiagnosticSeverity,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
//--------------------------------------------------------------------------------
import * as moo from 'moo';
import { getTokenRange } from './mxsProvideSymbols';
import { ItokenDefinitions } from './schema/mxsTokenDefs';
import * as fs from 'fs';
//--------------------------------------------------------------------------------
const tokenListToValues = (tokenList: Dictionary<string>[]): string[] =>
{
	return [...new Set((tokenList).map(item => item.type))];
};
//--------------------------------------------------------------------------------
interface Dictionary<T>
{
	[key: string]: T;
}
type ErrorDetail = {
	token?: moo.Token;
	expected: Dictionary<string>[];

};
export interface ParserFatalError extends Error
{
	token: moo.Token;
	offset: number;
	details: Dictionary<string>[];
}
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

const tokenDefinitions: ItokenDefinitions = JSON.parse(fs.readFileSync('./schema/mxsTokenDefs.json').toString('utf8'));
//--------------------------------------------------------------------------------
/**
 * Diagnostics collection.
 */
export const mxsDiagnosticCollection: Diagnostic[] = [];
//--------------------------------------------------------------------------------
/**
 * Provide basic error message
 * @param {token} token Offending token, from error
 */
const basicDiagnostics = (token: moo.Token): string =>
{
	return `Unexpected \"${token.value}\" at position: ${token.offset}`;
};
/**
 * Provide a message that list possible solutions
 * @param {token[]} tokenList List of possible tokens
 */
const correctionList = (tokenList: Dictionary<string>[]): string =>
{
	// get a list of the types
	let list = tokenListToValues(tokenList);
	let tokenDesc = list.map((item: string) => tokenDefinitions[item]).sort();
	// map the types to description...
	let str = 'It was expected one of the followings:\n - ' + tokenDesc.join('\n - ');
	return str;
};
/**
 * Diagnostics generic message
 * @param error Error throw from parser
 */
export function parsingErrorMessage(error: ParserFatalError): string
{
	return ([basicDiagnostics(error.token)].concat(correctionList(error.details)).join('\n'));
}
/**
 * Provides a basic syntax error diagnostic.
 * @param document Document that emiited the parsing error
 * @param error parser error type
 */
export function provideParserDiagnostic(document: TextDocument, error: ParserError): Diagnostic[]
{
	if (!document) { return []; }
	let diagnostics: Diagnostic[];
	let tokenList = [...error.tokens];
	diagnostics = tokenList.map(
		t =>
		{
			let vsRange = getTokenRange(document, t);
			let diag = Diagnostic.create(
				vsRange,
				`Unexpected \"${t}\".`,
				DiagnosticSeverity.Error
			);
			diag.source = 'MaxScript';
			diag.code = error.name;
			// DISABLED: List of possible tokens
			// let list = tokenListToValues(error.alternatives);
			// let tokenDesc: string[] = list.map(item => tokenDefinitions[item]).sort();
			// diag.relatedInformation = tokenDesc.map( item => new DiagnosticRelatedInformation(new Location(document.uri, vsRange), item));
			return diag;
		});
	return diagnostics;
}
/**
 * Provides bad token diagnosys based on lexer error token
 * @param document current document
 * @param CST parsed CST
 */
export function provideTokenDiagnostic(document: TextDocument, errTokens: moo.Token[] | undefined): Diagnostic[]
{
	if (!errTokens) { return []; }
	let diagnostics: Diagnostic[] = errTokens.map(
		t => ({
			code: 'ERR_TOKEN',
			message: `Unexpected token: ${t.text}`,
			range: getTokenRange(document, t),
			severity: DiagnosticSeverity.Warning,
			source: 'MaxScript'
		}));
	return diagnostics;
}

/**
 * Set or Remove Current Diagnostics for document
 * @param document Current active editor document
 * @param diagnostic collection of vscodeDiagnostic
 * @param collection Curent registered DiagnosticCollection
 */
export function setDiagnostics(
	diagnostic?: Diagnostic[],
	collection: Diagnostic[] = mxsDiagnosticCollection): void
{

	if (diagnostic) {
		collection.concat(diagnostic);
	} else {
		collection = [];
	}
	// collection.forEach(document => {
	// 	workspace.fs.stat(document).then(stat => {
	// 	}, err => collection.delete(document));
	// });
}