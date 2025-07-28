import { exec } from 'child_process';
import { promisify } from 'util';
import { PostgresPromptRepository } from '../src/postgres-storage.js';
import { TEST_DB_CONFIG } from './test-config.js';

const execAsync = promisify(exec);

export class TestDatabaseManager {
  private repository: PostgresPromptRepository | null = null;

  constructor() {
    // Don't create repository in constructor to avoid connection issues
  }

  async startTestDatabase(): Promise<void> {
    try {
      console.log('Setting up test database...');
      
      // Check if main database is running
      const { stdout } = await execAsync('docker ps --filter "name=mcp-prompt-postgres" --format "{{.Names}}"');
      if (stdout.trim() !== 'mcp-prompt-postgres') {
        throw new Error('Main database container is not running. Please start it with: docker-compose up -d postgres');
      }
      
      // Create test database (ignore if it already exists)
      try {
        await execAsync(`docker exec mcp-prompt-postgres psql -U mcp_user -d mcp_prompts -c "CREATE DATABASE mcp_prompts_test;"`);
      } catch (error) {
        // Database might already exist, that's fine
        console.log('Test database already exists, continuing...');
      }
      
      // Copy the same init.sql file to container and run it on test database
      await execAsync(`docker cp docker/init.sql mcp-prompt-postgres:/tmp/init.sql`);
      await execAsync(`docker exec mcp-prompt-postgres psql -U mcp_user -d mcp_prompts_test -f /tmp/init.sql`);
      
      // Wait for database to be ready
      await this.waitForDatabase();
      console.log('Test database setup completed successfully');
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw error;
    }
  }

  async stopTestDatabase(): Promise<void> {
    try {
      console.log('Cleaning up test database...');
      // Drop the test database
      await execAsync(`docker exec mcp-prompt-postgres psql -U mcp_user -d mcp_prompts -c "DROP DATABASE IF EXISTS mcp_prompts_test;"`);
      console.log('Test database cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup test database:', error);
      // Don't throw error for cleanup failures
    }
  }

  async connect(): Promise<void> {
    if (!this.repository) {
      this.repository = new PostgresPromptRepository(TEST_DB_CONFIG);
    }
    await this.repository.connect();
  }

  async disconnect(): Promise<void> {
    if (this.repository) {
      await this.repository.disconnect();
      this.repository = null;
    }
  }

  async cleanupTestData(): Promise<void> {
    if (!this.repository) {
      return;
    }
    try {
      const client = (this.repository as any).client;
      await client`DELETE FROM prompt_versions`;
      await client`DELETE FROM prompt_tags`;
      await client`DELETE FROM prompt_variables`;
      await client`DELETE FROM prompts`;
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Cleanup warning:', error);
    }
  }

  getRepository(): PostgresPromptRepository {
    if (!this.repository) {
      this.repository = new PostgresPromptRepository(TEST_DB_CONFIG);
    }
    return this.repository;
  }

  private async waitForDatabase(): Promise<void> {
    const maxAttempts = 10;
    const delay = 500; // 0.5 seconds

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Just test if we can connect to the test database
        await execAsync(`docker exec mcp-prompt-postgres psql -U mcp_user -d mcp_prompts_test -c "SELECT 1;"`);
        return; // Database is ready
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(`Test database failed to be ready after ${maxAttempts} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

// Global test database manager instance
export const testDbManager = new TestDatabaseManager(); 