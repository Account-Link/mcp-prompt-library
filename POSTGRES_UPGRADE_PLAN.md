# PostgreSQL Implementation Plan for MCP Prompt Management

## Overview
This plan outlines the implementation of PostgreSQL storage for the MCP prompt management system, replacing the current file-based storage approach. Using Docker to avoid conflicts with local PostgreSQL instances.

## Current Architecture Analysis

### File-Based Storage (`FilePromptRepository`)
- **Storage**: JSON files in filesystem with index.json for metadata
- **Versioning**: Separate files per version (`prompt-id/version.json`)
- **Concurrency**: File-based locking with `proper-lockfile`
- **Search**: In-memory filtering after loading all prompts
- **Transactions**: Not supported

### Data Model
```typescript
interface Prompt {
  id: string;
  name: string;
  content: string;
  description?: string;
  isTemplate: boolean;
  variables: string[];
  tags: string[];
  category?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
```

## PostgreSQL Architecture Design

### Database Schema
```sql
-- Prompts table (latest versions)
CREATE TABLE prompts (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  description VARCHAR(500),
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  category VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Indexes for performance
  INDEX idx_prompts_name (name),
  INDEX idx_prompts_category (category),
  INDEX idx_prompts_is_template (is_template),
  INDEX idx_prompts_created_at (created_at),
  INDEX idx_prompts_updated_at (updated_at)
);

-- Prompt versions table (historical versions)
CREATE TABLE prompt_versions (
  id VARCHAR(255) NOT NULL,
  version INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  description VARCHAR(500),
  is_template BOOLEAN NOT NULL,
  category VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  PRIMARY KEY (id, version),
  FOREIGN KEY (id) REFERENCES prompts(id) ON DELETE CASCADE
);

-- Tags table (normalized)
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

-- Prompt-tag relationships
CREATE TABLE prompt_tags (
  prompt_id VARCHAR(255) NOT NULL,
  tag_id INTEGER NOT NULL,
  
  PRIMARY KEY (prompt_id, tag_id),
  FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Variables table (for templates)
CREATE TABLE prompt_variables (
  prompt_id VARCHAR(255) NOT NULL,
  variable_name VARCHAR(100) NOT NULL,
  variable_order INTEGER NOT NULL,
  
  PRIMARY KEY (prompt_id, variable_name),
  FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
);
```

### Docker Setup
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: mcp-prompt-postgres
    environment:
      POSTGRES_DB: mcp_prompts
      POSTGRES_USER: mcp_user
      POSTGRES_PASSWORD: mcp_password
    ports:
      - "5433:5432"  # Use different port to avoid conflicts
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mcp_user -d mcp_prompts"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

## Implementation Plan

### Phase 1: Infrastructure Setup

1. **Add PostgreSQL Dependencies**
   ```bash
   npm install pg @types/pg
   npm install --save-dev @types/pg
   ```

2. **Create Docker Configuration**
   - `docker-compose.yml` for PostgreSQL service
   - `init.sql` for database schema
   - `.env` file for configuration

3. **Database Connection Management**
   - Connection pooling with `pg.Pool`
   - Environment-based configuration
   - Health checks and reconnection logic

### Phase 2: PostgreSQL Repository Implementation

1. **Create `PostgresPromptRepository` Class**
   ```typescript
   export class PostgresPromptRepository implements PromptRepository {
     private pool: pg.Pool;
     
     constructor(config: PostgresConfig) {
       this.pool = new pg.Pool(config);
     }
     
     // Implement all repository methods
   }
   ```

2. **Core Methods Implementation**
   - `save()`: Insert into prompts + prompt_versions + tags + variables
   - `getById()`: Query prompts table with optional version
   - `list()`: Complex queries with filtering and pagination
   - `update()`: Insert new version, update prompts table
   - `delete()`: Soft delete or hard delete based on version
   - `listVersions()`: Query prompt_versions table

3. **Advanced Features**
   - Full-text search using PostgreSQL's `tsvector`
   - Efficient pagination with `LIMIT` and `OFFSET`
   - Transaction support for atomic operations
   - Prepared statements for security

### Phase 3: Testing & Validation

1. **Unit Tests**
   - Repository method tests
   - Transaction tests
   - Error handling tests

2. **Integration Tests**
   - Full workflow tests
   - Performance tests
   - Feature parity testing

### Phase 4: Configuration & Environment

1. **Environment Configuration**
   ```typescript
   interface PostgresConfig {
     host: string;
     port: number;
     database: string;
     user: string;
     password: string;
     max: number; // pool size
     idleTimeoutMillis: number;
     connectionTimeoutMillis: number;
   }
   ```

2. **Configuration Sources**
   - Environment variables
   - Configuration files
   - Docker secrets (for production)

## Implementation Steps

### Step 1: Setup Infrastructure (Day 1)
```bash
# Create Docker setup
mkdir docker
touch docker-compose.yml
touch docker/init.sql
touch .env

# Add PostgreSQL dependencies
npm install pg @types/pg
```

### Step 2: Database Schema (Day 1-2)
- Create `init.sql` with complete schema
- Add indexes for performance
- Test schema with Docker setup

### Step 3: Repository Implementation (Day 2-4)
- Implement `PostgresPromptRepository`
- Add connection management
- Implement all CRUD operations
- Add transaction support

### Step 4: Testing & Integration (Day 4-5)
- Unit tests for new repository
- Integration tests
- Performance testing

### Step 5: Deployment (Day 5-6)
- Deploy PostgreSQL container
- Switch to PostgreSQL repository
- Monitor and validate

## Configuration Files

### Environment Variables (.env)
```env
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_DB=mcp_prompts
POSTGRES_USER=mcp_user
POSTGRES_PASSWORD=mcp_password
POSTGRES_POOL_SIZE=10

# Storage Configuration
STORAGE_TYPE=postgres  # or 'file' for fallback
```

### Docker Compose (docker-compose.yml)
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: mcp-prompt-postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "${POSTGRES_PORT}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

## Benefits of PostgreSQL Migration

### Performance Improvements
- **Indexed Queries**: Fast filtering by category, tags, templates
- **Full-Text Search**: Native PostgreSQL text search capabilities
- **Pagination**: Efficient LIMIT/OFFSET queries
- **Concurrent Access**: No file locking issues

### Scalability
- **Connection Pooling**: Handle multiple concurrent requests
- **ACID Transactions**: Data consistency guarantees
- **Backup/Restore**: Standard database backup procedures
- **Replication**: Read replicas for high availability

### Features
- **Complex Queries**: Advanced filtering and sorting
- **Data Integrity**: Foreign key constraints
- **Audit Trail**: Complete version history
- **Metadata Search**: JSONB queries for flexible metadata

## Risk Mitigation

### Data Safety
- **Backup Strategy**: Regular PostgreSQL backups
- **Data Validation**: Comprehensive testing and validation
- **Rollback Plan**: Keep file storage as fallback option

### Performance
- **Connection Pooling**: Prevent connection exhaustion
- **Query Optimization**: Proper indexing strategy
- **Monitoring**: Database performance metrics
- **Load Testing**: Validate under expected load

### Compatibility
- **API Compatibility**: Maintain existing MCP interface
- **Feature Parity**: Ensure all features work identically

## Success Criteria

1. **Functional Requirements**
   - All existing MCP operations work identically
   - Performance is equal or better than file storage
   - Data integrity is maintained

2. **Non-Functional Requirements**
   - Database connection stability
   - Query performance under load
   - Rollback capability

3. **Operational Requirements**
   - Docker container management
   - Database backup procedures
   - Monitoring and alerting
   - Documentation updates

## Timeline Summary

- **Week 1**: Infrastructure setup and basic repository implementation
- **Week 2**: Advanced features, testing, and deployment

**Total Estimated Time**: 1-2 weeks for complete implementation and testing. 