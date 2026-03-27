import {
  CancellationToken, CodeLens, CodeLensProvider, Event, EventEmitter,
    Location, ProviderResult, Range, TextDocument, Uri,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import { ISymbolInfo } from './types.js';
import { Utilities } from './utils.js';

/** CodeLens that carries the symbol info and document URI for deferred resolution. */
class SymbolCodeLens extends CodeLens
{
    constructor(
        range: Range,
        public readonly symbol: ISymbolInfo,
        public readonly uri: Uri,
    ) {
        super(range);
    }
}

/** Provides "N references" code lenses above top-level symbol definitions. */
export class mxsCodeLensProvider implements CodeLensProvider
{
    public constructor(private backend: mxsBackend) { }

    private _onDidChangeCodeLenses = new EventEmitter<void>();

    public get onDidChangeCodeLenses(): Event<void> {
        return this._onDidChangeCodeLenses.event;
    }

    /** Notify VS Code that code lenses have changed and should be refreshed. */
    public refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }

    provideCodeLenses(document: TextDocument, _token: CancellationToken): ProviderResult<CodeLens[]>
    {
        const uri = document.uri;
        const ctx = this.backend.borrowContext(document.uri.toString());
        const symbols = ctx?.listTopLevelSymbols(false) ?? [];
        const lenses: CodeLens[] = [];

        for (const symbol of symbols) {
            if (!symbol.definition) {
                continue;
            }
            const range = Utilities.lexicalRangeToRange(symbol.definition.range);
            lenses.push(new SymbolCodeLens(range, symbol, uri));
        }

        return lenses;
    }

    resolveCodeLens(codeLens: CodeLens, _token: CancellationToken): ProviderResult<CodeLens>
    {
        const lens = codeLens as SymbolCodeLens;
        if (!lens.symbol?.definition) {
            return codeLens;
        }

        // Resolve both count and targets from the same scoped occurrence set.
        const symbolNameRange = Utilities.symbolNameRange(lens.symbol);
        const ctx = this.backend.borrowContext(lens.uri.toString());
        const occurrences =
            ctx?.symbolInfoAtPositionCtxOccurrences(
                symbolNameRange.start.line + 1,
                symbolNameRange.start.character,
            ) ?? [];
        const locations = Utilities.symbolTargets(occurrences)
            .map(target => new Location(target.uri, target.range));

        const refs = Math.max(0, locations.length - 1);
        const title = refs === 1 ? '1 reference' : `${refs} references`;

        if (refs === 0) {
            lens.command = {
                title,
                command: '',
            };
            return lens;
        }

        lens.command = {
            title,
            command: 'editor.action.showReferences',
            arguments: [lens.uri, symbolNameRange.start, locations],
        };

        return lens;
    }
}