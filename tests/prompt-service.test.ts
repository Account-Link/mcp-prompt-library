import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptService } from '../src/prompt-service.js';
import { NotFoundError, ValidationError } from '../src/types.js';
import type { PromptRepository, CreatePromptArgs, Prompt } from '../src/types.js';

// Mock the repository
const mockRepository = {
  save: vi.fn(),
  getById: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  listVersions: vi.fn(),
  healthCheck: vi.fn(),
} as unknown as PromptRepository;

describe('PromptService', () => {
  let service: PromptService;

  beforeEach(() => {
    service = new PromptService(mockRepository);
    vi.clearAllMocks();
  });

  describe('createPrompt', () => {
    it('should create a prompt successfully', async () => {
      // Arrange
      const createData: CreatePromptArgs = { 
        name: 'test', 
        content: 'content',
        description: 'test description',
        isTemplate: false,
        tags: ['tag1'],
        category: 'test-category'
      };
      const expectedPrompt: Prompt = { 
        id: '123', 
        name: 'test',
        content: 'content',
        description: 'test description',
        isTemplate: false,
        tags: ['tag1'],
        variables: [],
        category: 'test-category',
        metadata: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      vi.mocked(mockRepository.save).mockResolvedValue(expectedPrompt);

      // Act
      const result = await service.createPrompt(createData);

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(createData);
      expect(result).toEqual(expectedPrompt);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const createData: CreatePromptArgs = { name: 'test', content: 'content' };
      vi.mocked(mockRepository.save).mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(service.createPrompt(createData)).rejects.toThrow('DB Error');
    });
  });

  describe('getPrompt', () => {
    it('should return prompt when found', async () => {
      // Arrange
      const expectedPrompt: Prompt = { 
        id: '123', 
        name: 'test',
        content: 'content',
        description: null,
        isTemplate: false,
        tags: [],
        variables: [],
        category: null,
        metadata: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      vi.mocked(mockRepository.getById).mockResolvedValue(expectedPrompt);

      // Act
      const result = await service.getPrompt('123');

      // Assert
      expect(result).toEqual(expectedPrompt);
      expect(mockRepository.getById).toHaveBeenCalledWith('123', undefined);
    });

    it('should throw NotFoundError when prompt not found', async () => {
      // Arrange
      vi.mocked(mockRepository.getById).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getPrompt('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should pass version parameter when provided', async () => {
      // Arrange
      const expectedPrompt: Prompt = { 
        id: '123', 
        name: 'test',
        content: 'content',
        description: null,
        isTemplate: false,
        tags: [],
        variables: [],
        category: null,
        metadata: null,
        version: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      vi.mocked(mockRepository.getById).mockResolvedValue(expectedPrompt);

      // Act
      const result = await service.getPrompt('123', 2);

      // Assert
      expect(result).toEqual(expectedPrompt);
      expect(mockRepository.getById).toHaveBeenCalledWith('123', 2);
    });
  });

  describe('listPrompts', () => {
    it('should list prompts with optional filtering', async () => {
      // Arrange
      const prompts: Prompt[] = [
        { 
          id: '123', 
          name: 'test1',
          content: 'content1',
          description: null,
          isTemplate: false,
          tags: [],
          variables: [],
          category: 'cat1',
          metadata: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        { 
          id: '456', 
          name: 'test2',
          content: 'content2',
          description: null,
          isTemplate: true,
          tags: ['tag1'],
          variables: ['var1'],
          category: 'cat2',
          metadata: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      vi.mocked(mockRepository.list).mockResolvedValue(prompts);

      // Act
      const result = await service.listPrompts({ category: 'cat1' });

      // Assert
      expect(result).toEqual(prompts);
      expect(mockRepository.list).toHaveBeenCalledWith({ category: 'cat1' });
    });

    it('should list all prompts when no options provided', async () => {
      // Arrange
      const prompts: Prompt[] = [];
      vi.mocked(mockRepository.list).mockResolvedValue(prompts);

      // Act
      const result = await service.listPrompts();

      // Assert
      expect(result).toEqual(prompts);
      expect(mockRepository.list).toHaveBeenCalledWith(undefined);
    });
  });

  describe('updatePrompt', () => {
    it('should update prompt successfully', async () => {
      // Arrange
      const updateData = { content: 'updated content' };
      const expectedPrompt: Prompt = { 
        id: '123', 
        name: 'test',
        content: 'updated content',
        description: null,
        isTemplate: false,
        tags: [],
        variables: [],
        category: null,
        metadata: null,
        version: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      vi.mocked(mockRepository.update).mockResolvedValue(expectedPrompt);

      // Act
      const result = await service.updatePrompt('123', updateData);

      // Assert
      expect(result).toEqual(expectedPrompt);
      expect(mockRepository.update).toHaveBeenCalledWith('123', updateData);
    });
  });

  describe('deletePrompt', () => {
    it('should delete prompt successfully', async () => {
      // Arrange
      vi.mocked(mockRepository.delete).mockResolvedValue(true);

      // Act
      const result = await service.deletePrompt('123');

      // Assert
      expect(result).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith('123', undefined);
    });

    it('should pass version parameter when provided', async () => {
      // Arrange
      vi.mocked(mockRepository.delete).mockResolvedValue(true);

      // Act
      const result = await service.deletePrompt('123', 2);

      // Assert
      expect(result).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith('123', 2);
    });
  });

  describe('listPromptVersions', () => {
    it('should list all versions of a prompt', async () => {
      // Arrange
      const versions = [1, 2, 3];
      vi.mocked(mockRepository.listVersions).mockResolvedValue(versions);

      // Act
      const result = await service.listPromptVersions('123');

      // Assert
      expect(result).toEqual(versions);
      expect(mockRepository.listVersions).toHaveBeenCalledWith('123');
    });
  });

  describe('applyTemplate', () => {
    it('should apply variables to template', async () => {
      // Arrange
      const templatePrompt: Prompt = { 
        id: '123', 
        name: 'template',
        content: 'Hello {{name}}!',
        description: null,
        isTemplate: true,
        tags: [],
        variables: ['name'],
        category: null,
        metadata: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const variables = { name: 'World' };
      vi.mocked(mockRepository.getById).mockResolvedValue(templatePrompt);

      // Act
      const result = await service.applyTemplate({ id: '123', variables });

      // Assert
      expect(result).toBe('Hello World!');
      expect(mockRepository.getById).toHaveBeenCalledWith('123', undefined);
    });

    it('should throw ValidationError for non-template prompts', async () => {
      // Arrange
      const regularPrompt: Prompt = { 
        id: '123', 
        name: 'regular',
        content: 'Hello',
        description: null,
        isTemplate: false,
        tags: [],
        variables: [],
        category: null,
        metadata: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      vi.mocked(mockRepository.getById).mockResolvedValue(regularPrompt);

      // Act & Assert
      await expect(service.applyTemplate({ id: '123', variables: {} }))
        .rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when template not found', async () => {
      // Arrange
      vi.mocked(mockRepository.getById).mockResolvedValue(null);

      // Act & Assert
      await expect(service.applyTemplate({ id: 'nonexistent', variables: {} }))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('searchPrompts', () => {
    it('should search by name, content, description, and tags', async () => {
      // Arrange
      const allPrompts: Prompt[] = [
        { 
          id: '123', 
          name: 'test prompt',
          content: 'test content',
          description: 'test description',
          isTemplate: false,
          tags: ['tag1'],
          variables: [],
          category: null,
          metadata: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        { 
          id: '456', 
          name: 'other prompt',
          content: 'other content',
          description: 'other description',
          isTemplate: false,
          tags: ['tag2'],
          variables: [],
          category: null,
          metadata: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      vi.mocked(mockRepository.list).mockResolvedValue(allPrompts);

      // Act
      const results = await service.searchPrompts('test');

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('test prompt');
    });

    it('should return empty array when no matches found', async () => {
      // Arrange
      const allPrompts: Prompt[] = [
        { 
          id: '123', 
          name: 'other',
          content: 'other',
          description: 'other',
          isTemplate: false,
          tags: ['other'],
          variables: [],
          category: null,
          metadata: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      vi.mocked(mockRepository.list).mockResolvedValue(allPrompts);

      // Act
      const results = await service.searchPrompts('nonexistent');

      // Assert
      expect(results).toHaveLength(0);
    });

    it('should be case insensitive', async () => {
      // Arrange
      const allPrompts: Prompt[] = [
        { 
          id: '123', 
          name: 'Test Prompt',
          content: 'Test Content',
          description: 'Test Description',
          isTemplate: false,
          tags: ['TestTag'],
          variables: [],
          category: null,
          metadata: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      vi.mocked(mockRepository.list).mockResolvedValue(allPrompts);

      // Act
      const results = await service.searchPrompts('test');

      // Assert
      expect(results).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should calculate correct statistics', async () => {
      // Arrange
      const prompts: Prompt[] = [
        { 
          id: '123', 
          name: 'template1',
          content: 'content',
          description: null,
          isTemplate: true,
          tags: ['tag1'],
          variables: ['var1'],
          category: 'cat1',
          metadata: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        { 
          id: '456', 
          name: 'regular1',
          content: 'content',
          description: null,
          isTemplate: false,
          tags: ['tag1', 'tag2'],
          variables: [],
          category: 'cat1',
          metadata: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        { 
          id: '789', 
          name: 'regular2',
          content: 'content',
          description: null,
          isTemplate: false,
          tags: ['tag2'],
          variables: [],
          category: 'cat2',
          metadata: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      vi.mocked(mockRepository.list).mockResolvedValue(prompts);

      // Act
      const stats = await service.getStats();

      // Assert
      expect(stats.total).toBe(3);
      expect(stats.templates).toBe(1);
      expect(stats.regular).toBe(2);
      expect(stats.categories.cat1).toBe(2);
      expect(stats.categories.cat2).toBe(1);
      expect(stats.tags.tag1).toBe(2);
      expect(stats.tags.tag2).toBe(2);
    });

    it('should handle empty prompt list', async () => {
      // Arrange
      vi.mocked(mockRepository.list).mockResolvedValue([]);

      // Act
      const stats = await service.getStats();

      // Assert
      expect(stats.total).toBe(0);
      expect(stats.templates).toBe(0);
      expect(stats.regular).toBe(0);
      expect(stats.categories).toEqual({});
      expect(stats.tags).toEqual({});
    });
  });

  describe('healthCheck', () => {
    it('should return repository health check result', async () => {
      // Arrange
      vi.mocked(mockRepository.healthCheck).mockResolvedValue(true);

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result).toBe(true);
      expect(mockRepository.healthCheck).toHaveBeenCalled();
    });

    it('should return false when repository is unhealthy', async () => {
      // Arrange
      vi.mocked(mockRepository.healthCheck).mockResolvedValue(false);

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result).toBe(false);
    });
  });
}); 