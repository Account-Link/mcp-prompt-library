import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DrizzlePromptRepository, PostgresConfig } from '../src/drizzle-storage.js';
import { CreatePromptArgs, UpdatePromptArgs } from '../src/types.js';

describe('DrizzlePromptRepository', () => {
  let repository: DrizzlePromptRepository;
  const config: PostgresConfig = {
    host: 'localhost',
    port: 5433,
    database: 'mcp_prompts',
    user: 'mcp_user',
    password: 'mcp_password_123',
  };

  beforeEach(async () => {
    repository = new DrizzlePromptRepository(config);
    await repository.connect();
  });

  afterEach(async () => {
    await repository.disconnect();
  });

  describe('Connection Management', () => {
    it('should connect to database', async () => {
      const isConnected = await repository.isConnected();
      expect(isConnected).toBe(true);
    });

    it('should perform health check', async () => {
      const isHealthy = await repository.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should disconnect from database', async () => {
      await repository.disconnect();
      const isConnected = await repository.isConnected();
      expect(isConnected).toBe(false);
    });
  });

  describe('CRUD Operations', () => {
    it('should save a new prompt', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Test Prompt',
        content: 'This is a test prompt',
        description: 'A test description',
        isTemplate: false,
        tags: ['test', 'example'],
        category: 'testing',
      };

      const saved = await repository.save(promptData);

      expect(saved.id).toBeDefined();
      expect(saved.name).toBe(promptData.name);
      expect(saved.content).toBe(promptData.content);
      expect(saved.description).toBe(promptData.description);
      expect(saved.isTemplate).toBe(promptData.isTemplate);
      expect(saved.tags).toEqual(promptData.tags);
      expect(saved.category).toBe(promptData.category);
      expect(saved.version).toBe(1);
      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);
    });

    it('should save a template prompt with extracted variables', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Template Prompt',
        content: 'Hello {{name}}, welcome to {{company}}!',
        isTemplate: true,
        tags: ['template'],
      };

      const saved = await repository.save(promptData);

      expect(saved.isTemplate).toBe(true);
      expect(saved.variables).toEqual(['name', 'company']);
    });

    it('should get prompt by ID', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Get Test',
        content: 'Content for get test',
        tags: ['get'],
      };

      const saved = await repository.save(promptData);
      const retrieved = await repository.getById(saved.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(saved.id);
      expect(retrieved?.name).toBe(saved.name);
      expect(retrieved?.content).toBe(saved.content);
    });

    it('should return null for non-existent prompt', async () => {
      const result = await repository.getById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should list all prompts', async () => {
      const prompt1: CreatePromptArgs = {
        name: 'List Test 1',
        content: 'Content 1',
        tags: ['list'],
      };

      const prompt2: CreatePromptArgs = {
        name: 'List Test 2',
        content: 'Content 2',
        tags: ['list'],
      };

      await repository.save(prompt1);
      await repository.save(prompt2);

      const prompts = await repository.list();
      expect(prompts.length).toBeGreaterThanOrEqual(2);
      expect(prompts.some(p => p.name === 'List Test 1')).toBe(true);
      expect(prompts.some(p => p.name === 'List Test 2')).toBe(true);
    });

    it('should filter prompts by category', async () => {
      const prompt1: CreatePromptArgs = {
        name: 'Category Test 1',
        content: 'Content 1',
        category: 'test-category',
      };

      const prompt2: CreatePromptArgs = {
        name: 'Category Test 2',
        content: 'Content 2',
        category: 'other-category',
      };

      await repository.save(prompt1);
      await repository.save(prompt2);

      const prompts = await repository.list({ category: 'test-category' });
      expect(prompts.length).toBeGreaterThanOrEqual(1);
      expect(prompts.every(p => p.category === 'test-category')).toBe(true);
    });

    it('should filter prompts by template status', async () => {
      const prompt1: CreatePromptArgs = {
        name: 'Template Test 1',
        content: 'Content 1',
        isTemplate: true,
      };

      const prompt2: CreatePromptArgs = {
        name: 'Template Test 2',
        content: 'Content 2',
        isTemplate: false,
      };

      await repository.save(prompt1);
      await repository.save(prompt2);

      const templates = await repository.list({ isTemplate: true });
      expect(templates.length).toBeGreaterThanOrEqual(1);
      expect(templates.every(p => p.isTemplate)).toBe(true);

      const nonTemplates = await repository.list({ isTemplate: false });
      expect(nonTemplates.length).toBeGreaterThanOrEqual(1);
      expect(nonTemplates.every(p => !p.isTemplate)).toBe(true);
    });

    it('should filter prompts by tags', async () => {
      const prompt1: CreatePromptArgs = {
        name: 'Tag Test 1',
        content: 'Content 1',
        tags: ['tag1', 'tag2'],
      };

      const prompt2: CreatePromptArgs = {
        name: 'Tag Test 2',
        content: 'Content 2',
        tags: ['tag2', 'tag3'],
      };

      await repository.save(prompt1);
      await repository.save(prompt2);

      const prompts = await repository.list({ tags: ['tag1'] });
      expect(prompts.length).toBeGreaterThanOrEqual(1);
      expect(prompts.every(p => p.tags.includes('tag1'))).toBe(true);
    });

    it('should apply pagination', async () => {
      const prompt1: CreatePromptArgs = {
        name: 'Pagination Test 1',
        content: 'Content 1',
      };

      const prompt2: CreatePromptArgs = {
        name: 'Pagination Test 2',
        content: 'Content 2',
      };

      const prompt3: CreatePromptArgs = {
        name: 'Pagination Test 3',
        content: 'Content 3',
      };

      await repository.save(prompt1);
      await repository.save(prompt2);
      await repository.save(prompt3);

      const firstPage = await repository.list({ limit: 2, offset: 0 });
      expect(firstPage.length).toBeLessThanOrEqual(2);

      const secondPage = await repository.list({ limit: 2, offset: 2 });
      expect(secondPage.length).toBeLessThanOrEqual(2);
    });

    it('should update a prompt', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Update Test',
        content: 'Original content',
        tags: ['original'],
      };

      const saved = await repository.save(promptData);

      const updates: UpdatePromptArgs = {
        name: 'Updated Name',
        content: 'Updated content',
        tags: ['updated'],
      };

      const updated = await repository.update(saved.id, updates);

      expect(updated.name).toBe(updates.name);
      expect(updated.content).toBe(updates.content);
      expect(updated.tags).toEqual(updates.tags);
      expect(updated.version).toBe(saved.version + 1);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(saved.updatedAt.getTime());
    });

    it('should throw error when updating non-existent prompt', async () => {
      const updates: UpdatePromptArgs = {
        name: 'Updated Name',
      };

      await expect(repository.update('non-existent-id', updates)).rejects.toThrow('Prompt with id \'non-existent-id\' not found');
    });

    it('should delete a prompt', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Delete Test',
        content: 'Content to delete',
      };

      const saved = await repository.save(promptData);
      const deleted = await repository.delete(saved.id);

      expect(deleted).toBe(true);

      const retrieved = await repository.getById(saved.id);
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent prompt', async () => {
      const deleted = await repository.delete('non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should list versions of a prompt', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Version Test',
        content: 'Original content',
      };

      const saved = await repository.save(promptData);

      // Update to create a new version
      await repository.update(saved.id, { content: 'Updated content' });

      const versions = await repository.listVersions(saved.id);
      expect(versions).toEqual([2, 1]); // Newest first
    });

    it('should get specific version of a prompt', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Version Get Test',
        content: 'Original content',
      };

      const saved = await repository.save(promptData);

      // Update to create a new version
      await repository.update(saved.id, { content: 'Updated content' });

      const originalVersion = await repository.getById(saved.id, 1);
      const updatedVersion = await repository.getById(saved.id, 2);

      expect(originalVersion?.content).toBe('Original content');
      expect(updatedVersion?.content).toBe('Updated content');
    });
  });

  describe('Template Operations', () => {
    it('should extract variables from template content', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Variable Test',
        content: 'Hello {{name}}, you work at {{company}} and your role is {{role}}.',
        isTemplate: true,
      };

      const saved = await repository.save(promptData);

      expect(saved.variables).toEqual(['name', 'company', 'role']);
    });

    it('should update variables when template content changes', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Variable Update Test',
        content: 'Hello {{name}}!',
        isTemplate: true,
      };

      const saved = await repository.save(promptData);
      expect(saved.variables).toEqual(['name']);

      const updated = await repository.update(saved.id, {
        content: 'Hello {{name}}, welcome to {{company}}!',
      });

      expect(updated.variables).toEqual(['name', 'company']);
    });

    it('should clear variables when prompt is no longer a template', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Template to Regular Test',
        content: 'Hello {{name}}!',
        isTemplate: true,
      };

      const saved = await repository.save(promptData);
      expect(saved.variables).toEqual(['name']);

      const updated = await repository.update(saved.id, {
        content: 'Hello John!',
        isTemplate: false,
      });

      expect(updated.variables).toEqual([]);
    });
  });

  describe('Tag Management', () => {
    it('should handle duplicate tags gracefully', async () => {
      const prompt1: CreatePromptArgs = {
        name: 'Tag Test 1',
        content: 'Content 1',
        tags: ['shared-tag'],
      };

      const prompt2: CreatePromptArgs = {
        name: 'Tag Test 2',
        content: 'Content 2',
        tags: ['shared-tag'],
      };

      const saved1 = await repository.save(prompt1);
      const saved2 = await repository.save(prompt2);

      expect(saved1.tags).toEqual(['shared-tag']);
      expect(saved2.tags).toEqual(['shared-tag']);
    });

    it('should update tags correctly', async () => {
      const promptData: CreatePromptArgs = {
        name: 'Tag Update Test',
        content: 'Content',
        tags: ['original-tag'],
      };

      const saved = await repository.save(promptData);
      expect(saved.tags).toEqual(['original-tag']);

      const updated = await repository.update(saved.id, {
        tags: ['new-tag1', 'new-tag2'],
      });

      expect(updated.tags).toEqual(['new-tag1', 'new-tag2']);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const badConfig: PostgresConfig = {
        host: 'localhost',
        port: 9999, // Invalid port
        database: 'mcp_prompts',
        user: 'mcp_user',
        password: 'mcp_password_123',
      };

      const badRepository = new DrizzlePromptRepository(badConfig);
      await expect(badRepository.connect()).rejects.toThrow();
    });
  });
}); 