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
import { SignatureHelpModel } from '@backend/signature/SignatureHelpService.js';

export class mxsSignatureHelpProvider implements SignatureHelpProvider {
    public constructor(private backend: mxsBackend) { }

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
        _token: CancellationToken,
        _context: SignatureHelpContext,
    ): ProviderResult<SignatureHelp> {
        return new Promise((resolve) => {
            const config = workspace.getConfiguration('maxScript');
            const useAst = config.get<boolean>('providers.ast.completionProvider', true);
            const traceRouting = config.get<boolean>('providers.traceRouting', false);
            if (!useAst) {
                if (traceRouting) {
                    console.log('[language-maxscript][SignatureHelpProvider] route=None (AST disabled)');
                }
                resolve(undefined);
                return;
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
                resolve(this.buildSignatureHelp(model));
                return;
            }

            if (traceRouting) {
                console.log('[language-maxscript][SignatureHelpProvider] route=None (no call context match)');
            }
            resolve(undefined);
        });
    }
}
