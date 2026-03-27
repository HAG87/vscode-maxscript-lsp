import * as fs from 'fs';

import {
  ICodeFormatSettings, ILexicalRange, IMinifySettings, IPrettifySettings,
  ISemanticToken, ISymbolInfo,
} from '../types.js';
import { IformatterResult } from './formatting/simpleCodeFormatter.js';
import { SourceContext } from './SourceContext.js';
import { fileURLToPath, pathToFileURL } from 'url';

export interface IContextEntry
{
    context: SourceContext;
    //TODO:
    // this holds a counter to check the references to this ctx
    // this should serve the workspace provider
    refCount: number;
    dependencies: string[]
    // grammar: string
}

/**
 * Backend service that manages source contexts for all loaded documents.
 * 
 * ARCHITECTURE NOTES:
 * ===================
 * This class serves as the main contact point between the VS Code extension host and the
 * language processing backend. It maintains a collection of SourceContext instances (one per
 * document) and provides methods to access their functionality.
 * 
 * CURRENT DESIGN LIMITATIONS:
 * ===========================
 * 1. Too many wrapper methods: Most public methods simply forward calls to `getContext(uri).method()`.
 *    This creates unnecessary indirection and makes the API surface larger than needed.
 * 
 * 2. Single-document focus: All operations take a `uri` parameter and operate on that specific
 *    document. There's limited support for workspace-wide operations.
 * 
 * PROPOSED REFACTORING:
 * ====================
 * Consider simplifying this class by:
 * 
 * A) Direct Context Access Pattern:
 *    Instead of:
 *      backend.symbolInfoAtPosition(uri, line, char)
 *    Use:
 *      backend.getContext(uri).symbolAtPosition(line, char)
 * 
 *    Benefits:
 *    - Reduces code duplication (eliminates ~20 wrapper methods)
 *    - Makes API more discoverable (IntelliSense shows SourceContext methods)
 *    - Simplifies maintenance (changes to SourceContext don't require Backend updates)
 *    - Clearer separation: Backend = lifecycle management, SourceContext = language features
 * 
 * B) Keep Backend methods only for:
 *    - Context lifecycle (loadDocument, unloadDocument, reparse)
 *    - Workspace-wide operations (see TODO below)
 *    - Operations that coordinate multiple contexts
 * 
 * TODO: WORKSPACE-WIDE FEATURES TO IMPLEMENT:
 * ===========================================
 * The following features require searching across ALL loaded source contexts:
 * 
 * 1. Workspace Symbol Search:
 *    public findSymbolInWorkspace(symbolName: string): ISymbolInfo[]
 *    {
 *        const results: ISymbolInfo[] = [];
 *        for (const [uri, entry] of this.sourceContexts) {
 *            results.push(...entry.context.symbolTable.getAllSymbols()
 *                .filter(s => s.name.includes(symbolName)));
 *        }
 *        return results;
 *    }
 * 
 * 2. Find All References (Workspace):
 *    public findAllReferencesInWorkspace(uri: string, line: number, character: number): ISymbolInfo[]
 *    {
 *        // 1. Get symbol from source document
 *        const symbol = this.getContext(uri).symbolTable.getSymbolAtPosition(line, character);
 *        if (!symbol) return [];
 *        
 *        // 2. Search all loaded contexts for references to this symbol
 *        const results: ISymbolInfo[] = [];
 *        for (const [contextUri, entry] of this.sourceContexts) {
 *            results.push(...entry.context.symbolTable.getSymbolOccurrences(symbol.name, false));
 *        }
 *        return results;
 *    }
 * 
 * 3. Workspace Diagnostics:
 *    public getAllWorkspaceDiagnostics(): Map<string, IDiagnosticEntry[]>
 *    {
 *        const diagnostics = new Map<string, IDiagnosticEntry[]>();
 *        for (const [uri, entry] of this.sourceContexts) {
 *            if (entry.context.hasErrors) {
 *                diagnostics.set(uri, entry.context.getDiagnostics);
 *            }
 *        }
 *        return diagnostics;
 *    }
 * 
 * 4. Cross-File Symbol Resolution:
 *    Implement proper dependency tracking to resolve symbols defined in other files.
 *    This requires:
 *    - Detecting import/include statements in MaxScript
 *    - Building dependency graph
 *    - Resolving symbols across file boundaries
 *    - Updating the currently commented-out code in parseDocument()
 * 
 * 5. Rename Across Workspace:
 *    Similar to Find All References, but also updates symbol occurrences in all files.
 * 
 * MIGRATION PLAN:
 * ===============
 * To refactor this safely:
 * 1. Make sourceContexts collection accessible via getter: `get contexts() { return this.sourceContexts; }`
 * 2. Update extension providers to use direct context access pattern
 * 3. Deprecate wrapper methods (mark with @ deprecated)
 * 4. Remove wrapper methods in next major version
 * 5. Implement workspace-wide features listed above
 */
export class mxsBackend
{
    // Hold the contexts for all loaded documents
    private sourceContexts: Map<string, IContextEntry> = new Map<string, IContextEntry>();
    // Unsaved editor buffer text, keyed by normalized file URI.
    private liveDocumentTextByUri: Map<string, string> = new Map<string, string>();

    public constructor() { }

    /**
     * Direct access to the source contexts collection.
     * Use this to access SourceContext methods directly instead of using wrapper methods.
     * 
     * Example:
     *   const entry = backend.contexts.get(uri);
     *   if (entry) {
     *       const symbols = entry.context.symbolAtPosition(line, char);
     *   }
     * 
     * This pattern is preferred over wrapper methods as it:
     * - Reduces indirection
     * - Makes the API more discoverable
     * - Simplifies maintenance
     */
    public get contexts(): ReadonlyMap<string, IContextEntry>
    {
        return this.sourceContexts;
    }

    //------------------------------------------------------------------
    // Context Lifecycle Management
    //------------------------------------------------------------------

    /**
     * Get or load a source context for a document.
     * This is the primary method for accessing document contexts.
     * @param uri The document URI
     * @param source Optional document content (reads from file if not provided)
     * @returns The SourceContext for the document
     */
    public acquireContext(uri: string, source?: string): SourceContext
    {
        const targetUri = this.findLoadedContextKey(uri) ?? this.normalizeContextUri(uri);
        return this.loadDocument(targetUri, source, true);
    }

    public borrowContext(uri: string, source?: string): SourceContext
    {
        const targetUri = this.findLoadedContextKey(uri) ?? this.normalizeContextUri(uri);
        const existing = this.sourceContexts.get(targetUri);
        if (existing) {
            return existing.context;
        }
        return this.loadDocument(targetUri, source, false);
    }

    /**
     * @deprecated Prefer acquireContext() or borrowContext() to make ownership explicit.
     */
    public getContext(uri: string, source?: string): SourceContext
    {
        return this.acquireContext(uri, source);
    }

    /**
     * Preload a context without parsing.
     * Useful for preparing contexts before they're needed.
     */
    public preloadContext(uri: string, source?: string): SourceContext
    {
        const targetUri = this.findLoadedContextKey(uri) ?? this.normalizeContextUri(uri);
        return this.preloadDocument(targetUri, source);
    }
    
    /**
     * Release a context when it's no longer needed.
     * Decrements reference count and removes if reaches zero.
     */
    public releaseContext(uri: string): void
    {
        const key = this.findLoadedContextKey(uri) ?? this.normalizeContextUri(uri);
        this.unloadDocument(key)
    }
    
    private normalizeContextUri(uri: string): string
    {
        try {
            const parsed = new URL(uri);
            if (parsed.protocol === 'file:') {
                return pathToFileURL(fileURLToPath(parsed)).toString();
            }
            return uri;
        } catch {
            return uri;
        }
    }

    private normalizeGlobalName(name: string): string
    {
        return name.toLowerCase();
    }

    public setLiveDocumentText(uri: string, text: string): void
    {
        this.liveDocumentTextByUri.set(this.normalizeContextUri(uri), text);
    }

    public clearLiveDocumentText(uri: string): void
    {
        this.liveDocumentTextByUri.delete(this.normalizeContextUri(uri));
    }

    private getLiveDocumentText(uri: string): string | undefined
    {
        return this.liveDocumentTextByUri.get(this.normalizeContextUri(uri));
    }

    /** Returns the SourceContext for a URI if it is already loaded, without creating a new one. */
    public getExistingContext(uri: string): SourceContext | undefined
    {
        const key = this.findLoadedContextKey(uri) ?? this.normalizeContextUri(uri);
        return this.sourceContexts.get(key)?.context;
    }

    public acquireDependencyContext(ownerUri: string, dependencyUri: string, source?: string): SourceContext
    {
        const ownerKey = this.findLoadedContextKey(ownerUri) ?? this.normalizeContextUri(ownerUri);
        const dependencyKey = this.findLoadedContextKey(dependencyUri) ?? this.normalizeContextUri(dependencyUri);

        const ownerEntry = this.sourceContexts.get(ownerKey);
        if (!ownerEntry || ownerKey === dependencyKey) {
            return this.borrowContext(dependencyKey, source);
        }

        if (!ownerEntry.dependencies.includes(dependencyKey)) {
            ownerEntry.dependencies.push(dependencyKey);
            return this.acquireContext(dependencyKey, source);
        }

        return this.getExistingContext(dependencyKey) ?? this.acquireContext(dependencyKey, source);
    }

    public releaseDependencyContext(ownerUri: string, dependencyUri: string): void
    {
        const ownerKey = this.findLoadedContextKey(ownerUri) ?? this.normalizeContextUri(ownerUri);
        const dependencyKey = this.findLoadedContextKey(dependencyUri) ?? this.normalizeContextUri(dependencyUri);
        const ownerEntry = this.sourceContexts.get(ownerKey);
        if (!ownerEntry) {
            return;
        }

        const dependencyIndex = ownerEntry.dependencies.indexOf(dependencyKey);
        if (dependencyIndex < 0) {
            return;
        }

        ownerEntry.dependencies.splice(dependencyIndex, 1);
        this.unloadDocument(dependencyKey, ownerEntry);
    }

    private getLoadedContextUriByFsPath(fsPath: string): string | undefined
    {
        const isWindows = /^[a-zA-Z]:[\\/]/.test(fsPath);
        const expected = isWindows ? fsPath.toLowerCase() : fsPath;

        for (const key of this.sourceContexts.keys()) {
            let keyPath: string;
            try {
                keyPath = fileURLToPath(new URL(key));
            } catch {
                continue;
            }

            const normalized = isWindows ? keyPath.toLowerCase() : keyPath;
            if (normalized === expected) {
                return key;
            }
        }

        return undefined;
    }

    private findLoadedContextKey(uri: string): string | undefined
    {
        const normalized = this.normalizeContextUri(uri);
        if (this.sourceContexts.has(normalized)) {
            return normalized;
        }

        try {
            const fsPath = fileURLToPath(new URL(normalized));
            return this.getLoadedContextUriByFsPath(fsPath);
        } catch {
            return undefined;
        }
    }

    /**
     * Triggers a reparse of a loaded document.
     * Document must have been loaded before calling this.
     * @param uri The document uri
     */
    public reparse(uri: string): void
    {
        const normalizedUri = this.normalizeContextUri(uri);
        const key = this.findLoadedContextKey(normalizedUri) ?? normalizedUri;
        const ctxEntry = this.sourceContexts.get(key);
        if (ctxEntry) {
            this.parseDocument(ctxEntry);
        }
    }

    /**
     * Read document text from file system.
     * @param uri The document URI
     * @returns Document content
     */
    public getDocumentText(uri: string): string
    {
        return fs.readFileSync(fileURLToPath(new URL(uri)), "utf8");
    }

    /**
     * Update the text content of a loaded context.
     * Call this before reparsing or code completion.
     * @param uri The document uri
     * @param source The document content, or undefined to read from file
     * @deprecated Use SourceContext.setText() instead.
     */
    public setText(uri: string, source?: string): void
    {
        const normalizedUri = this.normalizeContextUri(uri);
        if (source !== undefined) {
            this.liveDocumentTextByUri.set(normalizedUri, source);
        }

        const key = this.findLoadedContextKey(normalizedUri) ?? normalizedUri;
        const ctxEntry = this.sourceContexts.get(key);
        if (ctxEntry) {
            ctxEntry.context.setText(source ?? this.getLiveDocumentText(key) ?? this.getDocumentText(key));
        }
    }

    //------------------------------------------------------------------
    // Private Context Management
    //------------------------------------------------------------------
    private parseDocument(contextEntry: IContextEntry): void
    {
        contextEntry.context.parse();
    }

    /**
     * Add sourceContext
     * @param uri the document uri
     * @param source the document text
     * @returns 
     */
    private loadDocument(uri: string, source?: string, acquire: boolean = true): SourceContext
    {
        let ctxEntry = this.sourceContexts.get(uri);

        if (!ctxEntry) {
            // new context
            const ctx = new SourceContext(uri);
            // set ctx text            
            ctx.setText(source ?? this.getLiveDocumentText(uri) ?? this.getDocumentText(uri));
            ctxEntry = {
                context: ctx,
                refCount: 0,
                dependencies: []
            };
            // add to SourceContexts
            this.sourceContexts.set(uri, ctxEntry);            
            // do an initial parse run
            this.parseDocument(ctxEntry);
        }
        /*
        if (!ctxEntry.context.compareText(source ?? this.getDocumentText(uri)))
        {
            this.parseDocument(ctxEntry);
        }
        */
        // Count this as an ownership reference when explicitly acquired.
        if (acquire) {
            ctxEntry!.refCount++;
        }
        return ctxEntry.context;
    }

    private preloadDocument(uri: string, source?: string): SourceContext
    {
        let ctxEntry = this.sourceContexts.get(uri);
        if (!ctxEntry) {
            // new context
            const ctx = new SourceContext(uri);
            ctxEntry = {
                context: ctx,
                refCount: 0,
                dependencies: []
            };
            // set ctx text
            ctx.setText(source ?? this.getLiveDocumentText(uri) ?? this.getDocumentText(uri));
            // add to SourceContexts
            this.sourceContexts.set(uri, ctxEntry);            
        }
        // count this as a referency
        // ctxEntry!.refCount++;
        return ctxEntry.context;
    }

    /**
     * Remove SourceContext
     * @param uri 
     * @param referencing 
     */
    private unloadDocument(uri: string, referencing?: IContextEntry): void
    {
        const ctxEntry = this.sourceContexts.get(uri);
        if (ctxEntry) {
            if (referencing) {
                // If a referencing context is given remove this one from the reference's dependencies list,
                // which in turn will remove the referencing context from the dependency's referencing list.
                referencing.context.removeDependency(ctxEntry.context);
            }
            ctxEntry.refCount--;
            if (ctxEntry.refCount === 0) {
                this.sourceContexts.delete(uri);
                this.clearLiveDocumentText(uri);
                // release also all dependencies
                for (const dep of [...ctxEntry.dependencies]) {
                    this.unloadDocument(dep, ctxEntry);
                }
            }
        }
    }
}