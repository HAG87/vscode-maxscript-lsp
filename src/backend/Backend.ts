import * as fs from 'fs';
import { Uri } from 'vscode';

import {
  ICodeFormatSettings, ILexicalRange, IMinifySettings, IPrettifySettings,
  ISemanticToken, ISymbolInfo,
} from '../types.js';
import { IformatterResult } from './CodeFormatter.js';
import { SourceContext } from './SourceContext.js';

export interface IContextEntry
{
    context: SourceContext;
    //TODO:
    // this holds a counter to check the references to this ctx
    refCount: number;
    //TODO:
    // dependencies: string[]
    //...
}

export class mxsBackend
{
    // hold the contexts
    private sourceContexts: Map<string, IContextEntry> = new Map<string, IContextEntry>();

    public constructor() { }

    // get the context
    public getContext(uri: string, source?: string): SourceContext
    {
        const cxtEntry = this.sourceContexts.get(uri);
        if (!cxtEntry) {
            return this.loadDocument(uri, source);
        }
        return cxtEntry.context;
    }

    /**
     * Parse the current source set for the document
     * @param contextEntry 
     */
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
     * Triggers a reparse. document must have been loaded before
     * @param uri The document uri
     */
    public reparse(uri: Uri): void
    {
        const ctxEntry = this.sourceContexts.get(uri.toString());
        if (ctxEntry) {
            this.parseDocument(ctxEntry);
        }
    }

    public getDocumentText(uri: string): string
    {
        return fs.readFileSync(Uri.parse(uri).fsPath, "utf8");
    }

    /**
     * Call this to refresh the internal input stream as a preparation to a reparse call
     * or for code completion
     * Does nothing if no grammar has been loaded for that file name.
     * @param uri The document uri
     * @param source The document content, or undefined to read from the file
     */
    public setText(uri: string, source?: string): void
    {
        const ctxEntry = this.sourceContexts.get(uri.toString());
        if (ctxEntry) {
            ctxEntry.context.setText(source ?? this.getDocumentText(uri));
        }
    }

    /**
     * Add sourceContext
     * @param uri the document uri
     * @param source the document text
     * @returns 
     */
    public loadDocument(uri: string, source?: string): SourceContext
    {
        let ctxEntry = this.sourceContexts.get(uri);
        if (!ctxEntry) {
            // new context
            const ctx = new SourceContext(uri);
            ctxEntry = {
                context: ctx,
                refCount: 0,
                // dependencies: []
            };
            // add to SourceContexts
            this.sourceContexts.set(uri, ctxEntry);

            // set ctx text
            ctx.setText(source ?? this.getDocumentText(uri));
            // do an initial parse run
            this.parseDocument(ctxEntry);
        }
        // count this as a referency
        ctxEntry!.refCount++;
        return ctxEntry.context;
    }

    /**
     * Remove SourceContext
     * @param uri 
     * @param referencing 
     */
    public unloadDocument(uri: string, referencing?: IContextEntry): void
    {
        const ctxEntry = this.sourceContexts.get(uri);
        if (ctxEntry) {
            if (referencing) {
                // If a referencing context is given remove this one from the reference's dependencies list,
                // which in turn will remove the referencing context from the dependency's referencing list.
                // referencing.context.removeDependency(ctxEntry.context);
            }
            ctxEntry.refCount--;
            if (ctxEntry.refCount === 0) {
                // release all dependencies
                // for (const dep of ctxEntry.dependencies) { this.unloadDocument(dep, contextEntry); }
                this.sourceContexts.delete(uri);
            }
        }
    }
    //------------------------------------------------------------------
    // get symbols -- for mxsDefinitionProvider
    public symbolInfoAtPosition(
        uri: string,
        line: number,
        character: number): ISymbolInfo | undefined
    {
        return this.getContext(uri).symbolAtPosition(line, character);
    }

    public symbolInfoDefinition(
        uri: string,
        line: number,
        character: number): ISymbolInfo | undefined
    {
        return this.getContext(uri).symbolDefinition(line, character);
    }

    public infoForSymbol(uri: string, symbol: string)
    {
        return this.getContext(uri).getSymbolInfo(symbol);
    }

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

    // code completion
    public async getCodeCompletionCandidates(
        uri: string,
        line: number,
        character: number): Promise<ISymbolInfo[]>
    {
        return this.getContext(uri).getCodeCompletionCandidates(line, character);
    }

    // diagnostics
    public getDiagnostics(uri: string)
    {
        return this.getContext(uri).getDiagnostics;
    }

    public hasErrors(uri: string): boolean
    {
        return this.getContext(uri).hasErrors;
    }

    // semantic tokens
    public getDocumentSemanticTokens(uri: string): ISemanticToken[]
    {
        return this.getContext(uri).getSemanticTokens;
    }

    // formatting
    public formatCode(uri: string, range: ILexicalRange, options?: ICodeFormatSettings): IformatterResult
    public formatCode(uri: string, range: { start: number, stop: number }, options?: ICodeFormatSettings): IformatterResult
    public formatCode(uri: string, range: ILexicalRange | { start: number, stop: number }, options?: ICodeFormatSettings): IformatterResult
    {
        if ('stop' in range) {
            return this.getContext(uri).formatCode(range, options);
        }
        return this.getContext(uri).formatCode(range, options);
    }

    // minify
    public minifyCode(uri: string, options: ICodeFormatSettings & IMinifySettings & IPrettifySettings, enhanced: boolean = false): string | null
    {
        return this.getContext(uri).minifyCode(options, enhanced)
    }

    // prettify
    public prettifyCode(uri: string, options: ICodeFormatSettings & IMinifySettings & IPrettifySettings): string | null
    {
        return this.getContext(uri).prettifyCode(options)
    }
}