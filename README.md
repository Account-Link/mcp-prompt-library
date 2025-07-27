# MCP Prompt Manager

A **simple, focused prompt manager** built on the Model Context Protocol (MCP). This project extracts the core functionality from the larger MCP Prompts ecosystem into a minimal, well-tested implementation.

## 🎯 Motivation

The original MCP Prompts project is ambitious but over-engineered. It promises enterprise features but delivers a complex codebase with many unimplemented components. This project aims to:

- **Extract the working core** - file storage with atomic operations
- **Focus on simplicity** - do one thing well
- **Ensure test coverage** - every feature has working tests
- **Provide clear value** - a prompt manager that actually works

## 🏗️ Architecture

### Core Components

```
src/
├── types.ts          # Prompt interface and schemas
├── file-storage.ts   # Atomic file operations with locking
├── prompt-service.ts # Business logic and validation
├── mcp-server.ts     # MCP protocol integration
└── index.ts          # Entry point and server startup

tests/
├── file-storage.test.ts
├── prompt-service.test.ts
└── mcp-server.test.ts
```

### Key Features

1. **Atomic File Storage**
   - Temp file + rename for corruption prevention
   - File locking with `proper-lockfile`
   - Index.json for fast metadata lookup

2. **Schema Validation**
   - Zod schemas for all data
   - Type-safe operations
   - Clear error messages

3. **MCP Integration**
   - Full MCP server implementation
   - Tools: add, get, list, update, delete prompts
   - Resources: expose prompts as MCP resources

4. **Template System**
   - Variable substitution with `{{variables}}`
   - Validation of required variables
   - Support for default values

## 🚀 Quick Start

### Installation

```bash
cd mcp-prompt-mgmt
npm install
```

### Development

```bash
# Run tests
npm test

# Start development server
npm run dev

# Build for production
npm run build
```

### Usage

```bash
# Start the MCP server
npm start

# Or with npx
npx mcp-prompt-mgmt
```

## 📋 Implementation Plan

### Phase 1: Core Foundation (1-2 days)
- [ ] Set up project structure and dependencies
- [ ] Implement `Prompt` interface and Zod schemas
- [ ] Create `FilePromptRepository` with atomic operations
- [ ] Add comprehensive tests for file storage
- [ ] Basic MCP server integration

### Phase 2: Features (2-3 days)
- [ ] Template variable substitution engine
- [ ] Complete MCP tools and resources
- [ ] CLI commands for basic operations
- [ ] Health check endpoint
- [ ] Configuration management

### Phase 3: Polish (1-2 days)
- [ ] Better error handling and logging
- [ ] Docker support
- [ ] Documentation and examples
- [ ] Performance optimizations

## 🧪 Testing Strategy

### Unit Tests
- File storage operations (atomic writes, locking)
- Schema validation
- Template variable substitution
- Error handling

### Integration Tests
- MCP server communication
- End-to-end prompt operations
- CLI command execution

### Test Coverage Goals
- **90%+ line coverage** for core functionality
- **100% coverage** for critical paths (file operations)
- **Integration tests** for all MCP tools

## 🎯 Success Criteria

A successful implementation will:

1. **Store prompts safely** - No data corruption, atomic operations
2. **Validate everything** - Reject invalid data with clear errors
3. **Work with MCP clients** - Claude Desktop, Cursor, etc.
4. **Have comprehensive tests** - Every feature tested
5. **Be simple to understand** - Clear, focused codebase
6. **Be easy to extend** - Well-defined interfaces

## 🔄 Comparison with Original

| Feature | Original MCP Prompts | This Project |
|---------|---------------------|--------------|
| **File Storage** | ✅ Working | ✅ Core focus |
| **PostgreSQL** | ❌ Not implemented | ❌ Out of scope |
| **REST API** | ❌ Not implemented | ❌ Out of scope |
| **CLI** | ❌ Not implemented | ✅ Simple CLI |
| **Testing** | ⚠️ Minimal | ✅ Comprehensive |
| **Complexity** | 🔴 High | 🟢 Low |
| **Maintainability** | 🔴 Poor | 🟢 Excellent |

## 📚 MCP Integration

This server implements the Model Context Protocol to provide:

### Tools
- `add_prompt` - Create a new prompt
- `get_prompt` - Retrieve a prompt by ID
- `list_prompts` - List all prompts with filtering
- `update_prompt` - Update an existing prompt
- `delete_prompt` - Delete a prompt
- `apply_template` - Apply variables to a template

### Resources
- `prompts` - List of all prompts
- `prompt/{id}` - Individual prompt details

### Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "prompt-manager": {
      "command": "npx",
      "args": ["mcp-prompt-mgmt"],
      "env": {
        "PROMPTS_DIR": "./prompts"
      }
    }
  }
}
```

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or pnpm

### Setup
```bash
git clone <repository>
cd mcp-prompt-mgmt
npm install
npm test
```

### Adding Features
1. Write tests first
2. Implement the feature
3. Ensure all tests pass
4. Update documentation

## 📄 License

MIT License - see LICENSE file for details.

---

**Goal**: A prompt manager that actually works, with tests that actually pass, and code that's actually maintainable.
