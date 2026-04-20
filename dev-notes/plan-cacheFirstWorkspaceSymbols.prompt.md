## Plan: Cache-First Architecture + Workspace Symbols

Adopt a generation-based cache architecture in SourceContext so expensive operations execute once per parse generation, then layer an incremental workspace symbol index that updates per dirty file. This addresses current hot spots (repeated AST/resolver rebuilds and full-collection workspace symbol rebuilds) while preserving behavior through staged rollout and feature flags.

**Steps**
1. Phase 0 — Baseline and instrumentation (*blocks all later phases*): add lightweight counters/timers around parse, ensureAstModel, ensureSymbolTable, ASTQuery entrypoints, and workspace symbol query latency to establish a before/after baseline.
2. Phase 1 — Generation cache boundaries in SourceContext (*depends on 1*): introduce parse generation counters and gate ensureSymbolTable/ensureAstModel so symbol-table and AST pipelines rebuild at most once per generation.
3. Phase 2 — Query-result memoization (*depends on 2*): cache hot AST query results by generation + position keys for declaration lookup and completion visibility lookups.
4. Phase 3 — Provider refresh coalescing in ExtensionHost (*depends on 2, parallel with 3*): batch semantic-token and codelens refresh notifications into one scheduled pass per reparse debounce cycle.
5. Phase 4 — Workspace symbol index foundation (*depends on 1, parallel with 2/3*): add a dedicated index service with per-file symbol snapshots, dirty-file tracking, and query-time lookup map.
6. Phase 5 — Dual-path workspace provider rollout (*depends on 4*): keep existing provider output as control path while introducing feature-flagged index-backed query path and diff/verify equivalence.
7. Phase 6 — Source strategy for workspace symbols (*depends on 5*): select extraction source (simple lexer path or AST symbol-tree path) by measured correctness/perf profile, then set production default.
8. Phase 7 — Hardening and graduation (*depends on 6*): remove legacy rebuild-heavy internals only after stability thresholds (latency, correctness parity, memory ceiling) are met.

**Relevant files**
- e:/repos/vscode-maxscript/src/backend/SourceContext.ts — introduce generation counters, per-generation invalidation, and ASTQuery memoization hooks.
- e:/repos/vscode-maxscript/src/backend/Backend.ts — host/cache lifecycle integration points and workspace-level service ownership.
- e:/repos/vscode-maxscript/src/ExtensionHost.ts — debounce/reparse event flow and provider refresh coalescing.
- e:/repos/vscode-maxscript/src/backend/ast/ASTQuery.ts — hot query entrypoints to memoize by generation and cursor position.
- e:/repos/vscode-maxscript/src/WorkspaceSymbolProvider.ts — dual-path workspace symbol query and feature-flag routing.
- e:/repos/vscode-maxscript/src/backend/symbols/simpleSymbolProvider.ts — current fast extractor path; candidate default for large workspaces.
- e:/repos/vscode-maxscript/src/SymbolProvider.ts — document-symbol AST route; reference behavior baseline for symbol correctness checks.
- e:/repos/vscode-maxscript/src/backend/ast/SymbolTreeBuilder.ts — AST/hierarchical symbol extraction path for accuracy-focused workspace mode.

**Verification**
1. Add performance counters and assert target improvements: AST builds per keystroke cycle, resolver invocations per generation, and workspace-symbol query p50/p95.
2. Add correctness parity tests for workspace symbols (old provider vs index provider) on representative fixture set.
3. Add stale-data tests: edit/save/close/delete file and ensure index updates/removals are reflected without full rebuild.
4. Add cache invalidation tests: any parse generation bump must invalidate cached AST/query results and produce fresh answers.
5. Run existing AST suites and provider integration tests to ensure no behavioral regressions.

**Decisions**
- Included scope: robust caching architecture and workspace-symbol provider strategy only.
- Excluded scope: formatter backend redesign and unrelated provider migrations.
- Recommendation: generation-first caching before resolver micro-optimizations; this yields highest ROI with lower risk.
- Workspace symbols recommendation: ship incremental index behind feature flag, keep legacy path until parity and perf targets are validated.

**Further Considerations**
1. Resolver memoization depth: Option A cache only query outputs (low risk), Option B cache resolver internals too (higher complexity, later phase).
2. Workspace symbol source default: Option A simple for performance-first default, Option B AST source for accuracy-first default, Option C adaptive mode by workspace size.
3. Cross-file semantics: Option A declarations-only workspace symbols now, Option B add optional cross-file relation graph after index stabilization.
