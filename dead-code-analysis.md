# Dead Code Analysis Results

## Overview
Analysis of the mcp-prompt-mgmt codebase for unused functions, classes, variables, constants, and imports. Excludes test directories.

## Dead Code Findings

### **src/schema.ts** - Multiple unused exports

**Line 52:** `selectPromptSchema` - Exported but never used
- **Reason:** Created with `createSelectSchema(prompts)` but not imported or used anywhere

**Line 54-55:** `insertPromptVersionSchema`, `selectPromptVersionSchema` - Exported but never used  
- **Reason:** Created for `promptVersions` table but not imported or used anywhere

**Line 57-58:** `insertTagSchema`, `selectTagSchema` - Exported but never used
- **Reason:** Created for `tags` table but not imported or used anywhere

**Line 60-61:** `insertPromptTagSchema`, `selectPromptTagSchema` - Exported but never used
- **Reason:** Created for `promptTags` table but not imported or used anywhere

**Line 63-64:** `insertPromptVariableSchema`, `selectPromptVariableSchema` - Exported but never used
- **Reason:** Created for `promptVariables` table but not imported or used anywhere

**Line 82-154:** Multiple unused interfaces - `CreatePrompt`, `CreatePromptVersion`, `CreateTag`, `CreatePromptTag`, `CreatePromptVariable`, `PromptWithRelations`
- **Reason:** These interfaces are defined but never used in the codebase. The actual implementations use the types from `types.ts` instead.

### **src/template-engine.ts** - Unused method

**Line 59:** `applyTemplateWithValidation` method in `SimpleTemplateEngine` class
- **Reason:** Defined but never called. The `applyTemplate` method is used instead.

### **src/drizzle-storage.ts** - Unused method

**Line 56:** `isConnected()` method in `DrizzlePromptRepository` class
- **Reason:** Defined but never called. The connection status is tracked internally but not exposed.

### **src/drizzle-storage.ts** - Unused import

**Line 2:** `sql` from `drizzle-orm` 
- **Reason:** Imported but only used once in line 197. Could be inlined.

### **src/simple-drizzle-storage.ts** - Unused import

**Line 2:** `sql` from `drizzle-orm`
- **Reason:** Imported but only used once in line 193. Could be inlined.

### **Missing file reference**

**tests/prompt-service.test.ts** references `../src/file-storage.js` which doesn't exist
- **Reason:** The test file imports `FilePromptRepository` from a non-existent file, causing potential runtime errors.

### **Unused storage implementations**

**src/drizzle-storage.ts** and **src/simple-drizzle-storage.ts** - Both `DrizzlePromptRepository` and `SimpleDrizzlePromptRepository` classes
- **Reason:** Exported but never imported or used. Only `PostgresPromptRepository` is used in `src/index.ts`.

## Summary

The main dead code issues are:
1. **Schema validation exports** - 8 unused Zod schemas in `schema.ts`
2. **Duplicate interfaces** - 6 unused interfaces in `schema.ts` that duplicate types from `types.ts`
3. **Unused methods** - `applyTemplateWithValidation` and `isConnected`
4. **Unused imports** - `sql` import in both Drizzle storage files
5. **Unused classes** - Two complete storage implementations
6. **Missing file** - Referenced but non-existent `file-storage.js`

The codebase has good test coverage but contains several unused exports and implementations that could be cleaned up to reduce bundle size and improve maintainability.

## Recommendations

1. **Remove unused schema exports** - Delete the 8 unused Zod schemas from `schema.ts`
2. **Remove duplicate interfaces** - Delete the 6 unused interfaces that duplicate `types.ts`
3. **Remove unused methods** - Delete `applyTemplateWithValidation` and `isConnected` methods
4. **Inline sql usage** - Remove the `sql` import and inline the single usage
5. **Remove unused storage classes** - Delete `DrizzlePromptRepository` and `SimpleDrizzlePromptRepository`
6. **Fix missing file reference** - Either create `file-storage.js` or update the test to use an existing storage implementation

## Analysis Method

This analysis was performed using:
- Static analysis of import/export statements
- Grep searches for usage patterns
- Cross-referencing between files
- Manual verification of function calls and class instantiations 