import {
    CallExpression,
    Program,
    ScopeNode,
    StringLiteral,
    VariableDeclaration,
    VariableReference,
} from '@ast/ASTNodes.js';
import { ASTQuery } from '@ast/ASTQuery.js';

/**
 * Owns all cached position-based AST queries for a single document.
 *
 * Responsibilities:
 *  - Caches results for `astDeclarationAtPosition`, `astCompletionsAtPosition`,
 *    and `astMemberCompletionsAtPosition` keyed by (row, column).
 *  - Invalidates caches when the document is re-parsed (`invalidate()`) or when
 *    the workspace globals version changes.
 *  - Encapsulates all workspace-lookup callbacks needed to resolve cross-file
 *    declarations and member completions.
 *
 * SourceContext creates and owns one instance per document. It calls
 * `configure()` when workspace callbacks are wired and `invalidate()` after
 * each successful parse.
 */
export class AstQueryService {
    // ------------------------------------------------------------------ config
    private workspaceGlobalResolver?: (name: string, requesterUri: string) => VariableDeclaration | undefined;
    private workspaceGlobalVersionProvider?: () => number;
    private workspaceDeclarationAstProvider?: (decl: VariableDeclaration) => Program | undefined;
    private workspaceFileInAstProvider?: (sourceUri: string, fileInTarget: string) => Program | undefined;

    // ------------------------------------------------------------------ cache
    private generation: number = 0;
    private cacheGeneration: number = -1;
    private cacheWorkspaceGlobalsVersion: number = -1;

    private declarationAtPositionCache: Map<string, VariableDeclaration | undefined> = new Map();
    private completionsAtPositionCache: Map<string, VariableDeclaration[] | undefined> = new Map();
    private memberCompletionsAtPositionCache: Map<string, { members: VariableDeclaration[] | undefined; fingerprint: string }> = new Map();

    // ------------------------------------------------------------------ lifecycle

    /** Called by SourceContext when workspace callbacks are (re-)configured. */
    public configure(
        workspaceGlobalResolver?: (name: string, requesterUri: string) => VariableDeclaration | undefined,
        workspaceGlobalVersionProvider?: () => number,
        workspaceDeclarationAstProvider?: (decl: VariableDeclaration) => Program | undefined,
        workspaceFileInAstProvider?: (sourceUri: string, fileInTarget: string) => Program | undefined,
    ): void {
        this.workspaceGlobalResolver = workspaceGlobalResolver;
        this.workspaceGlobalVersionProvider = workspaceGlobalVersionProvider;
        this.workspaceDeclarationAstProvider = workspaceDeclarationAstProvider;
        this.workspaceFileInAstProvider = workspaceFileInAstProvider;
    }

    /** Called by SourceContext after each successful parse to invalidate all position caches. */
    public invalidate(): void {
        this.generation++;
    }

    private ensureCachesCurrent(): void {
        const workspaceGlobalsVersion = this.workspaceGlobalVersionProvider?.() ?? -1;
        if (
            this.cacheGeneration === this.generation
            && this.cacheWorkspaceGlobalsVersion === workspaceGlobalsVersion
        ) {
            return;
        }
        this.declarationAtPositionCache.clear();
        this.completionsAtPositionCache.clear();
        this.memberCompletionsAtPositionCache.clear();
        this.cacheGeneration = this.generation;
        this.cacheWorkspaceGlobalsVersion = workspaceGlobalsVersion;
    }

    // ------------------------------------------------------------------ private helpers

    private resolveDeclarationFromReference(reference: VariableReference, ast: Program): VariableDeclaration | undefined {
        if (!reference.name) {
            return reference.declaration?.referred ?? undefined;
        }
        return reference.declaration?.referred
            ?? ASTQuery.findDeclarationByName(ast, reference.name)
            ?? undefined;
    }

    private resolveFileInImportedAst(declaration: VariableDeclaration, sourceUri: string): Program | undefined {
        const initializer = declaration.initializer;
        if (!(initializer instanceof CallExpression)) {
            return undefined;
        }
        if (!(initializer.callee instanceof VariableReference) || !initializer.callee.name) {
            return undefined;
        }
        if (initializer.callee.name.toLowerCase() !== 'filein') {
            return undefined;
        }
        const target = initializer.arguments[0];
        if (!(target instanceof StringLiteral)) {
            return undefined;
        }
        return this.workspaceFileInAstProvider?.(sourceUri, target.value);
    }

    private resolveFileInImportedMembers(declaration: VariableDeclaration, sourceUri: string): { ast: Program; members: VariableDeclaration[] } | undefined {
        const importedAst = this.resolveFileInImportedAst(declaration, sourceUri);
        if (!importedAst) {
            return undefined;
        }
        const members = [...importedAst.declarations.values()];
        return { ast: importedAst, members };
    }

    private memberDeclarationsFingerprint(members: VariableDeclaration[]): string {
        return members
            .map((member) => {
                const pos = member.position;
                const posKey = pos
                    ? `${pos.start.line}:${pos.start.column}:${pos.end.line}:${pos.end.column}`
                    : 'nopos';
                return `${member.name ?? ''}|${member.scope}|${posKey}`;
            })
            .sort()
            .join('||');
    }

    // ------------------------------------------------------------------ public queries

    /**
     * Finds the VariableDeclaration at a given position in the resolved AST.
     * Falls back to member-access resolution and workspace-global lookup when
     * no direct declaration is found at the cursor.
     *
     * @param ast   Resolved AST for this document (from SourceContext.getResolvedAST)
     * @param sourceUri  Document URI (needed for workspace cross-file callbacks)
     * @param row    1-based line number
     * @param column 0-based column number
     */
    public astDeclarationAtPosition(
        ast: Program,
        sourceUri: string,
        row: number,
        column: number,
    ): VariableDeclaration | undefined {
        this.ensureCachesCurrent();
        const cacheKey = `${row}:${column}`;
        if (this.declarationAtPositionCache.has(cacheKey)) {
            return this.declarationAtPositionCache.get(cacheKey);
        }

        let declaration = ASTQuery.findDeclarationAtPosition(ast, row, column);

        if (!declaration) {
            const member = ASTQuery.findMemberExpressionAtPosition(ast, row, column);
            const objectRef = member?.object;
            if (member?.property && objectRef instanceof VariableReference && objectRef.name) {
                const objectDeclaration = this.resolveDeclarationFromReference(objectRef, ast)
                    ?? this.workspaceGlobalResolver?.(objectRef.name, sourceUri);
                if (objectDeclaration) {
                    const objectAst = this.workspaceDeclarationAstProvider?.(objectDeclaration) ?? ast;
                    const importedMembers = this.resolveFileInImportedMembers(objectDeclaration, sourceUri);
                    const members = importedMembers?.members
                        ?? ASTQuery.getMemberCompletions(importedMembers?.ast ?? objectAst, objectDeclaration);
                    declaration = members.find(candidate => candidate.name === member.property);
                }
            }
        }

        if (!declaration && this.workspaceGlobalResolver) {
            const ref = ASTQuery.findReferenceAtPosition(ast, row, column);
            if (ref?.name) {
                declaration = this.workspaceGlobalResolver(ref.name, sourceUri);
            }
        }

        this.declarationAtPositionCache.set(cacheKey, declaration);
        return declaration;
    }

    /**
     * Returns visible declarations in scope at the cursor for non-member completions.
     *
     * @param ast    Resolved AST
     * @param row    1-based line number
     * @param column 0-based column number
     */
    public astCompletionsAtPosition(
        ast: Program,
        row: number,
        column: number,
    ): { ast: Program; declarations: VariableDeclaration[] } | undefined {
        this.ensureCachesCurrent();
        const cacheKey = `${row}:${column}`;
        if (this.completionsAtPositionCache.has(cacheKey)) {
            const cached = this.completionsAtPositionCache.get(cacheKey);
            return cached ? { ast, declarations: cached } : undefined;
        }

        const node = ASTQuery.findNodeAtPosition(ast, row, column);
        if (!node) {
            this.completionsAtPositionCache.set(cacheKey, undefined);
            return undefined;
        }

        const scope = (node instanceof ScopeNode)
            ? node
            : ASTQuery.getEnclosingScope(node);
        if (!scope) {
            this.completionsAtPositionCache.set(cacheKey, undefined);
            return undefined;
        }

        const declarations = ASTQuery.getVisibleDeclarationsAtPosition(scope, row, column);
        this.completionsAtPositionCache.set(cacheKey, declarations);
        return { ast, declarations };
    }

    /**
     * Returns member declarations when the cursor follows a dot-access expression.
     *
     * @param ast       Resolved AST
     * @param sourceUri Document URI for workspace cross-file callbacks
     * @param row       1-based line number
     * @param column    0-based column number
     * @param text      Source text (must be the current document content)
     */
    public astMemberCompletionsAtPosition(
        ast: Program,
        sourceUri: string,
        row: number,
        column: number,
        text: string,
    ): { ast: Program; members: VariableDeclaration[] } | undefined {
        this.ensureCachesCurrent();

        const lines = text.split(/\r?\n/);
        if (row < 1 || row > lines.length) {
            return undefined;
        }

        const currentLine = lines[row - 1];
        const beforeCursor = currentLine.substring(0, column);
        const cacheKey = `${row}:${column}:${beforeCursor}`;
        const existing = this.memberCompletionsAtPositionCache.get(cacheKey);

        const memberAccessMatch = beforeCursor.match(/(\w+)\.(\w*)$/);
        if (!memberAccessMatch) {
            this.memberCompletionsAtPositionCache.set(cacheKey, { members: undefined, fingerprint: '' });
            return undefined;
        }

        const objectName = memberAccessMatch[1];
        const memberPrefix = memberAccessMatch[2];
        const objectLine = row;
        const objectColumn = column - memberPrefix.length - 1 - objectName.length;

        let objectDeclaration: VariableDeclaration | undefined =
            ASTQuery.findDeclarationAtPosition(ast, objectLine, objectColumn)
            ?? ASTQuery.findDeclarationByName(ast, objectName);

        let resolvedAst: Program = ast;
        let members: VariableDeclaration[] | undefined;

        if (!objectDeclaration && this.workspaceGlobalResolver) {
            objectDeclaration = this.workspaceGlobalResolver(objectName, sourceUri);
            if (objectDeclaration && this.workspaceDeclarationAstProvider) {
                resolvedAst = this.workspaceDeclarationAstProvider(objectDeclaration) ?? ast;
            }
        }

        if (!objectDeclaration) {
            this.memberCompletionsAtPositionCache.set(cacheKey, { members: undefined, fingerprint: '' });
            return undefined;
        }

        const importedMembers = this.resolveFileInImportedMembers(objectDeclaration, sourceUri);
        if (importedMembers) {
            resolvedAst = importedMembers.ast;
            members = importedMembers.members;
        }

        members ??= ASTQuery.getMemberCompletions(resolvedAst, objectDeclaration);
        const fingerprint = this.memberDeclarationsFingerprint(members);

        if (existing && existing.fingerprint === fingerprint) {
            return existing.members ? { ast: resolvedAst, members: existing.members } : undefined;
        }

        if (members.length === 0) {
            this.memberCompletionsAtPositionCache.set(cacheKey, { members: undefined, fingerprint });
            return undefined;
        }

        this.memberCompletionsAtPositionCache.set(cacheKey, { members, fingerprint });
        return { ast: resolvedAst, members };
    }
}
