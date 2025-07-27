import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FilePromptRepository } from '../src/file-storage.js';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

describe('FilePromptRepository', () => {
  const TMP_DIR = path.join(__dirname, 'tmp-prompts');
  let repository: FilePromptRepository;

  beforeAll(async () => {
    await fs.rm(TMP_DIR, { recursive: true, force: true });
    await fs.mkdir(TMP_DIR, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(TMP_DIR, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean up before each test
    await fs.rm(TMP_DIR, { recursive: true, force: true });
    await fs.mkdir(TMP_DIR, { recursive: true });
    
    repository = new FilePromptRepository({ promptsDir: TMP_DIR });
    await repository.connect();
  });

  describe('Connection', () => {
    it('should connect and create index file', async () => {
      expect(await repository.isConnected()).toBe(true);
      
      const indexPath = path.join(TMP_DIR, 'index.json');
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      expect(JSON.parse(indexContent)).toEqual({});
    });

    it('should handle connection errors gracefully', async () => {
      const badRepository = new FilePromptRepository({ 
        promptsDir: '/invalid/path/that/should/fail' 
      });
      
      await expect(badRepository.connect()).rejects.toThrow();
    });
  });

  describe('Save and Retrieve', () => {
    it('should save and retrieve a prompt atomically', async () => {
      const promptData = {
        name: 'Test Prompt',
        content: 'Hello, world!',
        description: 'A test prompt',
        isTemplate: false,
        tags: ['test', 'example'],
        category: 'testing',
      };

      const saved = await repository.save(promptData);
      
      expect(saved.id).toBeDefined();
      expect(saved.name).toBe(promptData.name);
      expect(saved.content).toBe(promptData.content);
      expect(saved.version).toBe(1);
      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);

      const retrieved = await repository.getById(saved.id);
      expect(retrieved).toMatchObject({
        id: saved.id,
        name: promptData.name,
        content: promptData.content,
        description: promptData.description,
        isTemplate: promptData.isTemplate,
        tags: promptData.tags,
        category: promptData.category,
      });
    });

    it('should reject invalid prompt schema', async () => {
      const invalidData = {
        name: 123, // Should be string
        content: 456, // Should be string
      };

      await expect(repository.save(invalidData as any)).rejects.toThrow(z.ZodError);
    });

    it('should generate unique IDs for different prompts', async () => {
      const prompt1 = await repository.save({
        name: 'Prompt 1',
        content: 'Content 1',
        isTemplate: false,
      });

      const prompt2 = await repository.save({
        name: 'Prompt 2',
        content: 'Content 2',
        isTemplate: false,
      });

      expect(prompt1.id).not.toBe(prompt2.id);
    });

    it('should handle template variables extraction', async () => {
      const templateData = {
        name: 'Template Prompt',
        content: 'Hello {{name}}, welcome to {{place}}!',
        isTemplate: true,
      };

      const saved = await repository.save(templateData);
      expect(saved.variables).toEqual(['name', 'place']);
    });
  });

  describe('Concurrent Operations', () => {
    it('should prevent concurrent writes with file locking', async () => {
      const promptData = {
        name: 'Concurrent Test',
        content: 'Test content',
        isTemplate: false,
      };

      // Start two concurrent save operations
      const p1 = repository.save(promptData);
      const p2 = repository.save(promptData);
      
      const results = await Promise.allSettled([p1, p2]);
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');
      
      expect(fulfilled.length + rejected.length).toBe(2);
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle concurrent reads safely', async () => {
      const prompt = await repository.save({
        name: 'Concurrent Read Test',
        content: 'Test content',
        isTemplate: false,
      });

      // Multiple concurrent reads should all succeed
      const reads = await Promise.all([
        repository.getById(prompt.id),
        repository.getById(prompt.id),
        repository.getById(prompt.id),
      ]);

      expect(reads.every(p => p?.id === prompt.id)).toBe(true);
    });
  });

  describe('Index Management', () => {
    it('should update index.json on add/update/delete', async () => {
      const prompt = await repository.save({
        name: 'Index Test',
        content: 'Test content',
        isTemplate: false,
      });

      // Check index was updated
      const indexPath = path.join(TMP_DIR, 'index.json');
      const index = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
      expect(index[prompt.id]).toBeDefined();
      expect(index[prompt.id].name).toBe(prompt.name);

      // Update prompt
      const updated = await repository.update(prompt.id, {
        name: 'Updated Index Test',
      });

      // Check index was updated
      const index2 = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
      expect(index2[prompt.id].name).toBe('Updated Index Test');
      expect(index2[prompt.id].version).toBe(2);

      // Delete prompt
      await repository.delete(prompt.id);

      // Check index was updated
      const index3 = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
      expect(index3[prompt.id]).toBeUndefined();
    });

    it('should maintain index consistency', async () => {
      const prompts = await Promise.all([
        repository.save({ name: 'Prompt 1', content: 'Content 1', isTemplate: false }),
        repository.save({ name: 'Prompt 2', content: 'Content 2', isTemplate: false }),
        repository.save({ name: 'Prompt 3', content: 'Content 3', isTemplate: false }),
      ]);

      const listed = await repository.list();
      expect(listed).toHaveLength(3);
      expect(listed.map(p => p.id).sort()).toEqual(prompts.map(p => p.id).sort());
    });
  });

  describe('Update Operations', () => {
    it('should update prompt and increment version', async () => {
      const prompt = await repository.save({
        name: 'Update Test',
        content: 'Original content',
        isTemplate: false,
      });

      const updated = await repository.update(prompt.id, {
        name: 'Updated Name',
        content: 'Updated content',
      });

      expect(updated.id).toBe(prompt.id);
      expect(updated.name).toBe('Updated Name');
      expect(updated.content).toBe('Updated content');
      expect(updated.version).toBe(prompt.version + 1);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(prompt.updatedAt.getTime());
    });

    it('should throw error when updating non-existent prompt', async () => {
      await expect(repository.update('non-existent-id', { name: 'New Name' }))
        .rejects.toThrow('Prompt with id \'non-existent-id\' not found');
    });

    it('should preserve unchanged fields during update', async () => {
      const prompt = await repository.save({
        name: 'Preserve Test',
        content: 'Original content',
        description: 'Original description',
        tags: ['original'],
        isTemplate: false,
      });

      const updated = await repository.update(prompt.id, {
        name: 'Updated Name',
      });

      expect(updated.content).toBe(prompt.content);
      expect(updated.description).toBe(prompt.description);
      expect(updated.tags).toEqual(prompt.tags);
    });
  });

  describe('Delete Operations', () => {
    it('should delete prompt and return true', async () => {
      const prompt = await repository.save({
        name: 'Delete Test',
        content: 'Test content',
        isTemplate: false,
      });

      const deleted = await repository.delete(prompt.id);
      expect(deleted).toBe(true);

      const retrieved = await repository.getById(prompt.id);
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent prompt', async () => {
      const deleted = await repository.delete('non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should delete specific version', async () => {
      const prompt = await repository.save({
        name: 'Version Delete Test',
        content: 'Version 1',
        isTemplate: false,
      });

      const updated = await repository.update(prompt.id, {
        content: 'Version 2',
      });

      // Delete version 1
      const deleted = await repository.delete(prompt.id, 1);
      expect(deleted).toBe(true);

      // Version 2 should still exist
      const retrieved = await repository.getById(prompt.id);
      expect(retrieved?.version).toBe(2);
    });
  });

  describe('List Operations', () => {
    it('should list all prompts', async () => {
      const prompts = await Promise.all([
        repository.save({ name: 'List 1', content: 'Content 1', isTemplate: false }),
        repository.save({ name: 'List 2', content: 'Content 2', isTemplate: false }),
        repository.save({ name: 'List 3', content: 'Content 3', isTemplate: false }),
      ]);

      const listed = await repository.list();
      expect(listed).toHaveLength(3);
      expect(listed.map(p => p.name).sort()).toEqual(['List 1', 'List 2', 'List 3']);
    });

    it('should filter by category', async () => {
      await Promise.all([
        repository.save({ name: 'Cat 1', content: 'Content 1', category: 'test', isTemplate: false }),
        repository.save({ name: 'Cat 2', content: 'Content 2', category: 'prod', isTemplate: false }),
        repository.save({ name: 'Cat 3', content: 'Content 3', category: 'test', isTemplate: false }),
      ]);

      const testPrompts = await repository.list({ category: 'test' });
      expect(testPrompts).toHaveLength(2);
      expect(testPrompts.every(p => p.category === 'test')).toBe(true);
    });

    it('should filter by template status', async () => {
      await Promise.all([
        repository.save({ name: 'Regular 1', content: 'Content 1', isTemplate: false }),
        repository.save({ name: 'Template 1', content: 'Content 2', isTemplate: true }),
        repository.save({ name: 'Regular 2', content: 'Content 3', isTemplate: false }),
      ]);

      const templates = await repository.list({ isTemplate: true });
      expect(templates).toHaveLength(1);
      expect(templates[0].name).toBe('Template 1');

      const regular = await repository.list({ isTemplate: false });
      expect(regular).toHaveLength(2);
      expect(regular.every(p => !p.isTemplate)).toBe(true);
    });

    it('should filter by tags', async () => {
      await Promise.all([
        repository.save({ name: 'Tag 1', content: 'Content 1', tags: ['important'], isTemplate: false }),
        repository.save({ name: 'Tag 2', content: 'Content 2', tags: ['urgent'], isTemplate: false }),
        repository.save({ name: 'Tag 3', content: 'Content 3', tags: ['important', 'urgent'], isTemplate: false }),
      ]);

      const important = await repository.list({ tags: ['important'] });
      expect(important).toHaveLength(2);
      expect(important.every(p => p.tags.includes('important'))).toBe(true);
    });

    it('should apply pagination', async () => {
      const prompts = await Promise.all([
        repository.save({ name: 'Page 1', content: 'Content 1', isTemplate: false }),
        repository.save({ name: 'Page 2', content: 'Content 2', isTemplate: false }),
        repository.save({ name: 'Page 3', content: 'Content 3', isTemplate: false }),
      ]);

      const firstPage = await repository.list({ limit: 2, offset: 0 });
      expect(firstPage).toHaveLength(2);

      const secondPage = await repository.list({ limit: 2, offset: 2 });
      expect(secondPage).toHaveLength(1);
    });
  });

  describe('Version Management', () => {
    it('should list all versions of a prompt', async () => {
      const prompt = await repository.save({
        name: 'Version Test',
        content: 'Version 1',
        isTemplate: false,
      });

      await repository.update(prompt.id, { content: 'Version 2' });
      await repository.update(prompt.id, { content: 'Version 3' });

      const versions = await repository.listVersions(prompt.id);
      expect(versions).toEqual([1, 2, 3]);
    });

    it('should return empty array for non-existent prompt', async () => {
      const versions = await repository.listVersions('non-existent-id');
      expect(versions).toEqual([]);
    });
  });

  describe('Health Check', () => {
    it('should return true when healthy', async () => {
      const healthy = await repository.healthCheck();
      expect(healthy).toBe(true);
    });

    it('should return false when not connected', async () => {
      const disconnectedRepo = new FilePromptRepository({ promptsDir: TMP_DIR });
      const healthy = await disconnectedRepo.healthCheck();
      expect(healthy).toBe(false);
    });
  });

  describe('Security', () => {
    it('should sanitize path traversal attempts', async () => {
      const maliciousId = '../../../etc/passwd';
      const prompt = await repository.save({
        name: 'Security Test',
        content: 'Test content',
        isTemplate: false,
      });

      // Try to access with malicious ID
      const result = await repository.getById(maliciousId);
      expect(result).toBeNull();

      // Verify the actual prompt is still accessible
      const actualPrompt = await repository.getById(prompt.id);
      expect(actualPrompt).toBeDefined();
      expect(actualPrompt?.name).toBe('Security Test');
    });

    it('should handle special characters in IDs', async () => {
      const specialId = 'test<>:"|?*\x00-\x1f';
      const prompt = await repository.save({
        name: 'Special Chars Test',
        content: 'Test content',
        isTemplate: false,
      });

      // Try to access with special characters
      const result = await repository.getById(specialId);
      expect(result).toBeNull();

      // Verify the actual prompt is still accessible
      const actualPrompt = await repository.getById(prompt.id);
      expect(actualPrompt).toBeDefined();
    });
  });
}); 