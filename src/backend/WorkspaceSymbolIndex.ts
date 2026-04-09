import { mxsSimpleSymbolProvider } from './symbols/simpleSymbolProvider.js';
import { ISymbolInfo } from '@backend/types.js';
import { mxsBackend } from './Backend.js';

/**
 * Incremental workspace symbol index.
 *
 * Maintains per-file symbol snapshots and only re-extracts symbols for files
 * that have been marked dirty since the last query. This reduces the cost of
 * workspace symbol updates from O(all_files × extraction_time) per keystroke
 * to O(1) on edit and O(changed_files × extraction_time) on query.
 *
 * Lifecycle:
 *   1. Construct with the shared backend instance.
 *   2. Call seedUris() once with all workspace file URIs to register them.
 *   3. Call setFileDirty(uri) whenever a document is saved/reparsed.
 *   4. Call removeFile(uri) when a document is closed or deleted.
 *   5. Call getAll() / findByName() at query time; dirty files are refreshed lazily.
 */
export class WorkspaceSymbolIndex
{
    private readonly symbolProvider = new mxsSimpleSymbolProvider();
    private readonly fileSymbols: Map<string, ISymbolInfo[]> = new Map();
    private readonly dirtyFiles: Set<string> = new Set();
    private initialized: boolean = false;

    constructor(private readonly backend: mxsBackend) {}

    // ------------------------------------------------------------------
    // Registration
    // ------------------------------------------------------------------

    /**
     * Register a set of workspace URIs.  Already-known URIs are not re-queued.
     * All newly registered URIs are marked dirty and will be extracted on the
     * next call to getAll() / findByName().
     */
    seedUris(uris: string[]): void
    {
        for (const uri of uris) {
            if (!this.fileSymbols.has(uri)) {
                this.dirtyFiles.add(uri);
            }
        }
        this.initialized = true;
    }

    // ------------------------------------------------------------------
    // Mutations
    // ------------------------------------------------------------------

    /** Mark a file as needing re-extraction on the next query. */
    setFileDirty(uri: string): void
    {
        this.dirtyFiles.add(uri);
    }

    /** Remove a file from the index entirely (file closed or deleted). */
    removeFile(uri: string): void
    {
        this.fileSymbols.delete(uri);
        this.dirtyFiles.delete(uri);
    }

    // ------------------------------------------------------------------
    // Internal refresh
    // ------------------------------------------------------------------

    /**
     * Re-extract symbols for all dirty files synchronously.
     * Called lazily at the start of every query method.
     */
    private refreshDirty(): void
    {
        for (const uri of this.dirtyFiles) {
            try {
                const text = this.backend.getDocumentText(uri);
                this.fileSymbols.set(uri, this.symbolProvider.getSymbols(uri, text));
            } catch {
                // File may have been deleted between the dirty-mark and the query;
                // remove it from the snapshot so stale data is not served.
                this.fileSymbols.delete(uri);
            }
        }
        this.dirtyFiles.clear();
    }

    // ------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------

    /** True once seedUris() has been called at least once. */
    get isInitialized(): boolean
    {
        return this.initialized;
    }

    /** True when no files are pending re-extraction. */
    get isClean(): boolean
    {
        return this.dirtyFiles.size === 0;
    }

    // ------------------------------------------------------------------
    // Queries
    // ------------------------------------------------------------------

    /**
     * Return all indexed symbols, refreshing dirty files first.
     * VS Code performs its own fuzzy filtering on the returned list,
     * so returning the full set is correct when the query is empty.
     */
    getAll(): ISymbolInfo[]
    {
        this.refreshDirty();
        const result: ISymbolInfo[] = [];
        for (const symbols of this.fileSymbols.values()) {
            result.push(...symbols);
        }
        return result;
    }

    /**
     * Return symbols whose names include the query string (case-insensitive),
     * refreshing dirty files first.
     */
    findByName(query: string): ISymbolInfo[]
    {
        this.refreshDirty();
        const lc = query.toLowerCase();
        const result: ISymbolInfo[] = [];
        for (const symbols of this.fileSymbols.values()) {
            for (const s of symbols) {
                if (s.name.toLowerCase().includes(lc)) {
                    result.push(s);
                }
            }
        }
        return result;
    }
}
