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

import { mxsBackend } from './backend/Backend.js';
import { ASTQuery } from './backend/ast/ASTQuery.js';
import {
    ArrayLiteral,
    BooleanLiteral,
    Expression,
    FunctionDefinition,
    NameLiteral,
    NumberLiteral,
    PathLiteral,
    StringLiteral,
    UndefinedLiteral,
} from './backend/ast/ASTNodes.js';

export class mxsSignatureHelpProvider implements SignatureHelpProvider {
    public constructor(private backend: mxsBackend) { }

    private resolveFunctionDefinitionAtCallee(
        document: TextDocument,
        row1Based: number,
        calleeStartColumn0Based: number,
    ): FunctionDefinition | undefined {
        const sourceContext = this.backend.getContext(document.uri.toString());
        const declaration = sourceContext?.astDeclarationAtPosition(row1Based, calleeStartColumn0Based);
        const ast = sourceContext?.getResolvedAST();
        if (!declaration || !ast) {
            return undefined;
        }

        const semantic = ASTQuery.findSemanticNodeForDeclaration(ast, declaration);
        return semantic instanceof FunctionDefinition ? semantic : undefined;
    }

    private static countCommas(argsText: string): number {
        let depth = 0;
        let commas = 0;

        for (const ch of argsText) {
            if (ch === '(' || ch === '[' || ch === '{') {
                depth++;
                continue;
            }
            if (ch === ')' || ch === ']' || ch === '}') {
                depth = Math.max(0, depth - 1);
                continue;
            }
            if (ch === ',' && depth === 0) {
                commas++;
            }
        }

        return commas;
    }

    private renderDefaultValue(expr?: Expression): string | undefined {
        if (!expr) {
            return undefined;
        }
        if (expr instanceof BooleanLiteral) {
            return expr.value ? 'true' : 'false';
        }
        if (expr instanceof NumberLiteral) {
            return expr.rawText;
        }
        if (expr instanceof StringLiteral) {
            return `"${expr.value}"`;
        }
        if (expr instanceof NameLiteral) {
            return `#${expr.value}`;
        }
        if (expr instanceof UndefinedLiteral) {
            return 'undefined';
        }
        if (expr instanceof PathLiteral) {
            return expr.value;
        }
        if (expr instanceof ArrayLiteral) {
            return '#(...)';
        }
        return undefined;
    }

    private buildSignatureHelp(functionName: string, fn: FunctionDefinition, activeParameterGuess: number): SignatureHelp | undefined {
        const params: string[] = [];

        for (const arg of fn.arguments) {
            if (arg.name) {
                params.push(arg.name);
            }
        }
        for (const param of fn.parameters) {
            if (param.name) {
                const defaultValue = this.renderDefaultValue(param.defaultValue);
                params.push(defaultValue ? `${param.name}:${defaultValue}` : `${param.name}:`);
            }
        }

        if (params.length === 0) {
            return undefined;
        }

        const signature = new SignatureInformation(`${functionName} ${params.join(' ')}`);
        signature.parameters = params.map((p) => new ParameterInformation(p));

        const help = new SignatureHelp();
        help.signatures = [signature];
        help.activeSignature = 0;
        help.activeParameter = Math.max(0, Math.min(activeParameterGuess, params.length - 1));
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

            // Style 1: foo(arg1, arg2 ...)
            const parenMatch = lineBeforeCursor.match(/(\w+)\s*\(([^()]*)$/);
            if (parenMatch) {
                const calleeName = parenMatch[1];
                const argsText = parenMatch[2] ?? '';
                const activeParameterGuess = mxsSignatureHelpProvider.countCommas(argsText);
                const calleeStart = lineBeforeCursor.length - parenMatch[0].length;
                const fn = this.resolveFunctionDefinitionAtCallee(document, row, calleeStart);

                if (fn) {
                    if (traceRouting) {
                        console.log('[language-maxscript][SignatureHelpProvider] route=AST style=paren');
                    }
                    resolve(this.buildSignatureHelp(calleeName, fn, activeParameterGuess));
                    return;
                }

                if (traceRouting) {
                    console.log('[language-maxscript][SignatureHelpProvider] route=AST-miss style=paren');
                }
            }

            // Style 2: foo arg1 arg2 ... (MaxScript common style)
            const spaceMatch = lineBeforeCursor.match(/(\w+)\s+(.+)?$/);
            if (spaceMatch) {
                const calleeName = spaceMatch[1];
                const argsText = (spaceMatch[2] ?? '').trim();
                const tokenCount = argsText.length > 0 ? argsText.split(/\s+/).length : 0;
                const activeParameterGuess = Math.max(0, tokenCount - 1);
                const calleeStart = lineBeforeCursor.length - spaceMatch[0].length;
                const fn = this.resolveFunctionDefinitionAtCallee(document, row, calleeStart);

                if (fn) {
                    if (traceRouting) {
                        console.log('[language-maxscript][SignatureHelpProvider] route=AST style=space');
                    }
                    resolve(this.buildSignatureHelp(calleeName, fn, activeParameterGuess));
                    return;
                }

                if (traceRouting) {
                    console.log('[language-maxscript][SignatureHelpProvider] route=AST-miss style=space');
                }
            }

            if (traceRouting) {
                console.log('[language-maxscript][SignatureHelpProvider] route=None (no call context match)');
            }
            resolve(undefined);
        });
    }
}
