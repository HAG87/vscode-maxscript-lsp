# Tylasu AST Architecture - Visual Guide

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    MaxScript Source Code                     │
│                  "local x = 5\ny = x + 1"                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    ANTLR4 Parser                             │
│              (mxsLexer + mxsParser)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Parse Tree                                │
│              (ProgramContext tree)                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    ASTBuilder                                │
│         visitProgram(), visitDeclaration(), etc.             │
│         • Converts contexts to typed nodes                   │
│         • Builds scope chain (parentScope links)             │
│         • Creates unresolved references                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Unresolved AST                                  │
│  Program {                                                   │
│    declarations: Map { "x" → VariableDeclaration }          │
│    statements: [                                             │
│      VariableDeclaration("x", local),                        │
│      VariableReference("x") ← UNRESOLVED!                    │
│    ]                                                         │
│  }                                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    SymbolResolver                            │
│         • Walks AST with scope tracking                      │
│         • Calls scope.resolve(name) for each reference       │
│         • Links reference ↔ declaration bidirectionally      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Resolved AST (READY!)                           │
│  Program {                                                   │
│    declarations: Map { "x" → VariableDeclaration }          │
│    statements: [                                             │
│      VariableDeclaration("x") {                              │
│        references: [VariableReference("x")] ←┐               │
│      },                                       │               │
│      VariableReference("x") {                 │               │
│        declaration: VariableDeclaration("x") ─┘               │
│      }                                                       │
│    ]                                                         │
│  }                                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            Providers (Definition, References)                │
│         • O(1) lookup via direct references!                 │
└─────────────────────────────────────────────────────────────┘
```

## Scope Chain Resolution

```
┌───────────────────────────────────────────────────────────────┐
│                        Global Scope                           │
│  declarations: { "globalVar", "myFunc" }                      │
│  parentScope: undefined                                       │
└─────────────────────────┬─────────────────────────────────────┘
                          │ parentScope
                          ▼
┌───────────────────────────────────────────────────────────────┐
│                    Function: myFunc                           │
│  declarations: { "x", "y" }  ← parameters + local vars        │
│  parentScope: Global ────────┘                                │
└─────────────────────────┬─────────────────────────────────────┘
                          │ parentScope
                          ▼
┌───────────────────────────────────────────────────────────────┐
│                    Block: if statement                        │
│  declarations: { "temp" }  ← local vars in block              │
│  parentScope: myFunc ───────┘                                 │
└───────────────────────────────────────────────────────────────┘

Resolve "x" from Block:
1. Block.resolve("x")        → not found in Block.declarations
2. Block.parentScope ("myFunc").resolve("x") → FOUND! ✓
   Return VariableDeclaration("x")

Time complexity: O(d) where d = scope depth (typically 1-5)
                 Effectively O(1) in practice
```

## Reference Resolution Example

```
MaxScript Code:
─────────────────────────────────────────────────────────────────
local x = 5
y = x + 1
local z = x * 2
─────────────────────────────────────────────────────────────────

AST After Resolution:
─────────────────────────────────────────────────────────────────
Program
├─ declarations: Map {
│    "x" → VariableDeclaration(x) {
│            references: [ref1, ref2]  ← Direct array!
│          }
│  }
├─ VariableDeclaration(x, local)
│    ├─ range: {line: 1, col: 6-7}
│    └─ references: [ref1, ref2]
│
├─ AssignmentExpression(y)
│    └─ value: BinaryExpression(+)
│         └─ left: VariableReference(x) ──┐
│              ├─ range: {line: 2, col: 4-5}
│              └─ declaration: ───────────┐│  ref1
│                                         ││
└─ VariableDeclaration(z, local)         ││
     └─ initializer: BinaryExpression(*) ││
          └─ left: VariableReference(x) ─┘│  ref2
               ├─ range: {line: 3, col: 10-11}
               └─ declaration: ────────────┘
─────────────────────────────────────────────────────────────────

Finding References (O(1)):
  1. Get declaration: ast.declarations.get("x")
  2. Return: declaration.references  ← Direct array access!
  
Finding Definition (O(1)):
  1. Find reference at cursor position
  2. Return: reference.declaration  ← Direct link!
```

## Comparison: antlr4-c3 vs Tylasu AST

### OLD: antlr4-c3 (O(n²))
```
User clicks on "x" at line 2
         ↓
DefinitionProvider
         ↓
ContextSymbolTable.getScopedSymbolOccurrences(symbol, scope)
         ↓
findSymbolInstances() - walks ENTIRE parse tree
         ↓
For each node in tree:
  - Is this an identifier?
  - Does it match name "x"?
  - isScopeSibling(node.scope, targetScope)?  ← Fragile!
  - isScopeChild(node.scope, targetScope)?    ← Unreliable!
  - compareScopes(JSON.stringify(...))        ← Slow!
         ↓
Returns array of matches (maybe correct, maybe not)
         ↓
Total: O(n²) where n = number of nodes
       Unreliable scope matching
       Multiple tree traversals
```

### NEW: Tylasu AST (O(1))
```
User clicks on "x" at line 2
         ↓
DefinitionProvider
         ↓
findNodeAtPosition(ast, position)  ← Single lookup
         ↓
Found: VariableReference("x")
         ↓
return reference.declaration.range  ← Direct link!
         ↓
Total: O(1) - single hash lookup or array access
       100% reliable - links set during resolution
       No tree traversal needed
```

## Memory Layout

```
┌─────────────────────────────────────────────────────────────┐
│  VariableDeclaration("x") @ 0x1234                          │
│    • name: "x"                                              │
│    • scope: "local"                                         │
│    • range: {line: 1, col: 6-7}                            │
│    • references: [0x5678, 0x9ABC]  ← Array of pointers      │
└─────────────────────────────────────────────────────────────┘
                 ▲                            ▲
                 │                            │
        Direct   │                            │   Direct
        pointer  │                            │   pointer
                 │                            │
┌────────────────┴───────────┐  ┌────────────┴────────────────┐
│ VariableReference @ 0x5678  │  │ VariableReference @ 0x9ABC  │
│   • name: "x"               │  │   • name: "x"               │
│   • range: {line: 2, col: 4}│  │   • range: {line: 3, col: 10}│
│   • declaration: 0x1234 ────┘  │   • declaration: 0x1234 ────┘
└────────────────────────────────┘  └────────────────────────────┘

Lookup Time:
  - Get references: declaration.references  → O(1) array access
  - Get declaration: reference.declaration  → O(1) pointer deref
  
Memory Cost:
  - 8 bytes per reference (pointer in array)
  - 8 bytes per declaration link (pointer in reference)
  - Total: ~16 bytes per reference
  - For 10,000 references: ~156KB (negligible!)
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│               VSCode Language Server                         │
└─────┬───────────────┬─────────────┬──────────────┬──────────┘
      │               │             │              │
      ▼               ▼             ▼              ▼
┌───────────┐  ┌────────────┐  ┌────────┐  ┌────────────┐
│Definition │  │ References │  │ Hover  │  │ Rename     │
│Provider   │  │ Provider   │  │Provider│  │ Provider   │
└─────┬─────┘  └──────┬─────┘  └───┬────┘  └──────┬─────┘
      │               │            │              │
      └───────────────┴────────────┴──────────────┘
                      │
                      ▼
      ┌───────────────────────────────────────┐
      │       buildAST(document.text)         │
      │   • Parse with ANTLR                  │
      │   • Build AST (ASTBuilder)            │
      │   • Resolve symbols (SymbolResolver)  │
      └───────────────┬───────────────────────┘
                      │
                      ▼
      ┌───────────────────────────────────────┐
      │         Resolved AST                   │
      │   • O(1) lookups                       │
      │   • 100% reliable scoping              │
      │   • Direct reference links             │
      └───────────────────────────────────────┘
```

## Testing Strategy

```
Test 1: Simple Variable
  Code: local x = 5; y = x + 1
  Verify:
    ✓ x has 1 reference
    ✓ reference.declaration points to x declaration
    ✓ Lookup time < 1ms

Test 2: Nested Scopes
  Code: local x = 1; fn f() = (local x = 2; x)
  Verify:
    ✓ Inner x resolves to inner declaration
    ✓ Outer x not referenced in function
    ✓ Scope chain correct

Test 3: Implicit Global
  Code: y = undeclaredVar + 10
  Verify:
    ✓ undeclaredVar reference created
    ✓ reference.declaration is undefined (unresolved)
    ✓ No crash or error

Benchmark:
  Code: local x = 1; [100 more locals]; y = x
  Measure:
    • Build time: < 20ms
    • Lookup time: < 0.01ms
    • Memory: < 1MB
```

---

**Key Insight**: By maintaining direct bidirectional links between declarations and references, we eliminate the need for expensive tree traversals entirely. The initial cost is paid once during AST construction, after which all lookups are O(1).
