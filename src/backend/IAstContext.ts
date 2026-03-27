import type { Program, VariableDeclaration } from './ast/ASTNodes.js';
import type { IDiagnosticEntry, ISemanticToken, ISymbolInfo } from './types.js';
import type { ILexicalRange } from './types.js';

/**
 * The minimal context contract that backend services depend on.
 * SourceContext implements this interface.
 * Services should import and depend on this interface — never the concrete SourceContext class.
 *
 * This keeps the dependency graph unidirectional:
 *   Providers → SourceContext (concrete class, owned by Backend)
 *   Services  → IAstContext  (interface, no coupling to concrete SourceContext)
 */
export interface IAstContext {
    /** Document URI this context belongs to. */
    readonly sourceUri: string;

    /** Returns the fully resolved AST for this document, building it lazily if needed. */
    getResolvedAST(): Program | undefined;

    /**
     * Finds the VariableDeclaration at a given source position.
     * Handles member-access resolution and workspace-global fallback.
     * @param row 1-based line number
     * @param column 0-based column number
     */
    astDeclarationAtPosition(row: number, column: number): VariableDeclaration | undefined;

    /**
     * Returns visible declarations in scope at the given position.
     * Used for non-member completion suggestions.
     * @param row 1-based line number
     * @param column 0-based column number
     */
    astCompletionsAtPosition(row: number, column: number): { ast: Program; declarations: VariableDeclaration[] } | undefined;

    /**
     * Returns member declarations when the cursor follows a dot-access expression.
     * @param row 1-based line number
     * @param column 0-based column number
     * @param source Optional source text snapshot (falls back to last-lexed text)
     */
    astMemberCompletionsAtPosition(row: number, column: number, source?: string): { ast: Program; members: VariableDeclaration[] } | undefined;

    /** Resolves the source file URI for a declaration that may originate in a different document. */
    getDeclarationSourceUri(declaration: VariableDeclaration): string | undefined;

    /** Returns the resolved AST for another workspace document by URI. */
    getWorkspaceAstForUri(uri: string): Program | undefined;

    /** Returns navigation reference locations for the symbol at the given position. */
    getAstReferenceLocations(
        row1Based: number,
        column0Based: number,
        includeDeclaration: boolean,
        sourceLineText?: string,
    ): Array<{ uri: string; range: ILexicalRange }> | undefined;

    /** Returns global-scope completion candidates from the entire workspace. */
    getWorkspaceGlobalCompletions(requesterUri: string): VariableDeclaration[];

    /** Legacy ANTLR-based code completion candidates at a position. */
    getCodeCompletionCandidates(row: number, column: number): Promise<ISymbolInfo[]>;
}
