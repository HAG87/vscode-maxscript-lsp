# Tylasu AST - Variable & Symbol Resolution

## Overview

This module implements a typed AST pipeline that replaces the legacy `ContextSymbolTable` (antlr4-c3), which has O(n²) complexity and unreliable scope resolution.

Built on **[Tylasu](https://github.com/Strumenta/tylasu)** from Strumenta — a professional AST framework that provides typed `Node` base classes, position tracking, and reference-by-name semantics.

## Problem Statement

Legacy implementation in `ContextSymbolTable.ts`:
- `getScopedSymbolOccurrences()` has O(n²) complexity
- Multiple DFS traversals with fragile heuristics (`isScopeSibling`, `isScopeChild`)
- Scope comparison using `JSON.stringify()`
- Unreliable for nested scopes and closure references

## Solution: Direct Reference AST

Instead of searching the parse tree repeatedly, build an AST where:
1. Each `VariableReference` has a `ReferenceByName<VariableDeclaration>` — direct resolved link
2. Each `VariableDeclaration` has an array of all its `VariableReference`s
3. Scope resolution happens once during the resolution pass

**Result:** O(1) lookups after build, 100% reliable scoping

## Architecture

```
Parse Tree (ANTLR)
       ↓
ASTBuilder (visitor)
       ↓
AST with unresolved references
       ↓
SymbolResolver (visitor)
       ↓
AST with resolved references
       ↓
SymbolTreeBuilder
       ↓
VS Code ISymbolInfo[] (hierarchical)
       ↓
Providers (Definition, References, DocumentSymbol, etc.)
```

## Files

| File | Purpose |
|------|---------|
| `ASTNodes.ts` | All typed AST node definitions (declarations, scopes, control flow, definition blocks) |
| `ASTBuilder.ts` | Converts ANTLR parse tree to unresolved AST |
| `SymbolResolver.ts` | Resolves all `VariableReference` nodes to their declarations |
| `SymbolTreeBuilder.ts` | Converts resolved AST to `ISymbolInfo[]` for VS Code outline |
| `README_POC.ts` | `buildAST()` pipeline entry point + position-query helpers |
| `POC_Test.ts` | Basic pipeline smoke tests |

## Key Classes

### ScopeNode
```typescript
abstract class ScopeNode extends Node {
    declarations: Map<string, VariableDeclaration>;
    parentScope?: ScopeNode;

    // O(scope-depth) lookup — effectively O(1) in practice
    resolve(name: string): VariableDeclaration | undefined;
    addDeclaration(decl: VariableDeclaration): void;
}
```

### VariableDeclaration
```typescript
class VariableDeclaration extends Node {
    name: string;
    scope: 'local' | 'global' | 'persistent';
    declaringScope?: ScopeNode;
    references: VariableReference[] = []; // populated by SymbolResolver
}
```

Subclasses: `RolloutControl`, `RcMenuItem`, `ParameterDefinition`

### VariableReference
```typescript
class VariableReference extends Node {
    name: string;
    // ReferenceByName<T> from Tylasu — resolved link
    declaration: ReferenceByName<VariableDeclaration>;
}
// After resolution: ref.declaration.referred → VariableDeclaration
```

### DefinitionBlock
```typescript
class DefinitionBlock extends ScopeNode {
    kind: 'macroscript' | 'utility' | 'rollout' | 'rolloutGroup' |
          'tool' | 'rcmenu' | 'submenu' | 'plugin' | 'parameters' | 'attributes';
    name: string;
    parameters: VariableDeclaration[];
    clauses: Node[];
}
```

## Coverage

**Implemented:**
- ✅ Variable declarations (`local x`, `global y`, `persistent z`)
- ✅ Variable references
- ✅ Function definitions and parameters
- ✅ Block expressions
- ✅ Scope chain resolution
- ✅ Struct definitions and member fields
- ✅ Control flow: `if`, `while`, `do-while`, `for`, `try-catch`, `case`
- ✅ Return/exit statements
- ✅ Context expressions (`with obj do ...`, `#myNode.prop`)
- ✅ When statements (`when obj.param changes do ...`)
- ✅ Event handlers (button pressed, spinner changed, etc.)
- ✅ All definition blocks: macroscript, utility, rollout, rolloutGroup, tool, rcmenu
- ✅ Rollout controls (button, spinner, slider, checkbox, etc.)
- ✅ RC menu items and submenus
- ✅ Parameters blocks and parameter entries
- ✅ Plugin definitions (`plugin geometry`, `plugin modifier`, etc.)
- ✅ Attributes definitions

**Not Yet Modelled:**
- ⚠️ Binary/unary expressions — children traversed, not typed as nodes
- ⚠️ Call expressions — callee reference tracked, no call→definition link
- ❌ Member expressions (obj.prop path typing)
- ❌ Type inference

## Usage Example

```typescript
import { buildAST } from './README_POC';

// 1. Build and resolve AST in one step
const ast = buildAST('local x = 5\ny = x + 1');

// 2. Find declaration — O(1)
const xDecl = ast.declarations.get('x');

// 3. Get all references — O(1)
const refs = xDecl?.references ?? [];
console.log(`Found ${refs.length} references`);

// 4. Navigate from reference to declaration — O(1)
refs.forEach(ref => {
    const line = ref.position?.start.line;
    const resolvedName = ref.declaration.referred?.name;
    console.log(`Reference at line ${line} → ${resolvedName}`);
});
```

## Position-Based Queries

For cursor-position queries (e.g., from providers), use the helpers in `README_POC.ts` or the stable API in `ASTQuery.ts`:

```typescript
import { findDefinitionAt, findReferencesAt } from './README_POC';

// "Go to Definition" — find the declaration under cursor
const decl = findDefinitionAt(ast, line, col);
if (decl?.position) { /* navigate */ }

// "Find All References"
const refs = findReferencesAt(ast, line, col);
```

Note: `findInnermostNode` uses `ast.walk()` (O(n) traversal) to locate the cursor node. The actual reference→declaration lookup is O(1). For a provider-ready stable API see `ASTQuery.ts`.

## Performance

| Operation | antlr4-c3 (current) | Tylasu AST | Notes |
|-----------|---------------------|------------|-------|
| Find references | O(n²) tree walk | O(1) array access | After build |
| Find definition | O(n) tree walk | O(1) direct link | After build |
| Scope resolution | Heuristic matching | Direct scope chain | 100% reliable |
| Build symbol tree | O(n²) with DFS | O(n) single pass | |
| Node-at-position | N/A | O(n) walk | One-time per request |

## Testing

```bash
npm run test:ast          # all AST tests
npm run test:ast:contexts # context/when/event tests
npm run test:ast:symboltree  # symbol tree output
npm run test:ast:definitions # definition block coverage
npm run compile-tests     # TypeScript type check
```

## Integration Plan

### Next: ASTQuery.ts (stable provider API)
```typescript
// Stable entrypoints for providers
import { ASTQuery } from './ASTQuery';

const query = new ASTQuery(ast);

// "Go to Definition"
const decl = query.findDeclarationAtPosition(line, col);

// "Find All References"
const refs = query.findReferencesForDeclaration(decl);

// Scope navigation
const chain = query.getScopeChain(someNode);
const block = query.getEnclosingDefinitionBlock(someNode);
```

### Then: Provider Wiring
```typescript
// DefinitionProvider.ts
const ast = BackendUtils.getOrBuildAST(document);
const decl = ASTQuery.findDeclarationAtPosition(ast, line, col);
return toLocation(document.uri, decl.position);

// ReferenceProvider.ts
const ast = BackendUtils.getOrBuildAST(document);
const decl = ASTQuery.findDeclarationAtPosition(ast, line, col);
return ASTQuery.findReferencesForDeclaration(decl).map(r => toLocation(uri, r.position));
```

---

**Status**: AST pipeline complete end-to-end. Query layer next, then provider integration.
**Build**: `npm run compile-tests` → exit 0
