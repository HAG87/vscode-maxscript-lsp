'use strict';
import
{
	// CancellationToken,
	// Command,
	Definition,
	DefinitionLink,
	Location,
	LocationLink,
	Range,
	Position,
	SymbolInformation,
	DocumentSymbol,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import {getFromCST, getTokenRange} from './mxsProvideSymbols';
import * as utils from './utils';
//------------------------------------------------------------------------------------------
export default class mxsDefinitions
{
	/**
	 * Regex method to find first occurence of word in document
	 * @param document 
	 * @param word 
	 */
	private static getDocumentDefinitionMatch(
		document: TextDocument,
		word: string
	): Location | undefined
	{
		let lastLineMatch = /[^\n]*$/i;

		let data = document.getText();
		let pos = data.indexOf(word);

		if (pos < -1) { return undefined; }

		let prevData = data.slice(0, pos);
		let lastLine = lastLineMatch.exec(prevData);

		if (lastLine?.[0]) {
			let line = utils.getlineNumberofChar(prevData, pos);
			if (line > -1) {
				line = line > 0 ? line - 1 : line;
				let start = Position.create(line, lastLine[0].length);
				let end = Position.create(line, lastLine[0].length + word.length);
				return (Location.create(document.uri, Range.create(start, end)));
			} else {
				return undefined;
			}
		}
		return undefined;
	}
	/**
	 * DocumentSymbols[] query
	 * @param id 
	 * @param array 
	 */
	private static findNode(
		id: string,
		array: any[]
	): DocumentSymbol | undefined
	{
		let _visit = (id: string, array: any[]): DocumentSymbol | undefined =>
		{
			for (const node of array) {
				if (node.name === id) { return node; }
				if (node.children) {
					const child = _visit(id, node.children);
					if (child) { return child; }
				}
			}
		};
		return _visit(id, array);
	}
	/**
	 * Regex Match
	 * @param document 
	 * @param searchword 
	 */
	private static wordMatch(document: TextDocument, searchword: string)
	{
		return mxsDefinitions.getDocumentDefinitionMatch(document, searchword);
	}
	/**
	 * DocumentSymbol Match
	 * @param document 
	 * @param DocumentSymbols 
	 * @param searchword 
	 */
	private static symbolMatch(document: TextDocument, DocumentSymbols: DocumentSymbol[], searchword: string)
	{
		let findSymbol = mxsDefinitions.findNode(searchword, DocumentSymbols);
		if (findSymbol !== undefined) {
			let symbolMatch = LocationLink.create(document.uri, findSymbol.range, findSymbol.selectionRange);
			return symbolMatch;
		}
		return undefined;
	}
	/**
	 * CAST query Match
	 * @param document 
	 * @param CST 
	 * @param searchword 
	 */
	private static cstMatch(document: TextDocument, CST: any | any[], searchword: string)
	{
		//TODO: use only valid statements, declarations, etc.
		let prospect = getFromCST(CST, { 'value': searchword });
		if (prospect.length > 0) {
			// first element in collection
			let tokenRange = getTokenRange(document, prospect[0]);
			let cstMatch = LocationLink.create(document.uri, tokenRange, tokenRange);
			return cstMatch;
		}
		return undefined;
	}

	static async getDocumentDefinitions(
		document: TextDocument,
		position: Position,
		parseCST?: any[],
		DocumentSymbols?: DocumentSymbol[] | SymbolInformation[]
	): Promise<Definition | DefinitionLink[]>
	{
		return new Promise((resolve, reject) =>
		{
			let word = utils.getWordAtPosition(document, position, '--');
			if (!word) { reject('No input word.'); return; }
			
			console.log(word);
			
			// /*
			// debug
			// let Match = mxsDefinitions.symbolMatch(document,DocumentSymbols as DocumentSymbol[], word);
			// console.log('symbolMatch');
			// let Match = mxsDefinitions.cstMatch(document, parseCST, word);
			// console.log('cstMatch');
			// let Match = mxsDefinitions.wordMatch(document, word);
			// console.log('wordMatch');
			// Match !== undefined ? resolve([Match]) : reject('No matches.');
			// */
			// /*
			if (DocumentSymbols !== undefined) {
				//FIXME: PROBLEM WITH CHARACTER OFFSET! - MAYBE LINE NUMBER - MAYBE HAS TO DO WITH WHITESPACE
				// console.log('symbolMatch');
				let symbolMatch = mxsDefinitions.symbolMatch(document, DocumentSymbols as DocumentSymbol[], word);
				if (symbolMatch !== undefined) {
					resolve([symbolMatch]);
				} else if (parseCST !== undefined) {
					// search the parse tree
					// console.log('cstMatch');
					// let cstMatch = mxsDefinitions.cstMatch(document, parseCST, word);
					// cstMatch !== undefined ? resolve([cstMatch]) : reject('No matches.');
					// return no matches
					reject('No matches.');
				}
			} else {
				// search the parse tree
				// console.log('wordMatch');
				let wordMatch = mxsDefinitions.wordMatch(document, word);
				// console.log(JSON.stringify(wordMatch, null, 2));
				wordMatch !== undefined ? resolve(wordMatch) : reject('No matches.');
			}
			// */
		});
	}
}