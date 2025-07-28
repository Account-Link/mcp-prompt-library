import { exec } from 'child_process';
import { promisify } from 'util';
import { PostgresPromptRepository } from '../src/postgres-storage.js';
import { TEST_DB_CONFIG } from './test-config.js';

const execAsync = promisify(exec);

export class TestDatabaseManager {
  private repository: PostgresPromptRepository | null = null;
  private isConnected = false;

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
      
      // Create test database with retry logic for concurrent access
      await this.createTestDatabaseWithRetry();
      
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
      console.log('Stopping test database...');
      // Ensure we're disconnected before cleanup
      await this.disconnect();
      
      console.log('Cleaning up test database...');
      // Drop the test database with retry logic for concurrent access
      await this.dropTestDatabaseWithRetry();
      console.log('Test database cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup test database:', error);
      // Don't throw error for cleanup failures
    }
  }

  private async dropTestDatabaseWithRetry(): Promise<void> {
    const maxAttempts = 5;
    const delay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // First, terminate all connections to the test database
        await execAsync(`docker exec mcp-prompt-postgres psql -U mcp_user -d mcp_prompts -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'mcp_prompts_test' AND pid <> pg_backend_pid();"`);
        
        // Then drop the database
        await execAsync(`docker exec mcp-prompt-postgres psql -U mcp_user -d mcp_prompts -c "DROP DATABASE IF EXISTS mcp_prompts_test;"`);
        return; // Success
      } catch (error: any) {
        if (attempt === maxAttempts) {
          throw error; // Give up after max attempts
        }
        
        // If it's a "database is being accessed" error, wait and retry
        if (error.stderr && error.stderr.includes('is being accessed by other users')) {
          console.log(`Database cleanup attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // For other errors, don't retry
          throw error;
        }
      }
    }
  }

  async connect(): Promise<void> {
    if (!this.repository) {
      this.repository = new PostgresPromptRepository(TEST_DB_CONFIG);
    }
    if (!this.isConnected) {
      await this.repository.connect();
      this.isConnected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.repository && this.isConnected) {
      try {
        await this.repository.disconnect();
      } catch (error) {
        // Ignore disconnect errors as they might be expected
        console.warn('Disconnect warning:', error);
      }
      this.repository = null;
      this.isConnected = false;
    }
  }

  async cleanupTestData(): Promise<void> {
    if (!this.repository || !this.isConnected) {
      return;
    }
    try {
      const client = (this.repository as any).client;
      // Clean up in the correct order to respect foreign key constraints
      await client`DELETE FROM prompt_versions`;
      await client`DELETE FROM prompt_tags`;
      await client`DELETE FROM prompt_variables`;
      await client`DELETE FROM prompts`;
      // Also clean up orphaned tags
      await client`DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM prompt_tags)`;
    } catch (error) {
      // Ignore cleanup errors but log them
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

  private async createTestDatabaseWithRetry(): Promise<void> {
    const maxAttempts = 3;
    const delay = 500; // 0.5 seconds

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await execAsync(`docker exec mcp-prompt-postgres psql -U mcp_user -d mcp_prompts -c "CREATE DATABASE mcp_prompts_test;"`);
        return; // Success
      } catch (error: any) {
        if (attempt === maxAttempts) {
          // On final attempt, check if database already exists
          try {
            await execAsync(`docker exec mcp-prompt-postgres psql -U mcp_user -d mcp_prompts_test -c "SELECT 1;"`);
            console.log('Test database already exists, continuing...');
            return; // Database exists, that's fine
          } catch (checkError) {
            throw error; // Database doesn't exist and we couldn't create it
          }
        }
        
        // If it's a "database already exists" error, that's fine
        if (error.stderr && error.stderr.includes('already exists')) {
          console.log('Test database already exists, continuing...');
          return;
        }
        
        // For other errors, wait and retry
        console.log(`Database creation attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

// Global test database manager instance
export const testDbManager = new TestDatabaseManager(); 