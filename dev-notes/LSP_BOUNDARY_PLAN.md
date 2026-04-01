# LSP Boundary Plan

## Recommendation

Do not move straight to a full language server yet.

The current codebase is already close to a reusable analysis core, but `ExtensionHost` still mixes three concerns:

1. VS Code transport and UI integration
2. Workspace/document lifecycle orchestration
3. Runtime dependency graph maintenance and diagnostic refresh policy

The right next step is to extract concern 2 and 3 into a protocol-agnostic session layer. That same session layer can later sit behind either:

- the current direct VS Code providers
- an LSP server

This gives most of the architectural benefit without paying the full migration cost now.

## Current Split

### Already reusable

- `src/backend/Backend.ts`
- `src/backend/SourceContext.ts`
- `src/backend/ast/**`
- `src/backend/navigation/**`
- `src/backend/rename/**`
- `src/backend/signature/**`
- `src/backend/completion/**`
- `src/backend/query/**`

These areas are largely URI and text driven. They do not fundamentally require VS Code provider APIs.

### Still transport-bound

- `src/ExtensionHost.ts`
- `src/Diagnostics.ts`
- `src/*Provider.ts`
- command implementations for minify and prettify

These parts depend on VS Code events, editor state, progress UI, diagnostics collections, provider registration, and command routing.

## The Real Extraction Target

The most important seam is not provider classes. It is the orchestration logic currently inside `ExtensionHost`.

That logic should move into a new protocol-agnostic service, for example:

- `src/backend/session/WorkspaceSession.ts`

This service should own:

- open/close/change/save document state
- reparse debounce policy
- runtime `fileIn` dependency graph
- workspace file create/change/delete/rename reactions
- publishable diagnostics state
- provider refresh invalidation state
- workspace symbol dirtiness state

It should not know anything about:

- `languages.register*Provider`
- `DiagnosticCollection`
- `window.showInformationMessage`
- `window.withProgress`
- `TextEditorEdit`

## Proposed Boundary

### 1. Protocol-agnostic session layer

Create a service with a narrow host-independent API.

Suggested shape:

```ts
interface SessionDocument {
    uri: string;
    languageId: string;
    version?: number;
    text: string;
}

interface SessionSettings {
    parser: { reparseDelay: number };
    providers: {
        contextualSemanticTokens: boolean;
        tracePerformance: boolean;
        traceRouting: boolean;
        traceParserDecisions: boolean;
    };
}

interface SessionEvents {
    diagnosticsChanged(uris: string[]): void;
    semanticTokensInvalidated(uris: string[]): void;
    codeLensInvalidated(uris: string[]): void;
    workspaceSymbolsChanged(uris: string[]): void;
}

interface WorkspaceSession {
    initializeOpenDocuments(documents: SessionDocument[]): void;
    openDocument(document: SessionDocument): void;
    changeDocument(document: SessionDocument): void;
    saveDocument(uri: string): void;
    closeDocument(uri: string): void;

    fileCreated(uri: string): void;
    fileChanged(uri: string): void;
    fileDeleted(uri: string): void;
    fileRenamed(oldUri: string, newUri: string): void;

    updateSettings(settings: SessionSettings): void;

    getDiagnostics(uri: string): IDiagnosticEntry[];
}
```

The current extension host and a future LSP server can both adapt to this interface.

### 2. Thin transport adapters

Keep the outer shell thin.

For VS Code direct providers:

- register providers
- translate VS Code events into session calls
- translate diagnostics/tokens/results into VS Code types

For LSP:

- map `didOpen`, `didChange`, `didSave`, `didClose`
- map `didChangeWatchedFiles`
- publish diagnostics with `textDocument/publishDiagnostics`
- surface provider results from server handlers

### 3. UI-only commands stay in the client

The following are not good first-pass LSP targets:

- `mxs.help`
- `mxs.minify`
- `mxs.prettify`
- progress notifications around file formatting
- file picker flows in `processFiles(...)`

Those are client UX commands. They can keep calling backend/session services directly for now.

## Mapping From Current `ExtensionHost`

### Move into `WorkspaceSession`

These methods are business logic, not VS Code shell logic:

- `clearPendingReparse(...)`
- `getOpenRuntimeDependencyOwners(...)`
- `ensureDocumentContext(...)`
- `refreshRuntimeDependencyOwners(...)`
- `handleWatchedFileChange(...)`
- `handleWatchedFileCreate(...)`
- `handleWatchedFileDelete(...)`
- `handleWorkspaceFileDelete(...)`
- `handleWorkspaceFileRename(...)`
- `syncBackendTraceSettings(...)` split into settings mapping plus backend update
- `resolveWorkspaceFileInUri(...)`
- `collectRuntimeDependencyUris(...)`
- `reconcileRuntimeDependencies(...)`
- `removeRuntimeDependencyGraphFor(...)`
- `scheduleProvidersRefresh(...)` as invalidation events, not direct UI refresh
- `publishDiagnosticsForDocument(...)` partially, but return raw diagnostics rather than VS Code `Diagnostic`
- `refreshOpenDocumentDiagnostics(...)`
- `reparseAndRefreshDocument(...)`

### Keep in the VS Code client shell

- `registerEventHandlers(...)`
- `registerProviders(...)`
- `registerCommands(...)`
- `registerFileWatcher(...)`
- `diagnosticCollection` ownership
- `window.show*Message(...)`
- `window.withProgress(...)`

### Keep in provider adapters, but make them thinner

The provider files should ideally become translation-only adapters:

- `DefinitionProvider.ts`
- `ReferenceProvider.ts`
- `HoverProvider.ts`
- `RenameProvider.ts`
- `SignatureHelpProvider.ts`
- `CompletionItemProvider.ts`
- `DocumentHighlightProvider.ts`
- `CallHierarchyProvider.ts`
- `SemanticTokensProvider.ts`
- `SymbolProvider.ts`
- `WorkspaceSymbolProvider.ts`

They should call stable backend/session query APIs and translate the result to transport-specific types.

## Why This Is Better Than Jumping To LSP Now

If you move straight to LSP, you will be refactoring transport and orchestration at the same time. That is the risky path.

If you extract a session layer first:

- the AST-first backend stays intact
- provider behavior is easier to regression test
- rename/delete/watcher logic is preserved in one place
- you can keep shipping VS Code features during the refactor
- the later LSP step becomes mostly protocol plumbing

## What An LSP Server Would Still Need Later

After the session layer exists, the remaining LSP work is mostly:

1. Document sync wiring
2. Watched-files wiring
3. Diagnostics publishing
4. Capability negotiation
5. Result translation to LSP shapes
6. Cancellation and request scheduling

That is still real work, but it becomes tractable and mostly mechanical.

## Migration Plan

### Phase 1: Extract orchestration

Create `WorkspaceSession` and move document lifecycle and dependency graph logic out of `ExtensionHost`.

Success criteria:

- `ExtensionHost` becomes a thin adapter
- no behavior change for open/change/save/delete/rename flows

### Phase 2: Normalize backend query APIs

Reduce direct provider knowledge of backend internals.

Success criteria:

- providers stop reaching into ad hoc lifecycle details
- provider code becomes mostly result translation

### Phase 3: Introduce transport-neutral diagnostics and invalidation events

Move away from direct `DiagnosticCollection` thinking.

Success criteria:

- session emits raw updates
- client decides how to publish them

### Phase 4: Optional LSP server

Only after phases 1 to 3 are stable.

Success criteria:

- same core session/backend reused by both transports
- no AST fallback regressions

## Priority Recommendation

The highest-value extraction is:

1. runtime dependency graph ownership
2. document lifecycle state machine
3. diagnostics/invalidation event production

Do those first. Do not start with provider rewrites.

## Bottom Line

Yes, the backend is a good candidate for a language server eventually.

No, a full LSP migration is probably not the best immediate investment.

The best next step is to extract a protocol-agnostic workspace session from `ExtensionHost` and keep the AST-first backend as the core.