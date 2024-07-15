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
import { getFromCST, rangeUtil } from './backend/astUtils';
import { keywordsDB } from './backend/keywordsDB';
import { getWordAtPosition } from './utils';
//------------------------------------------------------------------------------------------
/**
 * DocumentSymbols[] query
 * @param  id name to search for
 * @param array DocumentSymbols
 * @returns  Found node or undefined
 */
function findDocumenSymbols(id: string, array: DocumentSymbol[]): DocumentSymbol[] | undefined
{
	let results: DocumentSymbol[] = [];

	let _visit = (id: string, array: DocumentSymbol[]) =>
	{
		for (const node of array) {
			if (node.name === id) { results.push(node); }
			if (node.children) {
				_visit(id, node.children);
			}
		}
	};
	_visit(id, array);
	return results.length ? results : undefined;
}

/**
 * Regex Match
 * @param document
 * @param searchWord
 * @returns Word location
 */
function wordMatch(document: TextDocument, searchWord: string, position: Position)
{
	let data = document.getText();
	// skip invalid words....
	// if searchword is a keyword...
	if (keywordsDB.keyword.includes(searchWord.toLowerCase())) { return; }
	// skip data values like numbers
	if (/^[\d.]+$/m.test(searchWord)) { return; }
	// skip one line comments
	const offsetPos = document.offsetAt(position);
	const matchLine = data.slice(0, offsetPos).split('\n');
	if (/--/.test(matchLine[matchLine.length - 1])) { return; }
	// skip copmments, strings, or drop it from the results. too complex!
	//-------------------------------------------------------------------------
	const exp = new RegExp(`\\b(${searchWord})\\b`, 'igu');
	let match, results = [];

	while (match = exp.exec(data)) {
		let matchLine = data.slice(0, match.index).split('\n');
		// skip single line comments from results...
		if (/--/.test(matchLine[matchLine.length - 1])) { continue; }
		/*
			// text until here...
			let dataPrev = data.slice(0, match.index);
			// split in lines
			let lines = dataPrev.split('\n');
			// get the character pos in the last line...
			let lastLine = lines[lines.length - 1];
			if (/--/.test(lastLine)) {continue;}
			let pos = lastLine.length;
			let start = Position.create(lines.length - 1, pos);
			let end = Position.create(lines.length - 1, pos + searchWord.length);
			results.push(Range.create(start, end));
		*/
		let range = Range.create(
			document.positionAt(match.index),
			document.positionAt(match.index + searchWord.length));
		results.push(Location.create(document.uri, range));
	}
	return results.length ? results : undefined;
}

/**
 * DocumentSymbol Match
 * @param document 
 * @param documentSymbols
 * @param searchWord
 * @param wordRange
 * @returns DocumentSymbol location
 */
function symbolMatch(document: TextDocument, documentSymbols: DocumentSymbol[], searchWord: string)
{
	return findDocumenSymbols(searchWord, documentSymbols)!.map(
		(sym) => LocationLink.create(
			document.uri,
			sym.range,
			sym.selectionRange
		));
}

/**
 * CST query Match -- DEPRECATED -- TODO: USE THE NEW IMPLEMENTED PARSER RANGES -- SEARCH IN NODES IDS FOR CONSISTENCY, OR AR LEAST FILTER OUT KEYWORDS... NOW IT MATCHES ANY TOKEN
 * @param  document 
 * @param  CST 
 * @param  searchWord 
 */
function cstMatch(document: TextDocument, CST: any | any[], searchWord: string)
{
	//TODO: use only valid statements, declarations, etc.
	const prospect = getFromCST(CST, { 'value': searchWord });
	if (prospect.length <= 0) { return; }
	// first element in collection
	let tokenRange = rangeUtil.getTokenRange(prospect[0]);
	return LocationLink.create(document.uri, tokenRange, tokenRange);
}

/**
 * Get Document definitions
 * @async
 * @param document 
 * @param position 
 * @param parseCST 
 * @param documentSymbols
 */
export async function getDocumentDefinitions(
	document: TextDocument,
	position: Position,
	documentSymbols?: DocumentSymbol[] | SymbolInformation[],
	// parseCST?: any[],
)
{
	// try to avoid words inside inline comments
	const word = getWordAtPosition(document, position, '--');
	if (word) {
		// use documentSymbols
		if (documentSymbols) {
			let _symbolMatch = symbolMatch(document, documentSymbols as DocumentSymbol[], word);
			if (_symbolMatch && _symbolMatch.length) {
				return _symbolMatch;
			} else {
				throw new Error('No matches');
			}
		} else {
			// fallback to regex match
			let _wordMatch = wordMatch(document, word, position);
			if (_wordMatch) {
				return _wordMatch;
			} else {
				throw new Error('No matches');
			}
		}
	} else {
		throw new Error('No input word.');
	}
	// use the parse tree -- DISABLED
	/*
		console.log('DEFINITIONS: symbols un-available, using CST');
		else if (parseCST) {
			let _cstMatch = cstMatch(document, parseCST, word);
			if (_cstMatch) {
				resolve([_cstMatch]);
				// return;
			} else {
				reject('No match');
			}
		} else {
			// fallback to regex match
			let _wordMatch = wordMatch(document, word);
			_wordMatch ? resolve(_wordMatch) : reject('No matches.');
		}
	*/
}