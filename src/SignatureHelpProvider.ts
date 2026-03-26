import {
    CancellationToken,
    ParameterInformation,
    Position,
    ProviderResult,
    Range,
    SignatureHelp,
    SignatureHelpContext,
    SignatureHelpProvider,
    SignatureInformation,
    TextDocument,
    workspace,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import { SignatureHelpModel } from '@backend/types.js';

export class mxsSignatureHelpProvider implements SignatureHelpProvider {
    public constructor(private backend: mxsBackend) { }

    private nowMs(): number {
        return typeof performance !== 'undefined' ? performance.now() : Date.now();
    }

    private buildSignatureHelp(model: SignatureHelpModel): SignatureHelp {
        const signature = new SignatureInformation(model.signatureLabel);
        signature.parameters = model.parameters.map((p) => new ParameterInformation(p));

        const help = new SignatureHelp();
        help.signatures = [signature];
        help.activeSignature = 0;
        help.activeParameter = model.activeParameter;
        return help;
    }

    provideSignatureHelp(
        document: TextDocument,
        position: Position,
        token: CancellationToken,
        _context: SignatureHelpContext,
    ): ProviderResult<SignatureHelp> {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const config = workspace.getConfiguration('maxScript');
        const useAst = config.get<boolean>('providers.ast.completionProvider', true);
        const traceRouting = config.get<boolean>('providers.traceRouting', false);
        const tracePerformance = config.get<boolean>('providers.tracePerformance', false);
        const providerStart = tracePerformance ? this.nowMs() : 0;
        const logPerformance = (route: string): void => {
            if (!tracePerformance) {
                return;
            }
            console.log(`[language-maxscript][Performance] signatureProvider uri=${document.uri.toString()} duration=${(this.nowMs() - providerStart).toFixed(2)}ms route=${route}`);
        };
        if (!useAst) {
            if (traceRouting) {
                console.log('[language-maxscript][SignatureHelpProvider] route=None reason=ast-disabled');
            }
            logPerformance('None');
            return undefined;
        }

        const lineBeforeCursor = document.getText(new Range(position.line, 0, position.line, position.character));
        const row = position.line + 1;
        const sourceContext = this.backend.getContext(document.uri.toString());
        const model = sourceContext.getSignatureHelpModel(
            row,
            lineBeforeCursor,
        );

        if (model) {
            if (traceRouting) {
                console.log(`[language-maxscript][SignatureHelpProvider] route=AST style=${model.style}`);
            }
            logPerformance('AST');
            return this.buildSignatureHelp(model);
        }

        if (traceRouting) {
            console.log('[language-maxscript][SignatureHelpProvider] route=None reason=no-call-context');
        }
        logPerformance('None');
        return undefined;
    }
}
