/**
 * Provide document symbols via parse tree.
 */
import { spawn, Thread, Worker } from 'threads';
// import { wrap } from 'comlink';
// import nodeEndpoint, { NodeEndpoint } from 'comlink/dist/umd/node-adapter';
import {symbolsWorker} from './workers/symbols.worker';
// import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

import
{
	Connection,
} from 'vscode-languageserver';
import { TextDocument, } from 'vscode-languageserver-textdocument';
import
{
	provideParserErrorInformation
} from './mxsDiagnostics';

import
{
	// parserResult,
	ParserError,
	parserOptions
} from './backend/mxsParserBase';


import getDocumentSymbolsLegacy from './mxsOutlineLegacy';
import {ParserSymbols, DocumentSymbolProvider} from './mxsOutline';

//@ts-ignore
// import workerURL from 'threads-plugin/dist/loader?name=symbols.worker!./workers/symbols.worker.ts';
//--------------------------------------------------------------------------------


export class DocumentSymbolProviderThreaded extends DocumentSymbolProvider
{
	private async parseTextDocumentThreaded(document: TextDocument, options?: parserOptions): Promise<ParserSymbols>
	{
		// /*
		let workerURL
		try {
			workerURL = require('threads-plugin/dist/loader?name=symbols.worker!./workers/symbols.worker.ts');			
		} catch {
			workerURL = 'workers/symbols.worker';
		}
		let worker = await spawn<symbolsWorker>(new Worker(`./${workerURL}`));
		try {
			return await worker(document.getText(), this.documentRange(document), options);
		} finally {
			await Thread.terminate(worker);
		}
		// */
		/*
		const worker = new Worker('./workers/symbols.worker');
		const api = wrap<symbolsWorker>(nodeEndpoint(<unknown>worker as NodeEndpoint));
		return await api.documentSymbols(document.getText(), this.documentRange(document), options);
		// */

	
		/*
		if (isMainThread) {
			return new Promise((resolve, reject) =>
			{
				// const worker = new Worker(new URL('', import.meta.url));
				const worker = new Worker(__filename, {workerData: "hello"});
				console.log(worker);

				worker.on("message", msg => {
					console.log(`Worker message received: ${msg}`);
					// resolve(this.parseTextDocument(data.doc, data.opts)) 
					resolve({symbols: [], diagnostics: []})});
				worker.on("error", err => {
					console.error(err);
					reject(err)
				});
				worker.on("exit", code => {
					// 					if (code === 0) { reject(new Error(`Worker failed with error ${code}`)); }
					console.log(`Worker exited with code ${code}.`);
				});
			});
		} else {
			return Promise.reject(new Error('Can conly call parseTextDocumentThreaded() from Main thread'));
		}
		// */
	}

	
	/** MXS document parser - Threaded version */
	async parseDocument(document: TextDocument, connection: Connection): Promise<ParserSymbols>
	{
		// console.log('Threaded!');
		try {
			return await this.parseTextDocumentThreaded(document, this.options);
		} catch (e: any) {
			connection.window.showWarningMessage(this.errorMessage(e.message));
			return getDocumentSymbolsLegacy(document, new Array(provideParserErrorInformation(<ParserError>e)));
		}
	}
}
