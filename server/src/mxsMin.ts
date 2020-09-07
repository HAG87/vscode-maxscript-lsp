'use strict';
import * as fs from 'fs';
//--------------------------------------------------------------------------------
import { mxsMinify } from './lib/mxsCompactCode';
import { mxsParseSource } from './mxsParser';
//--------------------------------------------------------------------------------
export default class mxsMinifier {
	// COMPACT THE CODE
	// make this async...
	private static minCode(parserTree: any[])
	{
		return mxsMinify(parserTree);
	}

	private static minifyWrite(path: string, data: string) {

		return new Promise((resolve, reject) => {
			fs.writeFile(path, Buffer.from(data, 'utf8'),
				(err) => {
					err ? reject(err) : resolve();
				}
			);
		});
	}

	private static minifyRead(path: string)
	{
		return new Promise((resolve, reject) => {
			fs.readFile(path, 'utf8', (err, data) => {
				err ? reject(err) : resolve(data);
			});
		});

	}

	static async MinifyData(data: any | any[] | string)
	{
		if (typeof data === 'string') {
			// try {
			let parser = new mxsParseSource(data);
			await parser.ParseSourceAsync();
			if (Array.isArray(parser.parsedCST) && parser.parsedCST.length > 0) {
				return mxsMinifier.minCode(parser.parsedCST);
			} else {
				throw new Error('Parser failed.');
			}
			// }
			// catch (err) {
			// throw err;
			// }
		} else {
			return mxsMinifier.minCode(data);
		}
	}

	static async MinifyDoc(data: any | any[] | string, savePath:string)
	{ 
		let minify = await mxsMinifier.MinifyData(data);
		await mxsMinifier.minifyWrite(savePath, minify);
	}

	static async MinifyFile(src: string, dest: string)
	{
		// for (let path of paths) {}
		let data = mxsMinifier.minifyRead(src);
		let minify = await mxsMinifier.MinifyData(data);
		await mxsMinifier.minifyWrite(dest, minify);
	}
}