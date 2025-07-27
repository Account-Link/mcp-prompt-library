import { describe, it, expect, beforeEach } from 'vitest';
import { PromptService } from '../src/prompt-service.js';
import { FilePromptRepository } from '../src/file-storage.js';
import fs from 'fs/promises';
import path from 'path';

describe('PromptService', () => {
  const TMP_DIR = path.join(__dirname, 'tmp-service');
  let repository: FilePromptRepository;
  let service: PromptService;

  beforeEach(async () => {
    // Clean up before each test
    await fs.rm(TMP_DIR, { recursive: true, force: true });
    await fs.mkdir(TMP_DIR, { recursive: true });
    
    repository = new FilePromptRepository({ promptsDir: TMP_DIR });
    await repository.connect();
    service = new PromptService(repository);
  });

  describe('createPrompt', () => {
    it('should create a regular prompt', async () => {
      const promptData = {
        name: 'Test Prompt',
        content: 'Hello, world!',
        description: 'A test prompt',
        isTemplate: false,
        tags: ['test'],
        category: 'testing',
      };

      const prompt = await service.createPrompt(promptData);
      
      expect(prompt.name).toBe(promptData.name);
      expect(prompt.content).toBe(promptData.content);
      expect(prompt.isTemplate).toBe(false);
      expect(prompt.variables).toEqual([]);
    });

    it('should extract variables from template content', async () => {
      const templateData = {
        name: 'Template Prompt',
        content: 'Hello {{name}}, welcome to {{place}}!',
        isTemplate: true,
      };

      const prompt = await service.createPrompt(templateData);
      
      expect(prompt.isTemplate).toBe(true);
      expect(prompt.variables).toEqual(['name', 'place']);
    });

    it('should not extract variables from non-template content', async () => {
      const promptData = {
        name: 'Regular Prompt',
        content: 'Hello {{name}}, this is not a template',
        isTemplate: false,
      };

      const prompt = await service.createPrompt(promptData);
      
      expect(prompt.isTemplate).toBe(false);
      expect(prompt.variables).toEqual([]);
    });
  });

  describe('getPrompt', () => {
    it('should retrieve a prompt by ID', async () => {
      const created = await service.createPrompt({
        name: 'Get Test',
        content: 'Test content',
        isTemplate: false,
      });

      const retrieved = await service.getPrompt(created.id);
      
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe(created.name);
      expect(retrieved.content).toBe(created.content);
    });

    it('should throw error for non-existent prompt', async () => {
      await expect(service.getPrompt('non-existent-id'))
        .rejects.toThrow('Prompt with id \'non-existent-id\' not found');
    });

    it('should retrieve specific version', async () => {
      const created = await service.createPrompt({
        name: 'Version Test',
        content: 'Version 1',
        isTemplate: false,
      });

      const updated = await service.updatePrompt(created.id, {
        content: 'Version 2',
      });

      const v1 = await service.getPrompt(created.id, 1);
      const v2 = await service.getPrompt(created.id, 2);

      expect(v1.content).toBe('Version 1');
      expect(v2.content).toBe('Version 2');
    });
  });

  describe('listPrompts', () => {
    it('should list all prompts', async () => {
      const prompts = await Promise.all([
        service.createPrompt({ name: 'List 1', content: 'Content 1', isTemplate: false }),
        service.createPrompt({ name: 'List 2', content: 'Content 2', isTemplate: false }),
        service.createPrompt({ name: 'List 3', content: 'Content 3', isTemplate: false }),
      ]);

      const listed = await service.listPrompts();
      expect(listed).toHaveLength(3);
      expect(listed.map(p => p.name).sort()).toEqual(['List 1', 'List 2', 'List 3']);
    });

    it('should filter by category', async () => {
      await Promise.all([
        service.createPrompt({ name: 'Cat 1', content: 'Content 1', category: 'test', isTemplate: false }),
        service.createPrompt({ name: 'Cat 2', content: 'Content 2', category: 'prod', isTemplate: false }),
        service.createPrompt({ name: 'Cat 3', content: 'Content 3', category: 'test', isTemplate: false }),
      ]);

      const testPrompts = await service.listPrompts({ category: 'test' });
      expect(testPrompts).toHaveLength(2);
      expect(testPrompts.every(p => p.category === 'test')).toBe(true);
    });

    it('should filter by template status', async () => {
      await Promise.all([
        service.createPrompt({ name: 'Regular 1', content: 'Content 1', isTemplate: false }),
        service.createPrompt({ name: 'Template 1', content: 'Content 2', isTemplate: true }),
        service.createPrompt({ name: 'Regular 2', content: 'Content 3', isTemplate: false }),
      ]);

      const templates = await service.listPrompts({ isTemplate: true });
      expect(templates).toHaveLength(1);
      expect(templates[0].name).toBe('Template 1');
    });
  });

  describe('updatePrompt', () => {
    it('should update prompt and extract variables for templates', async () => {
      const prompt = await service.createPrompt({
        name: 'Update Test',
        content: 'Original content',
        isTemplate: false,
      });

      const updated = await service.updatePrompt(prompt.id, {
        content: 'Hello {{name}}, welcome!',
        isTemplate: true,
      });

      expect(updated.content).toBe('Hello {{name}}, welcome!');
      expect(updated.isTemplate).toBe(true);
      expect(updated.variables).toEqual(['name']);
      expect(updated.version).toBe(prompt.version + 1);
    });

    it('should clear variables when converting to non-template', async () => {
      const prompt = await service.createPrompt({
        name: 'Template Test',
        content: 'Hello {{name}}!',
        isTemplate: true,
      });

      const updated = await service.updatePrompt(prompt.id, {
        isTemplate: false,
      });

      expect(updated.isTemplate).toBe(false);
      expect(updated.variables).toEqual([]);
    });

    it('should throw error for non-existent prompt', async () => {
      await expect(service.updatePrompt('non-existent-id', { name: 'New Name' }))
        .rejects.toThrow('Prompt with id \'non-existent-id\' not found');
    });
  });

  describe('deletePrompt', () => {
    it('should delete prompt and return true', async () => {
      const prompt = await service.createPrompt({
        name: 'Delete Test',
        content: 'Test content',
        isTemplate: false,
      });

      const deleted = await service.deletePrompt(prompt.id);
      expect(deleted).toBe(true);

      await expect(service.getPrompt(prompt.id))
        .rejects.toThrow('Prompt with id \'' + prompt.id + '\' not found');
    });

    it('should return false for non-existent prompt', async () => {
      const deleted = await service.deletePrompt('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('applyTemplate', () => {
    it('should apply variables to template', async () => {
      const template = await service.createPrompt({
        name: 'Template Test',
        content: 'Hello {{name}}, welcome to {{place}}!',
        isTemplate: true,
      });

      const result = await service.applyTemplate({
        id: template.id,
        variables: { name: 'Alice', place: 'Wonderland' },
      });

      expect(result).toBe('Hello Alice, welcome to Wonderland!');
    });

    it('should throw error for non-template prompt', async () => {
      const prompt = await service.createPrompt({
        name: 'Regular Prompt',
        content: 'Hello {{name}}!',
        isTemplate: false,
      });

      await expect(service.applyTemplate({
        id: prompt.id,
        variables: { name: 'Alice' },
      })).rejects.toThrow('Prompt \'Regular Prompt\' is not a template');
    });

    it('should throw error for non-existent prompt', async () => {
      await expect(service.applyTemplate({
        id: 'non-existent-id',
        variables: { name: 'Alice' },
      })).rejects.toThrow('Prompt with id \'non-existent-id\' not found');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      await Promise.all([
        service.createPrompt({ name: 'Regular 1', content: 'Content 1', isTemplate: false, category: 'test' }),
        service.createPrompt({ name: 'Template 1', content: 'Content 2', isTemplate: true, category: 'test' }),
        service.createPrompt({ name: 'Regular 2', content: 'Content 3', isTemplate: false, category: 'prod' }),
        service.createPrompt({ name: 'Template 2', content: 'Content 4', isTemplate: true, category: 'prod' }),
      ]);

      const stats = await service.getStats();
      
      expect(stats.total).toBe(4);
      expect(stats.templates).toBe(2);
      expect(stats.regular).toBe(2);
      expect(stats.categories).toEqual({ test: 2, prod: 2 });
    });

    it('should handle empty repository', async () => {
      const stats = await service.getStats();
      
      expect(stats.total).toBe(0);
      expect(stats.templates).toBe(0);
      expect(stats.regular).toBe(0);
      expect(stats.categories).toEqual({});
      expect(stats.tags).toEqual({});
    });
  });

  describe('searchPrompts', () => {
    it('should search by name', async () => {
      await Promise.all([
        service.createPrompt({ name: 'Search Test 1', content: 'Content 1', isTemplate: false }),
        service.createPrompt({ name: 'Other Prompt', content: 'Content 2', isTemplate: false }),
        service.createPrompt({ name: 'Search Test 2', content: 'Content 3', isTemplate: false }),
      ]);

      const results = await service.searchPrompts('Search Test');
      expect(results).toHaveLength(2);
      expect(results.every(p => p.name.includes('Search Test'))).toBe(true);
    });

    it('should search by content', async () => {
      await Promise.all([
        service.createPrompt({ name: 'Prompt 1', content: 'Hello world', isTemplate: false }),
        service.createPrompt({ name: 'Prompt 2', content: 'Goodbye world', isTemplate: false }),
        service.createPrompt({ name: 'Prompt 3', content: 'Hello there', isTemplate: false }),
      ]);

      const results = await service.searchPrompts('Hello');
      expect(results).toHaveLength(2);
      expect(results.every(p => p.content.includes('Hello'))).toBe(true);
    });

    it('should search by tags', async () => {
      await Promise.all([
        service.createPrompt({ name: 'Prompt 1', content: 'Content 1', tags: ['important'], isTemplate: false }),
        service.createPrompt({ name: 'Prompt 2', content: 'Content 2', tags: ['urgent'], isTemplate: false }),
        service.createPrompt({ name: 'Prompt 3', content: 'Content 3', tags: ['important', 'urgent'], isTemplate: false }),
      ]);

      const results = await service.searchPrompts('important');
      expect(results).toHaveLength(2);
      expect(results.every(p => p.tags.includes('important'))).toBe(true);
    });

    it('should be case insensitive', async () => {
      await service.createPrompt({ name: 'HELLO WORLD', content: 'Content', isTemplate: false });

      const results = await service.searchPrompts('hello world');
      expect(results).toHaveLength(1);
    });
  });

  describe('healthCheck', () => {
    it('should return true when healthy', async () => {
      const healthy = await service.healthCheck();
      expect(healthy).toBe(true);
    });
  });
}); 