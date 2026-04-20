import {
    CancellationToken, Hover, HoverProvider, MarkdownString,
    Position, ProviderResult, TextDocument,
} from 'vscode';

import { mxsBackend } from '@backend/Backend';
import {
  mxsLanguageCompletions,
} from '@backend/schemas/mxsCompletions-base';
import { symbolDescriptionFromEnum } from './SymbolTranslator';
import { SymbolKind } from '@backend/types';
import { Utilities } from './utils';
import { IMaxScriptSettings } from './types';

export class mxsHoverProvider implements HoverProvider
{
    public constructor(private backend: mxsBackend, private options?: IMaxScriptSettings) { }

    private nowMs(): number {
        return typeof performance !== 'undefined' ? performance.now() : Date.now();
    }

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
        const sourceContext = this.backend.borrowContext(document.uri.toString());
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

    provideHover(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover>
    {
        if (token.isCancellationRequested) {
            return undefined;
        }

        const traceRouting = this.options?.debug?.traceRouting || false;
        const tracePerformance = this.options?.debug?.tracePerformance || false;

        const providerStart = tracePerformance ? this.nowMs() : 0;
        const logPerformance = (route: string): void => {
            if (!tracePerformance) {
                return;
            }
            console.log(`[language-maxscript][Performance] hoverProvider uri=${document.uri.toString()} duration=${(this.nowMs() - providerStart).toFixed(2)}ms route=${route}`);
        };

        const apiHover = this.apiHover(document, position);
        if (apiHover) {
            if (traceRouting) {
                console.log('[language-maxscript][HoverProvider] route=API');
            }
            logPerformance('API');
            return apiHover;
        }

        const hover = this.astHover(document, position);
        if (hover) {
            if (traceRouting) {
                console.log('[language-maxscript][HoverProvider] route=AST');
            }
            logPerformance('AST');
            return hover;
        }

        if (traceRouting) {
            console.log('[language-maxscript][HoverProvider] route=None reason=no-match');
        }

        logPerformance('None');
        return undefined;
    }
}