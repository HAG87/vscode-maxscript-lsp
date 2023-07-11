import { spawn, Thread, Worker } from 'threads';
import { CompletionItem } from 'vscode-languageserver';
//https://github.com/andywer/threads-plugin/issues/37
//https://github.com/andywer/threads-plugin/issues/34
//@ts-ignore
// import workerURL from 'threads-plugin/dist/loader?name=completions.worker!./workers/completions.worker.ts';
//------------------------------------------------------------------------------------------
export async function CodeCompletionItems(CTS: any): Promise<CompletionItem[]>
{
	let workerURL
	try {
		workerURL = require('threads-plugin/dist/loader?name=completions.worker!./workers/completions.worker.ts');			
	} catch {
		workerURL = 'workers/completions.worker';
	}
	let worker = await spawn(new Worker(`./${workerURL}`));
	try {
		return await worker(CTS);
	} finally {
		await Thread.terminate(worker);
	}
}
