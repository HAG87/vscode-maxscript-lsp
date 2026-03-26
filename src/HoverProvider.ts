import {
  CancellationToken, Hover, HoverProvider, MarkdownString,
    Position, ProviderResult, Range, TextDocument, workspace,
} from 'vscode';

import { mxsBackend } from '@backend/Backend.js';
import {
  mxsLanguageCompletions,
} from '@backend/schemas/mxsCompletions-base.js';
import { symbolDescriptionFromEnum } from './SymbolTranslator.js';
import { SymbolKind } from '@backend/types.js';
import { Utilities } from './utils.js';

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

    private astHover(document: TextDocument, position: Position): Hover | undefined {
        const sourceContext = this.backend.getContext(document.uri.toString());
        const hoverModel = sourceContext.getAstHoverModel(
            position.line + 1,
            position.character,
            document.getText(),
        );
        if (!hoverModel) {
            return undefined;
        }

        const markdown = new MarkdownString(`**${symbolDescriptionFromEnum(hoverModel.symbolKind as SymbolKind)}**\n`);
        markdown.appendCodeblock(hoverModel.codeSnippet, 'maxscript');
        return hoverModel.range
            ? new Hover([markdown], Utilities.lexicalRangeToRange(hoverModel.range))
            : new Hover([markdown]);
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

        const hoverModel = ctx.getLegacyHoverModel(
            position.line + 1,
            position.character);

        if (!hoverModel) {
            return undefined;
        }

        const markedStr: MarkdownString = new MarkdownString(`**${symbolDescriptionFromEnum(hoverModel.symbolKind as SymbolKind)}**\n`);
        markedStr.appendCodeblock(hoverModel.codeSnippet, 'maxscript');
        return new Hover([markedStr]);
    }

    provideHover(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover>
    {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const config = workspace.getConfiguration('maxScript');
        const useAst = config.get<boolean>('providers.ast.hoverProvider', true);
        const fallbackToLegacy = config.get<boolean>('providers.fallbackToLegacy', true);
        const traceRouting = config.get<boolean>('providers.traceRouting', false);

        const apiHover = this.apiHover(document, position);
        if (apiHover) {
            if (traceRouting) {
                console.log('[language-maxscript][HoverProvider] route=API');
            }
            return apiHover;
        }

        if (useAst) {
            const hover = this.astHover(document, position);
            if (hover) {
                if (traceRouting) {
                    console.log('[language-maxscript][HoverProvider] route=AST');
                }
                return hover;
            }
        }

        if (fallbackToLegacy) {
            const hover = this.legacyHover(document, position);
            if (hover) {
                if (traceRouting) {
                    console.log('[language-maxscript][HoverProvider] route=Legacy');
                }
                return hover;
            }
        }

        if (traceRouting) {
            console.log('[language-maxscript][HoverProvider] route=None');
        }

        return undefined;
    }
}