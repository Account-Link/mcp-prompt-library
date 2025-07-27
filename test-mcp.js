#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use tsx for development testing, fallback to built version
const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const command = isDev ? 'npx' : 'node';
const args = isDev ? ['tsx', join(__dirname, 'src/index.ts')] : [join(__dirname, 'dist/index.js')];

console.log(`Testing MCP server with: ${command} ${args.join(' ')}`);

const server = spawn(command, args, {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseCount = 0;

// Test the tools/list method
const listRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list'
};

server.stdin.write(JSON.stringify(listRequest) + '\n');

server.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
  responseCount++;
  
  // After getting the tools list, try to add a prompt
  if (responseCount === 1) {
    const addRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'add_prompt',
        arguments: {
          name: 'Test Prompt',
          content: 'This is a test prompt content'
        }
      }
    };
    
    setTimeout(() => {
      server.stdin.write(JSON.stringify(addRequest) + '\n');
    }, 500);
  }
  
  // After getting the add response, close the server
  if (responseCount === 2) {
    setTimeout(() => {
      console.log('Test completed, shutting down server...');
      server.kill('SIGTERM');
    }, 500);
  }
});

server.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

server.on('close', (code) => {
  console.log(`✅ MCP server test completed. Server exited with code ${code}`);
  process.exit(code === 0 ? 0 : 1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down...');
  server.kill('SIGTERM');
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down...');
  server.kill('SIGTERM');
}); 