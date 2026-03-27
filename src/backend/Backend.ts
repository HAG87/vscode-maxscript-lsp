/*
* Contact layer between providers and backend business logic
*/
import * as fs from 'fs';
import { dirname, isAbsolute, resolve as pathResolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import {
    DiagnosticType, IBackendAstSettings, IBackendTraceSettings, ICodeFormatSettings, IDiagnosticEntry, ILexicalRange, IMinifySettings, IPrettifySettings,
    ISemanticToken, ISymbolInfo,
} from './types.js';
import {
    CallHierarchyCallModel,
    CallHierarchyDescriptor,
    CallHierarchyItemModel,
    CallHierarchyService,
} from './callHierarchy/CallHierarchyService.js';
import { FoldingRangeService } from './folding/FoldingRangeService.js';
import { LinkedEditingService } from './linkedEditing/LinkedEditingService.js';
import { ASTQuery } from './ast/ASTQuery.js';
import { Program, ScopeNode, VariableDeclaration, VariableReference } from './ast/ASTNodes.js';
import { IformatterResult } from './formatting/simpleCodeFormatter.js';
import { SourceContext } from './SourceContext.js';

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
    //──────────────────────────────────────────────────────────────────
    // Fields
    // All mutable state: loaded contexts, workspace globals index,
    // runtime dependency graph, live editor buffers, and settings.
    //──────────────────────────────────────────────────────────────────

    /** One entry per loaded document URI. refCount tracks how many owners have acquired the context. */
    private sourceContexts: Map<string, IContextEntry> = new Map<string, IContextEntry>();

    /** Workspace-global declarations keyed by declaring file URI, and by lower-cased name. */
    private workspaceGlobalsByUri: Map<string, VariableDeclaration[]> = new Map<string, VariableDeclaration[]>();
    private workspaceGlobalsByName: Map<string, VariableDeclaration[]> = new Map<string, VariableDeclaration[]>();
    /** Reverse map: which URI declared each VariableDeclaration node. */
    private workspaceGlobalDeclSource: Map<VariableDeclaration, string> = new Map<VariableDeclaration, string>();
    /** URIs whose global index is stale and must be rebuilt on next access. */
    private dirtyWorkspaceGlobalUris: Set<string> = new Set<string>();

    /** Directed graph of runtime `include` / dependency edges between file URIs. */
    private runtimeDependencyGraph: Map<string, Set<string>> = new Map<string, Set<string>>();

    /** Unsaved editor buffer text, keyed by normalized file URI. */
    private liveDocumentTextByUri: Map<string, string> = new Map<string, string>();

    private traceSettings: IBackendTraceSettings = {
        tracePerformance: false,
        traceParserDecisions: false,
        traceRouting: false,
    };
    private astSettings: IBackendAstSettings = {
        contextualSemanticTokens: true,
    };

    /** Monotonically incremented whenever the workspace globals index changes. */
    private workspaceGlobalsVersion: number = 0;

    private readonly callHierarchyService: CallHierarchyService = new CallHierarchyService();
    private readonly foldingRangeService: FoldingRangeService = new FoldingRangeService();
    private readonly linkedEditingService: LinkedEditingService = new LinkedEditingService();

    public constructor() { }

    //──────────────────────────────────────────────────────────────────
    // Settings
    // Fan-out methods that apply updated settings to all live contexts.
    //──────────────────────────────────────────────────────────────────

    public updateTraceSettings(settings: IBackendTraceSettings): void
    {
        this.traceSettings = { ...settings };
        for (const entry of this.sourceContexts.values()) {
            entry.context.updateTraceSettings(this.traceSettings);
        }
    }

    public updateAstSettings(settings: IBackendAstSettings): void
    {
        this.astSettings = { ...settings };
        for (const entry of this.sourceContexts.values()) {
            entry.context.updateAstSettings(this.astSettings);
        }
    }

    //──────────────────────────────────────────────────────────────────
    // URI & Key Utilities
    // Helpers for normalizing and looking up document URIs in the
    // sourceContexts map, handling platform path differences.
    //──────────────────────────────────────────────────────────────────

    /** Canonicalizes a file: URI so that equivalent paths always map to the same key. */
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

    /** Returns the key already present in sourceContexts that corresponds to the given URI, if any. */
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

    /** Scans loaded keys for one whose fs-path matches the given absolute path (case-insensitive on Windows). */
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

    //──────────────────────────────────────────────────────────────────
    // Context Lifecycle — Public
    // Methods for acquiring, borrowing, preloading, and releasing
    // SourceContext instances. acquireContext() increments refCount;
    // releaseContext() decrements it and unloads when it reaches zero.
    //──────────────────────────────────────────────────────────────────

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

    /**
     * Get or load a source context for a document, incrementing its reference count.
     * @param uri The document URI
     * @param source Optional document content (reads from file if not provided)
     */
    public acquireContext(uri: string, source?: string): SourceContext
    {
        const targetUri = this.findLoadedContextKey(uri) ?? this.normalizeContextUri(uri);
        return this.loadDocument(targetUri, source, true);
    }

    /**
     * Return an existing context without incrementing refCount, or load one transiently.
     * Use this for read-only operations that should not prolong the context's lifetime.
     */
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
     * Preload a context without triggering an initial parse.
     * Useful for warming up contexts before the first real request.
     */
    public preloadContext(uri: string, source?: string): SourceContext
    {
        const targetUri = this.findLoadedContextKey(uri) ?? this.normalizeContextUri(uri);
        return this.preloadDocument(targetUri, source);
    }

    /**
     * Release a context when it's no longer needed.
     * Decrements reference count and removes the context when it reaches zero.
     */
    public releaseContext(uri: string): void
    {
        const key = this.findLoadedContextKey(uri) ?? this.normalizeContextUri(uri);
        this.unloadDocument(key);
    }

    /**
     * Acquire a dependency context on behalf of an owner document.
     * Records the dependency edge so it is released together with the owner.
     */
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

    /** Release a dependency acquired via acquireDependencyContext(). */
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

    /** Returns the SourceContext for a URI if it is already loaded, without creating a new one. */
    public getExistingContext(uri: string): SourceContext | undefined
    {
        const key = this.findLoadedContextKey(uri) ?? this.normalizeContextUri(uri);
        return this.sourceContexts.get(key)?.context;
    }

    /** @deprecated Prefer acquireContext() or borrowContext() to make ownership explicit. */
    public getContext(uri: string, source?: string): SourceContext
    {
        return this.acquireContext(uri, source);
    }

    //──────────────────────────────────────────────────────────────────
    // Live Document Text
    // Stores the unsaved editor buffer for open documents so that
    // parse operations always use the latest in-memory content.
    //──────────────────────────────────────────────────────────────────

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

    //──────────────────────────────────────────────────────────────────
    // Document I/O & Parsing
    // Reading text from disk, pushing new text into a context, and
    // triggering a reparse.
    //──────────────────────────────────────────────────────────────────

    /** Read document text from the file system. */
    public getDocumentText(uri: string): string
    {
        return fs.readFileSync(fileURLToPath(new URL(uri)), "utf8");
    }

    /**
     * Update the text content of a loaded context.
     * Call this before reparsing or requesting completions.
     * @deprecated Use SourceContext.setText() instead.
     */
    public setText(uri: string, source?: string): void
    {
        const normalizedUri = this.normalizeContextUri(uri);
        const key = this.findLoadedContextKey(normalizedUri) ?? normalizedUri;
        const ctxEntry = this.sourceContexts.get(key);
        if (ctxEntry) {
            ctxEntry.context.setText(source ?? this.getDocumentText(key));
        }
    }

    /**
     * Triggers a reparse of a loaded document.
     * The document must have been acquired before calling this.
     */
    public reparse(uri: string): void
    {
        const normalizedUri = this.normalizeContextUri(uri);
        const key = this.findLoadedContextKey(normalizedUri) ?? normalizedUri;
        const ctxEntry = this.sourceContexts.get(key);
        if (ctxEntry) {
            ctxEntry.context.parse();
            this.markWorkspaceGlobalsDirty(key);
        }
    }

    //──────────────────────────────────────────────────────────────────
    // Cross-file AST Resolution
    // Resolves a fileIn/include target path to its parsed AST,
    // loading the target document as a dependency if necessary.
    //──────────────────────────────────────────────────────────────────

    public getResolvedFileInAst(sourceUri: string, fileInTarget: string): Program | undefined
    {
        const target = fileInTarget.trim();
        if (!target || target.startsWith('$')) {
            return undefined;
        }

        const sourceFsPath = fileURLToPath(new URL(sourceUri));
        const sourceDir = dirname(sourceFsPath);
        const resolvedPath = isAbsolute(target)
            ? target
            : pathResolve(sourceDir, target);

        if (!fs.existsSync(resolvedPath)) {
            return undefined;
        }

        const lower = resolvedPath.toLowerCase();
        if (!lower.endsWith('.ms') && !lower.endsWith('.mcr')) {
            return undefined;
        }

        const canonicalTargetUri = this.normalizeContextUri(pathToFileURL(resolvedPath).toString());
        const targetUri = this.findLoadedContextKey(canonicalTargetUri) ?? canonicalTargetUri;

        // Always refresh from the newest available source snapshot.
        // Prefer live editor buffer when file is open; otherwise use on-disk text.
        const latestSource = this.getLiveDocumentText(targetUri)
            ?? this.getDocumentText(targetUri);
        const targetContext = this.acquireDependencyContext(sourceUri, targetUri, latestSource);
        targetContext.setText(latestSource);

        // Keep fileIn-driven member resolution in sync even before the normal delayed reparse runs.
        targetContext.parse();
        this.markWorkspaceGlobalsDirty(this.findLoadedContextKey(targetUri) ?? this.normalizeContextUri(targetUri));
        return targetContext.getResolvedAST();
    }

    //──────────────────────────────────────────────────────────────────
    // Workspace Globals Index
    // Tracks global/persistent variable declarations across all loaded
    // files using a lazy dirty-flag approach: URIs are marked dirty on
    // every parse and re-indexed on the next cross-file query.
    //──────────────────────────────────────────────────────────────────

    /** Walk the AST and collect all top-level global/persistent declarations. */
    private collectGlobalDeclarations(ast: Program): VariableDeclaration[]
    {
        const globals: VariableDeclaration[] = [];
        const seen = new Set<VariableDeclaration>();

        for (const node of ast.walk()) {
            if (!(node instanceof ScopeNode)) {
                continue;
            }
            for (const decl of node.declarations.values()) {
                if (!decl.name) {
                    continue;
                }
                if (decl.scope !== 'global' && decl.scope !== 'persistent') {
                    continue;
                }
                if (seen.has(decl)) {
                    continue;
                }
                seen.add(decl);
                globals.push(decl);
            }
        }

        return globals;
    }

    /** Remove all index entries belonging to the given URI. */
    private removeWorkspaceGlobalsForUri(uri: string): void
    {
        const previous = this.workspaceGlobalsByUri.get(uri);
        if (!previous) {
            return;
        }

        for (const decl of previous) {
            if (!decl.name) {
                continue;
            }
            const key = this.normalizeGlobalName(decl.name);
            const bucket = this.workspaceGlobalsByName.get(key);
            if (!bucket) {
                continue;
            }

            const filtered = bucket.filter(candidate => candidate !== decl);
            if (filtered.length === 0) {
                this.workspaceGlobalsByName.delete(key);
            } else {
                this.workspaceGlobalsByName.set(key, filtered);
            }

            this.workspaceGlobalDeclSource.delete(decl);
        }

        this.workspaceGlobalsByUri.delete(uri);
    }

    /** Rebuild the index for one URI from its latest resolved AST. */
    private indexWorkspaceGlobalsForUri(uri: string): void
    {
        const entry = this.sourceContexts.get(uri);
        if (!entry) {
            this.removeWorkspaceGlobalsForUri(uri);
            return;
        }

        const ast = entry.context.getResolvedAST();
        this.removeWorkspaceGlobalsForUri(uri);
        if (!ast) {
            return;
        }

        const globals = this.collectGlobalDeclarations(ast);
        this.workspaceGlobalsByUri.set(uri, globals);

        for (const decl of globals) {
            if (!decl.name) {
                continue;
            }
            const key = this.normalizeGlobalName(decl.name);
            const bucket = this.workspaceGlobalsByName.get(key) ?? [];
            bucket.push(decl);
            this.workspaceGlobalsByName.set(key, bucket);
            this.workspaceGlobalDeclSource.set(decl, uri);
        }
    }

    /** Mark a URI's globals as stale so they are re-indexed on the next access. */
    private markWorkspaceGlobalsDirty(uri: string): void
    {
        this.dirtyWorkspaceGlobalUris.add(uri);
        this.workspaceGlobalsVersion++;
    }

    /** Flush all pending dirty URIs, rebuilding their index entries. */
    private ensureWorkspaceGlobalsIndexCurrent(): void
    {
        if (this.dirtyWorkspaceGlobalUris.size === 0) {
            return;
        }

        const dirtyUris = Array.from(this.dirtyWorkspaceGlobalUris);
        this.dirtyWorkspaceGlobalUris.clear();
        for (const uri of dirtyUris) {
            this.indexWorkspaceGlobalsForUri(uri);
        }
    }

    //──────────────────────────────────────────────────────────────────
    // Workspace Globals Resolution
    // Public surface for cross-file global lookup, ambiguity checks,
    // and completion candidates. All methods flush the dirty index first.
    //──────────────────────────────────────────────────────────────────

    private normalizeGlobalName(name: string): string
    {
        return name.toLowerCase();
    }

    /**
     * Rank multiple declarations of the same global name by proximity to the requester:
     * same-file declarations come first, then declarations reachable via the shortest
     * runtime dependency path, with declaration order as a final tie-breaker.
     */
    private rankGlobalCandidates(
        candidates: VariableDeclaration[],
        requesterUri: string,
    ): Array<{ candidate: VariableDeclaration; distance: number; sameFile: boolean; index: number }>
    {
        return candidates
            .map((candidate, index) => {
                const sourceUri = this.workspaceGlobalDeclSource.get(candidate);
                const distance = sourceUri ? this.shortestDependencyDistance(requesterUri, sourceUri) : undefined;
                const sameFile = sourceUri === requesterUri;
                return {
                    candidate,
                    index,
                    distance: distance ?? Number.MAX_SAFE_INTEGER,
                    sameFile,
                };
            })
            .sort((a, b) => {
                if (a.sameFile !== b.sameFile) {
                    return a.sameFile ? -1 : 1;
                }
                if (a.distance !== b.distance) {
                    return a.distance - b.distance;
                }
                return a.index - b.index;
            });
    }

    /** Resolve a global name to its best-ranked declaration, or undefined if not found. */
    public resolveWorkspaceGlobalDeclaration(
        name: string,
        requesterUri: string,
    ): VariableDeclaration | undefined
    {
        this.ensureWorkspaceGlobalsIndexCurrent();

        const key = this.normalizeGlobalName(name);
        const candidates = this.workspaceGlobalsByName.get(key);
        if (!candidates || candidates.length === 0) {
            return undefined;
        }

        if (candidates.length === 1) {
            return candidates[0];
        }

        const ranked = this.rankGlobalCandidates(candidates, requesterUri);

        return ranked[0]?.candidate;
    }

    /**
     * Return warning diagnostics for any global variable references in the given file
     * that cannot be unambiguously resolved to a single declaration.
     */
    public getWorkspaceGlobalAmbiguityDiagnostics(requesterUri: string): IDiagnosticEntry[]
    {
        this.ensureWorkspaceGlobalsIndexCurrent();

        const entry = this.sourceContexts.get(requesterUri);
        const ast = entry?.context.getResolvedAST();
        if (!ast) {
            return [];
        }

        const diagnostics: IDiagnosticEntry[] = [];
        const emittedKeys = new Set<string>();

        for (const node of ASTQuery.walkAllNodes(ast)) {
            if (!(node instanceof VariableReference)) {
                continue;
            }

            const name = node.name;
            if (!name) {
                continue;
            }

            const candidates = this.workspaceGlobalsByName.get(this.normalizeGlobalName(name));
            if (!candidates || candidates.length < 2) {
                continue;
            }

            const ranked = this.rankGlobalCandidates(candidates, requesterUri);
            const best = ranked[0];
            const second = ranked[1];
            if (!best || !second) {
                continue;
            }

            // Only warn when ranking cannot distinguish the top candidates.
            if (best.sameFile !== second.sameFile || best.distance !== second.distance) {
                continue;
            }

            const pos = node.position;
            if (!pos) {
                continue;
            }

            const key = `${name}:${pos.start.line}:${pos.start.column}`;
            if (emittedKeys.has(key)) {
                continue;
            }
            emittedKeys.add(key);

            diagnostics.push({
                type: DiagnosticType.Warning,
                message: `Ambiguous workspace global '${name}': multiple equally-ranked declarations found.`,
                range: {
                    start: { row: pos.start.line, column: pos.start.column },
                    end: { row: pos.end.line, column: pos.end.column },
                },
            });
        }

        return diagnostics;
    }

    /**
     * Return all workspace global declarations from files other than requesterUri.
     * Used by the completion provider to offer cross-file globals in non-member context.
     */
    public getWorkspaceGlobalCompletions(requesterUri: string): VariableDeclaration[]
    {
        this.ensureWorkspaceGlobalsIndexCurrent();
        const result: VariableDeclaration[] = [];
        for (const [uri, decls] of this.workspaceGlobalsByUri) {
            if (uri === requesterUri) {
                continue;
            }
            result.push(...decls);
        }
        return result;
    }

    /** Monotonically increasing version number that increments on every globals index change. */
    public getWorkspaceGlobalsVersion(): number
    {
        return this.workspaceGlobalsVersion;
    }

    /** Returns the URI of the workspace file that owns the given global declaration, or undefined if not tracked. */
    public getDeclarationSourceUri(declaration: VariableDeclaration): string | undefined
    {
        return this.workspaceGlobalDeclSource.get(declaration);
    }

    //──────────────────────────────────────────────────────────────────
    // Runtime Dependency Graph
    // Directed graph of include/dependency edges between file URIs,
    // used to rank global declarations by proximity to the requester.
    //──────────────────────────────────────────────────────────────────

    /** Record all dependency targets for a source file, replacing any previous edges. */
    public setRuntimeDependencyTargets(sourceUri: string, dependencies: Iterable<string>): void
    {
        this.runtimeDependencyGraph.set(sourceUri, new Set(dependencies));
    }

    /** Remove a file and all edges referencing it from the dependency graph. */
    public removeRuntimeDependencyNode(uri: string): void
    {
        this.runtimeDependencyGraph.delete(uri);
        for (const deps of this.runtimeDependencyGraph.values()) {
            deps.delete(uri);
        }
    }

    /** BFS shortest path length from fromUri to targetUri, or undefined if unreachable. */
    private shortestDependencyDistance(fromUri: string, targetUri: string): number | undefined
    {
        if (fromUri === targetUri) {
            return 0;
        }

        const visited = new Set<string>([fromUri]);
        const queue: Array<{ uri: string; distance: number }> = [{ uri: fromUri, distance: 0 }];

        while (queue.length > 0) {
            const current = queue.shift();
            if (!current) {
                continue;
            }

            const edges = this.runtimeDependencyGraph.get(current.uri);
            if (!edges) {
                continue;
            }

            for (const next of edges) {
                if (visited.has(next)) {
                    continue;
                }
                const nextDistance = current.distance + 1;
                if (next === targetUri) {
                    return nextDistance;
                }

                visited.add(next);
                queue.push({ uri: next, distance: nextDistance });
            }
        }

        return undefined;
    }

    //──────────────────────────────────────────────────────────────────
    // Language Services
    // Delegates to specialized service objects (call hierarchy, linked
    // editing, folding) that operate on SourceContext instances.
    //──────────────────────────────────────────────────────────────────

    public prepareAstCallHierarchyItem(
        uri: string,
        row1Based: number,
        column0Based: number,
    ): { item: CallHierarchyItemModel; descriptor: CallHierarchyDescriptor } | undefined {
        const context = this.borrowContext(uri);
        return this.callHierarchyService.prepareItem(context, row1Based, column0Based);
    }

    public getAstCallHierarchyOutgoingCalls(descriptor: CallHierarchyDescriptor): CallHierarchyCallModel[] {
        const sourceContext = this.getExistingContext(descriptor.uri) ?? this.borrowContext(descriptor.uri);
        return this.callHierarchyService.getOutgoingCalls(
            sourceContext,
            descriptor,
            (targetUri) => this.getExistingContext(targetUri) ?? this.borrowContext(targetUri),
        );
    }

    public getAstCallHierarchyIncomingCalls(descriptor: CallHierarchyDescriptor): CallHierarchyCallModel[] {
        const targetContext = this.getExistingContext(descriptor.uri) ?? this.borrowContext(descriptor.uri);
        return this.callHierarchyService.getIncomingCalls(
            targetContext,
            descriptor,
            Array.from(this.sourceContexts.values(), (entry) => entry.context),
        );
    }

    public getAstLinkedEditingRanges(
        uri: string,
        row1Based: number,
        column0Based: number,
        sourceLineText: string,
    ): ILexicalRange[] | undefined {
        const sourceContext = this.borrowContext(uri);
        return this.linkedEditingService.getLinkedEditingRanges(
            sourceContext,
            row1Based,
            column0Based,
            sourceLineText,
        );
    }

    public getAstFoldingRanges(uri: string, sourceText: string): ILexicalRange[] {
        const sourceContext = this.borrowContext(uri);
        return this.foldingRangeService.getFoldingRanges(sourceContext, sourceText);
    }

    //──────────────────────────────────────────────────────────────────
    // Context Lifecycle — Private
    // Low-level load/preload/unload that directly manipulate
    // sourceContexts and wire up workspace-global callbacks.
    //──────────────────────────────────────────────────────────────────

    /**
     * Load (or return an existing) SourceContext for the given URI.
     * When acquire=true, refCount is incremented so releaseContext()
     * must be called when the caller no longer needs the context.
     */
    private loadDocument(uri: string, source?: string, acquire: boolean = true): SourceContext
    {
        let ctxEntry = this.sourceContexts.get(uri);

        if (!ctxEntry) {
            // new context
            const ctx = new SourceContext(uri);
            ctx.updateTraceSettings(this.traceSettings);
            ctx.configureWorkspaceGlobalLookup(
                (name, requesterUri) => this.resolveWorkspaceGlobalDeclaration(name, requesterUri),
                () => this.getWorkspaceGlobalsVersion(),
                (decl) => {
                    const declUri = this.workspaceGlobalDeclSource.get(decl);
                    return declUri ? this.sourceContexts.get(declUri)?.context.getResolvedAST() : undefined;
                },
                (sourceDocumentUri, fileInTarget) => this.getResolvedFileInAst(sourceDocumentUri, fileInTarget),
                (requesterUri) => this.getWorkspaceGlobalCompletions(requesterUri),
                (decl) => this.getDeclarationSourceUri(decl),
                (workspaceUri) => this.getExistingContext(workspaceUri)?.getResolvedAST(),
            );
            // set ctx text            
            ctx.setText(source ?? this.getDocumentText(uri));
            ctxEntry = {
                context: ctx,
                refCount: 0,
                dependencies: []
            };
            // add to SourceContexts
            this.sourceContexts.set(uri, ctxEntry);
            // do an initial parse run
            ctxEntry.context.parse();
            this.markWorkspaceGlobalsDirty(uri);
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

    /**
     * Load a SourceContext without running an initial parse.
     * The caller is responsible for calling parse() when ready.
     */
    private preloadDocument(uri: string, source?: string): SourceContext
    {
        let ctxEntry = this.sourceContexts.get(uri);
        if (!ctxEntry) {
            // new context
            const ctx = new SourceContext(uri);
            ctx.updateTraceSettings(this.traceSettings);
            ctx.configureWorkspaceGlobalLookup(
                (name, requesterUri) => this.resolveWorkspaceGlobalDeclaration(name, requesterUri),
                () => this.getWorkspaceGlobalsVersion(),
                (decl) => {
                    const declUri = this.workspaceGlobalDeclSource.get(decl);
                    return declUri ? this.sourceContexts.get(declUri)?.context.getResolvedAST() : undefined;
                },
                (sourceDocumentUri, fileInTarget) => this.getResolvedFileInAst(sourceDocumentUri, fileInTarget),
                (requesterUri) => this.getWorkspaceGlobalCompletions(requesterUri),
                (decl) => this.getDeclarationSourceUri(decl),
                (workspaceUri) => this.getExistingContext(workspaceUri)?.getResolvedAST(),
            );
            ctxEntry = {
                context: ctx,
                refCount: 0,
                dependencies: []
            };
            // set ctx text
            ctx.setText(source ?? this.getDocumentText(uri));
            // add to SourceContexts
            this.sourceContexts.set(uri, ctxEntry);
            this.markWorkspaceGlobalsDirty(uri);
        }
        // count this as a referency
        // ctxEntry!.refCount++;
        return ctxEntry.context;
    }

    /**
     * Decrement the refCount for a context and remove it when it reaches zero.
     * Also removes all transitive dependency contexts the entry owns.
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
                this.removeWorkspaceGlobalsForUri(uri);
                this.workspaceGlobalsVersion++;
                // release also all dependencies
                for (const dep of [...ctxEntry.dependencies]) {
                    this.unloadDocument(dep, ctxEntry);
                }
            }
        }
    }

}