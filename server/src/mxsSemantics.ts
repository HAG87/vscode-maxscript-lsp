'use strict';
import
{
	SemanticTokensBuilder,
	SemanticTokensLegend,
	SemanticTokensClientCapabilities,
	SemanticTokens
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
//-------------------------------------------------------------------------------------------------------------
import moo from 'moo';
import maxAPI from './schema/mxsAPI';
import { mxsFormatterLexer } from './lib/mooTokenize-formatter';
//-------------------------------------------------------------------------------------------------------------
// This is a simplified ruleset of the parser tokenizer
let lexer = mxsFormatterLexer(maxAPI);
//-------------------------------------------------------------------------------------------------------------
/*
	const tokenTypesLegend = [
		'comment',
		'keyword',
		'operator',
		'namespace',
		'type',
		'struct',
		'class',
		'interface',
		'enum',
		'typeParameter',
		'function',
		'member',
		'macro',
		'variable',
		'parameter',
		// 'property',
		// 'label',
		// 'string',
		// 'number',
	];
*/
enum TokenTypes
{
	class = 0,
	function = 1 ,
	interface = 2,
	namespace = 3,
	struct = 4,
	type = 5,
	variable = 6 ,
	enumMember = 7 ,
	_ = 8
	// comment = 0,
	// keyword = 1,
	// string = 2,
	// number = 3,
	// // regexp = 4,
	// type = 5,
	// class = 6,
	// interface = 7,
	// enum = 8,
	// typeParameter = 9,
	// function = 10,
	// member = 11,
	// property = 12,
	// variable = 13,
	// parameter = 14,
	// lambdaFunction = 15,
	// _ = 16
}

enum TokenModifiers
{
	declaration = 0,
	documentation = 1,
	readonly = 2,
	static = 3,
	abstract = 4,
	deprecated = 5,
	_ = 6
	// abstract = 0,
	// deprecated = 1,
	// _ = 2,
}
//-------------------------------------------------------------------------------------------------------------
interface IParsedToken
{
	line: number;
	startCharacter: number;
	length: number;
	tokenType: number;
	tokenModifiers: number;
}

export class mxsSemanticTokens
{
	legend: SemanticTokensLegend | undefined;
	tokenTypes: Map<string, number> = new Map();
	tokenModifiers:Map<string, number> = new Map();
	tokenBuilders: Map<string, SemanticTokensBuilder> = new Map();

	constructor(capability: SemanticTokensClientCapabilities) {
		this.legend = this.computeLegend(capability);
	}

	private tokenizeDocument(text: string)
	{
		let semtoken: IParsedToken[] = [];
		if (!this.legend) { return semtoken;}

		let token: moo.Token | undefined;
		// compute token modifiers
		let tokenMod = (vals: string[]) =>
		{
			let result = 0;
			for (let i = 0; i < vals.length; i++) {
				const _tokenMod = vals[i];
				if (this.tokenModifiers.has(_tokenMod)) {
					result = result | (1 << this.tokenModifiers.get(_tokenMod)!);
				} else if (_tokenMod === 'notInLegend') {
					result = result | (1 << this.tokenModifiers.size + 2);
				}
			}
			return result;
		};
		let tokenType = (val: string) =>
		{
			if (this.tokenTypes.has(val)) {
				return this.tokenTypes.get(val)!;
			} else if (val === 'notInLegend') {
				return this.tokenTypes.size + 2;
			}
			return 0;
		};
		// feed the tokenizer
		lexer.reset(text);
		while (token = lexer.next()) {
			// filter tokens here
			if (token.type) {
				let typing = token.type.split('_');
				if (this.legend.tokenTypes.includes(typing[0])) {
					// console.log(typing[0]);
					semtoken.push(
						{
							line: token.line - 1,
							startCharacter: token.col - 1,
							length: token.text.length,
							tokenType: tokenType(typing[0]),
							tokenModifiers: tokenMod(typing.slice(1))
						}
					);
				}
			}
		}
		return semtoken;
	}

	computeLegend(capability: SemanticTokensClientCapabilities): SemanticTokensLegend
	{
		const clientTokenTypes = new Set<string>(capability.tokenTypes);
		const clientTokenModifiers = new Set<string>(capability.tokenModifiers);

		const _tokenTypes: string[] = [];

		for (let i = 0; i < TokenTypes._; i++) {
			const str = TokenTypes[i];
			if (clientTokenTypes.has(str)) {
				_tokenTypes.push(str);
				this.tokenTypes.set(str, i);
			}
		}

		const _tokenModifiers: string[] = [];

		for (let i = 0; i < TokenModifiers._; i++) {
			const str = TokenModifiers[i];
			if (clientTokenModifiers.has(str)) {
				_tokenModifiers.push(str);
				this.tokenModifiers.set(str, i);
			}
		}

		return { tokenTypes: _tokenTypes, tokenModifiers: _tokenModifiers };
	}

	getTokenBuilder(document: TextDocument): SemanticTokensBuilder
	{
		let result = this.tokenBuilders.get(document.uri);
		if (result !== undefined) {
			return result;
		}
		result = new SemanticTokensBuilder();
		this.tokenBuilders.set(document.uri, result);
		return result;
	}

	provideSemanticTokens(document: TextDocument)
	{
		const builder = this.getTokenBuilder(document);
		// if (!this.legend) { return;}
		this.tokenizeDocument(document.getText()).forEach((token) =>
		{
			builder.push(
				token.line,
				token.startCharacter,
				token.length,
				token.tokenType,
				token.tokenModifiers
			);
		});
		return builder.build();
	}

	provideDeltas(document: TextDocument, resultsId: string)
	{
		const builder = this.getTokenBuilder(document);
		builder.previousResult(resultsId);
		this.tokenizeDocument(document.getText()).forEach((token) =>
		{
			builder.push(
				token.line,
				token.startCharacter,
				token.length,
				token.tokenType,
				token.tokenModifiers
			);
		});
		return builder.buildEdits();
	}
}
