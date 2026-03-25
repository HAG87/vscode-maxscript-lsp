import {
  CancellationToken, CodeLens, CodeLensProvider, Event, EventEmitter,
    Location, Position, ProviderResult, Range, TextDocument, Uri,
} from 'vscode';

import type { Position as AstPosition } from '@strumenta/tylasu';
import { mxsBackend } from '@backend/Backend.js';
import { ASTQuery } from '@backend/ast/ASTQuery.js';
import {
    DefinitionBlock,
    FunctionDefinition,
    Program,
    StructDefinition,
    VariableDeclaration,
} from '@backend/ast/ASTNodes.js';

/** CodeLens that carries an AST declaration anchor for deferred reference resolution. */
class AstDeclarationCodeLens extends CodeLens
{
    constructor(
        range: Range,
        public readonly uri: Uri,
        public readonly declarationLine: number,
        public readonly declarationCharacter: number,
    ) {
        super(range);
    }
}

/** Provides "N references" code lenses above AST declarations. */
export class mxsCodeLensProvider implements CodeLensProvider
{
    public constructor(private backend: mxsBackend) { }

    private _onDidChangeCodeLenses = new EventEmitter<void>();

    public get onDidChangeCodeLenses(): Event<void> {
        return this._onDidChangeCodeLenses.event;
    }

    /** Notify VS Code that code lenses have changed and should be refreshed. */
    public refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }

    private astPositionToRange(position: AstPosition): Range {
        return new Range(
            position.start.line - 1,
            position.start.column,
            position.end.line - 1,
            position.end.column,
        );
    }

    private astPositionToVsPosition(position: AstPosition): Position {
        return new Position(position.start.line - 1, position.start.column);
    }

    private declarationFromSemanticNode(ast: Program, node: FunctionDefinition | StructDefinition | DefinitionBlock): VariableDeclaration | undefined {
        const name = node.name;
        if (!name || !node.parentScope) {
            return undefined;
        }
        const scoped = node.parentScope.declarations.get(name);
        if (scoped) {
            return scoped;
        }
        // Fallback to position-based resolution if scope map does not contain the declaration.
        if (!node.position) {
            return undefined;
        }
        return ASTQuery.findDeclarationAtPosition(ast, node.position.start.line, node.position.start.column);
    }

    private declarationLocations(uri: Uri, ast: Program, declaration: VariableDeclaration): Location[] {
        const locations: Location[] = [];

        if (declaration.position) {
            locations.push(new Location(uri, this.astPositionToRange(declaration.position)));
        }

        for (const reference of declaration.references) {
            if (!reference.position) {
                continue;
            }
            locations.push(new Location(uri, this.astPositionToRange(reference.position)));
        }

        for (const memberReference of ASTQuery.findMemberReferencesForDeclaration(ast, declaration)) {
            if (!memberReference.position) {
                continue;
            }
            locations.push(new Location(uri, this.astPositionToRange(memberReference.position)));
        }

        const seen = new Set<string>();
        return locations.filter((loc) => {
            const key = `${loc.range.start.line}:${loc.range.start.character}:${loc.range.end.line}:${loc.range.end.character}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    provideCodeLenses(document: TextDocument, _token: CancellationToken): ProviderResult<CodeLens[]>
    {
        const uri = document.uri;
        const context = this.backend.getContext(uri.toString());
        const ast = context.getResolvedAST();
        if (!ast) {
            return [];
        }

        const lenses: CodeLens[] = [];
        const seenDeclarations = new Set<string>();

        for (const node of ASTQuery.walkAllNodes(ast)) {
            if (!(node instanceof FunctionDefinition || node instanceof StructDefinition || node instanceof DefinitionBlock)) {
                continue;
            }

            const declaration = this.declarationFromSemanticNode(ast, node);
            if (!declaration?.position) {
                continue;
            }

            const key = `${declaration.position.start.line}:${declaration.position.start.column}`;
            if (seenDeclarations.has(key)) {
                continue;
            }
            seenDeclarations.add(key);

            const range = this.astPositionToRange(declaration.position);
            lenses.push(new AstDeclarationCodeLens(
                range,
                uri,
                declaration.position.start.line,
                declaration.position.start.column,
            ));
        }

        return lenses;
    }

    resolveCodeLens(codeLens: CodeLens, _token: CancellationToken): ProviderResult<CodeLens>
    {
        const lens = codeLens as AstDeclarationCodeLens;
        const context = this.backend.getContext(lens.uri.toString());
        const ast = context.getResolvedAST();
        if (!ast) {
            return codeLens;
        }

        const declaration = context.astDeclarationAtPosition(lens.declarationLine, lens.declarationCharacter);
        if (!declaration) {
            return codeLens;
        }

        const locations = this.declarationLocations(lens.uri, ast, declaration);

        const declarationPosition = declaration.position
            ? this.astPositionToVsPosition(declaration.position)
            : new Position(Math.max(0, lens.declarationLine - 1), lens.declarationCharacter);

        const refs = Math.max(0, locations.length - 1);
        const title = refs === 1 ? '1 reference' : `${refs} references`;

        if (refs === 0) {
            lens.command = {
                title,
                command: '',
            };
            return lens;
        }

        lens.command = {
            title,
            command: 'editor.action.showReferences',
            arguments: [lens.uri, declarationPosition, locations],
        };

        return lens;
    }
}