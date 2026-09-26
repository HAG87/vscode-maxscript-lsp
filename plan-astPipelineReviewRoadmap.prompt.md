# Plan: AST Pipeline Review — Quality, Speed, Fidelity Roadmap

TL;DR: The Tylasu-based AST pipeline (`src/backend/ast/`) is functionally complete (~96%, per docs/STATUS.md) and already replaces the legacy antlr4-c3 symbol table for most providers. This is a roadmap (not immediate execution) of concrete, independently-schedulable improvements across three axes: build/resolve speed per reparse, type/dispatch code quality, and AST structural fidelity to MaxScript source (missing typed nodes, unresolved TODOs). Legacy `ContextSymbolTable` retirement is explicitly out of scope.

**Current pipeline** (`SourceContext.ensureAstModel()`):
Parse tree → `semanticTokenListener` walk (parse tree) → `ASTBuilder.visitProgram` (parse tree → AST) → `SymbolResolver.resolve()` (2 AST walks: reset + resolve) → `NavigationService.prewarmIndexes` → optional `appendAstSemanticTokens`. That's ~4-5 full tree walks per reparse today.

---

## Phase A — Speed (reduce redundant walks per reparse)

1. **Merge `SymbolResolver.resetResolutionState()` into the resolve pass.** Currently `resolve()` does a full `program.walk()` just to clear `references`/`referred` links, then a second structural walk to re-resolve. Since `SymbolResolver`'s structural visit already touches every `VariableDeclaration`/`VariableReference`, clearing state inline (at first visit) removes one full tree walk. *Independent, low risk.*
2. **Investigate collapsing `semanticTokenListener` (parse-tree walk) and `ASTBuilder` (parse-tree walk) into one traversal**, or defer the semantic-token walk until `appendAstSemanticTokens` is actually needed (it's already gated by `isAstSemanticTokenTraceEnabled()` in some paths — confirm this gate covers the *listener* walk too, not just the append step). Check [SourceContext.ts](src/backend/SourceContext.ts#L607-L631) — `semanticWalkStart`/`semanticListener` runs unconditionally before the `isAstSemanticTokenTraceEnabled()` check that guards `appendAstSemanticTokens`. If the base semantic tokens are always needed (MaxAPI defaults), keep as-is but document why; otherwise gate it too. *Depends on confirming what "always-on" semantic tokens are used for downstream.*
3. **Profile real files** using the existing `providers.tracePerformance` trace (`astBuild=`, `resolve=`, `prewarm=` timings already logged) against a large representative `.ms` file to get current baseline numbers before optimizing further — the perf doc's old benchmark table (10–500 vars, sub-ms resolve) predates full node coverage (control flow, definition blocks, rollouts) and is stale.
4. **Re-examine `SymbolResolver.visit()` dispatcher** (`if (node instanceof X) ... else if ...` chain of ~18 branches) — for `Program`-scale trees this runs per-node on every resolve; a `Map<constructor, handler>` dispatch (or moving to a proper Tylasu visitor) turns this into O(1) type dispatch instead of a linear instanceof chain. Modest win, mostly a quality/perf twofer (see Phase B item 1).

## Phase B — Quality (type safety, dispatch pattern, dead/loose typing)

1. **Replace linear instanceof dispatch with a lookup table or Tylasu's built-in visitor support** in both `SymbolResolver.visit()` ([SymbolResolver.ts](src/backend/ast/SymbolResolver.ts#L399-L461)) and `SymbolTreeBuilder.buildSymbolForNode()` — same shape of problem in both files. Centralizing this pattern also makes it easier to add new node types consistently (ties into Phase C).
2. **Tighten `ASTBuilder` return typing.** `mxsParserVisitor<any>` and many `visitX` methods return `Expression | Expression[] | null` or bare `any`; the `visit()` call sites cast with `as Expression` liberally. Introduce a narrower discriminated result type or per-category visit helpers (`visitExprAsExpression`, `visitDeclarationList`) to reduce unchecked casts and catch mismatches at compile time.
3. **Resolve the two open TODOs:**
   - [ASTBuilder.ts](src/backend/ast/ASTBuilder.ts#L772) — `visitStructMember` always creates the field's `VariableDeclaration` with scope `'local'`; confirm whether struct fields need a distinct `scope`/kind (e.g. `'field'`) for correct hover/rename semantics, or document why `'local'` is intentionally correct.
   - [ASTBuilder.ts](src/backend/ast/ASTBuilder.ts#L1121) — `as` type-cast expressions are folded into a generic `BinaryExpression('as', ...)` with no dedicated node; decide whether a `TypeCastExpression` node is worth adding now or tracked as a fidelity backlog item (see Phase C item 1).
4. **Decide the fate of `src/backend/ast/docs/` and `src/backend/ast/test/*.ts` ad-hoc scripts** (`POC_Test.ts`, `test-ast-debug.ts`, `run-tests.ts`, etc.) — several predate the current node coverage and their own docs admit stale numbers (0 references/statements bugs, since fixed). Either fold their assertions into the `npm run test:ast:*` suites referenced in package.json or archive/delete to stop them drifting further from reality.

## Phase C — Fidelity (structural gaps vs. MaxScript source, per docs/STATUS.md's own "Not Yet Modelled" list)

1. **Binary/unary expressions are typed nodes already** (`BinaryExpression`/`UnaryExpression` exist) but per STATUS.md some code paths still fall through the generic "walk `.children`" catch-all in `SymbolResolver.visit()` rather than a dedicated `visitBinaryExpression`/`visitUnaryExpression` — confirm current state (STATUS.md may be stale here) and add explicit visit methods if references inside these can be missed by the generic children-walk fallback.
2. **Call expressions**: callee reference is tracked but there is no call → function-definition link (STATUS.md gap). Adding `CallExpression.resolvedCallee?: ReferenceByName<FunctionDefinition>` would enable "go to definition" on function calls and future signature-help improvements without a second lookup pass.
3. **Member expression typing**: `obj.prop` paths resolve today via `ASTQuery.findDeclarationForMemberExpression` heuristics rather than a first-class structural link. Consider whether member resolution should be pre-computed during `SymbolResolver` (mirroring `VariableReference.declaration`) instead of being recomputed per query in `ASTQuery` — trades resolve-time cost for O(1) query-time lookups (ties into Phase A tradeoffs).
4. **Type inference**: explicitly listed as not started; out of scope for this roadmap but flagged as the natural next fidelity milestone after member-expression typing.

---

**Relevant files**
- [src/backend/SourceContext.ts](src/backend/SourceContext.ts#L607-L676) — `ensureAstModel()`, the per-reparse pipeline and perf trace logging.
- [src/backend/ast/ASTBuilder.ts](src/backend/ast/ASTBuilder.ts) — parse tree → AST; TODOs at lines 772, 1121; heavy `any`/cast usage.
- [src/backend/ast/SymbolResolver.ts](src/backend/ast/SymbolResolver.ts) — `resetResolutionState()` (extra walk), `visit()` dispatcher (instanceof chain).
- [src/backend/ast/SymbolTreeBuilder.ts](src/backend/ast/SymbolTreeBuilder.ts) — same dispatcher pattern as SymbolResolver.
- [src/backend/ast/ASTQuery.ts](src/backend/ast/ASTQuery.ts) — position index (`WeakMap` cache) already present; member-expression resolution heuristics live here.
- [src/backend/ast/docs/STATUS.md](src/backend/ast/docs/STATUS.md) — authoritative "what's done / not done" list; several gaps referenced above are already tracked here.
- [src/backend/ast/test/](src/backend/ast/test) — ad-hoc POC scripts vs. the `npm run test:ast:*` suite; candidates for cleanup.

**Verification**
1. `npm run test:ast`, `npm run test:ast:contexts`, `npm run test:ast:symboltree`, `npm run test:ast:definitions`, `npm run compile-tests` — existing regression suite, must stay green through any Phase A/B refactor.
2. For Phase A changes: re-run with `maxScript.providers.tracePerformance` enabled on a large `.ms` file, compare `astBuild=`/`resolve=`/`prewarm=` trace numbers before/after.
3. For Phase C additions (call/member resolution links): add targeted cases to `test-query-positions.ts` / `test-symboltree.ts` verifying the new resolved links.

**Decisions**
- Legacy `ContextSymbolTable` (antlr4-c3) retirement is explicitly excluded from this roadmap per user direction.
- This is a review/roadmap deliverable — phases are independently schedulable, not a committed execution order. Phase A and B items are low-risk and could be picked up first; Phase C items are larger and better suited for dedicated follow-up planning sessions once prioritized.

**Further Considerations**
1. Phase A item 2 (semantic token walk gating) needs one more read of how `contextualSemanticTokens`/base semantic tokens are consumed downstream before deciding whether to gate it — flagged as needing a quick follow-up check rather than a blocking question now.
2. Phase C's member-expression/call-expression linking (items 2–3) directly trades AST build/resolve time for query-time speed — worth revisiting Phase A's benchmark data before committing, since it changes the speed/fidelity balance.
