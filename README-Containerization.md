# MCP Prompt Library - Containerization

This document describes the containerized setup for the MCP Prompt Library server.

## 🐳 Containerization Overview

The MCP server has been successfully containerized using Docker and exposed over HTTP using `mcp-proxy`.

### Architecture

- **PostgreSQL Database**: Running in a separate container
- **MCP Server**: Containerized with Node.js 20 and mcp-proxy
- **HTTP Proxy**: mcp-proxy exposes the stdio-based MCP server over HTTP

### Services

1. **postgres**: PostgreSQL database for prompt storage
2. **mcp-server**: MCP server with HTTP proxy

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Port 8080 available for HTTP access
- Port 5433 available for PostgreSQL (optional, for direct DB access)

### Running the Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs mcp-server
docker-compose logs postgres

# Stop services
docker-compose down
```

### Building the MCP Server

```bash
# Build the MCP server image
docker-compose build mcp-server

# Rebuild and restart
docker-compose up -d --build
```

## 🔧 Configuration

### Environment Variables

The MCP server uses these environment variables:

- `POSTGRES_HOST`: Database host (default: postgres)
- `POSTGRES_PORT`: Database port (default: 5432)
- `POSTGRES_DB`: Database name (default: mcp_prompts)
- `POSTGRES_USER`: Database user (default: mcp_user)
- `POSTGRES_PASSWORD`: Database password (default: mcp_password_123)
- `NODE_ENV`: Environment (default: production)

### Ports

- **8080**: HTTP endpoint for MCP server
- **5433**: PostgreSQL database (mapped to avoid conflicts)

## 🧪 Testing

### Basic Connectivity

```bash
# Test HTTP endpoint
curl http://localhost:8080
# Expected: 404 (no root endpoint)

# Test MCP initialize
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

### Using the Test Scripts

```bash
# Run comprehensive tests
./test-mcp-comprehensive.sh

# Run simple connectivity test
./test-mcp.sh
```

## 📁 Files

- `Dockerfile`: Multi-stage build for the MCP server
- `.dockerignore`: Excludes unnecessary files from build context
- `docker-compose.yml`: Orchestrates PostgreSQL and MCP server
- `test-mcp.sh`: Basic connectivity test
- `test-mcp-comprehensive.sh`: Full MCP functionality test

## 🔍 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 8080 and 5433 are available
2. **Database connection**: Check if PostgreSQL container is healthy
3. **MCP proxy issues**: Verify Node.js version (requires 20+)

### Debugging

```bash
# Check container logs
docker-compose logs mcp-server

# Access container shell
docker exec -it mcp-prompt-server sh

# Check running processes
docker exec mcp-prompt-server ps aux

# Test database connection
docker exec mcp-prompt-postgres psql -U mcp_user -d mcp_prompts -c "SELECT 1;"
```

## ✅ Verification

The containerization is successful when:

- ✅ Both containers are running and healthy
- ✅ HTTP endpoint responds on port 8080
- ✅ MCP server connects to PostgreSQL
- ✅ MCP requests are processed correctly
- ✅ All prompt library functionality works over HTTP

## 🎉 Success!

The MCP Prompt Library is now fully containerized and accessible over HTTP at `http://localhost:8080`. 