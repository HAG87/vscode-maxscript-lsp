'use strict';
import * as fs from 'fs';
//--------------------------------------------------------------------------------
//@ts-ignore
import { mxsMinify } from './lib/mxsCompactCode';
import { mxsParseSource } from './mxsParser';
//--------------------------------------------------------------------------------
// make this async...
function minCode(parserTree: any[])
{
	return mxsMinify(parserTree);
}

function minifyWrite(path: string, data: string)
{

	return new Promise((resolve, reject) =>
	{
		fs.writeFile(path, Buffer.from(data, 'utf8'),
			(err) =>
			{
				err ? reject(err) : resolve();
			}
		);
	});
}

function minifyRead(path: string)
{
	return new Promise((resolve, reject) =>
	{
		fs.readFile(path, 'utf8', (err, data) =>
		{
			err ? reject(err) : resolve(data);
		});
	});
}

export async function MinifyData(data: any | any[] | string)
{
	if (typeof data === 'string') {
		// try {
		let parser = new mxsParseSource(data);
		await parser.ParseSourceAsync();
		if (Array.isArray(parser.parsedCST) && parser.parsedCST.length > 0) {
			return minCode(parser.parsedCST);
		} else {
			throw new Error('Parser failed.');
		}
	} else {
		return minCode(data);
	}
}

export async function MinifyDoc(data: any | any[] | string, savePath: string)
{
	let minify = await MinifyData(data);
	await minifyWrite(savePath, minify);
}

export async function MinifyFile(src: string, dest: string)
{
	let data = await minifyRead(src);
	let minify = await MinifyData(data);
	await minifyWrite(dest, minify);
}