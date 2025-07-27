#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = spawn('node', [join(__dirname, 'dist/index.js')], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Test the tools/list method
const listRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list'
};

server.stdin.write(JSON.stringify(listRequest) + '\n');

server.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
  
  // After getting the tools list, try to add a prompt
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
  }, 1000);
});

server.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
}); 