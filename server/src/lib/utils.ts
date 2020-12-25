'use strict';
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
/**
 * Test if number is Odd
 * @param x number to test
 */
export const isOdd = function (x: number) { return x & 1; };
/**
 * Test if number is Even
 * @param x number to test
 */
export const isEven = function (x: number) { return !(x & 1); };
//--------------------------------------------------------------------------------
/**
 * Write a string to file
 * @param path fs path for the file
 * @param data data to be written
 */
export async function fileWrite(path: string, data: string)
{
	return await fs.promises.writeFile(path, data, 'utf8');
}
/**
 * Read the contents of a file
 * @param path fs path for the file to be read
 */
export async function fileRead(path: string)
{
	return await fs.promises.readFile(path, { encoding: 'utf8' });
}
/**
 * Check if a file exists in source.
 * @param filePath File path
 */
export const fileExists = (filePath: string) => fs.statSync(filePath).isFile(); // (await fs.promises.stat(path)).isFile();
/**
 * Prefix a filename providing the full file path
 * @param path Original path
 * @param prefix File prefix
 */
export const prefixFile = (path: string, prefix: string) => Path.join(path, '..', prefix + Path.basename(path));
//--------------------------------------------------------------------------------
/**
 * Check for balanced pairs of char in string
 * @param src
 */
export function balancedChars(src: string, char = '\"')
{
	const expr = new RegExp(`[^\\]${char}`, 'g');
	let doubleQuotesCnt = (expr.exec(src) ?? []).length;
	doubleQuotesCnt += src.startsWith('\"') ? 1 : 0;
	return doubleQuotesCnt % 2 === 1;
}
/**
 * find word before dot character, if any
 * @param src
 */
export function precWord(src: string)
{
	const pattern = /(\w+)\.$/g;
	let wordmatches = pattern.exec(src);
	return wordmatches?.[wordmatches.length - 1];
}
/**
 * Trim a substring from a source string
 * @param src source string
 * @param substr string to remove
 * @returns returns a new string
 */
export function trimString(src: string, substr: string)
{
	const start = src.indexOf(substr);
	const end = start + substr.length;
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
	const wordStart = /\b[_\w\d]*$/im;
	const wordEnd = /^[_\w\d]*\b/im;

	const lineText = document.getText(Range.create(position.line, 0, position.line + 1, 0));
	const lineTillCurrentPosition = lineText.slice(0, position.character);
	const lineFromCurrentPosition = lineText.slice(position.character);

	// skip lines with glob
	if (skip && lineTillCurrentPosition.includes(skip)) { return; }

	const start = wordStart.exec(lineTillCurrentPosition);
	const end = wordEnd.exec(lineFromCurrentPosition);

	if (start === null && end === null) { return; }

	let a = start![0] ?? '';
	let b = end![0] ?? '';

	return a + b;
}
/**
 * Return line number from char offset
 * @param data 
 * @param index 
 */
export const getlineNumberofChar =
	(data: string, index: number) =>
		data.substring(0, index).split('\n').length;
/**
 * Get the Range of a word, providing a start position
 * @param word 
 * @param position 
 */
export const getWordRange =
	(word: string, position: Position) =>
		Range.create(position, Position.create(position.line, position.character + word.length - 1));
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
export function uriToPath(stringUri: string)
{
	const uri = URI.parse(stringUri);
	if (uri.scheme !== 'file') {
		return;
	}
	return uri.fsPath;
}
/**
 * Return URI object from string path
 * @param filepath 
 * @param documents 
 */
export function pathToUri(filepath: string, documents?: LspDocuments)
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
