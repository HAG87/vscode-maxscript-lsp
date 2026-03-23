# AST Migration - Current Status

## ✅ What's Complete

### 1. Core AST Infrastructure (100%)
- ✅ Base classes: `ASTNode` (Tylasu `Node`), `ScopeNode`, `Expression`
- ✅ Node types: `Program`, `VariableDeclaration`, `VariableReference`
- ✅ Function support: `FunctionDefinition`, `BlockExpression`
- ✅ Struct support: `StructDefinition`, `StructMemberField`
- ✅ Scope chain: `parentScope` links with `resolve()` method
- ✅ Direct references: Bidirectional declaration ↔ reference links
- ✅ Position tracking: Tylasu `Position`/`Point` on all nodes

### 2. AST Builder (100%)
- ✅ ANTLR visitor: Extends `mxsParserVisitor<ASTNode>`
- ✅ Scope tracking: Stack-based scope management
- ✅ Declaration handling: `local x`, `global y`, `persistent z`
- ✅ Function parsing: With parameters and body
- ✅ Struct parsing: With member fields and method slots
- ✅ Reference creation: All identifier usages become `VariableReference`
- ✅ Control flow: `if`, `while`, `do-while`, `for`, `try-catch`, `case`
- ✅ Return/exit: `ReturnStatement`, `ExitStatement`
- ✅ Context/when: `ContextStatement`, `WhenStatement`
- ✅ Event handlers: `EventHandlerStatement`
- ✅ Definition blocks: macroscript, utility, rollout, tool, rcmenu via `DefinitionBlock`
- ✅ Rollout controls: `RolloutControl` (button, spinner, slider, etc.)
- ✅ Rollout groups: `rolloutGroup` DefinitionBlock kind
- ✅ RC menu items: `RcMenuItem` (menuitem, separator)
- ✅ RC submenus: `submenu` DefinitionBlock kind
- ✅ Parameters blocks: `parameters` DefinitionBlock kind with `ParameterDefinition` entries
- ✅ Plugin definitions: `PluginDefinition` with `pluginKind`
- ✅ Attributes definitions: `attributes` DefinitionBlock kind

### 3. Symbol Resolver (100%)
- ✅ Resolution pass: Walks AST and resolves all references
- ✅ Scope chain lookup: Uses `scope.resolve(name)` for each scope layer
- ✅ Bidirectional linking: Sets `reference.declaration` and `declaration.references[]`
- ✅ Unresolved handling: Gracefully handles undefined variables (implicit globals)
- ✅ Function/block scope: Properly enters/exits all scope boundaries
- ✅ DefinitionBlock scope: Parameters and clause members resolved within block scope
- ✅ RolloutControl/RcMenuItem subclass resolution (caption, parameters, operands)
- ✅ ParameterDefinition resolution

### 4. Symbol Tree Builder (100%)
- ✅ `SymbolTreeBuilder.buildSymbolTree()` produces `ISymbolInfo[]` for VS Code outline
- ✅ Functions, structs, definition blocks all emit proper children
- ✅ `definitionBlockKind()` maps 10 DefinitionBlock kinds to VS Code `SymbolKind`
- ✅ `RolloutControl` → `SymbolKind.Control`
- ✅ `RcMenuItem` → `SymbolKind.RcMenuControl`
- ✅ `ParameterDefinition` → `SymbolKind.Parameter`
- ✅ Event handlers emit as `SymbolKind.Event` with `target.event` naming
- ✅ Struct members emit with `SymbolKind.Field` / `SymbolKind.Method`

### 5. Testing (80%)
- ✅ `npm run test:ast` — all AST tests pass
- ✅ `npm run test:ast:contexts` — context/when/event tests pass
- ✅ `npm run test:ast:symboltree` — symbol tree tests pass
- ✅ `npm run test:ast:definitions` — definition block tests pass
- ✅ `npm run compile-tests` — clean TypeScript build (exit 0)
- ⚠️ No benchmark vs antlr4-c3 yet

### 6. Query Helpers (README_POC.ts)
- ✅ `buildAST(code)` — full pipeline (parse → build → resolve)
- ✅ `findInnermostNode<T>()` — walks AST to find smallest-span node at position
- ✅ `findReferencesAt()` — finds all references for the symbol at cursor
- ✅ `findDefinitionAt()` — returns the declaration for reference at cursor

## 🔄 What's In Progress

### 1. Stable Query/Access Layer (0%)
- ❌ `ASTQuery.ts` not yet created — needed before provider integration
- ❌ No `findNodeAtPosition`, `findDeclarationAtPosition`, `getScopeChain` stable APIs

## ❌ What's Not Started

### 1. Provider Integration (0%)
- ❌ DefinitionProvider not using AST
- ❌ ReferenceProvider not using AST
- ❌ HoverProvider not using AST
- ❌ RenameProvider not using AST
- ❌ Still using ContextSymbolTable (antlr4-c3) as active backend

### 2. ContextSymbolTable Retirement (0%)
- ❌ antlr4-c3 still active; no feature flag yet
- ❌ `ContextSymbolTable.ts` not deprecated

### 3. Remaining AST Node Coverage (partial)
- ⚠️ Binary/unary expressions — not modelled as nodes; children traversed normally
- ⚠️ Call expressions — callee reference tracked, but no call→definition link
- ❌ Member expressions (obj.prop) — not tracked structurally
- ❌ Property path types / type inference

## 📊 Completion Status

```
Overall: ████████████████░░░░ 75%

Core Infrastructure:    ████████████████████ 100%
AST Builder coverage:   ████████████████████ 100%
Symbol Resolver:        ████████████████████ 100%
Symbol Tree Builder:    ████████████████████ 100%
Testing:                ████████████████░░░░  80%
Query/Access Layer:     ░░░░░░░░░░░░░░░░░░░░   0%
Provider Integration:   ░░░░░░░░░░░░░░░░░░░░   0%
```

## 🎯 Next Steps

### Step 1: Create ASTQuery.ts (immediate)
Stable query API needed before touching providers:
- `findNodeAtPosition(ast, line, col)` — narrowest node at cursor
- `findDeclarationAtPosition(ast, line, col)` — declaration or declaration-of-reference at cursor
- `findReferencesForDeclaration(decl)` — O(1) via `decl.references`
- `findDefinitionForReference(ref)` — O(1) via `ref.declaration?.referred`
- `getScopeChain(node)` — ancestry scope list up to Program
- `getEnclosingDefinitionBlock(node)` — nearest `DefinitionBlock` ancestor

### Step 2: Provider Integration
Wire DefinitionProvider and ReferenceProvider to use AST path behind a feature flag.

### Step 3: Retire ContextSymbolTable
Remove antlr4-c3 dependency after provider parity is confirmed.

## 🎉 When Complete

1. **Delete** `ContextSymbolTable.ts` (730 lines)
2. **Remove** antlr4-c3 dependency
3. **Enable** future features: type checking, flow analysis, unused variable warnings

---

**Last Updated**: Post Phase-4 (rollout controls, parameters, RC menus, plugin definitions complete)
**Build**: Clean — `npm run compile-tests` exit 0
**Next Gate**: Create `ASTQuery.ts`, then provider integration
