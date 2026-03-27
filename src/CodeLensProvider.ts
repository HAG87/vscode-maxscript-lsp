import {
    CancellationToken, CodeLens, CodeLensProvider, Event, EventEmitter,
    Location, Position, ProviderResult, Range, TextDocument, Uri,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import { Utilities } from './utils.js';

/** CodeLens that carries an AST declaration anchor for deferred reference resolution. */
class AstDeclarationCodeLens extends CodeLens
{
    constructor(
        range: Range,
        public readonly uri: Uri,
        public readonly declarationLine: number,
        public readonly declarationCharacter: number,
    ) {
        super(range);
    }
}

/** Provides "N references" code lenses above AST declarations. */
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

    provideCodeLenses(document: TextDocument, token: CancellationToken): ProviderResult<CodeLens[]>
    {
        if (token.isCancellationRequested) {
            return [];
        }

        const uri = document.uri;
        const context = this.backend.getContext(uri.toString());
        const anchors = context.getAstCodeLensAnchors();
        if (anchors.length === 0) {
            return [];
        }

        const lenses: CodeLens[] = [];
        for (const anchor of anchors) {
            if (token.isCancellationRequested) {
                return [];
            }

            lenses.push(new AstDeclarationCodeLens(
                Utilities.lexicalRangeToRange(anchor.range),
                uri,
                anchor.declarationLine,
                anchor.declarationCharacter,
            ));
        }

        return lenses;
    }

    resolveCodeLens(codeLens: CodeLens, token: CancellationToken): ProviderResult<CodeLens>
    {
        if (token.isCancellationRequested) {
            return codeLens;
        }

        const lens = codeLens as AstDeclarationCodeLens;
        const context = this.backend.getContext(lens.uri.toString());
        const resolved = context.resolveAstCodeLens(lens.declarationLine, lens.declarationCharacter);
        if (!resolved) {
            return codeLens;
        }

        const parsedUris = new Map<string, Uri>();
        const locations = resolved.locations.map((location) =>
            new Location(
                parsedUris.get(location.uri)
                ?? (() => {
                    const parsed = location.uri === lens.uri.toString()
                        ? lens.uri
                        : Uri.parse(location.uri);
                    parsedUris.set(location.uri, parsed);
                    return parsed;
                })(),
                Utilities.lexicalRangeToRange(location.range),
            ));

        const declarationPosition = new Position(
            Math.max(0, resolved.declarationLine - 1),
            resolved.declarationCharacter,
        );

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
            arguments: [lens.uri, declarationPosition, locations],
        };

        return lens;
    }
}