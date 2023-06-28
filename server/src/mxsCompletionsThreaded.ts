import { spawn, Thread, Worker } from 'threads';
import { CompletionItem } from 'vscode-languageserver';
//------------------------------------------------------------------------------------------
export async function provideCodeCompletionItems(CTS: any): Promise<CompletionItem[]>
{
	let worker = await spawn(new Worker('./workers/completions.worker'));
	try {
		return await worker(CTS);
	} finally {
		await Thread.terminate(worker);
	}
}
