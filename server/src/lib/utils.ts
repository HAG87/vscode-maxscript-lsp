// import {window, Uri} from 'vscode';
import
{
	Position,
	Range
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import * as fs from 'fs';
import * as Path from 'path';
import { LspDocuments } from './document';
import { URI } from 'vscode-uri';
//--------------------------------------------------------------------------------
var isOdd = function (x: number) { return x & 1; };
var isEven = function (x: number) { return !(x & 1); };
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
export function prefixFile(path: string, prefix: string)
{
	return Path.join(path, '..', prefix + Path.basename(path));
}
/**
 * Check for balanced pairs of char in string
 * @param src
 */
export function balancedChars(src: string, char = '\"'): boolean
{
	let expr = new RegExp(`[^\\]${char}`, 'g');
	let doubleQuotesCnt = (expr.exec(src) || []).length;
	doubleQuotesCnt += src.startsWith('\"') ? 1 : 0;
	return doubleQuotesCnt % 2 === 1;
}
/**
 * find word before dot character, if any
 * @param src
 */
export function precWord(src: string): string | undefined
{
	let pattern = /(\w+)\.$/g;
	let wordmatches = pattern.exec(src);
	return (wordmatches?.[wordmatches.length - 1]);
}
/**
 * Trim a substring from a source string
 * @param src source string
 * @param substr string to remove
 * @returns returns a new string
 */
export function trimString(src: string, substr: string)
{
	var start = src.indexOf(substr);
	var end = start + substr.length;
	return src.substring(0, start - 1) + src.substring(end);
}
/**
 * Get word in TextDocument Position
 * @param document vscode document
 * @param position vscode position
 * @param skip string to skip
 */
export function getWordAtPosition(document: TextDocument, position: Position, skip?: string)
{
	let lineText = document.getText(Range.create(position.line, -1, position.line, Number.MAX_VALUE));
	let lineTillCurrentPosition = lineText.slice(0, position.character);
	let lineFromCurrentPosition = lineText.slice(position.character);

	// skip lines with glob
	if (skip && lineTillCurrentPosition.includes(skip)) { return undefined; }

	let wordStart = /\b[_\w\d]*$/im;
	let wordEnd = /^[_\w\d]*\b/im;

	let start = wordStart.exec(lineTillCurrentPosition);
	let end = wordEnd.exec(lineFromCurrentPosition);

	if (start === null && end === null) { return undefined; }

	let a = start !== null ? start[0] : '';
	let b = end !== null ? end[0] : '';
	// this is the word near the current position
	let word = a.concat(b);

	return word;
}
/**
 * Return line number from char offset
 * @param data 
 * @param index 
 */
export function getlineNumberofChar(data: string, index: number)
{
	return data.substring(0, index).split('\n').length;
}
/**
 * Get the Range of a word, providing a start position
 * @param word 
 * @param position 
 */
export function getWordRange(word: string, position: Position)
{
	return Range.create(position, Position.create(position.line, position.character + word.length - 1));
}

/*
 * Copyright (C) 2017, 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Return a path string from URI object
 * @param stringUri 
 */
export function uriToPath(stringUri: string): string | undefined
{
	const uri = URI.parse(stringUri);
	if (uri.scheme !== 'file') {
		return undefined;
	}
	return uri.fsPath;
}
/**
 * Return URI object from string path
 * @param filepath 
 * @param documents 
 */
export function pathToUri(filepath: string, documents: LspDocuments | undefined): string
{
	const fileUri = URI.file(filepath);
	const document = documents && documents.get(fileUri.fsPath);
	return document ? document.uri : fileUri.toString();
}

/**
 * Generic wait function
 * @param delay 
 * @param value 
 */
export const wait = (delay: number, value?: any) => new Promise(resolve => setTimeout(resolve, delay, value));
