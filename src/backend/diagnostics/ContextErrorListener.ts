/*
 * Copyright (c) Mike Lischke. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */

import {
  ATNConfigSet, ATNSimulator, BaseErrorListener, BitSet, DFA, Parser,
  RecognitionException, Recognizer, Token,
  NoViableAltException, InputMismatchException,
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

    /**
     * Called when an SLL conflict is found and the parser is about to retry
     * with full LL context. This is a normal part of two-stage parsing; it does
     * not indicate an error but may indicate an ambiguous or context-sensitive
     * grammar rule. No diagnostic is emitted — only syntax errors from
     * `syntaxError` are reported to the user.
     */
    public override reportAttemptingFullContext(
        _recognizer: Parser,
        _dfa: DFA,
        _startIndex: number,
        _stopIndex: number,
        _conflictingAlts: BitSet | undefined,
        _configs: ATNConfigSet): void
    {
        // SLL -> LL fallback is expected for context-sensitive grammar rules
        // (e.g. distinguishing `accessor as Classname` from `assignmentExpression`).
        // No action needed; the parser handles this transparently.
    }

    /**
     * Called when the full-context LL prediction resolves an SLL conflict to a
     * unique alternative. No diagnostic is emitted.
     */
    public override reportContextSensitivity(
        _recognizer: Parser,
        _dfa: DFA,
        _startIndex: number,
        _stopIndex: number,
        _prediction: number,
        _configs: ATNConfigSet): void
    {
        // Context-sensitive prediction resolved successfully; no action needed.
    }

    /**
     * Called when the full-context prediction results in an ambiguity.
     * Ambiguities are grammar-level issues and do not produce user-visible
     * diagnostics at parse time.
     */
    public override reportAmbiguity(
        _recognizer: Parser,
        _dfa: DFA,
        _startIndex: number,
        _stopIndex: number,
        _exact: boolean,
        _ambigAlts: BitSet | undefined,
        _configs: ATNConfigSet): void
    {
        // Ambiguities are expected in some MaxScript constructs (e.g. function
        // call vs expression) and are resolved by precedence rules in the grammar.
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
