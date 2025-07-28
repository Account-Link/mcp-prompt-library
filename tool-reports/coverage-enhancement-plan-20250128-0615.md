# 🧪 Coverage Enhancement Plan
**Based on:** `untested-functionality-20250128-0615.md`  
**Generated:** 2025-01-28 06:20

## 🔝 Priority Test Additions

### 1. `PromptService` – Unit Tests
- **Target:** `src/prompt-service.ts`
- **Covers:** All business logic methods, error handling, template integration
- **Type:** Unit (with mocked repository)
- **Impact:** 🔴 High
- **Priority:** 1

### 2. `PostgresPromptRepository` – Integration Tests
- **Target:** `src/postgres-storage.ts`
- **Covers:** Database CRUD operations, versioning, error handling
- **Type:** Integration (with test database)
- **Impact:** 🔴 High
- **Priority:** 2

### 3. `McpPromptServer` – Integration Tests
- **Target:** `src/mcp-server.ts`
- **Covers:** MCP tool endpoints, error responses, validation
- **Type:** Integration (with real service)
- **Impact:** 🔴 High
- **Priority:** 3

### 4. `PromptService.applyTemplate()` – Unit Test
- **Target:** `src/prompt-service.ts` (applyTemplate method)
- **Covers:** Template variable substitution, validation errors
- **Type:** Unit
- **Impact:** 🟠 Medium
- **Priority:** 4

### 5. `PromptService.searchPrompts()` – Unit Test
- **Target:** `src/prompt-service.ts` (searchPrompts method)
- **Covers:** Search functionality, various query patterns
- **Type:** Unit
- **Impact:** 🟠 Medium
- **Priority:** 5

### 6. `PromptService.getStats()` – Unit Test
- **Target:** `src/prompt-service.ts` (getStats method)
- **Covers:** Statistics generation, category/tag counting
- **Type:** Unit
- **Impact:** 🟡 Low
- **Priority:** 6

### 7. `PostgresPromptRepository.healthCheck()` – Integration Test
- **Target:** `src/postgres-storage.ts` (healthCheck method)
- **Covers:** Database connectivity validation
- **Type:** Integration
- **Impact:** 🟡 Low
- **Priority:** 7

### 8. `index.ts` – Integration Test
- **Target:** `src/index.ts`
- **Covers:** Application startup, configuration, graceful shutdown
- **Type:** Integration
- **Impact:** 🟡 Low
- **Priority:** 8

## 📊 Summary
| Total Gaps | Tests to Add | High Impact | Medium | Low |
|------------|--------------|-------------|--------|-----|
| 16         | 8            | 3           | 2      | 3   |

## 🎯 Test Strategy

### Phase 1: Core Business Logic (High Priority)
1. **Unit test PromptService** with mocked repository
2. **Integration test PostgresPromptRepository** with test database
3. **Integration test McpPromptServer** with real service

### Phase 2: Feature Completeness (Medium Priority)
4. **Test template functionality** integration
5. **Test search functionality** with various scenarios

### Phase 3: Infrastructure & Edge Cases (Low Priority)
6. **Test statistics generation**
7. **Test health checks**
8. **Test application lifecycle**

## 🛠️ Implementation Notes

- **Test Framework:** Vitest (already configured)
- **Mocking:** Use Vitest's built-in mocking capabilities
- **Database Testing:** Use test database with Docker Compose
- **Coverage Target:** Aim for >80% coverage on all source files
- **Test Organization:** Group by module (service, repository, server)

---

_Generated automatically by coding agent_ 