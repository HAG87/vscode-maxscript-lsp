import
{
	SemanticTokensBuilder,
	SemanticTokensLegend,
	SemanticTokensClientCapabilities
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
enum TokenTypes
{
	class,
	function,
	interface,
	namespace,
	struct,
	type,
	variable,
	enumMember,
	_
	// comment,
	// keyword,
	// string,
	// number,
	// type,
	// class,
	// interface,
	// enum,
	// typeParameter,
	// member,
	// property,
	// variable,
	// parameter,
	// lambdaFunction,
}
enum TokenModifiers
{
	declaration,
	documentation,
	readonly,
	static,
	abstract,
	deprecated,
	_
	// abstract,
	// deprecated,
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

export class SemanticTokensProvider
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
			switch (true) {
				case this.tokenTypes.has(val):
					return this.tokenTypes.get(val)!;
				case (val === 'notInLegend'):
					return this.tokenTypes.size + 2;
				default:
					return 0;
			}
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
							length:         token.text.length,
							tokenType:      tokenType(typing[0]),
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
		// Return existing token builder
		if (result !== undefined) { return result; }
		// No builder found, create new one
		result = new SemanticTokensBuilder();
		// Add to tokenBuilders set
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
