// import {window, Uri} from 'vscode';
import { DocumentUri } from 'vscode-languageserver';
import * as fs from 'fs';
import {posix} from 'path';
//--------------------------------------------------------------------------------
export const fileExists = (filePath: string): boolean => fs.statSync(filePath).isFile();
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