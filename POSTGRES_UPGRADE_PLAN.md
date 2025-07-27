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

1. **Add Drizzle ORM Dependencies**
   ```bash
   npm install drizzle-orm postgres
   npm install drizzle-zod
   npm install --save-dev drizzle-kit @types/pg
   ```

2. **Create Docker Configuration**
   - `docker-compose.yml` for PostgreSQL service
   - `init.sql` for database schema
   - Secure credential management (see Security section)

3. **Database Connection Management**
   - Connection pooling with `postgres` client
   - Environment-based configuration
   - Health checks and reconnection logic

### Phase 2: Drizzle Repository Implementation

1. **Create Schema with Zod Integration**
   ```typescript
   // schema.ts - Single source of truth
   import { pgTable, text, boolean, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
   import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

   export const prompts = pgTable('prompts', {
     id: text('id').primaryKey(),
     name: text('name').notNull(),
     content: text('content').notNull(),
     description: text('description'),
     isTemplate: boolean('is_template').notNull().default(false),
     category: text('category'),
     metadata: jsonb('metadata'),
     createdAt: timestamp('created_at').notNull().defaultNow(),
     updatedAt: timestamp('updated_at').notNull().defaultNow(),
     version: integer('version').notNull().default(1),
   });

   // Auto-generated Zod schemas
   export const insertPromptSchema = createInsertSchema(prompts);
   export const selectPromptSchema = createSelectSchema(prompts);
   ```

2. **Create `DrizzlePromptRepository` Class**
   ```typescript
   export class DrizzlePromptRepository implements PromptRepository {
     private db: ReturnType<typeof drizzle>;
     
     constructor(config: PostgresConfig) {
       const client = postgres(config.connectionString);
       this.db = drizzle(client);
     }
     
     // Implement all repository methods with type safety
   }
   ```

2. **Core Methods Implementation**
   - `save()`: Type-safe insert with automatic Zod validation
   - `getById()`: Type-safe query with optional version
   - `list()`: Type-safe queries with filtering and pagination
   - `update()`: Type-safe updates with versioning
   - `delete()`: Type-safe deletion with version support
   - `listVersions()`: Type-safe version queries

3. **Advanced Features**
   - Full-text search using PostgreSQL's `tsvector`
   - Efficient pagination with `LIMIT` and `OFFSET`
   - Transaction support for atomic operations
   - Type-safe query building with Drizzle
   - Automatic Zod validation on all operations

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
     connectionString: string;
     // Or individual fields:
     // host: string;
     // port: number;
     // database: string;
     // user: string;
     // password: string;
   }
   ```

2. **Configuration Sources**
   - Environment variables (development)
   - Docker secrets (production)
   - Kubernetes secrets (K8s deployment)
   - Cloud secret managers (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager)

## Implementation Steps

### Step 1: Setup Infrastructure (Day 1)
```bash
# Create Docker setup
mkdir docker
mkdir secrets  # For secure credential storage
touch docker-compose.yml
touch docker/init.sql
echo "secrets/" >> .gitignore  # Never commit secrets

# Add Drizzle ORM dependencies
npm install drizzle-orm postgres drizzle-zod
npm install --save-dev drizzle-kit @types/pg
```

### Step 2: Database Schema (Day 1-2)
- Create Drizzle schema with Zod integration
- Generate migrations with `drizzle-kit`
- Test schema with Docker setup

### Step 3: Repository Implementation (Day 2-4)
- Implement `DrizzlePromptRepository`
- Add connection management
- Implement all CRUD operations with type safety
- Add transaction support

### Step 4: Testing & Integration (Day 4-5)
- Unit tests for new repository
- Integration tests
- Performance testing

### Step 5: Deployment (Day 5-6)
- Deploy PostgreSQL container
- Run Drizzle migrations
- Switch to Drizzle repository
- Monitor and validate

## Security & Credential Management

### ❌ Avoid: .env Files
`.env` files are **not secure** for production:
- Credentials stored in plain text
- Often committed to version control
- No access controls
- No rotation capabilities

### ✅ Secure Alternatives

#### 1. **Docker Secrets** (Recommended for Docker)
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    secrets:
      - postgres_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password

secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt  # Not in version control
```

#### 2. **Kubernetes Secrets** (K8s deployment)
```yaml
# k8s-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
type: Opaque
data:
  password: <base64-encoded-password>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-prompt-mgmt
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
```

#### 3. **Cloud Secret Managers**
```typescript
// AWS Secrets Manager
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManager();
const secret = await secretsManager.getSecretValue({
  SecretId: 'mcp-postgres-credentials'
});

// Azure Key Vault
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

const credential = new DefaultAzureCredential();
const client = new SecretClient('https://your-vault.vault.azure.net/', credential);
const secret = await client.getSecret('postgres-password');

// GCP Secret Manager
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();
const [version] = await client.accessSecretVersion({
  name: 'projects/your-project/secrets/postgres-password/versions/latest'
});
```

#### 4. **Environment Variables** (Development Only)
```bash
# Only for local development
export POSTGRES_PASSWORD="your-dev-password"
```

### Configuration Priority
1. **Production**: Cloud secret managers or K8s secrets
2. **Docker**: Docker secrets
3. **Development**: Environment variables (never committed)

### Docker Compose with Secrets (docker-compose.yml)
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: mcp-prompt-postgres
    secrets:
      - postgres_password
    environment:
      POSTGRES_DB: mcp_prompts
      POSTGRES_USER: mcp_user
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mcp_user -d mcp_prompts"]
      interval: 10s
      timeout: 5s
      retries: 5

secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt  # Not in version control

volumes:
  postgres_data:
```

## Benefits of Drizzle ORM + PostgreSQL

### Performance Improvements
- **Indexed Queries**: Fast filtering by category, tags, templates
- **Full-Text Search**: Native PostgreSQL text search capabilities
- **Pagination**: Efficient LIMIT/OFFSET queries
- **Concurrent Access**: No file locking issues
- **Type-Safe Queries**: Compile-time query validation

### Scalability
- **Connection Pooling**: Handle multiple concurrent requests
- **ACID Transactions**: Data consistency guarantees
- **Backup/Restore**: Standard database backup procedures
- **Replication**: Read replicas for high availability

### Features
- **Complex Queries**: Advanced filtering and sorting with type safety
- **Data Integrity**: Foreign key constraints + Zod validation
- **Audit Trail**: Complete version history
- **Metadata Search**: JSONB queries for flexible metadata
- **Single Source of Truth**: Schema defined once, used everywhere
- **Auto-Generated Types**: Full TypeScript integration

## Risk Mitigation

### Data Safety
- **Backup Strategy**: Regular PostgreSQL backups
- **Data Validation**: Comprehensive testing and validation

### Security
- **Credential Management**: Use Docker secrets, K8s secrets, or cloud secret managers
- **No Plain Text**: Never store credentials in .env files or version control
- **Access Controls**: Implement proper database user permissions
- **Connection Security**: Use SSL/TLS for database connections

### Performance
- **Connection Pooling**: Prevent connection exhaustion
- **Query Optimization**: Proper indexing strategy + type-safe queries
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

3. **Operational Requirements**
   - Docker container management
   - Database backup procedures
   - Monitoring and alerting
   - Documentation updates

## Drizzle ORM + Zod Advantages

### Why Drizzle Over Raw SQL
1. **Type Safety**: Compile-time query validation prevents runtime errors
2. **Zod Integration**: Automatic schema validation with `drizzle-zod`
3. **Less Boilerplate**: No manual SQL queries or Zod schema definitions
4. **Migrations**: Built-in migration system with `drizzle-kit`
5. **Query Builder**: Intuitive, type-safe query building
6. **Single Source of Truth**: Schema defined once, used for database + validation

### Implementation Example
```typescript
// schema.ts - Define once, use everywhere
import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const prompts = pgTable('prompts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  isTemplate: boolean('is_template').notNull().default(false),
});

// Auto-generated Zod schemas
export const insertPromptSchema = createInsertSchema(prompts);
export const selectPromptSchema = createSelectSchema(prompts);

// Repository with full type safety
export class DrizzlePromptRepository implements PromptRepository {
  async save(data: CreatePromptArgs): Promise<Prompt> {
    // Zod validation happens automatically
    const validated = insertPromptSchema.parse(data);
    const [result] = await this.db.insert(prompts).values(validated).returning();
    return selectPromptSchema.parse(result);
  }
}
```

## Timeline Summary

- **Week 1**: Infrastructure setup and basic repository implementation
- **Week 2**: Advanced features, testing, and deployment

**Total Estimated Time**: 1-2 weeks for complete implementation and testing. 