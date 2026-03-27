import type { IAstContext } from '@backend/IAstContext.js';
import type { ILexicalRange } from '@backend/types.js';

export class LinkedEditingService {
    public getLinkedEditingRanges(
        sourceContext: IAstContext,
        row1Based: number,
        column0Based: number,
        sourceLineText: string,
    ): ILexicalRange[] | undefined {
        const references = sourceContext.getAstReferenceLocations(
            row1Based,
            column0Based,
            true,
            sourceLineText,
        );

        if (!references || references.length === 0) {
            return undefined;
        }

        return references.map((reference) => reference.range);
    }
}
