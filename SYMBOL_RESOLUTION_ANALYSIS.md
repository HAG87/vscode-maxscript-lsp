# Symbol Resolution Analysis & Recommendations

## Current State Assessment

### Architecture Overview

Your current implementation uses:
- **antlr4-c3** for symbol table construction from ANTLR parse tree
- **Custom scope resolution** via `ExprSymbol.getScope()` and complex heuristics
- **Manual symbol tracking** through listener pattern (`symbolTableListener.ts`)

### Core Problems Identified

#### 1. **Scope Resolution is Unreliable**

**Root Cause:** The current scope comparison logic is heuristic-based and doesn't properly model MaxScript's scoping rules.

```typescript
// From ContextSymbolTable.ts:625-770
function checkDefinition(foundSymbol, symbol, result, candidates) {
    // Uses heuristics like isScopeSame(), isScopeSibling(), isScopeChild()
    // These are prone to false positives/negatives
}
```

**Problem Cases:**
- Variables with same name in nested scopes (e.g., `local x` in function, `local x` in loop)
- Struct member access vs local variables
- Function parameters shadowing outer variables
- Global vs local scope conflicts

**Example Failure:**
```maxscript
fn outer = (
    local x = 5
    fn inner = (
        local x = 10  -- Should be different symbol
        x             -- Which x does this refer to?
    )
    x                 -- Which x does this refer to?
)
```

Current implementation uses `isScopeSame()` which compares symbol paths, but:
- Doesn't account for shadowing rules
- Doesn't distinguish between declaration and reference scopes
- Relies on string comparison of scope paths (brittle)

#### 2. **Performance Issues**

**Bottleneck:** `findSymbolInstances()` does depth-first search across entire symbol tree

```typescript
// Line 802-894: Recursive DFS on every symbol lookup
function _dfs(node, results, candidates) {
    // Visits ALL children nodes
    for (let i = node.children.length - 1; i >= 0; i--) {
        const res = _dfs(node.children[i], results, candidates);
        // ... checks every identifier ...
    }
}
```

**Complexity:** O(n²) where n = number of identifiers in file
- For each reference, walks entire tree
- No caching or indexing
- Repeated scope comparisons

**Impact:**
- Slow on large files (>1000 LOC)
- Blocks UI during rename operations
- Poor experience for "Find All References"

#### 3. **Incomplete Symbol Information**

**Missing Data:**
- Symbol kind (declaration, reference, write, read)
- Declaration order (important for MaxScript's forward reference rules)
- Type information (crucial for struct member resolution)
- Visibility (public/private in structs)

**Consequences:**
- Can't distinguish `x = 5` (write) from `print x` (read)
- Can't enforce "use before declare" errors
- Can't resolve `obj.property` correctly without type info

#### 4. **MaxScript-Specific Challenges**

**Language Features Not Properly Modeled:**

1. **Implicit Global Declarations**
   ```maxscript
   x = 5  -- Creates global if not declared
   ```
   Current code treats this as implicit declaration (line 763-765) but doesn't track global scope properly.

2. **By-Reference Variables** (`&var`)
   ```maxscript
   fn modify &x = (x = 10)
   ```
   Not distinguished from regular parameters in symbol table.

3. **Dynamic Member Access**
   ```maxscript
   obj = sphere()
   obj.pos  -- Runtime property, not in parse tree
   ```
   Current code can't resolve dynamic properties.

4. **Context-Dependent Keywords**
   ```maxscript
   rollout test "Test" (
       button btn "OK"  -- 'button' is keyword here
   )
   local button = 5     -- 'button' is identifier here
   ```
   Handled by grammar but not reflected in symbol semantics.

---

## Solution Options

### Option 1: Fix Current Implementation (Incremental)

**Approach:** Improve existing antlr4-c3 based system

#### Changes Required:

##### A. Add Proper Symbol Kinds
```typescript
export enum SymbolKind {
    Declaration,
    Reference,
    Write,
    Read,
    Parameter,
    GlobalDecl,
    LocalDecl
}

export class IdentifierSymbol extends BaseSymbol {
    kind: SymbolKind;
    declarationOrder: number;  // Token index of declaration
}
```

##### B. Build Scope Chain Properly
```typescript
export class ScopeInfo {
    symbol: BaseSymbol;
    declarationOrder: number;
    shadowedBy?: ScopeInfo[];  // Track shadowing
}

export class ExprSymbol extends ScopedSymbol {
    scopeChain: Map<string, ScopeInfo[]>;  // name -> declarations in scope order
    
    resolveSymbol(name: string, position: number): BaseSymbol | undefined {
        const candidates = this.scopeChain.get(name) || [];
        // Return first declaration before position
        return candidates
            .filter(c => c.declarationOrder < position)
            .sort((a, b) => b.declarationOrder - a.declarationOrder)[0]
            ?.symbol;
    }
}
```

##### C. Two-Pass Analysis
```typescript
// Pass 1: Collect declarations
class DeclarationCollector extends mxsParserListener {
    // Build declaration map with positions
}

// Pass 2: Resolve references
class ReferenceResolver extends mxsParserListener {
    // Link references to declarations using scope chain
}
```

##### D. Index for Performance
```typescript
export class ContextSymbolTable extends SymbolTable {
    // Index: name -> declarations
    private declarationIndex: Map<string, BaseSymbol[]>;
    
    // Index: position -> symbol
    private positionIndex: Map<number, BaseSymbol>;
    
    // Reverse index: symbol -> references
    private referenceIndex: Map<BaseSymbol, BaseSymbol[]>;
}
```

**Pros:**
- Builds on existing code
- Incremental improvements
- Familiar architecture

**Cons:**
- Still fundamentally limited by antlr4-c3 design
- Manual scope tracking is error-prone
- Won't handle all MaxScript edge cases

**Effort:** ~2-3 weeks
**Risk:** Medium (may still have edge cases)

---

### Option 2: Migrate to Tylasu AST (Recommended)

**Approach:** Use proper AST with semantic model

#### Why Tylasu?

[Tylasu](https://github.com/Strumenta/tylasu) (by Strumenta) provides:
1. **Proper AST nodes** with parent/child relationships
2. **Built-in symbol resolution** with scope providers
3. **Reference resolution** that handles shadowing correctly
4. **Transformation pipeline** from ANTLR parse tree to typed AST
5. **Validation framework** for semantic checks

#### Architecture:

```typescript
// 1. Define AST nodes
class MxsProgram extends Node {
    statements: Statement[];
}

class FunctionDeclaration extends Statement {
    name: string;
    parameters: Parameter[];
    body: Expression[];
    
    // Tylasu provides scope automatically
}

class VariableDeclaration extends Statement {
    scope: 'local' | 'global' | 'persistent';
    name: string;
    initializer?: Expression;
}

class Identifier extends Expression implements ReferenceByName<VariableDeclaration> {
    name: string;
    referred?: VariableDeclaration;  // Resolved by Tylasu
}

// 2. Transform parse tree to AST
class MxsParserToAstTransformer extends ParseTreeToASTTransformer {
    // Map ANTLR contexts to AST nodes
    
    transformFnDefinition(ctx: FnDefinitionContext): FunctionDeclaration {
        return new FunctionDeclaration(
            ctx._fn_name?.getText(),
            ctx.fn_args().map(this.transform),
            ctx.fn_body().expr().map(this.transform)
        );
    }
    
    transformIdentifier(ctx: IdentifierContext): Identifier {
        return new Identifier(ctx.getText());
    }
}

// 3. Define scope provider
class MaxScriptScopeProvider extends ScopeProvider {
    // Tylasu calls this to resolve references
    scopeFor(node: Node): Scope {
        if (node instanceof FunctionDeclaration) {
            return new LocalScope(node, node.parameters);
        }
        // ... handle other scoping constructs
    }
}

// 4. Symbol resolution (automatic!)
const ast = transformer.transform(parseTree);
const model = ASTSemanticModel(ast, scopeProvider);

// Find definition: O(1) lookup
const definition = model.getDefinition(identifierNode);

// Find references: O(1) lookup  
const references = model.getReferences(declarationNode);
```

#### Migration Steps:

**Phase 1: Core AST (1 week)**
- Define AST node classes for major constructs
- Implement transformer for expressions
- Basic symbol resolution for local variables

**Phase 2: Scoping (1 week)**
- Implement scope provider for all constructs
- Handle shadowing correctly
- Add global scope

**Phase 3: Advanced Features (1 week)**
- Struct member resolution
- Function parameter handling
- By-reference variables
- Implicit globals

**Phase 4: Integration (1 week)**
- Replace antlr4-c3 symbol table
- Update language features (rename, find refs, etc.)
- Performance testing

**Pros:**
- ✅ **Correct** scope resolution (handles shadowing)
- ✅ **Fast** lookups (O(1) for definition/references)
- ✅ **Maintainable** (declarative AST structure)
- ✅ **Extensible** (easy to add type checking, etc.)
- ✅ **Industry standard** (used by language servers professionally)

**Cons:**
- ❌ Larger refactor
- ❌ New library to learn
- ❌ Need to define AST schema

**Effort:** ~4 weeks
**Risk:** Low (proven library, clear design)

---

### Option 3: Hybrid Approach

**Approach:** Use Tylasu only for symbol resolution, keep rest as-is

```typescript
// Keep existing visitors for formatting, minification
// Only replace symbol table with Tylasu-based model

class Backend {
    // Parse with ANTLR
    parseTree = parser.parse();
    
    // Transform to AST for semantics
    ast = transformer.transform(parseTree);
    semanticModel = new ASTSemanticModel(ast);
    
    // Use AST for language features
    getDefinition(pos) {
        const node = this.semanticModel.nodeAt(pos);
        return this.semanticModel.getDefinition(node);
    }
    
    // Use parse tree for formatting
    format() {
        return visitor.visit(this.parseTree);
    }
}
```

**Pros:**
- ✅ Fixes symbol resolution
- ✅ Minimal changes to formatting/minification
- ✅ Can migrate incrementally

**Cons:**
- ⚠️ Maintain two representations (parse tree + AST)
- ⚠️ Memory overhead

**Effort:** ~3 weeks
**Risk:** Low

---

## Recommendation: **Option 2 (Tylasu AST)**

### Justification:

1. **Correctness First:** Symbol resolution is critical for IDE features. Current approach has fundamental design issues that are hard to fix incrementally.

2. **Long-term Value:** Proper AST opens door to:
   - Type checking
   - Advanced refactorings
   - Code analysis tools
   - Better error messages

3. **Industry Standard:** Tylasu is designed for exactly this use case. It's proven in production language servers.

4. **Performance:** O(1) lookups vs O(n²) searches make it worthwhile even for the refactor cost.

5. **Your Grammar is Already Optimized:** The work you just did (labeled properties, reduced backtracking) makes the transformation easier since the parse tree is cleaner.

### Implementation Priority:

**Week 1:** Core AST + Basic Resolution
- Variable declarations (local/global)
- Function definitions
- Simple identifier references
- **Goal:** Handle 80% of common cases

**Week 2:** Scoping
- Nested functions
- Struct definitions
- For loop variables
- Expression sequences
- **Goal:** Correct shadowing

**Week 3:** Advanced Features
- Function calls with parameters
- Property access
- Struct members
- **Goal:** Handle complex cases

**Week 4:** Integration
- Replace symbol table in providers
- Update rename/find references
- Performance testing
- **Goal:** Feature parity

### Quick Win First:

Start with **just variable resolution** using Tylasu. This will prove the concept and show immediate improvement for the most common case (local variables).

```typescript
// Minimal POC (1-2 days)
class VariableDecl extends Node { ... }
class IdentifierRef extends Node implements ReferenceByName<VariableDecl> { ... }

// Test on simple case:
// local x = 5
// print x  -- Should resolve to line 1

// If this works well, proceed with full migration
```

---

## Decision Matrix

| Criteria | Option 1: Fix Current | Option 2: Tylasu | Option 3: Hybrid |
|----------|----------------------|------------------|------------------|
| **Correctness** | ⚠️ Medium | ✅ High | ✅ High |
| **Performance** | ⚠️ Medium | ✅ High | ✅ High |
| **Effort** | 2-3 weeks | 4 weeks | 3 weeks |
| **Risk** | ⚠️ Medium | ✅ Low | ✅ Low |
| **Maintainability** | ❌ Low | ✅ High | ⚠️ Medium |
| **Extensibility** | ❌ Low | ✅ High | ⚠️ Medium |
| **Learning Curve** | ✅ None | ⚠️ Medium | ⚠️ Medium |

**Winner:** Option 2 (Tylasu) - Best long-term solution despite higher initial effort.

---

## Next Steps

1. **Review Tylasu Documentation:** https://github.com/Strumenta/tylasu
2. **Create Minimal POC:** Variable declaration/reference resolution only
3. **Benchmark:** Compare performance with current implementation
4. **Decide:** If POC looks good, proceed with full migration
5. **I can help you:** Generate AST node definitions from your grammar if you choose Option 2

Would you like me to:
- Generate the AST node classes for MaxScript?
- Create a POC transformer for basic variable resolution?
- Help evaluate Tylasu alternatives (e.g., custom AST without library)?
