#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { pino } from 'pino';
import { FilePromptRepository } from './file-storage.js';
import { PromptService } from './prompt-service.js';
import { McpPromptServer } from './mcp-server.js';

// Configuration
const PROMPTS_DIR = process.env.PROMPTS_DIR || './prompts';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Logger
const logger = pino({
  level: LOG_LEVEL,
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      options: {
        colorize: true,
      },
      target: 'pino-pretty',
    },
  }),
});

async function main() {
  try {
    logger.info('Starting MCP Prompt Manager...');
    logger.info(`Prompts directory: ${PROMPTS_DIR}`);

    // Initialize components
    const repository = new FilePromptRepository({ promptsDir: PROMPTS_DIR });
    await repository.connect();
    logger.info('Connected to file storage');

    const promptService = new PromptService(repository);
    const mcpServer = new McpPromptServer(promptService);

    // Health check
    const isHealthy = await promptService.healthCheck();
    if (!isHealthy) {
      throw new Error('Health check failed');
    }
    logger.info('Health check passed');

    // Connect to MCP transport
    const transport = new StdioServerTransport();
    await mcpServer.getServer().connect(transport);
    logger.info('MCP server connected via stdio');

    // Keep the process alive
    const keepAlive = setInterval(() => {}, 1000);

    // Graceful shutdown
    async function shutdown() {
      logger.info('Shutting down MCP Prompt Manager...');
      clearInterval(keepAlive);
      await mcpServer.close();
      await repository.disconnect();
      logger.info('Shutdown complete');
      process.exit(0);
    }

    // Handle process signals
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      shutdown().catch((err) => {
        logger.error('Error during shutdown:', err);
        process.exit(1);
      });
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection:', reason);
      shutdown().catch((err) => {
        logger.error('Error during shutdown:', err);
        process.exit(1);
      });
    });

    logger.info('MCP Prompt Manager ready');

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 