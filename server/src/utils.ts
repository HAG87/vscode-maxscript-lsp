import * as Path from 'path';
import { statSync } from 'fs';
import { Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
//--------------------------------------------------------------------------------
/**
 * Check if a file exists in source.
 * @param filePath File path
 */
export const fileExists = (filePath: string) => statSync(filePath).isFile();
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
export function balancedPairs(src: string, char = '\"')
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
	const wordmatches = pattern.exec(src);
	return wordmatches?.[wordmatches.length - 1];
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

	const a = start && start[0] ? start[0] : '';
	const b = end && end[0] ? end[0] : '';

	return a + b;
}
/**
 * Return line number from char offset
 * @param data 
 * @param index 
 */
export const getlineNumberOfChar =
	(data: string, index: number) =>
		data.substring(0, index).split('\n').length;
/**
 * Get the Range of a word, providing a start position
 * @param word 
 * @param position 
 */
export const getWordRange =
	(word: string, position: Position) =>
		Range.create(
			position,
			Position.create(
				position.line,
				position.character + word.length - 1
			)
		);
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
export const uriToPath = (stringUri: string) =>
{
	const uri = URI.parse(stringUri);
	return uri.scheme === 'file' ? uri.fsPath : undefined;
}