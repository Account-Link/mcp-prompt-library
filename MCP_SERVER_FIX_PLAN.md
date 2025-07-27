# MCP Server Fix Plan

## Current State Analysis

### Working Components
- ✅ MCP server structure and tool registration
- ✅ Stdio transport setup
- ✅ File storage implementation
- ✅ PostgreSQL database container running
- ✅ Database schema defined
- ✅ Basic MCP server functionality (test-mcp.js works)

### Critical Issues Identified

1. **TypeScript Compilation Errors (38 errors)**
   - Drizzle ORM schema type issues
   - Postgres storage implementation errors
   - Type mismatches between schema and implementation

2. **Missing PostgreSQL Integration**
   - `index.ts` still uses `FilePromptRepository` instead of PostgreSQL
   - `postgres-storage.js` not compiled (missing from dist/)
   - No environment-based storage selection

3. **Build System Issues**
   - TypeScript errors preventing successful build
   - Missing compiled PostgreSQL storage files
   - Schema type conflicts

## Fix Plan

### Phase 1: Fix TypeScript Compilation Errors

#### 1.1 Fix Schema Type Issues
- **File**: `src/schema.ts`
- **Issue**: Drizzle-Zod schema type conflicts
- **Fix**: Replace `z.infer<>` with proper type definitions
- **Action**: Create manual type definitions that match the schema structure

#### 1.2 Fix Drizzle Storage Implementation
- **File**: `src/drizzle-storage.ts`
- **Issues**: 
  - Unused imports
  - Type mismatches in transaction handling
  - Metadata type conflicts
- **Fix**: 
  - Remove unused imports
  - Fix transaction type handling
  - Resolve metadata type issues

#### 1.3 Fix Postgres Storage Implementation
- **File**: `src/postgres-storage.ts`
- **Issues**:
  - SQL template literal type errors
  - Null handling issues
  - Unused variables
- **Fix**:
  - Fix SQL parameter types
  - Add proper null checks
  - Remove unused code

#### 1.4 Fix Simple Drizzle Storage
- **File**: `src/simple-drizzle-storage.ts`
- **Issues**: Similar to main drizzle storage
- **Fix**: Apply same fixes as drizzle-storage.ts

### Phase 2: Implement PostgreSQL Integration

#### 2.1 Update Main Entry Point
- **File**: `src/index.ts`
- **Current**: Uses `FilePromptRepository`
- **Target**: Use PostgreSQL by default, fallback to file storage
- **Implementation**:
  ```typescript
  const repository = process.env.USE_POSTGRES === 'true' 
    ? new PostgresPromptRepository({...})
    : new FilePromptRepository({...});
  ```

#### 2.2 Environment Configuration
- **Add Environment Variables**:
  - `USE_POSTGRES`: Enable PostgreSQL storage
  - `POSTGRES_HOST`: Database host (default: localhost)
  - `POSTGRES_PORT`: Database port (default: 5433)
  - `POSTGRES_DB`: Database name (default: mcp_prompts)
  - `POSTGRES_USER`: Database user (default: mcp_user)
  - `POSTGRES_PASSWORD`: Database password

#### 2.3 Database Connection Management
- **Add**: Connection pooling and retry logic
- **Add**: Health check improvements
- **Add**: Graceful connection handling

### Phase 3: Testing and Validation

#### 3.1 Build Verification
- **Action**: Ensure `npm run build` completes without errors
- **Verify**: All storage implementations compile successfully
- **Check**: TypeScript strict mode compliance

#### 3.2 PostgreSQL Integration Test
- **Action**: Test PostgreSQL repository functionality
- **Verify**: CRUD operations work correctly
- **Check**: Connection handling and error recovery

#### 3.3 MCP Server Integration Test
- **Action**: Test MCP server with PostgreSQL backend
- **Verify**: All tools work correctly
- **Check**: Stdio transport functionality

#### 3.4 Cursor Integration Test
- **Action**: Test MCP server in Cursor
- **Verify**: Server connects and responds to requests
- **Check**: Tool registration and execution

### Phase 4: Production Readiness

#### 4.1 Error Handling
- **Add**: Comprehensive error handling
- **Add**: Logging improvements
- **Add**: Graceful degradation

#### 4.2 Performance Optimization
- **Add**: Connection pooling
- **Add**: Query optimization
- **Add**: Caching where appropriate

#### 4.3 Documentation
- **Update**: README with PostgreSQL setup instructions
- **Add**: Environment variable documentation
- **Add**: Troubleshooting guide

## Implementation Priority

1. **High Priority**: Fix TypeScript compilation errors
2. **High Priority**: Implement PostgreSQL integration in main entry point
3. **Medium Priority**: Add environment-based configuration
4. **Medium Priority**: Improve error handling and logging
5. **Low Priority**: Performance optimizations and documentation

## Success Criteria

- ✅ `npm run build` completes without errors
- ✅ MCP server starts with PostgreSQL backend
- ✅ All CRUD operations work correctly
- ✅ MCP server responds to Cursor requests
- ✅ Graceful error handling and recovery
- ✅ Comprehensive logging for debugging

## Risk Mitigation

- **Backup Plan**: Keep file storage as fallback option
- **Testing**: Comprehensive test suite for all storage backends
- **Monitoring**: Add health checks and connection monitoring
- **Documentation**: Clear setup and troubleshooting guides 