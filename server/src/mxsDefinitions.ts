'use strict';
import
{
	Definition,
	DefinitionLink,
	Location,
	LocationLink,
	Range,
	Position,
	SymbolInformation,
	DocumentSymbol,
	CancellationToken,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
//------------------------------------------------------------------------------------------
import { getFromCST, getTokenRange } from './mxsProvideSymbols';
import { getlineNumberofChar, getWordAtPosition } from './lib/utils';
//------------------------------------------------------------------------------------------
/**
 * Regex method to find first occurence of word in document
 * @param {TextDocument} document 
 * @param {string} word 
 * @returns {Location | undefined} Word location or undefined
 */
function getDocumentDefinitionMatch(document: TextDocument, word: string): Location | undefined
{
	let lastLineMatch = /[^\n]*$/i;

	let data = document.getText();
	let pos = data.indexOf(word);

	if (pos < -1) { return undefined; }

	let prevData = data.slice(0, pos);
	let lastLine = lastLineMatch.exec(prevData);

	if (lastLine?.[0]) {
		let line = getlineNumberofChar(prevData, pos);
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
 * @param {string} id
 * @param {any[]} array
 * @returns { DocumentSymbol | undefined} Found node or undefined
 */
function findNode(id: string, array: any[]): DocumentSymbol | undefined
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
 * @param {TextDocument} document
 * @param {string} searchword
 * @returns {Location | undefined} Word location
 */
function wordMatch(document: TextDocument, searchword: string)
{
	return getDocumentDefinitionMatch(document, searchword);
}

/**
 * DocumentSymbol Match
 * @param {TextDocument} document 
 * @param {DocumentSymbol[]} DocumentSymbols 
 * @param {string} searchword 
 * @returns {LocationLink | undefined} DocumentSymbol location
 */
function symbolMatch(document: TextDocument, DocumentSymbols: DocumentSymbol[], searchword: string)
{
	let findSymbol = findNode(searchword, DocumentSymbols);
	if (findSymbol !== undefined) {
		let symbolMatch = LocationLink.create(document.uri, findSymbol.range, findSymbol.selectionRange);
		return symbolMatch;
	}
	return undefined;
}

/**
 * CAST query Match
 * @param {TextDocument} document 
 * @param {any | any[]} CST 
 * @param {string} searchword 
 * @returns {LocationLink | undefined}
 */
function cstMatch(document: TextDocument, CST: any | any[], searchword: string)
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

/**
 * Get Document definitions
 * @async
 * @param {TextDocument} document 
 * @param {Position} position 
 * @param {any[]} parseCST 
 * @param {DocumentSymbol[] | SymbolInformation[]} DocumentSymbols
 * @returns {Promise<Definition | DefinitionLink[]>}
 */
export function getDocumentDefinitions(
	document: TextDocument,
	position: Position,
	cancellation: CancellationToken,
	DocumentSymbols?: DocumentSymbol[] | SymbolInformation[],
	parseCST?: any[],
): Promise<Definition | DefinitionLink[] | undefined>
{
	return new Promise((resolve, reject) =>
	{
		// cancellation request
		cancellation.onCancellationRequested(async () => reject('Cancellation requested'));

		// try to avoid words inside inline comments
		let word = getWordAtPosition(document, position, '--');
		if (!word) {
			// console.log('DEFINITIONS: No input word.');
			reject('No input word.');
			return;
		}

		// use documentSymbols
		//FIXME: PROBLEM WITH CHARACTER OFFSET! - MAYBE LINE NUMBER - MAYBE HAS TO DO WITH WHITESPACE
		// console.log('DEFINITIONS: symbols available');

		if (DocumentSymbols !== undefined) {
			let _symbolMatch = symbolMatch(document, DocumentSymbols as DocumentSymbol[], word);
			if (_symbolMatch !== undefined) {
				resolve([_symbolMatch]);
				return;
			}
		}

		// use the parse tree -- DISABLED
		/*
		console.log('DEFINITIONS: symbols un-available, using CST');
		if (parseCST !== undefined) {
			let _cstMatch = cstMatch(document, parseCST, word);
			if (_cstMatch !== undefined) {
				resolve([_cstMatch]);
				return;
			}
		}
		*/
		
		// fallback to regex match
		// console.log('DEFINITIONS: symbols un-available, using regex');

		let _wordMatch = wordMatch(document, word);
		_wordMatch !== undefined ? resolve(_wordMatch) : reject('No matches.');
	});
}