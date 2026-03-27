/*
THIS IS BROKEN!
TODO:
 - Fix references for symbols with the same name or referenced from an enclosed construct (like calling a method of a structure that initiated into a variable)
*/
import {
  CancellationToken, Location, Position, ProviderResult,
    ReferenceContext, ReferenceProvider, TextDocument,
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
        token: CancellationToken): ProviderResult<Location[]>
    {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const occurrences =
            this.backend.getContext(document.uri.toString()).symbolInfoAtPositionCtxOccurrences(
                position.line + 1,
                position.character);

        if (occurrences) {
            const result: Location[] = [];
            const targets = Utilities.symbolTargets(occurrences);
            for (const target of targets) {
                result.push(new Location(target.uri, target.range));
            }
            return result;
        }

        return undefined;
    }
}