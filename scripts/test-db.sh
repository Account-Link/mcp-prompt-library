#!/bin/bash

# Test Database Management Script
# Usage: ./scripts/test-db.sh [setup|clean|status]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

case "${1:-}" in
  setup)
    echo "Setting up test database..."
    
    # Check if main database is running
    if ! docker ps --filter "name=mcp-prompt-postgres" --format "{{.Names}}" | grep -q "mcp-prompt-postgres"; then
      echo "Main database container is not running. Please start it with: docker-compose up -d postgres"
      exit 1
    fi
    
    # Create test database
    docker exec mcp-prompt-postgres psql -U mcp_user -d mcp_prompts -c "CREATE DATABASE mcp_prompts_test;" 2>/dev/null || echo "Test database already exists"
    
    # Copy and run init.sql on test database
    docker cp docker/init.sql mcp-prompt-postgres:/tmp/init.sql
    docker exec mcp-prompt-postgres psql -U mcp_user -d mcp_prompts_test -f /tmp/init.sql
    
    echo "Test database setup completed"
    ;;
  clean)
    echo "Cleaning test database..."
    docker exec mcp-prompt-postgres psql -U mcp_user -d mcp_prompts -c "DROP DATABASE IF EXISTS mcp_prompts_test;"
    echo "Test database cleaned"
    ;;
  status)
    echo "Checking test database status..."
    if docker ps --filter "name=mcp-prompt-postgres" --format "{{.Names}}" | grep -q "mcp-prompt-postgres"; then
      echo "Main database container is running"
      if docker exec mcp-prompt-postgres psql -U mcp_user -d mcp_prompts -c "\l" | grep -q "mcp_prompts_test"; then
        echo "Test database exists"
      else
        echo "Test database does not exist"
      fi
    else
      echo "Main database container is not running"
    fi
    ;;
  *)
    echo "Usage: $0 {setup|clean|status}"
    echo ""
    echo "Commands:"
    echo "  setup   - Set up test database in existing container"
    echo "  clean   - Remove test database"
    echo "  status  - Show test database status"
    exit 1
    ;;
esac 