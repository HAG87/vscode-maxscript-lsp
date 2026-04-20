# Tylasu AST Architecture

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    MaxScript Source Code                     │
│         "local x = 5  \n  y = x + 1"                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    ANTLR4 Parser                             │
│              mxsLexer + mxsParser                            │
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
│   visitProgram(), visitDeclaration(), visitRollout(), ...    │
│   • Converts contexts to typed nodes                         │
│   • Builds scope chain (parentScope links)                   │
│   • Creates unresolved VariableReference nodes               │
│   • Attaches Tylasu Position to every node                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Unresolved AST                                  │
│  Program {                                                   │
│    declarations: Map { "x" → VariableDeclaration }          │
│    statements: [                                             │
│      VariableDeclaration("x", local),                        │
│      VariableReference("x") ← UNRESOLVED                     │
│    ]                                                         │
│  }                                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    SymbolResolver                            │
│   • Walks AST with scope tracking                            │
│   • Calls scope.resolve(name) for each VariableReference     │
│   • Links reference ↔ declaration bidirectionally           │
│   • Uses ReferenceByName<VariableDeclaration> (Tylasu)        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Resolved AST                                    │
│  Program {                                                   │
│    declarations: Map { "x" → VariableDeclaration }          │
│    statements: [                                             │
│      VariableDeclaration("x") {                              │
│        references: [VariableReference("x")] ◄─┐              │
│      },                                        │              │
│      VariableReference("x") {                  │              │
│        declaration.referred: ────────────────►─┘              │
│      }                                                       │
│    ]                                                         │
│  }                                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            SymbolTreeBuilder                                 │
│   • Converts resolved AST to ISymbolInfo[] hierarchy         │
│   • DefinitionBlock → VS Code SymbolKind mapping             │
│   • EventHandler → SymbolKind.Event                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            ASTQuery (stable provider API)                    │
│   findDeclarationAtPosition(), findReferencesForDeclaration(),│
│   getScopeChain(), getEnclosingDefinitionBlock()             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            Providers                                         │
│   DefinitionProvider, ReferenceProvider,                     │
│   DocumentSymbolProvider, HoverProvider, RenameProvider      │
└─────────────────────────────────────────────────────────────┘
```

## Scope Chain

```
┌───────────────────────────────────────────────────────────────┐
│                        Program (root)                         │
│  declarations: { "globalVar", "myFunc" }                      │
│  parentScope: undefined                                       │
└─────────────────────────┬─────────────────────────────────────┘
                          │ parentScope
                          ▼
┌───────────────────────────────────────────────────────────────┐
│                    FunctionDefinition: myFunc                 │
│  declarations: { "x", "y" }  ← parameters + locals           │
│  parentScope: Program ───────────────────────────────────────  │
└─────────────────────────┬─────────────────────────────────────┘
                          │ parentScope
                          ▼
┌───────────────────────────────────────────────────────────────┐
│                    BlockExpression (if body)                  │
│  declarations: { "temp" }                                     │
│  parentScope: myFunc ────────────────────────────────────────  │
└───────────────────────────────────────────────────────────────┘

Resolve "x" from BlockExpression:
  1. Block.resolve("x")                → not found
  2. myFunc.resolve("x")               → FOUND ✓
Return VariableDeclaration("x")

Time: O(scope depth), typically O(1)–O(3) in practice
```

## Definition Block Scope

DefinitionBlock (rollout, macroscript, utility, tool, …) also extends ScopeNode:

```
┌───────────────────────────────────────────────────────────────┐
│                    Program                                    │
│  declarations: { "myRollout" }                                │
└─────────────────────────┬─────────────────────────────────────┘
                          │ parentScope
                          ▼
┌───────────────────────────────────────────────────────────────┐
│               DefinitionBlock: myRollout (kind=rollout)       │
│  declarations: {                                              │
│    "theValue"  → VariableDeclaration (local param)            │
│    "btn1"      → RolloutControl (button)                      │
│    "spn1"      → RolloutControl (spinner)                     │
│  }                                                            │
│  clauses: [EventHandlerStatement(btn1.pressed), ...]          │
└───────────────────────────────────────────────────────────────┘
```

## Reference Resolution Example

```
MaxScript Source:
─────────────────────────────────────────────────────────────
local x = 5
y = x + 1
local z = x * 2
─────────────────────────────────────────────────────────────

After Resolution:
─────────────────────────────────────────────────────────────
Program
├─ declarations: Map {
│    "x" → VariableDeclaration(x) {
│            references: [ref1, ref2]
│          }
│  }
│
├─ VariableDeclaration(x, local)
│    └─ position: {start: {line:1, col:6}, end: {line:1, col:7}}
│
├─ VariableReference(x) [ref1]
│    ├─ position: {start: {line:2, col:4}, end: {line:2, col:5}}
│    └─ declaration.referred → VariableDeclaration(x) ────────┐
│                                                              │
└─ VariableDeclaration(z, local)                              │
     └─ VariableReference(x) [ref2]                           │
          ├─ position: {start: {line:3, col:10}, ...}          │
          └─ declaration.referred → VariableDeclaration(x) ───┘
─────────────────────────────────────────────────────────────

Finding References (O(1)):
  decl = ast.declarations.get("x")
  refs = decl.references           // direct array

Finding Definition (O(1)):
  ref.declaration.referred         // ReferenceByName resolved link
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
findSymbolInstances() — walks ENTIRE parse tree
         ↓
For each node:
  - Is this an identifier?
  - Does it match name "x"?
  - isScopeSibling(node.scope, targetScope)?  ← fragile
  - isScopeChild(node.scope, targetScope)?    ← unreliable
  - JSON.stringify scope comparison           ← slow
         ↓
Returns array of matches (maybe correct, maybe not)
Total: O(n²) — unreliable scope matching, multiple traversals
```

### NEW: Tylasu AST
```
User clicks on "x" at line 2
         ↓
ASTQuery.findDeclarationAtPosition(ast, line, col)
         ↓ (one O(n) walk to find cursor node)
Found: VariableReference("x")
         ↓
ref.declaration.referred   ← direct resolved link O(1)
         ↓
Return declaration.position
Total: O(n) walk once per request + O(1) link access
       100% reliable — links set deterministically during resolution
```

## Node Hierarchy

```
Node (Tylasu)
├── ScopeNode
│   ├── Program
│   ├── FunctionDefinition
│   ├── BlockExpression
│   ├── DefinitionBlock
│   │   └── PluginDefinition
│   └── StructDefinition
├── VariableDeclaration
│   ├── RolloutControl
│   ├── RcMenuItem
│   └── ParameterDefinition
├── VariableReference
├── StructMemberField
├── IfStatement
├── WhileStatement
├── DoWhileStatement
├── ForStatement
├── TryStatement
├── CaseStatement
├── ReturnStatement
├── ExitStatement
├── ContextStatement
├── WhenStatement
└── EventHandlerStatement
```

## Memory Layout

```
┌─────────────────────────────────────────────────────────────┐
│  VariableDeclaration("x")                                   │
│    • name: "x"                                              │
│    • scope: "local"                                         │
│    • position: Position { start: Point(1,6), end: Point(1,7)}│
│    • references: [ref1 @0x5678, ref2 @0x9abc]               │
└───────────────────────┬─────────────────────────────────────┘
                        │ ▲ back-pointer from each ref
         ┌──────────────┘ │
         ▼                │
┌─────────────────────────────────────────────────────────────┐
│  VariableReference [ref1]                                   │
│    • name: "x"                                              │
│    • position: Position { start: Point(2,4), end: Point(2,5)}│
│    • declaration: ReferenceByName { referred → decl @0x1234 }│
└─────────────────────────────────────────────────────────────┘
```

Nodes are standard heap objects; no serialisation overhead.
