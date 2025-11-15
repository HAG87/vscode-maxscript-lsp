/*
 * Copyright (c) Mike Lischke. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */

import {
  ATNSimulator, BaseErrorListener, RecognitionException, Recognizer,
  Token, NoViableAltException, InputMismatchException, FailedPredicateException,
} from 'antlr4ng';

import { DiagnosticType, IDiagnosticEntry } from '../../types.js';

export class ContextErrorListener extends BaseErrorListener
{
    public constructor(private errorList: IDiagnosticEntry[])
    {
        super();
    }

    public override syntaxError<S extends Token, T extends ATNSimulator>(
        recognizer: Recognizer<T>,
        offendingSymbol: S | null,
        line: number,
        column: number,
        msg: string,
        e: RecognitionException | null): void
    {
        // Based on ANTLR research: The best practice is to use BailErrorStrategy
        // or limit error reporting to first N errors, not filter at listener level.
        // This listener just reports ALL errors with enhanced messages.
        // Cascading error suppression should be handled by parser error strategy,
        // not by the listener.

        let enhancedMsg = msg;
        const severity = DiagnosticType.Error;

        // Enhance messages to be more user-friendly
        if (e) {
            if (e instanceof NoViableAltException) {
                enhancedMsg = this.enhanceNoViableAltMessage(msg, offendingSymbol);
            } else if (e instanceof InputMismatchException) {
                enhancedMsg = this.enhanceInputMismatchMessage(msg, offendingSymbol);
            }
        } else {
            // No exception means generic syntax error
            enhancedMsg = this.enhanceGenericMessage(msg, offendingSymbol);
        }

        const error: IDiagnosticEntry = {
            type: severity,
            message: enhancedMsg,
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

    private enhanceNoViableAltMessage(msg: string, token: Token | null): string
    {
        if (!token) {
            return 'Syntax error: no viable alternative';
        }
        
        const text = token.text ?? '';
        
        // TODO: Check for common patterns
        
        // Remove the "at input '...'" part with escaped characters
        // Just report what token caused the error
        return `Syntax error at '${text}': no viable alternative`;
    }

    private enhanceInputMismatchMessage(msg: string, token: Token | null): string
    {
        if (!token) {
            return 'Syntax error: input mismatch';
        }
        
        const text = token.text ?? '';
        
        // Extract what was expected
        const expectedMatch = msg.match(/expecting (.+)/i);
        if (expectedMatch) {
            const expected = expectedMatch[1];
            return `Expected ${expected}, but found '${text}'`;
        }
        
        return `Unexpected token '${text}'`;
    }

    private enhanceGenericMessage(msg: string, token: Token | null): string
    {
        if (!token) return msg;
        
        const text = token.text ?? '';
        
        // Check for common generic errors
        if (msg.includes('extraneous input')) {
            return `Unexpected '${text}'`;
        }
        
        if (msg.includes('missing')) {
            // Clean up the message but keep the "missing" info
            return msg.replace(/at input.*$/, '').trim();
        }
        
        // For any other message, remove the unreadable "at input" part
        return msg.replace(/at input\s+'[^']*'/, '').trim();
    }
}
