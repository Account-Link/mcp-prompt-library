# Project Rename Dry Run Report
**Date:** 2025-01-28 07:37  
**From:** `mcp-prompt-mgmt` → `mcp-prompt-library`  
**Status:** Preview Only

## 📋 Files to be Modified

### 1. `src/mcp-server.ts`
**Line 12:**
```diff
- name: 'mcp-prompt-mgmt',
+ name: 'mcp-prompt-library',
```

### 2. `package.json`
**Line 1:**
```diff
- "name": "mcp-prompt-mgmt",
+ "name": "mcp-prompt-library",
```

**Line 7:**
```diff
- "mcp-prompt-mgmt": "dist/index.js"
+ "mcp-prompt-library": "dist/index.js"
```

### 3. `package-lock.json`
**Line 1:**
```diff
- "name": "mcp-prompt-mgmt",
+ "name": "mcp-prompt-library",
```

**Line 7:**
```diff
- "name": "mcp-prompt-mgmt",
+ "name": "mcp-prompt-library",
```

**Line 21:**
```diff
- "mcp-prompt-mgmt": "dist/index.js"
+ "mcp-prompt-library": "dist/index.js"
```

### 4. `README.md`
**Line 57:**
```diff
- cd mcp-prompt-mgmt
+ cd mcp-prompt-library
```

**Line 120:**
```diff
- npx mcp-prompt-mgmt
+ npx mcp-prompt-library
```

**Line 129:**
```diff
- - **For production**: Use `npm start` or `npx mcp-prompt-mgmt`
+ - **For production**: Use `npm start` or `npx mcp-prompt-library`
```

**Line 225:**
```diff
- "mcp-prompt-mgmt": {
+ "mcp-prompt-library": {
```

**Line 227:**
```diff
- "args": ["mcp-prompt-mgmt"],
+ "args": ["mcp-prompt-library"],
```

**Line 245:**
```diff
- cd mcp-prompt-mgmt
+ cd mcp-prompt-library
```

### 5. External Config: `/Users/lsdan/.cursor/mcp.json`
**Line 26:**
```diff
- "mcp-prompt-mgmt": {
+ "mcp-prompt-library": {
```

**Line 28:**
```diff
- "args": ["/Users/lsdan/mcp/mcp-prompt-mgmt/dist/index.js"],
+ "args": ["/Users/lsdan/mcp/mcp-prompt-library/dist/index.js"],
```

**Line 29:**
```diff
- "cwd": "/Users/lsdan/mcp/mcp-prompt-mgmt"
+ "cwd": "/Users/lsdan/mcp/mcp-prompt-library"
```

## 📊 Summary
- **Total files to modify:** 5 files
- **Total changes:** 13 occurrences
- **External configs:** 1 (Cursor MCP config)
- **Project files:** 4 (package.json, package-lock.json, README.md, src/mcp-server.ts)

## ⚠️ Important Notes
1. The external Cursor MCP config will need manual updating
2. The project directory itself will need to be renamed
3. All changes are well-scoped to project-specific references
4. No unrelated variable names or libraries will be affected

## 🚀 Next Steps
1. Rename project directory
2. Apply all file changes
3. Update external MCP config
4. Build and test to ensure functionality
5. Commit changes with descriptive messages

---
*Generated automatically by Project Rename Pipeline* 