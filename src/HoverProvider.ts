import {
  CancellationToken, Hover, HoverProvider, MarkdownString,
  Position, ProviderResult, TextDocument,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import {
  mxsLanguageCompletions,
} from './backend/schemas/mxsCompletions-base.js';
import { symbolDescriptionFromEnum } from './Symbol.js';

export class mxsHoverProvider implements HoverProvider
{
    public constructor(private backend: mxsBackend) { }

    provideHover(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover>
    {
        if (token.isCancellationRequested) {
            return undefined;
        }
        
        const ctx = this.backend.getContext(document.uri.toString());
        const info = ctx.symbolAtPosition(
            position.line + 1,
            position.character
        );
        // console.log(info);
        if (info) {
            // provide hover for API definitions
            const mxsReference = mxsLanguageCompletions.has(info.name);

            if (mxsReference) {
                return(new Hover([
                    `**${mxsReference.label.toString()}**`,
                    `3ds MaxAPI | ${mxsReference.detail}`,
                ]));
            } else {
                // provide symbol definition
                const info = ctx.symbolDefinition(
                    position.line + 1,
                    position.character);
                
                if (info && info.definition) {
                    const markedStr: MarkdownString = new MarkdownString(`**${symbolDescriptionFromEnum(info.kind)}**\n`)
                    markedStr.appendCodeblock(info.definition.text, 'maxscript')
                    return(new Hover([
                        markedStr
                    ]));
                }
            }
        }
        return undefined;
    }
}