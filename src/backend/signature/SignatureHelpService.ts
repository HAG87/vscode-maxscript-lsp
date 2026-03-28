import type { IAstContext } from '@backend/IAstContext.js';
import { ASTQuery } from '@backend/ast/ASTQuery.js';
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
} from '@backend/ast/ASTNodes.js';
import { SignatureCallStyle, SignatureHelpModel } from '@backend/types';

export class SignatureHelpService {
    public getSignatureHelpModel(
        sourceContext: IAstContext,
        row1Based: number,
        lineBeforeCursor: string,
    ): SignatureHelpModel | undefined {
        // Style 1: foo(arg1, arg2 ...)
        const parenMatch = lineBeforeCursor.match(/(\w+)\s*\(([^()]*)$/);
        if (parenMatch) {
            const calleeName = parenMatch[1];
            const argsText = parenMatch[2] ?? '';
            const activeParameterGuess = SignatureHelpService.countCommas(argsText);
            const calleeStart = lineBeforeCursor.length - parenMatch[0].length;
            const fn = this.resolveFunctionDefinitionAtCallee(sourceContext, row1Based, calleeStart);

            if (fn) {
                return this.buildSignatureModel(calleeName, fn, activeParameterGuess, 'paren');
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
            const fn = this.resolveFunctionDefinitionAtCallee(sourceContext, row1Based, calleeStart);

            if (fn) {
                return this.buildSignatureModel(calleeName, fn, activeParameterGuess, 'space');
            }
        }

        return undefined;
    }

    private resolveFunctionDefinitionAtCallee(
        sourceContext: IAstContext,
        row1Based: number,
        calleeStartColumn0Based: number,
    ): FunctionDefinition | undefined {
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

    private buildSignatureModel(
        functionName: string,
        fn: FunctionDefinition,
        activeParameterGuess: number,
        style: SignatureCallStyle,
    ): SignatureHelpModel | undefined {
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

        return {
            signatureLabel: `${functionName} ${params.join(' ')}`,
            parameters: params,
            activeParameter: Math.max(0, Math.min(activeParameterGuess, params.length - 1)),
            style,
        };
    }
}
