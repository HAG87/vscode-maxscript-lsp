/*
 * Copyright (c) Mike Lischke. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */

import {
  ATNSimulator, BaseErrorListener, RecognitionException, Recognizer,
  Token,
} from 'antlr4ng';

import { DiagnosticType, IDiagnosticEntry } from '../types.js';

export class ContextErrorListener extends BaseErrorListener
{
    public constructor(private errorList: IDiagnosticEntry[])
    {
        super();
    }

    public override syntaxError<S extends Token, T extends ATNSimulator>(recognizer: Recognizer<T>,
        offendingSymbol: S | null, line: number, column: number, msg: string, _e: RecognitionException | null): void
    {
        const error: IDiagnosticEntry = {
            type: DiagnosticType.Error,
            message: msg,
            range: {
                start: {
                    row: line,
                    column,
                },
                end: {
                    row: line,
                    column: column + 1,
                },
            },
        };

        if (offendingSymbol) {
            error.range.end.column = column + offendingSymbol.stop - offendingSymbol.start + 1;
        }
        this.errorList.push(error);
    }
}
