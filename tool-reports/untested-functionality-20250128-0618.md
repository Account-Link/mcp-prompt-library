# Untested Functionality Audit
**Date:** 2025-01-28 06:18  
**Language Detected:** TypeScript  

## 🔧 Low-Coverage Areas (<80%)

| File | Coverage | Missing Functions |
|------|----------|-------------------|
| `src/index.ts` | 0% | `main()`, error handling, shutdown logic |
| `src/mcp-server.ts` | 37.78% | Most MCP tool handlers, resource handlers |
| `src/postgres-storage.ts` | 0% | All database operations, connection management |
| `src/schema.ts` | 0% | Database schema definitions |
| `src/types.ts` | 96.34% | Minor edge cases (lines 134-136) |
| `run-tests.js` | 0% | Test runner script |
| `test-mcp.js` | 0% | MCP testing utilities |
| `test-postgres-repo.js` | 0% | PostgreSQL repository tests |
| `test-postgres-simple.js` | 0% | Simple PostgreSQL tests |

## 🚪 Critical Entrypoints & Test Gaps

| Entrypoint | Type | Tested? | Notes |
|-----------|------|---------|-------|
| `main()` function | CLI | ❌ No | Application startup, config loading, error handling |
| MCP Tool: `add_prompt` | API | ❌ No | Prompt creation with validation |
| MCP Tool: `get_prompt` | API | ❌ No | Prompt retrieval with versioning |
| MCP Tool: `list_prompts` | API | ❌ No | Prompt listing with filters |
| MCP Tool: `update_prompt` | API | ❌ No | Prompt updates with validation |
| MCP Tool: `delete_prompt` | API | ❌ No | Prompt deletion with versioning |
| MCP Tool: `apply_template` | API | ❌ No | Template variable substitution |
| MCP Tool: `search_prompts` | API | ❌ No | Search functionality |
| MCP Tool: `get_stats` | API | ❌ No | Statistics endpoint |
| Database operations | Data | ❌ No | CRUD operations, connection management |
| Error handling | System | ❌ No | Graceful shutdown, uncaught exceptions |

## 🧠 Recommended Test Cases

### High Priority (Critical Path)
- Integration test for `main()` function with proper startup/shutdown
- Unit tests for all MCP tool handlers with various input scenarios
- Database integration tests for `PostgresPromptRepository`
- Error handling tests for connection failures and invalid inputs

### Medium Priority (Core Functionality)
- Template engine tests for variable substitution edge cases
- Prompt service tests for business logic validation
- Schema validation tests for database operations
- Health check endpoint tests

### Low Priority (Utilities)
- Test runner script validation
- MCP testing utility functions
- Configuration loading edge cases

## 📊 Coverage Summary
- **Overall Coverage:** 26.05%
- **Well-tested files:** `prompt-service.ts` (100%), `template-engine.ts` (100%)
- **Critical gaps:** Main application logic, database layer, MCP server handlers
- **Test framework:** Vitest with v8 coverage

---
_Generated automatically by coding agent_ 