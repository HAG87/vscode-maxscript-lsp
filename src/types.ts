/*
 * Copyright (c) Mike Lischke. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
*/

export enum DiagnosticType
{
    Hint,
    Info,
    Warning,
    Error,
}

export interface IDiagnosticEntry
{
    type: DiagnosticType;
    message: string;
    range: ILexicalRange;
}

/**
 * A range within a text. Just like the range object in vscode the end position is not included in the range.
 * Hence when start and end position are equal the range is empty.
 */
export interface ILexicalRange
{
    start: {
        row: number;
        column: number;
    };
    end: {
        row: number;
        column: number;
    };
}