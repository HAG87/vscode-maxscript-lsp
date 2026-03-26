/**
 * Workspace Symbol Provider
 * Provides symbols across the entire workspace using an incremental index.
 */
import {
  CancellationToken, Location, SymbolInformation,
  Uri, workspace, WorkspaceSymbolProvider,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import { WorkspaceSymbolIndex } from '@backend/WorkspaceSymbolIndex.js';
import { translateSymbolKind } from './SymbolTranslator.js';
import { ISymbolInfo } from '@backend/types.js';
import { Utilities } from './utils.js';

export class mxsWorkspaceSymbolProvider implements WorkspaceSymbolProvider
{
    private readonly index: WorkspaceSymbolIndex;

    public constructor(private backend: mxsBackend)
    {
        this.index = new WorkspaceSymbolIndex(backend);
    }

    async collectDocuments(): Promise<string[]>
    {
        async function collect(uri: Uri): Promise<string[]>
        {
            const result: string[] = [];
            const files = await workspace.fs.readDirectory(uri)
            for (const file of files) {
                switch (file[1] as number) {
                    case 2:
                        result.push(...await collect(Uri.joinPath(uri, file[0])))
                        break;
                    case 1:
                        if (
                            file[0].toLowerCase().endsWith('.ms') //|| file[0].toLowerCase().endsWith('.mcr')
                        ) {
                            result.push(Uri.joinPath(uri, file[0]).toString())
                        }
                        break;
                    case 65: // FileType.File | FileType.SymbolicLink
                        if (
                            file[0].toLowerCase().endsWith('.ms') || file[0].toLowerCase().endsWith('.mcr')
                        ) {
                            result.push(Uri.joinPath(uri, file[0]).toString())
                        }
                        break;
                    case 66: // FileType.Directory | FileType.SymbolicLink
                        result.push(...await collect(Uri.joinPath(uri, file[0])))
                        break;
                }
            }
            return result;
        }

        const folders = workspace.workspaceFolders;
        const paths: string[] = [];

        if (folders) {
            for (const folder of folders) {
                paths.push(...await collect(folder.uri));
            }
        }

        return paths;
    }

    private symbolInfoToSymbolInformation(symbol: ISymbolInfo): SymbolInformation
    {
        return new SymbolInformation(
            symbol.name,
            translateSymbolKind(symbol.kind),
            '',
            new Location(
                Uri.parse(symbol.source),
                Utilities.lexicalRangeToRange(symbol.definition!.range)
            )
        );
    }

    /**
     * Called by ExtensionHost after a document reparse.
     * O(1) — marks the file dirty in the index without doing any extraction work.
     * Extraction is deferred to the next provideWorkspaceSymbols() call.
     */
    public updateWorkspaceSymbols(uri: string): void
    {
        this.index.setFileDirty(uri);
    }

    provideWorkspaceSymbols(query: string, token: CancellationToken): Promise<SymbolInformation[]>
    {
        return new Promise<SymbolInformation[]>((resolve) =>
        {
            if (token.isCancellationRequested) {
                resolve([]);
                return;
            }

            const cancelSubscription = token.onCancellationRequested(() =>
            {
                cancelSubscription.dispose();
                resolve([]);
                return;
            });

            const serve = (): SymbolInformation[] =>
            {
                // VS Code does its own fuzzy filtering on the returned list,
                // so we only apply our own filter when a query is present to
                // avoid returning the full workspace set on every keystroke.
                const symbols = query
                    ? this.index.findByName(query)
                    : this.index.getAll();
                return symbols
                    .filter(s => s.definition !== undefined)
                    .map(s => this.symbolInfoToSymbolInformation(s));
            };

            if (!this.index.isInitialized) {
                // First call — seed the index with all workspace files.
                this.collectDocuments().then((uris) =>
                {
                    if (token.isCancellationRequested) {
                        cancelSubscription.dispose();
                        resolve([]);
                        return;
                    }
                    this.index.seedUris(uris);
                    cancelSubscription.dispose();
                    resolve(serve());
                }, () => {
                    cancelSubscription.dispose();
                    resolve([]);
                });
            } else {
                cancelSubscription.dispose();
                resolve(serve());
            }
        });
    }

    resolveWorkspaceSymbol?(symbol: SymbolInformation, _token: CancellationToken): Promise<SymbolInformation>
    {
        // Full range is already included in the Location produced by provideWorkspaceSymbols,
        // so no additional resolution is needed.
        return Promise.resolve(symbol);
    }
}