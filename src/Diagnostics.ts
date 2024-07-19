/* convert diagnostics information to vcode Diagnostic
*/

import { Diagnostic, DiagnosticSeverity } from "vscode";
import { DiagnosticType, IDiagnosticEntry } from "./types.js";
import { Utilities } from "./utils.js";

const diagnosticMap = new Map<DiagnosticType, DiagnosticSeverity>([
    [DiagnosticType.Hint, DiagnosticSeverity.Hint],
    [DiagnosticType.Info, DiagnosticSeverity.Information],
    [DiagnosticType.Warning, DiagnosticSeverity.Warning],
    [DiagnosticType.Error, DiagnosticSeverity.Error],
]);

const diagnosticTypeMap = new Map<DiagnosticType, DiagnosticSeverity>();

export function diagnosticAdapter(entries: IDiagnosticEntry[]): Diagnostic[]
{
    const diagnostics: Diagnostic[] = [];
    for (const entry of entries) {
        const diagnostic = new Diagnostic(
            Utilities.lexicalRangeToRange(entry.range),
            entry.message,
            diagnosticTypeMap.get(entry.type)  
        );
        diagnostics.push(diagnostic);
    }
    return diagnostics;
}
