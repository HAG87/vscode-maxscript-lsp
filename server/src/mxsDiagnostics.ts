import
{
	Diagnostic,
	DiagnosticSeverity,
	// DiagnosticRelatedInformation,
} from 'vscode-languageserver';
//--------------------------------------------------------------------------------
import {Token} from 'moo';
import { tokenDefinitions } from './schema/mxsTokenDefs';
import { rangeUtil } from './backend/astUtils';
import { ParserError } from './mxsParserBase';
//--------------------------------------------------------------------------------
interface Dictionary<T> { [key: string]: T }
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
 * @param error parser error type
 */
export function provideParserDiagnostic(err: ParserError): Diagnostic[]
{
	return err.tokens.map(
		t =>
		{
			//TODO: format error message
			let diag:Diagnostic =
			{
				range: rangeUtil.getTokenRange(t),
				severity: err.recoverable ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error,
				source: 'MaxScript',
				message: `Unexpected \"${t}\".`,
			};
			// DISABLED: List of possible tokens
			/*
				diag.code = error.name;
				let list = tokenListToValues(error.alternatives);
				let tokenDesc: string[] = list.map(item => tokenDefinitions[item]).sort();
				diag.relatedInformation = tokenDesc.map( item => new DiagnosticRelatedInformation(new Location(document.uri, vsRange), item));
			*/
			return diag;
		});
}
/* function reportError(token) {
	var tokenDisplay = (token.type ? token.type + " token: " : "") + JSON.stringify(token.value !== undefined ? token.value : token);
	var lexerMessage = this.lexer.formatError(token, "Syntax error");
	return this.reportErrorCommon(lexerMessage, tokenDisplay);
} */

/**
 * Provides a symbol with information related to the parsing error
 * @param err Parser error
 * @returns Diagnostic related information
 */
export function provideParserErrorInformation(err: ParserError): Diagnostic
{
	return {
		range: rangeUtil.getTokenRange(<Token>err.token),
		severity: DiagnosticSeverity.Error,
		source: 'MaxScript',
		message: err.message || err.toString(),
	};
}
/**
 * Provides bad token diagnosys based on lexer error token
 */
export function provideTokenDiagnostic(errTokens: Token[]): Diagnostic[]
{
	if (!errTokens) { return []; }
	let diagnostics: Diagnostic[] = errTokens.map(
		t => ({
			range:    rangeUtil.getTokenRange(t),
			message:  `Unexpected token: ${t.text}`,
			severity: DiagnosticSeverity.Warning,
			// code: 'ERR_TOKEN',
			source:   'MaxScript'
		}));
	return diagnostics;
}