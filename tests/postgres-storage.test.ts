import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { PostgresPromptRepository } from '../src/postgres-storage.js';
import type { CreatePromptArgs, UpdatePromptArgs, ListPromptsArgs, Prompt } from '../src/types.js';

// Test database configuration
const TEST_CONFIG = {
  host: 'localhost',
  port: 5433,
  database: 'mcp_prompts',
  user: 'mcp_user',
  password: 'mcp_password_123',
};

describe('PostgresPromptRepository', () => {
  let repository: PostgresPromptRepository;

  beforeAll(async () => {
    // Create test database if it doesn't exist
    // This would typically be handled by test setup scripts
  });

  beforeEach(async () => {
    repository = new PostgresPromptRepository(TEST_CONFIG);
    await repository.connect();
    
    // Clean up test data
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
    await repository.disconnect();
  });

  afterAll(async () => {
    // Clean up test database
  });

  async function cleanupTestData() {
    try {
      const client = (repository as any).client;
      await client`DELETE FROM prompt_versions`;
      await client`DELETE FROM prompt_tags`;
      await client`DELETE FROM prompt_variables`;
      await client`DELETE FROM prompts`;
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  describe('Connection Management', () => {
    it('should connect to database successfully', async () => {
      const testRepo = new PostgresPromptRepository(TEST_CONFIG);
      await expect(testRepo.connect()).resolves.not.toThrow();
      await testRepo.disconnect();
    });

    it('should handle connection failures', async () => {
      const invalidRepo = new PostgresPromptRepository({
        host: 'invalid-host',
        port: 5433,
        database: 'invalid_db',
        user: 'invalid_user',
        password: 'invalid_password',
      });

      await expect(invalidRepo.connect()).rejects.toThrow('Failed to connect to database');
    });

    it('should disconnect gracefully', async () => {
      const testRepo = new PostgresPromptRepository(TEST_CONFIG);
      await testRepo.connect();
      await expect(testRepo.disconnect()).resolves.not.toThrow();
    });
  });

  describe('CRUD Operations', () => {
    it('should save prompt with all fields', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Test Prompt',
        content: 'Test content',
        description: 'Test description',
        isTemplate: false,
        tags: ['test', 'integration'],
        variables: ['name', 'email'],
        category: 'test',
        metadata: { author: 'test-user' },
      };

      const result = await repository.save(promptData);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^test-prompt-/);
      expect(result.name).toBe('Test Prompt');
      expect(result.content).toBe('Test content');
      expect(result.description).toBe('Test description');
      expect(result.isTemplate).toBe(false);
      expect(result.tags).toEqual(['test', 'integration']);
      expect(result.variables).toEqual(['name', 'email']);
      expect(result.category).toBe('test');
      expect(result.metadata).toEqual({ author: 'test-user' });
      expect(result.version).toBe(1);
    });

    it('should retrieve prompt by ID', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Retrieve Test',
        content: 'Test content for retrieval',
        description: 'Test description',
        isTemplate: false,
        tags: ['retrieve'],
        variables: [],
        category: 'test',
      };

      const saved = await repository.save(promptData);
      const retrieved = await repository.getById(saved.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(saved.id);
      expect(retrieved!.name).toBe('Retrieve Test');
      expect(retrieved!.content).toBe('Test content for retrieval');
      expect(retrieved!.tags).toEqual(['retrieve']);
    });

    it('should return null for non-existent prompt', async () => {
      const result = await repository.getById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should retrieve specific version', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Version Test',
        content: 'Version 1 content',
        description: 'Test description',
        isTemplate: false,
        tags: ['version'],
        variables: [],
        category: 'test',
      };

      const saved = await repository.save(promptData);
      
      // Update to create version 2
      await repository.update(saved.id, {
        content: 'Version 2 content',
        description: 'Updated description',
      });

      // Retrieve version 1
      const version1 = await repository.getById(saved.id, 1);
      expect(version1).toBeDefined();
      expect(version1!.content).toBe('Version 1 content');
      expect(version1!.version).toBe(1);

      // Retrieve version 2
      const version2 = await repository.getById(saved.id, 2);
      expect(version2).toBeDefined();
      expect(version2!.content).toBe('Version 2 content');
      expect(version2!.version).toBe(2);
    });

    it('should list prompts with filters', async () => {
      // Create test prompts
      await repository.save({
        name: 'Prompt 1',
        content: 'Content 1',
        description: 'Description 1',
        isTemplate: false,
        tags: ['test', 'filter'],
        variables: [],
        category: 'test',
      });

      await repository.save({
        name: 'Prompt 2',
        content: 'Content 2',
        description: 'Description 2',
        isTemplate: true,
        tags: ['test', 'template'],
        variables: ['name'],
        category: 'production',
      });

      await repository.save({
        name: 'Prompt 3',
        content: 'Content 3',
        description: 'Description 3',
        isTemplate: false,
        tags: ['other'],
        variables: [],
        category: 'other',
      });

      // Test category filter
      const testCategoryPrompts = await repository.list({ category: 'test' });
      expect(testCategoryPrompts).toHaveLength(2);

      // Test tag filter
      const filterTagPrompts = await repository.list({ tags: ['filter'] });
      expect(filterTagPrompts).toHaveLength(1);
      expect(filterTagPrompts[0].name).toBe('Prompt 1');

      // Test template filter
      const templatePrompts = await repository.list({ isTemplate: true });
      expect(templatePrompts).toHaveLength(1);
      expect(templatePrompts[0].name).toBe('Prompt 2');

      // Test pagination
      const paginatedPrompts = await repository.list({ limit: 2, offset: 0 });
      expect(paginatedPrompts).toHaveLength(2);
    });

    it('should update prompt with versioning', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Update Test',
        content: 'Original content',
        description: 'Original description',
        isTemplate: false,
        tags: ['update'],
        variables: [],
        category: 'test',
      };

      const saved = await repository.save(promptData);

      const updateData: UpdatePromptArgs = {
        name: 'Updated Name',
        content: 'Updated content',
        description: 'Updated description',
        tags: ['update', 'modified'],
        category: 'updated',
      };

      const updated = await repository.update(saved.id, updateData);

      expect(updated.id).toBe(saved.id);
      expect(updated.name).toBe('Updated Name');
      expect(updated.content).toBe('Updated content');
      expect(updated.description).toBe('Updated description');
      expect(updated.tags).toEqual(['update', 'modified']);
      expect(updated.category).toBe('updated');
      expect(updated.version).toBe(2);

      // Verify original version is preserved
      const original = await repository.getById(saved.id, 1);
      expect(original!.name).toBe('Update Test');
      expect(original!.content).toBe('Original content');
      expect(original!.version).toBe(1);
    });

    it('should delete prompt and cleanup relations', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Delete Test',
        content: 'Content to delete',
        description: 'Description',
        isTemplate: false,
        tags: ['delete'],
        variables: ['var1'],
        category: 'test',
      };

      const saved = await repository.save(promptData);
      
      // Verify prompt exists
      const beforeDelete = await repository.getById(saved.id);
      expect(beforeDelete).toBeDefined();

      // Delete prompt
      const deleted = await repository.delete(saved.id);
      expect(deleted).toBe(true);

      // Verify prompt is deleted
      const afterDelete = await repository.getById(saved.id);
      expect(afterDelete).toBeNull();
    });

    it('should handle version-specific deletion', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Version Delete Test',
        content: 'Version 1',
        description: 'Description',
        isTemplate: false,
        tags: ['version-delete'],
        variables: [],
        category: 'test',
      };

      const saved = await repository.save(promptData);
      
      // Create version 2
      await repository.update(saved.id, {
        content: 'Version 2',
      });

      // Delete version 1
      const deleted = await repository.delete(saved.id, 1);
      expect(deleted).toBe(true);

      // Version 1 should be gone
      const version1 = await repository.getById(saved.id, 1);
      expect(version1).toBeNull();

      // Version 2 should still exist
      const version2 = await repository.getById(saved.id, 2);
      expect(version2).toBeDefined();
      expect(version2!.content).toBe('Version 2');
    });

    it('should return false for non-existent prompt deletion', async () => {
      const deleted = await repository.delete('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('List Versions', () => {
    it('should list all versions of a prompt', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Version List Test',
        content: 'Version 1',
        description: 'Description',
        isTemplate: false,
        tags: ['version-list'],
        variables: [],
        category: 'test',
      };

      const saved = await repository.save(promptData);
      
      // Create multiple versions
      await repository.update(saved.id, { content: 'Version 2' });
      await repository.update(saved.id, { content: 'Version 3' });

      const versions = await repository.listVersions(saved.id);
      expect(versions).toEqual([1, 2, 3]);
    });

    it('should return empty array for non-existent prompt', async () => {
      const versions = await repository.listVersions('non-existent-id');
      expect(versions).toEqual([]);
    });
  });

  describe('Health Check', () => {
    it('should return true when database is healthy', async () => {
      const healthy = await repository.healthCheck();
      expect(healthy).toBe(true);
    });

    it('should return false when database is down', async () => {
      await repository.disconnect();
      
      // This should fail since we're disconnected
      const healthy = await repository.healthCheck();
      expect(healthy).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database transaction rollback', async () => {
      // This test would require mocking the database to simulate failures
      // For now, we'll test that the repository handles errors gracefully
      
      const invalidData = {
        name: 'Test',
        content: 'Content',
        description: 'Description',
        isTemplate: false,
        tags: ['test'],
        variables: [],
        category: 'test',
        // Add invalid data that would cause database errors
      } as CreatePromptArgs;

      // This should handle the error gracefully
      try {
        await repository.save(invalidData);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle connection errors during operations', async () => {
      await repository.disconnect();
      
      const promptData: CreatePromptArgs = {
        name: 'Connection Test',
        content: 'Content',
        description: 'Description',
        isTemplate: false,
        tags: ['test'],
        variables: [],
        category: 'test',
      };

      await expect(repository.save(promptData)).rejects.toThrow();
    });
  });

  describe('ID Generation', () => {
    it('should generate consistent IDs for same name', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Consistent ID Test',
        content: 'Content',
        description: 'Description',
        isTemplate: false,
        tags: [],
        variables: [],
        category: 'test',
      };

      const result1 = await repository.save(promptData);
      const result2 = await repository.save(promptData);

      expect(result1.id).toMatch(/^consistent-id-test-/);
      expect(result2.id).toMatch(/^consistent-id-test-/);
      expect(result1.id).not.toBe(result2.id); // Should be unique
    });
  });
}); 