# Package Upgrade Plan

## Current Outdated Packages

- `@types/node`: 20.19.9 → 24.1.0 (major version bump)
- `pino`: 8.21.0 → 9.7.0 (major version bump) 
- `pino-pretty`: 10.3.1 → 13.0.0 (major version bump)
- `zod`: 3.25.76 → 4.0.10 (major version bump)

## Breaking Changes Analysis

### 1. **Zod 3.x → 4.x** 
**Risk: HIGH** - Major breaking changes
- **Schema API changes**: Some schema methods may have changed
- **Type inference changes**: May affect TypeScript types
- **Validation behavior**: Some edge cases may behave differently

**Your usage**: Heavy usage in `src/types.ts`, `src/file-storage.ts`, `src/mcp-server.ts`
- Schema definitions for prompts, validation, MCP tools
- All schemas use standard Zod patterns that should be compatible

### 2. **Pino 8.x → 9.x**
**Risk: MEDIUM** - Some breaking changes
- **Transport API changes**: `pino-pretty` integration may need updates
- **Configuration changes**: Some options may have moved/renamed

**Your usage**: Basic logging in `src/index.ts`
- Simple logger setup with `pino-pretty` transport
- Standard logging patterns, likely compatible

### 3. **Pino-pretty 10.x → 13.x**
**Risk: LOW** - Minor changes
- **Configuration options**: Some options may have changed
- **Output format**: Minor formatting changes possible

### 4. **@types/node 20.x → 24.x**
**Risk: LOW** - Type definitions only
- **New Node.js APIs**: Additional type definitions
- **Deprecated APIs**: Some types may be removed
- **No runtime impact**: Only affects TypeScript compilation

## Update Plan

### Phase 1: Safe Updates (Low Risk)
```bash
# Update @types/node first (types only)
npm install @types/node@^24.1.0
npm test
```

### Phase 2: Logger Updates (Medium Risk)
```bash
# Update pino and pino-pretty together
npm install pino@^9.7.0 pino-pretty@^13.0.0
npm test
```

### Phase 3: Schema Validation (High Risk)
```bash
# Update Zod last - requires careful testing
npm install zod@^4.0.10
npm test
```

### Phase 4: Verify Everything
```bash
npm run build
npm test
npm run lint
```

## Specific Code Changes Needed

### 1. **Pino Configuration** (if needed)
```typescript
// Current in src/index.ts
const logger = pino({
  level: LOG_LEVEL,
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      options: { colorize: true },
      target: 'pino-pretty',
    },
  }),
});

// May need to update to:
const logger = pino({
  level: LOG_LEVEL,
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true }
    },
  }),
});
```

### 2. **Zod Schemas** (if needed)
Your schemas use standard patterns that should work, but may need minor adjustments:
- `z.object()`, `z.string()`, `z.array()` - should be compatible
- `z.record()` - may need updates
- Schema validation calls - should work as-is

## Recommended Approach

1. **Start with @types/node** - safest, just type definitions
2. **Test thoroughly** after each update
3. **Update pino packages together** - they're designed to work together
4. **Update Zod last** - highest risk, may require code changes
5. **Run full test suite** after each step

## Success Criteria

- [x] All tests pass after each upgrade
- [x] Build succeeds without errors
- [x] Linting passes without new errors
- [x] No runtime regressions
- [x] All functionality works as expected

## ✅ Upgrade Complete!

All packages have been successfully upgraded:

- ✅ `@types/node`: 20.19.9 → 24.1.0
- ✅ `pino`: 8.21.0 → 9.7.0
- ✅ `pino-pretty`: 10.3.1 → 13.0.0
- ✅ `zod`: 3.25.76 → 4.0.10

### Key Changes Made:

1. **Zod 4.x Compatibility**: Created `src/zod-compat.ts` compatibility layer
2. **Schema Updates**: Fixed `z.record()` API changes (now requires key and value types)
3. **Update Schema Fix**: Fixed `updatePromptSchema` to not use defaults for optional fields
4. **MCP Integration**: Updated MCP server to use compatibility layer

### Final Status:
- **73/73 tests passing**
- **Build successful**
- **6 linting warnings (same as before)**
- **0 security vulnerabilities**
- **All packages up to date** 