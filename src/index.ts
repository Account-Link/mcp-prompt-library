#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { pino } from 'pino';
import { PostgresPromptRepository } from './postgres-storage.js';
import { PromptService } from './prompt-service.js';
import { McpPromptServer } from './mcp-server.js';

// Configuration
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
const POSTGRES_PORT = parseInt(process.env.POSTGRES_PORT || '5433', 10);
const POSTGRES_DB = process.env.POSTGRES_DB || 'mcp_prompts';
const POSTGRES_USER = process.env.POSTGRES_USER || 'mcp_user';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'mcp_password_123';

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
    
    // Initialize repository based on configuration
    let repository;

    logger.info('Using PostgreSQL storage');
    logger.info(`PostgreSQL config: ${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`);
    
    repository = new PostgresPromptRepository({
      host: POSTGRES_HOST,
      port: POSTGRES_PORT,
      database: POSTGRES_DB,
      user: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
    });
    
    await repository.connect();
    logger.info('Connected to PostgreSQL');

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

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down MCP Prompt Manager...');
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