/*
THIS IS BROKEN!
TODO:
 - Fix references for symbols with the same name or referenced from an enclosed construct (like calling a method of a structure that initiated into a variable)
*/
import {
  CancellationToken, Location, Position, ProviderResult,
  ReferenceContext, ReferenceProvider, TextDocument, Uri,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import { Utilities } from './utils.js';

export class mxsReferenceProvider implements ReferenceProvider
{
    public constructor(private backend: mxsBackend) { }

    provideReferences(
        document: TextDocument,
        position: Position,
        _context: ReferenceContext,
        _token: CancellationToken): ProviderResult<Location[]>
    {
        return new Promise((resolve) =>
        {
            const occurrences =
                this.backend.getContext(document.uri.toString()).symbolInfoAtPositionCtxOccurrences(
                    position.line + 1,
                    position.character);

            if (occurrences) {
                const result: Location[] = [];
                for (const symbol of occurrences) {
                    if (symbol.definition) {
                        const location =
                            new Location(
                                Uri.parse(symbol.source),
                                Utilities.symbolNameRange(symbol)
                            );
                        result.push(location);
                    }
                }
                resolve(result);
            } else {
                resolve(undefined);
            }
        });
    }
}