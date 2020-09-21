import { maxCompletions } from '../schema/mxsSchema';
import { mxClassMembers } from '../schema/mxsSchema-clases';
import { mxInterfaceMembers } from '../schema/mxsSchema-interfaces';
import { mxStructsMembers } from '../schema/mxsSchema-structs';
import { tokenDefinitions } from '../schema/mxsTokenDefs';
import { mxsSymbols } from '../schema/mxsSymbolDef';

import * as fs from 'fs';
import * as path from 'path';

const outputPaths =
[
	'./server/src/schema/mxsSchema.json',
	'./server/src/schema/mxsSchema-clases.json',
	'./server/src/schema/mxsSchema-interfaces.json',
	'./server/src/schema/mxsSchema-structs.json',
	'./server/src/schema/mxsTokenDefs.json',
	'./server/src/schema/mxsSymbolDef.json',
];
const sources = [maxCompletions, mxClassMembers, mxInterfaceMembers, mxStructsMembers, tokenDefinitions, mxsSymbols];

function Main ()
{
	console.log('==================================================');
	let schemas = sources.length;
	for (let i = 0; i < schemas; i++) {
		console.log('output: ' + path.resolve(outputPaths[i]) + '       ...OK');
		let stringify = JSON.stringify(sources[i], null);
		fs.writeFileSync(outputPaths[i],stringify);
	}
}
console.log('==================================================');
console.log('Encode schemas');
Main();
// tsc ./server/src/support/encoder.ts
// node ./server/src/support/encoder.js
// node ./server/out/support/encoder.js