'use strict';
import { SymbolKind, SymbolInformation, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

interface mxsSymbolMatch
{
	type: string;
	match: RegExp;
	kind: SymbolKind;
}

const mxsSymbols: mxsSymbolMatch[] = [
	{
		type: 'struct',
		match: /struct\s+(\b\w+)/ig,
		kind: SymbolKind.Struct,
	},
	{
		type: 'function',
		match: /(fn|function)\s+(\b\w+)/ig,
		kind: SymbolKind.Function,
	},
	/*
	{
		type: 'localVar',
		match: /local\s+(\b\w+)/ig,
		kind: SymbolKind.Variable,
	},
	{
		type: 'globalVar',
		match: /global\s+(\b\w+)/ig,
		kind: SymbolKind.Variable,
	},
	{
		type: 'globalTyped',
		match: /(::\w+)/ig,
		kind: SymbolKind.Variable,
	},
	*/
	{
		type: 'plugin',
		match: /plugin\s+(\b\w+)/ig,
		kind: SymbolKind.Module,
	},
	{
		type: 'macroscript',
		match: /macroscript\s+(\b\w+)/ig,
		kind: SymbolKind.Module,
	},
	{
		type: 'rollout',
		match: /rollout\s+(\b\w+)/ig,
		kind: SymbolKind.Object,
	},
	{
		type: 'utility',
		match: /utility\s+(\b\w+)/ig,
		kind: SymbolKind.Object,
	},
	{
		type: 'tool',
		match: /(tool|mousetool)\s+(\b\w+)/ig,
		kind: SymbolKind.Object,
	},
	{
		type: 'event',
		match: /on\s+(\b\w+)\.+(?=do|return)/ig,
		kind: SymbolKind.Event,
	},
	{
		type: 'External file',
		match: /filein\s*\(*(.*)(?=\)|;|\n)/ig,
		kind: SymbolKind.Package,
	}
];

let exp = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/ig;
let escapeRegex = (str: string) => str.replace(exp, '\\$&');

// skip comments
let blockComments = (x: string): RegExp => new RegExp('\\/\\*[^\\*\\/]*' + x, 'i');
let singleComments = (x: string): RegExp => new RegExp('--.*(' + x + ').*$', 'im');
let strings = (x: string): RegExp => new RegExp('"([^"]|[\\"])*(' + x + ')([^"]|[\\"])*$"', 'im');

export default function getDocumentSymbolsLegacy(document: TextDocument): Promise<SymbolInformation[]>
{
	return new Promise((resolve, reject) =>
	{
		let SymbolInfCol: SymbolInformation[] = [];
		const docTxt = document.getText();

		mxsSymbols.forEach(type =>
		{
			// token[type.match] contains a regex for matching
			// type.decl is a workaround for regexpExecArray index match
			let matchSymbols;
			while (matchSymbols = type.match.exec(docTxt)) {

				// console.log(matchSymbols[0].normalize);
				// /*
				let scomment = singleComments(escapeRegex(matchSymbols[0])).test(docTxt);
				let bcomment = blockComments(escapeRegex(matchSymbols[0])).test(docTxt);
				let _string = strings(escapeRegex(matchSymbols[0])).test(docTxt);
				if (scomment || bcomment || _string) { continue; }

				SymbolInfCol.push(
					SymbolInformation.create(
						matchSymbols[0],
						type.kind,
						Range.create(
							document.positionAt(matchSymbols.index),
							document.positionAt(matchSymbols.index + matchSymbols[0].length)
						)
					)
				);
				// */
			}
		});
		if (SymbolInfCol.length) { resolve(SymbolInfCol); } else { reject('Symbols unavailable'); }
	});
}