import { BaseErrorListener } from "antlr4ng";

export class ContextLexerErrorListener extends BaseErrorListener {

    public constructor(/* private errorList: IDiagnosticEntry[] */) {
        super();
    }

    /*
    public override syntaxError<S extends Token, T extends ATNSimulator>(_recognizer: Recognizer<T>,
        _offendingSymbol: S | null, line: number, column: number, msg: string, _e: RecognitionException | null): void {
        const error: IDiagnosticEntry = {
            type: DiagnosticType.Error,
            message: msg,
            range: {
                start: {
                    column,
                    row: line,
                },
                end: {
                    column: column + 1,
                    row: line,
                },
            },
        };

        this.errorList.push(error);
    }
        */
}
