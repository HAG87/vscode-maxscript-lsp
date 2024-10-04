import { readlinkSync } from 'node:fs';

import {
  CancellationToken, Location, Position, SymbolInformation,
  Uri, workspace, WorkspaceSymbolProvider,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import { mxsSimpleSymbolProvider } from './backend/simpleSymbolProvider.js';
import { translateSymbolKind } from './Symbol.js';
import { ISymbolInfo } from './types.js';
import { Utilities } from './utils.js';

export class mxsWorkspaceSymbolProvider implements WorkspaceSymbolProvider
{
    private symbolProvider: mxsSimpleSymbolProvider;
    private workspaceSymbolsCollection: SymbolInformation[] = [];
    private workspaceSymbolsMap: Map<string, ISymbolInfo[]> = new Map();

    public constructor(private backend: mxsBackend)
    {
        this.symbolProvider = new mxsSimpleSymbolProvider()
        // this.resolveWorkspaceSymbols().then(() => this.collectWorkspaceSymbols());
    }

    async collectDocuments(): Promise<string[]>
    {
        const paths: string[] = [];

        async function collect(uri: Uri): Promise<string[]>
        {
            const result: string[] = [];
            const files = await workspace.fs.readDirectory(uri)
            for (const file of files) {
                switch (file[1]) {
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
                    case 64:
                        {
                            const dest = readlinkSync(file[0])
                            if (
                                dest.toLowerCase().endsWith('.ms') ||
                                dest.toLowerCase().endsWith('.mcr')
                            ) {
                                result.push(file[0])
                            }
                        }
                        break;
                }
            }
            return result;
        }

        const folders = workspace.workspaceFolders;
        if (folders) {
            for (const folder of folders) {
                paths.push(...await collect(folder.uri));
            }
        }

        return paths;
    }

    private resolveSymbolInfo(uri?: string): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            if (!uri) {
                this.collectDocuments().then((documents) =>
                {
                    for (const document of documents) {
                        // get simple symbols
                        this.workspaceSymbolsMap.set(document,
                            this.symbolProvider.getSymbols(document, this.backend.getDocumentText(document))
                        )
                    }
                    resolve()
                }, (_err) => reject());
            } else {
                // get simple symbols        
                this.workspaceSymbolsMap.set(uri,
                    this.symbolProvider.getSymbols(uri, this.backend.getDocumentText(uri))
                )
                resolve()
            }
        })
    }

    private collectWorkspaceSymbols(): void
    {
        // this.workspaceSymbolsCollection = [...this.workspaceSymbolsMap.values()].flat()
        this.workspaceSymbolsCollection = [];

        const symbolInfo = [...this.workspaceSymbolsMap.values()].flat().map((symbol) =>
        {
            return new SymbolInformation(
                symbol.name,
                translateSymbolKind(symbol.kind),
                '',
                // /*
                new Location(
                    Uri.parse(symbol.source),
                    // Utilities.lexicalRangeToRange(symbol.definition!.range)
                    // <Range>{}
                    // /*
                    new Position(
                        symbol.definition!.range.start.row === 0 ? 0 : symbol.definition!.range.start.row - 1,
                        symbol.definition!.range.start.column
                    )
                    // */
                )
            )
        })
        this.workspaceSymbolsCollection.push(...symbolInfo)
        /*
        this.workspaceSymbolsMap.forEach((symbols, uri) =>
        {
            const symbolInfo = symbols.map((symbol): SymbolInformation =>
            {
                return new SymbolInformation(
                    symbol.name,
                    translateSymbolKind(symbol.kind),
                    '',
                    new Location(
                        Uri.parse(uri),
                        new Position(
                            symbol.definition!.range.start.row === 0 ? 0 : symbol.definition!.range.start.row - 1,
                            symbol.definition!.range.start.column
                        )
                    )
                )
            })
            this.workspaceSymbolsCollection.push(...symbolInfo)
        });
        // */
    }
    public updateWorkspaceSymbols(uri: string)
    {
        // console.log('Updating workspace symbols')
        this.resolveSymbolInfo(uri).then(
            () => this.collectWorkspaceSymbols()
        )
    }
    
    provideWorkspaceSymbols(query: string, token: CancellationToken): Promise<SymbolInformation[]>
    {
        return new Promise<SymbolInformation[]>((resolve, reject) =>
        {
            token.onCancellationRequested(() =>
            {
                resolve([])
                return;
            })

            if (this.workspaceSymbolsCollection.length === 0) {
                this.resolveSymbolInfo().then(() =>
                {
                    // derive symbols
                    this.collectWorkspaceSymbols()
                    resolve(this.workspaceSymbolsCollection)
                    // resolve(this.workspaceSymbolsCollection.filter( (symbol) => symbol.name.toLowerCase().includes(query.toLowerCase())) )
                }, () => resolve([]));
            } else {
                resolve(this.workspaceSymbolsCollection)
                // resolve(this.workspaceSymbolsCollection.filter( (symbol) => symbol.name.toLowerCase().includes(query.toLowerCase())) )
            }
        })
    }
    resolveWorkspaceSymbol?(symbol: SymbolInformation, _token: CancellationToken): Promise<SymbolInformation>
    {
        return new Promise<SymbolInformation>((resolve, reject) =>
        {
            const docUri = symbol.location.uri.toString()
            //resolve range
            if (this.workspaceSymbolsMap.has(docUri)) {
                // this is guaranteed to exist
                const symbolRef = this.workspaceSymbolsMap.get(docUri)!.find((s) => s.name === symbol.name)!;
                symbol.location.range = Utilities.lexicalRangeToRange(symbolRef.definition!.range)
            }
            resolve(symbol)
        })
    }
}