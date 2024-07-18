import { CancellationToken, CodeLens, CodeLensProvider, Event, ProviderResult, TextDocument } from "vscode";
import { mxsBackend } from "./backend/Backend";

export class mxsCodeLensProvider implements CodeLensProvider
{
    public constructor(private backend: mxsBackend) { }

    // private changeEvent = new EventEmitter<void>();
    // private documentName: string;

    onDidChangeCodeLenses?: Event<void> | undefined;
    /*
     public get onDidChangeCodeLenses(): Event<void> {
        return this.changeEvent.event;
    }

    public refresh(): void {
        this.changeEvent.fire();
    }

    */
    
    provideCodeLenses(document: TextDocument, token: CancellationToken): ProviderResult<CodeLens[]>
    {
        throw new Error("Method not implemented.");
        /*
                return new Promise((resolve) => {
            if (workspace.getConfiguration("antlr4.referencesCodeLens").enabled !== true) {
                resolve(null);
            } else {
                this.documentName = document.fileName;
                const symbols = this.backend.listTopLevelSymbols(document.fileName, false);
                const lenses = [];
                for (const symbol of symbols) {
                    if (!symbol.definition) {
                        continue;
                    }

                    switch (symbol.kind) {
                        case SymbolKind.FragmentLexerToken:
                        case SymbolKind.LexerRule:
                        case SymbolKind.LexerMode:
                        case SymbolKind.ParserRule: {
                            const range = new Range(
                                symbol.definition.range.start.row - 1,
                                symbol.definition.range.start.column,
                                symbol.definition.range.end.row - 1,
                                symbol.definition.range.end.column,
                            );
                            const lens = new SymbolCodeLens(symbol, range);
                            lenses.push(lens);

                            break;
                        }

                        default:
                    }
                }

                resolve(lenses);
            }
        });
        */
    }
    
    resolveCodeLens?(codeLens: CodeLens, token: CancellationToken): ProviderResult<CodeLens>
    {
        throw new Error("Method not implemented.");
        /*
        const refs = this.backend.countReferences(this.documentName, (codeLens as SymbolCodeLens).symbol.name);
        codeLens.command = {
            title: (refs === 1) ? "1 reference" : `${refs} references`,
            command: "",
            arguments: undefined,
        };

        return codeLens;
        */
    }
}