import {
  CancellationToken, Hover, HoverProvider, MarkdownString,
    Position, ProviderResult, Range, TextDocument, workspace,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import { ASTQuery } from './backend/ast/ASTQuery.js';
import {
    DefinitionBlock,
    FunctionArgument,
    FunctionDefinition,
    FunctionParameter,
    ParameterDefinition,
    RcMenuItem,
    RolloutControl,
    StructDefinition,
    StructMemberField,
    VariableDeclaration,
} from './backend/ast/ASTNodes.js';
import {
  mxsLanguageCompletions,
} from './backend/schemas/mxsCompletions-base.js';
import { symbolDescriptionFromEnum } from './Symbol.js';
import { SymbolKind } from './types.js';

export class mxsHoverProvider implements HoverProvider
{
    public constructor(private backend: mxsBackend) { }

    private static readonly identifierPattern = /[#@&$]?[A-Za-z_][A-Za-z0-9_]*/;

    private apiHover(document: TextDocument, position: Position): Hover | undefined {
        const wordRange = document.getWordRangeAtPosition(position, mxsHoverProvider.identifierPattern);
        if (!wordRange) {
            return undefined;
        }

        const rawWord = document.getText(wordRange);
        const lookupWord = rawWord.replace(/^[#@&$]+/, '');
        const mxsReference = mxsLanguageCompletions.has(lookupWord);

        if (!mxsReference) {
            return undefined;
        }

        return new Hover([
            `**${mxsReference.label.toString()}**`,
            `3ds MaxAPI | ${mxsReference.detail}`,
        ]);
    }

    private symbolKindForAstNode(node: unknown): SymbolKind {
        if (node instanceof FunctionDefinition) {
            return SymbolKind.Function;
        }
        if (node instanceof StructDefinition) {
            return SymbolKind.Struct;
        }
        if (node instanceof DefinitionBlock) {
            switch (node.kind) {
                case 'macroscript': return SymbolKind.MacroScript;
                case 'utility': return SymbolKind.Utility;
                case 'rollout': return SymbolKind.Rollout;
                case 'tool': return SymbolKind.Tool;
                case 'rcmenu': return SymbolKind.RcMenu;
                case 'plugin': return SymbolKind.Plugin;
                case 'parameters': return SymbolKind.Parameters;
                case 'attributes': return SymbolKind.Attributes;
                default: return SymbolKind.Object;
            }
        }
        if (node instanceof FunctionArgument || node instanceof FunctionParameter || node instanceof ParameterDefinition) {
            return SymbolKind.Parameter;
        }
        if (node instanceof RolloutControl) {
            return SymbolKind.Control;
        }
        if (node instanceof RcMenuItem) {
            return SymbolKind.RcMenuControl;
        }
        if (node instanceof StructMemberField) {
            return SymbolKind.Field;
        }
        if (node instanceof VariableDeclaration) {
            switch (node.scope) {
                case 'global':
                case 'persistent':
                    return SymbolKind.GlobalVar;
                case 'local':
                    return SymbolKind.LocalVar;
                default:
                    return SymbolKind.Variable;
            }
        }

        return SymbolKind.Variable;
    }

    private astHover(document: TextDocument, position: Position): Hover | undefined {
        const sourceContext = this.backend.getContext(document.uri.toString());
        const ast = sourceContext?.getResolvedAST();
        if (!ast) {
            return undefined;
        }

        const declaration = sourceContext?.astDeclarationAtPosition(position.line + 1, position.character);
        if (!declaration) {
            return undefined;
        }

        const semanticNode = ASTQuery.findSemanticNodeForDeclaration(ast, declaration);
        const semanticPosition = semanticNode.position ?? declaration.position;
        const symbolKind = this.symbolKindForAstNode(semanticNode);
        const markdown = new MarkdownString(`**${symbolDescriptionFromEnum(symbolKind)}**\n`);

        if (semanticPosition) {
            const rangeData = ASTQuery.positionToRange(semanticPosition);
            const range = new Range(
                rangeData.start.line,
                rangeData.start.character,
                rangeData.end.line,
                rangeData.end.character,
            );
            markdown.appendCodeblock(document.getText(range), 'maxscript');
            return new Hover([markdown], range);
        }

        markdown.appendCodeblock(declaration.name ?? '', 'maxscript');
        return new Hover([markdown]);
    }

    private legacyHover(document: TextDocument, position: Position): Hover | undefined {
        const ctx = this.backend.getContext(document.uri.toString());
        const info = ctx.symbolAtPosition(
            position.line + 1,
            position.character
        );

        if (!info) {
            return undefined;
        }

        const definition = ctx.symbolDefinition(
            position.line + 1,
            position.character);

        if (!definition?.definition) {
            return undefined;
        }

        const markedStr: MarkdownString = new MarkdownString(`**${symbolDescriptionFromEnum(definition.kind)}**\n`);
        markedStr.appendCodeblock(definition.definition.text, 'maxscript');
        return new Hover([markedStr]);
    }

    provideHover(document: TextDocument, position: Position, _token: CancellationToken): ProviderResult<Hover>
    {
        return new Promise((resolve) =>
        {
            const config = workspace.getConfiguration('maxScript');
            const useAst = config.get<boolean>('providers.ast.hoverProvider', true);
            const fallbackToLegacy = config.get<boolean>('providers.fallbackToLegacy', true);
            const traceRouting = config.get<boolean>('providers.traceRouting', false);

            const apiHover = this.apiHover(document, position);
            if (apiHover) {
                if (traceRouting) {
                    console.log('[language-maxscript][HoverProvider] route=API');
                }
                resolve(apiHover);
                return;
            }

            if (useAst) {
                const hover = this.astHover(document, position);
                if (hover) {
                    if (traceRouting) {
                        console.log('[language-maxscript][HoverProvider] route=AST');
                    }
                    resolve(hover);
                    return;
                }
            }

            if (fallbackToLegacy) {
                const hover = this.legacyHover(document, position);
                if (hover) {
                    if (traceRouting) {
                        console.log('[language-maxscript][HoverProvider] route=Legacy');
                    }
                    resolve(hover);
                    return;
                }
            }

            if (traceRouting) {
                console.log('[language-maxscript][HoverProvider] route=None');
            }

            resolve(undefined);
        });
    }
}