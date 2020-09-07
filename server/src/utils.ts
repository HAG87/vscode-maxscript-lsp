// import {window, Uri} from 'vscode';
import {
	// DocumentUri,
	Position,
	Range,
	Location
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import * as fs from 'fs';
import * as Path from 'path';
import {LspDocuments} from './document';
import {URI} from 'vscode-uri';
//--------------------------------------------------------------------------------
var isOdd = function(x: number) { return x & 1; };

var isEven  = function(x: number) { return !( x & 1 ); };
//--------------------------------------------------------------------------------
/**
 * Check if a file exists on source.
 * @param filePath File path
 */
export const fileExists = (filePath: string): boolean => fs.statSync(filePath).isFile();

/**
 * Prefix a filename providing the full file path
 * @param path Original path
 * @param prefix File prefix
 */
export function prefixFile(path: string, prefix: string) {
	return  Path.join(path,'..', prefix + Path.basename(path));
}

/**
 * Check if the current Document position line is inside a "string" object
 * @param feed
 */
export function isPositionInString(feed: string): boolean {
	// Count the number of double quotes in the string. Ignore escaped double quotes
	let doubleQuotesCnt = (feed.match(/[^\\]\"/g) || []).length;
	doubleQuotesCnt += feed.startsWith('\"') ? 1 : 0;
	return doubleQuotesCnt % 2 === 1;
}
/**
 * find word before dot character, if any
 * @param line
 */
export function precWord(line: string):string | undefined {
	let pattern = /(\w+)\.$/g;
	let wordmatches = pattern.exec(line);
	return (wordmatches?.[wordmatches.length - 1]);
}

export function trimString(src: string, substr: string) {
	var start = src.indexOf(substr);
	var end = start + substr.length;
	return src.substring(0, start - 1) + src.substring(end);
}

export function getWordAtPosition(document: TextDocument, position: Position, skip?: string)
{ 
	let lineText = document.getText(Range.create(position.line, -1, position.line, Number.MAX_VALUE));
	let lineTillCurrentPosition = lineText.slice(0, position.character);
	let lineFromCurrentPosition = lineText.slice(position.character);
	// let lineTillCurrentPosition = document.getText(Range.create(position.line, -1, position.line, position.character));
	// let lineFromCurrentPosition = document.getText(Range.create(position.line, position.character, position.line, Number.MAX_VALUE));
	
	// skip lines with glob
	if (skip && lineTillCurrentPosition.includes(skip)) { return undefined; }

	let wordStart = /\b[_\w\d]*$/im;
	let wordEnd = /^[_\w\d]*\b/im;
	
	let start = wordStart.exec(lineTillCurrentPosition)!;
	let end = wordEnd.exec(lineFromCurrentPosition)!;
	
	if (start! && end!) { return undefined;}

	let a = start! ? start[0] : '';
	let b = end! ? end[0] : '';
	// this is the word near the current position
	let word = a.concat(b);

	return word;
}

export function getlineNumberofChar(data: string,index: number): number {
	/*
	var perLine = data.split('\n');
	var total_length = 0;
	for (let i = 0; i < perLine.length; i++) {
		total_length += perLine[i].length;
		if (total_length >= index) {return i + 1;}
	}
	return -1;
	*/
	return data.substring(0, index).split('\n').length;
	// return data.slice(0, index).split('\n').length;
}

/*
 * Copyright (C) 2017, 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

export function uriToPath(stringUri: string): string | undefined {
	const uri = URI.parse(stringUri);
	if (uri.scheme !== 'file') {
		return undefined;
	}
	return uri.fsPath;
}

export function pathToUri(filepath: string, documents: LspDocuments | undefined): string {
	const fileUri = URI.file(filepath);
	const document = documents && documents.get(fileUri.fsPath);
	return document ? document.uri : fileUri.toString();
}