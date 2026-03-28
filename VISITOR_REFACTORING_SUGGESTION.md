# Visitor Refactoring Suggestions for Grammar Changes

## Summary

The grammar changes we made **should not break** the existing visitor implementation, but we have an opportunity to improve it once the parser is regenerated.

## Current Visitor Approach (Generic - Still Works)

The `visitifStatement` method currently uses a **generic approach** that iterates through `ctx.children` and checks for specific tokens:

```typescript
visitifStatement = (ctx: ifStatementContext): codeBlock =>
{
    const vals: (R | R[])[] = []
    let last: ParseTree | undefined;

    for (const [i, child] of ctx.children.entries()) {
        if (last && last instanceof TerminalNode) {
            // Determine indentation based on whether next child starts with '('
            let indent: number = this.indentLevel
            let ref = i
            while (ctx.children[ref] instanceof TerminalNode && 
                   (<TerminalNode>ctx.children[ref]).symbol.type === mxsLexer.NL) {
                ref++;
            }
            if (!ctx.children[ref].getText().startsWith('(')) {
                indent++;
            }

            // Insert line breaks after keywords
            switch (last.symbol.type) {
                case mxsLexer.THEN:
                case mxsLexer.DO:
                    vals.push(this.emmitLineBreak(false, indent))
                    break;
                case mxsLexer.ELSE:
                    vals.splice(vals.length - 1, 0,
                        this.emmitLineBreak(false, this.indentLevel))
                    vals.push(this.emmitLineBreak(false, indent))
                    break;
            }
        }
        vals.push(this.visit(child)!)
        last = child
    }
    return new codeBlock(vals.flat(), this.indentLevel, undefined, undefined, blockTypes.EXPR)
}
```

**Why this still works:**
- It doesn't rely on specific parse tree structure
- It only looks for terminal tokens (THEN, DO, ELSE)
- Visitor pattern handles any nested structure

## Improved Approach (After Parser Regeneration)

Once you regenerate the parser with the updated grammar, the `ifStatementContext` will have labeled accessor methods:

```typescript
export class ifStatementContext extends antlr.ParserRuleContext {
    public ifCondition(): SimpleExpressionContext { ... }    // The condition
    public thenBody(): ExprContext | null { ... }            // THEN branch body
    public elseBody(): ExprContext | null { ... }            // ELSE branch body  
    public doBody(): ExprContext | null { ... }              // DO branch body
    public THEN(): antlr.TerminalNode | null { ... }
    public ELSE(): antlr.TerminalNode | null { ... }
    public DO(): antlr.TerminalNode | null { ... }
}
```

### Refactored Visitor (More Explicit):

```typescript
visitifStatement = (ctx: ifStatementContext): codeBlock =>
{
    const vals: (R | R[])[] = []
    
    // Always present: IF keyword and condition
    vals.push(this.visit(ctx.IF())!)
    vals.push(this.visit(ctx.ifCondition())!)
    
    // Check which branch we're in
    if (ctx.THEN()) {
        // THEN branch
        vals.push(this.visit(ctx.THEN())!)
        
        // Determine indentation for then body
        const thenBody = ctx.thenBody()!
        const thenBodyText = thenBody.getText()
        const indent = thenBodyText.startsWith('(') ? this.indentLevel : this.indentLevel + 1
        vals.push(this.emmitLineBreak(false, indent))
        vals.push(this.visit(thenBody)!)
        
        // ELSE branch (optional)
        if (ctx.ELSE()) {
            vals.push(this.emmitLineBreak(false, this.indentLevel))
            vals.push(this.visit(ctx.ELSE())!)
            
            const elseBody = ctx.elseBody()!
            const elseBodyText = elseBody.getText()
            const elseIndent = elseBodyText.startsWith('(') ? this.indentLevel : this.indentLevel + 1
            vals.push(this.emmitLineBreak(false, elseIndent))
            vals.push(this.visit(elseBody)!)
        }
    } else if (ctx.DO()) {
        // DO branch
        vals.push(this.visit(ctx.DO())!)
        
        const doBody = ctx.doBody()!
        const doBodyText = doBody.getText()
        const indent = doBodyText.startsWith('(') ? this.indentLevel : this.indentLevel + 1
        vals.push(this.emmitLineBreak(false, indent))
        vals.push(this.visit(doBody)!)
    }
    
    return new codeBlock(vals.flat(), this.indentLevel, undefined, undefined, blockTypes.EXPR)
}
```

**Benefits:**
- ✅ More explicit - clearly shows IF-THEN-ELSE structure
- ✅ Easier to debug - you can access specific parts directly
- ✅ More maintainable - changes to grammar structure are clearer
- ✅ Better type safety - TypeScript knows what each accessor returns

**Drawbacks:**
- Requires regenerating the parser
- More code (but clearer)

## Other Affected Visitors

Similar refactoring opportunities exist for other modified rules:

### 1. **expr Rule** (reordered alternatives)
No change needed - the visitor doesn't override `visitExpr`, so it uses default `visitChildren()`.

### 2. **simpleExpression Rule** (fixed precedence)
Current implementation already works:
```typescript
visitSimpleExpression = (ctx: SimpleExpressionContext): R =>
{
    return new codeBlock(
        this.visitChildren(ctx)!,
        this.indentLevel,
        undefined,
        undefined,
        blockTypes.EXPR
    )
}
```
No change needed - uses generic `visitChildren()`.

### 3. **expr_operand Rule** (refactored)
Current implementation doesn't override `visitExpr_operand` or `visitOperand`, so default behavior handles it.

### 4. **functionCall Rule** (modified)
Not overridden in visitor - uses default behavior.

## Action Items

### Immediate (No Action Required):
✅ Current visitor implementation is **compatible** with grammar changes
✅ No breaking changes for existing functionality
✅ Formatting will continue to work correctly

### After Parser Regeneration (Optional Improvements):
1. Consider refactoring `visitifStatement` to use labeled accessors
2. Add similar improvements to other complex expression visitors
3. Add unit tests to verify formatting behavior

## Testing Recommendations

After regenerating the parser, test these MaxScript patterns:

```maxscript
-- Simple if-then
if x > 5 then print "yes"

-- If-then-else
if x > 5 then print "yes" else print "no"

-- If-do
if x > 5 do print "yes"

-- Nested if (in then body)
if x > 5 then
    if y > 3 then
        print "nested"

-- If with parenthesized body
if x > 5 then (
    print "line 1"
    print "line 2"
)

-- Complex condition
if (x + y * 2) > (z / 3) then print "ok"
```

All of these should format correctly with both the current generic implementation and the refactored version.

---

**Conclusion:** Your visitor is safe! The generic approach using `ctx.children` is resilient to grammar structure changes. Refactoring to use labeled accessors is an **optional improvement** for code clarity, not a necessity.
