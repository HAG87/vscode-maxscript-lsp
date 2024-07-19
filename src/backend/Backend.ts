import { DocumentSymbol, SymbolInformation, Uri } from 'vscode';
import { SourceContext } from './SourceContext.js';

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
    // Contexts referencing us.
    private references: SourceContext[] = [];
    /**
     * Parse the current source set for the document
     * @param contextEntry 
     */
    private parseContext(contextEntry: IContextEntry): void
    {
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
     * Triggers a reparse. document must have been loaded before
     * @param uri The document uri
     */
    public reparse(uri: Uri): void
    {
        const ctxEntry = this.sourceContexts.get(uri.toString());
        if (ctxEntry) {
            this.parseContext(ctxEntry);
        }
    }
    // add sourceContext
    public loadDocument(uri: Uri, source?: string): SourceContext
    {
        console.log('Add context!');
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
            this.parseContext(ctxEntry);
        }
        // count this as a referency
        ctxEntry!.refCount++;
        return ctxEntry.context;
    }

    // remove SourceContext
    public unloadDocument(uri: Uri, referencing?: IContextEntry): void
    {
        console.log('Remove context!');
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
    public listTopLevelSymbols(uri: Uri)
    {
        return undefined;
    }
    public symbolInfoAtPosition(uri: Uri, line: number, character: number, limitToChildren = true): DocumentSymbol[] | undefined
    {
        //...
        return undefined;
    }
    public getSymbolOcurrences(uri: Uri, symbolName: string)
    {
        return undefined;
    }
    // code completion
    public getCodeCompletionCandidates(uri: Uri, line: number, character: number)
    {
        return undefined;
    }
}