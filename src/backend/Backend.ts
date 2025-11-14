import * as fs from 'fs';
import { Uri } from 'vscode';

import {
  ICodeFormatSettings, ILexicalRange, IMinifySettings, IPrettifySettings,
  ISemanticToken, ISymbolInfo,
} from '../types.js';
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
 * 3. Deprecate wrapper methods (mark with @deprecated)
 * 4. Remove wrapper methods in next major version
 * 5. Implement workspace-wide features listed above
 */
export class mxsBackend
{
    // Hold the contexts for all loaded documents
    private sourceContexts: Map<string, IContextEntry> = new Map<string, IContextEntry>();

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
    public getContext(uri: string, source?: string): SourceContext
    {
        return this.loadDocument(uri, source);
    }
    
    /**
     * Preload a context without parsing.
     * Useful for preparing contexts before they're needed.
     */
    public preloadContext(uri: string, source?: string): SourceContext
    {
        return this.preloadDocument(uri, source);;
    }
    
    /**
     * Release a context when it's no longer needed.
     * Decrements reference count and removes if reaches zero.
     */
    public releaseContext(uri: string)
    {
        this.unloadDocument(uri)
    }
    
    /**
     * Triggers a reparse of a loaded document.
     * Document must have been loaded before calling this.
     * @param uri The document uri
     */
    public reparse(uri: Uri): void
    {
        const ctxEntry = this.sourceContexts.get(uri.toString());
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
        return fs.readFileSync(Uri.parse(uri).fsPath, "utf8");
    }

    /**
     * Update the text content of a loaded context.
     * Call this before reparsing or code completion.
     * @param uri The document uri
     * @param source The document content, or undefined to read from file
     */
    public setText(uri: string, source?: string): void
    {
        const ctxEntry = this.sourceContexts.get(uri.toString());
        if (ctxEntry) {
            ctxEntry.context.setText(source ?? this.getDocumentText(uri));
        }
    }

    //------------------------------------------------------------------
    // Private Context Management
    //------------------------------------------------------------------
    private parseDocument(contextEntry: IContextEntry): void
    {
        contextEntry.context.parse();
        /* //TODO:
            const oldDependencies = contextEntry.dependencies;
            contextEntry.dependencies = [];
            const newDependencies = contextEntry.context.parse();

            for (const dep of newDependencies) {
                const depContext = this.loadDependency(contextEntry, dep);
                if (depContext) {
                    contextEntry.context.addAsReferenceTo(depContext);
                }
            }

            // Release all old dependencies. This will only unload grammars which have
            // not been ref-counted by the above dependency loading (or which are not used by other
            // grammars).
            for (const dep of oldDependencies) {
                this.unloadDocument(dep);
            }
        */
    }

    /**
     * Add sourceContext
     * @param uri the document uri
     * @param source the document text
     * @returns 
     */
    private loadDocument(uri: string, source?: string): SourceContext
    {
        let ctxEntry = this.sourceContexts.get(uri);
        if (!ctxEntry) {
            // new context
            const ctx = new SourceContext(uri);
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
            this.parseDocument(ctxEntry);
        }
        /*
        if (!ctxEntry.context.compareText(source ?? this.getDocumentText(uri)))
        {
            this.parseDocument(ctxEntry);
        }
        */
        // count this as a referency
        ctxEntry!.refCount++;
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
            ctx.setText(source ?? this.getDocumentText(uri));
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
                // release also all dependencies
                for (const dep of ctxEntry.dependencies) {
                    this.unloadDocument(dep, ctxEntry);
                }
            }
        }
    }

    //------------------------------------------------------------------
    // Wrapper Methods (Consider Deprecating)
    //------------------------------------------------------------------
    // These methods forward calls to SourceContext instances.
    // REFACTORING NOTE: Consider replacing these with direct context access:
    //   Instead of: backend.symbolInfoAtPosition(uri, line, char)
    //   Use: backend.contexts.get(uri)?.context.symbolAtPosition(line, char)
    //
    // Keeping these temporarily for backward compatibility, but they add
    // unnecessary indirection. Future versions should use direct access.
    //------------------------------------------------------------------
    
    // Symbol Information
    /**
     * @deprecated Consider using: backend.contexts.get(uri)?.context.symbolAtPosition(line, character)
     */
    public symbolInfoAtPosition(
        uri: string,
        line: number,
        character: number): ISymbolInfo | undefined
    {
        return this.getContext(uri).symbolAtPosition(line, character);
    }

    /**
     * @deprecated Consider using: backend.contexts.get(uri)?.context.symbolDefinition(line, character)
     */
    public symbolInfoDefinition(
        uri: string,
        line: number,
        character: number): ISymbolInfo | undefined
    {
        return this.getContext(uri).symbolDefinition(line, character);
    }

    /**
     * @deprecated Consider using: backend.contexts.get(uri)?.context.getSymbolInfo(symbol)
     */
    public infoForSymbol(uri: string, symbol: string)
    {
        return this.getContext(uri).getSymbolInfo(symbol);
    }

    /**
     * @deprecated Consider using: backend.contexts.get(uri)?.context.enclosingSymbolAtPosition(...)
     */
    public enclosingSymbolAtPosition(
        uri: string,
        line: number,
        character: number,
        ruleScope = false)
    {
        return this.getContext(uri).enclosingSymbolAtPosition(line, character, ruleScope);
    }

    /**
     * Returns a list of top level symbols from a file (and optionally its dependencies).
     *
     * @param fileName The grammar file name.
     * @param full If true, includes symbols from all dependencies as well.
     * @returns A list of symbol info entries.
     * @deprecated Consider using: backend.contexts.get(uri)?.context.listTopLevelSymbols(!fullList)
     */
    public listTopLevelSymbols(uri: string, fullList: boolean): ISymbolInfo[]
    {
        return this.getContext(uri).listTopLevelSymbols(!fullList);
    }

    /**
     * Determines source file and position of all occurrences of the given symbol. The search includes
     * also all referencing and referenced contexts.
     *
     * @param fileName The grammar file name.
     * @param symbolName The name of the symbol to check.
     * @returns A list of symbol info entries, each describing one occurrence.
     */
    public getSymbolOccurrences(uri: string, symbolName: string): ISymbolInfo[]
    {
        const result = this.getContext(uri).symbolTable.getSymbolOccurrences(symbolName, false);
        // Sort result by kind. This way rule definitions appear before rule references and are re-parsed first.
        return result.sort((lhs: ISymbolInfo, rhs: ISymbolInfo) => lhs.kind - rhs.kind);
    }

    public symbolInfoAtPositionCtxOccurrences(
        uri: string,
        line: number,
        character: number): ISymbolInfo[] | undefined
    {
        const context = this.getContext(uri);
        const symbol = context.symbolTable.getSymbolAtPosition(line, character);

        if (!symbol) { return undefined; }

        const result = context.symbolTable.getScopedSymbolOccurrences(symbol)

        return result.sort((lhs: ISymbolInfo, rhs: ISymbolInfo) => lhs.kind - rhs.kind);
    }

    // Code Completion
    /**
     * @deprecated Consider using: backend.contexts.get(uri)?.context.getCodeCompletionCandidates(...)
     */
    public async getCodeCompletionCandidates(
        uri: string,
        line: number,
        character: number): Promise<ISymbolInfo[]>
    {
        return this.getContext(uri).getCodeCompletionCandidates(line, character);
    }

    // Diagnostics
    /**
     * @deprecated Consider using: backend.contexts.get(uri)?.context.getDiagnostics
     */
    public getDiagnostics(uri: string)
    {
        return this.getContext(uri).getDiagnostics;
    }

    /**
     * @deprecated Consider using: backend.contexts.get(uri)?.context.hasErrors
     */
    public hasErrors(uri: string): boolean
    {
        return this.getContext(uri).hasErrors;
    }

    // Semantic Tokens
    /**
     * @deprecated Consider using: backend.contexts.get(uri)?.context.getSemanticTokens
     */
    public getDocumentSemanticTokens(uri: string): ISemanticToken[]
    {
        return this.getContext(uri).getSemanticTokens;
    }

    // Formatting
    /**
     * @deprecated Consider using: backend.contexts.get(uri)?.context.formatCode(range, options)
     */
    public formatCode(uri: string, range: ILexicalRange, options?: ICodeFormatSettings): IformatterResult
    public formatCode(uri: string, range: { start: number, stop: number }, options?: ICodeFormatSettings): IformatterResult
    public formatCode(uri: string, range: ILexicalRange | { start: number, stop: number }, options?: ICodeFormatSettings): IformatterResult
    {
        if ('stop' in range) {
            return this.getContext(uri).formatCode(range, options);
        }
        return this.getContext(uri).formatCode(range, options);
    }

    // Minify
    /**
     * @deprecated Consider using: backend.contexts.get(uri)?.context.minifyCode(options, enhanced)
     */
    public minifyCode(uri: string, options: ICodeFormatSettings & IMinifySettings & IPrettifySettings, enhanced: boolean = false): string | null
    {
        return this.getContext(uri).minifyCode(options, enhanced)
    }

    // Prettify
    /**
     * @deprecated Consider using: backend.contexts.get(uri)?.context.prettifyCode(options)
     */
    public prettifyCode(uri: string, options: ICodeFormatSettings & IMinifySettings & IPrettifySettings): string | null
    {
        return this.getContext(uri).prettifyCode(options)
    }

    // TODO: references
    /**
     * Count how many times a symbol has been referenced. The given file must contain the definition of this symbol.
     *
     * @param uri The grammar file name.
     * @param symbol The symbol for which to determine the reference count.
     * @returns The reference count.
     */
    public countReferences(uri: string, symbol: string)
    {
        return this.getContext(uri).getReferenceCount(symbol);
    }

    public getDependencies(uri: string): string[] {
        const entry = this.sourceContexts.get(uri);
        if (!entry) {
            return [];
        }
        const dependencies: Set<SourceContext> = new Set();
        this.pushDependencyFiles(entry, dependencies);

        const result: string[] = [];
        for (const dep of dependencies) {
            result.push(dep.sourceUri);
        }

        return result;
    }

    private pushDependencyFiles(entry: IContextEntry, contexts: Set<SourceContext>) {
        // Using a set for the context list here, to automatically exclude duplicates.
        for (const dep of entry.dependencies) {
            const depEntry = this.sourceContexts.get(dep);
            if (depEntry && !contexts.has(depEntry.context)) {
                contexts.add(depEntry.context);
                this.pushDependencyFiles(depEntry, contexts);
            }
        }
    }
}