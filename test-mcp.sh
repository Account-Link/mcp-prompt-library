#!/bin/bash

echo "Testing MCP server at http://localhost:8080"

# Test basic connectivity
echo "1. Testing basic connectivity..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080
echo " (should be 404, which is expected)"

# Test MCP initialize
echo "2. Testing MCP initialize..."
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

echo ""
echo "Test completed!" 