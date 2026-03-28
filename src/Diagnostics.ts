/* convert diagnostics information to vcode Diagnostic
*/
import { Diagnostic, DiagnosticSeverity } from 'vscode';

import { DiagnosticType, IDiagnosticEntry } from '@backend/types.js';
import { Utilities } from './utils.js';

const diagnosticTypeMap = new Map<DiagnosticType, DiagnosticSeverity>();
diagnosticTypeMap.set(DiagnosticType.Hint, DiagnosticSeverity.Hint);
diagnosticTypeMap.set(DiagnosticType.Info, DiagnosticSeverity.Information);
diagnosticTypeMap.set(DiagnosticType.Warning, DiagnosticSeverity.Warning);
diagnosticTypeMap.set(DiagnosticType.Error, DiagnosticSeverity.Error);

export function diagnosticAdapter(entries: IDiagnosticEntry[]): Diagnostic[]
{
    const diagnostics: Diagnostic[] = [];
    //  Avoid duplicate entries
    let tempDiagnostic: IDiagnosticEntry | null = null;

    for (const entry of entries) {
        if (tempDiagnostic) {
            if (JSON.stringify(entry) === JSON.stringify(tempDiagnostic)) {
                tempDiagnostic = entry;
                continue;
            }
        }

        const diagnostic = new Diagnostic(
            Utilities.lexicalRangeToRange(entry.range),
            entry.message,
            diagnosticTypeMap.get(entry.type)
        );
        diagnostics.push(diagnostic);

        tempDiagnostic = entry;
    }
    return diagnostics;
}
