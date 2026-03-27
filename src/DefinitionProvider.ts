/*
THIS IS BROKEN!
TODO:
 - Fix definition for symbols with the same name or referenced from an enclosed construct (linke calling a method of a structure that initiated into a variable)
 - I should implement a method to derive a reference tree, instead of looking at the symbol table, of find a better implementation of the symbol table, keeping track of references in the listener
 - keep track of named symbols, definition, references and aliases (assignations and re-assignation). respect scope
*/
import {
  CancellationToken, Definition, DefinitionLink, DefinitionProvider,
  Location, Position, ProviderResult, TextDocument,
  Uri,
} from 'vscode';

import { mxsBackend } from './backend/Backend.js';
import { Utilities } from './utils.js';

export class mxsDefinitionProvider implements DefinitionProvider
{
    public constructor(private backend: mxsBackend) { }

    provideDefinition(
        document: TextDocument,
        position: Position,
        token: CancellationToken): ProviderResult<Definition | DefinitionLink[]>
    {
        if (token.isCancellationRequested) {
            return undefined;
        }
        const info = this.backend.getContext(document.uri.toString())?.symbolDefinition(  
            position.line + 1,
            position.character);

        if (info) {
            // VS code shows the text for the range given here on holding ctrl/cmd, which is rather
            // useless given that we show this info already in the hover provider. So, in order
            // to limit the amount of text we only pass on the smallest range which is possible.
            // Yet we need the correct start position to not break the goto-definition feature.
            if (info.definition) {
                return(new Location(Uri.parse(info.source), Utilities.lexicalRangeToRange(info.definition.range)));
            } else {
                // Empty for built-in entities.
                return(new Location(Uri.parse(""), new Position(0, 0)));
            }
        }
        return null;
    }
}