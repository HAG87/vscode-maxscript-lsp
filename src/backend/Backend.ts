import { DocumentSymbol, SymbolInformation, Uri } from 'vscode';
import { SourceContext } from './SourceContext.js';
import { ISymbolInfo } from '../types.js';
import { BaseSymbol } from 'antlr4-c3';

export interface IContextEntry
{
    context: SourceContext;
    // this holds a counter to check the references to this ctx
    refCount: number;
    // dependencies: string[]
    //...
}
export class mxsBackend
{
    // hold the contexts
    private sourceContexts: Map<string, IContextEntry> = new Map<string, IContextEntry>();

    public constructor() { }

    // get the context
    public getContext(uri: Uri, source?: string | undefined): SourceContext
    {
        const cxtEntry = this.sourceContexts.get(uri.toString());
        if (!cxtEntry) {
            return this.loadDocument(uri, source);
        }
        return cxtEntry.context;
    }

    /**
     * Parse the current source set for the document
     * @param contextEntry 
     */
    private parseContent(contextEntry: IContextEntry): void
    {
        contextEntry.context.parse();
        /*
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
                this.releaseGrammar(dep);
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
            this.parseContent(ctxEntry);
        }
    }

    /**
     * Call this to refresh the internal input stream as a preparation to a reparse call
     * or for code completion
     * Does nothing if no grammar has been loaded for that file name.
     * @param uri The document uri
     * @param source The document content, or undefined to read from the file
     */
    public setText(uri: Uri, source?: string): void
    {
        const ctxEntry = this.sourceContexts.get(uri.toString());
        if (ctxEntry) {
            ctxEntry.context.setText(source);
        }
    }

    /**
     * Add sourceContext
     * @param uri the document uri
     * @param source the document text
     * @returns 
     */
    public loadDocument(uri: Uri, source?: string): SourceContext
    {
        // console.log('Add context!');
        let ctxEntry = this.sourceContexts.get(uri.toString());
        if (!ctxEntry) {
            // new context
            const ctx = new SourceContext(uri);
            ctxEntry = {
                context: ctx,
                refCount: 0,
                // dependencies: []
            };
            // add to SourceContexts
            this.sourceContexts.set(uri.toString(), ctxEntry);
            // set ctx text
            ctx.setText(source);

            // do an initial parse run
            this.parseContent(ctxEntry);
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
    public unloadDocument(uri: Uri, referencing?: IContextEntry): void
    {
        // console.log('Remove context!');
        const id = uri.toString();
        const ctxEntry = this.sourceContexts.get(id);
        if (ctxEntry) {
            if (referencing) {
                // If a referencing context is given remove this one from the reference's dependencies list,
                // which in turn will remove the referencing context from the dependency's referencing list.
                // referencing.context.removeDependency(ctxEntry.context);
            }
            ctxEntry.refCount--;
            if (ctxEntry.refCount === 0) {
                // release all dependencies
                // for (const dep of ctxEntry.dependencies) {
                // this.unloadDocument(dep, contextEntry); }
                this.sourceContexts.delete(id);
            }
        }
    }

    // get symbols -- for mxsDefinitionProvider

    public symbolInfoAtPosition(
        uri: Uri,
        line: number,
        character: number): ISymbolInfo | undefined
    {
        return this.getContext(uri).symbolAtPosition(line, character);
    }

    public symbolInfoDefinition(
        uri: Uri,
        line: number,
        character: number): ISymbolInfo | undefined
    {
        return this.getContext(uri).symbolDefinition(line, character);
    }

    public infoForSymbol(uri: Uri, symbol: string)
    {
        return this.getContext(uri).getSymbolInfo(symbol);
    }

    public enclosingSymbolAtPosition(
        uri: Uri,
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
    public listTopLevelSymbols(uri: Uri, fullList: boolean): ISymbolInfo[]
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
    public getSymbolOccurrences(uri: Uri, symbolName: string): ISymbolInfo[]
    {
        
        const context = this.getContext(uri);
        
        const result = context.symbolTable.getSymbolOccurrences(symbolName, false);
        // /*
        // Sort result by kind. This way rule definitions appear before rule references and are re-parsed first.
        return result.sort((lhs: ISymbolInfo, rhs: ISymbolInfo) => {
            return lhs.kind - rhs.kind;
        });
        // */
        // return result;
    }

    public symbolInfoAtPositionCtxOccurrences(
        uri: Uri,
        line: number,
        character: number): ISymbolInfo[] | undefined
    {
        const context = this.getContext(uri);
        const symbol = context.symbolTable.getSymbolAtPosition(line, character);
       
        if (!symbol) { return undefined; }
        
        const result = context.symbolTable.getScopedSymbolOccurrences(symbol);

        return result.sort((lhs: ISymbolInfo, rhs: ISymbolInfo) => {
            return lhs.kind - rhs.kind;
        });
    }

    // code completion
    public getCodeCompletionCandidates(uri: Uri, line: number, character: number)
    {
        // return this.getContext(uri).getCodeCompletionCandidates(line, character);
    }

    // diagnostics
    public getDiagnostics(uri: Uri)
    {
        return this.getContext(uri).getDiagnostics();
    }

    public hasErrors(uri: Uri): boolean
    {
        return this.getContext(uri).hasErrors;
    }

    // references
    /**
     * Count how many times a symbol has been referenced. The given file must contain the definition of this symbol.
     *
     * @param fileName The grammar file name.
     * @param symbol The symbol for which to determine the reference count.
     * @returns The reference count.
     */
    public countReferences(uri: Uri, symbol: string)
    {
        // return this.getContext(uri).getReferenceCount(symbol);
    }
    // formatting
    /*
        public formatGrammar(fileName: string, options: IFormattingOptions, start: number,
        stop: number): [string, number, number] {
        const context = this.getContext(fileName);

        return context.formatGrammar(options, start, stop);
    }
        // prettify
        // minify
    */
}