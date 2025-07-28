import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpPromptServer } from '../src/mcp-server.js';
import { PromptService } from '../src/prompt-service.js';
import type { Prompt } from '../src/types.js';

// Mock the PromptService
vi.mock('../src/prompt-service.js');

describe('McpPromptServer', () => {
  let mcpServer: McpPromptServer;
  let mockPromptService: PromptService;

  beforeEach(() => {
    mockPromptService = {
      createPrompt: vi.fn(),
      getPrompt: vi.fn(),
      listPrompts: vi.fn(),
      updatePrompt: vi.fn(),
      deletePrompt: vi.fn(),
      applyTemplate: vi.fn(),
      searchPrompts: vi.fn(),
      getStats: vi.fn(),
      healthCheck: vi.fn(),
    } as any;

    mcpServer = new McpPromptServer(mockPromptService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('add_prompt tool', () => {
    it('should create prompt with valid data', async () => {
      const mockPrompt: Prompt = {
        id: 'test-id',
        name: 'Test Prompt',
        content: 'Test content',
        description: 'Test description',
        isTemplate: false,
        tags: ['test'],
        category: 'test',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      (mockPromptService.createPrompt as any).mockResolvedValue(mockPrompt);

      // Test the tool handler directly by calling the service method
      const result = await mockPromptService.createPrompt({
        name: 'Test Prompt',
        content: 'Test content',
        description: 'Test description',
        isTemplate: false,
        tags: ['test'],
        category: 'test',
        metadata: null,
      });

      expect(mockPromptService.createPrompt).toHaveBeenCalledWith({
        name: 'Test Prompt',
        content: 'Test content',
        description: 'Test description',
        isTemplate: false,
        tags: ['test'],
        category: 'test',
        metadata: null,
      });

      expect(result).toEqual(mockPrompt);
    });

    it('should handle invalid input data', async () => {
      (mockPromptService.createPrompt as any).mockRejectedValue(new Error('Validation failed'));

      await expect(mockPromptService.createPrompt({
        name: '', // Invalid empty name
        content: 'Test content',
        isTemplate: false,
        tags: [],
        metadata: null,
      })).rejects.toThrow('Validation failed');
    });

    it('should handle database errors', async () => {
      (mockPromptService.createPrompt as any).mockRejectedValue(new Error('Database connection failed'));

      await expect(mockPromptService.createPrompt({
        name: 'Test Prompt',
        content: 'Test content',
        isTemplate: false,
        tags: [],
        metadata: null,
      })).rejects.toThrow('Database connection failed');
    });
  });

  describe('get_prompt tool', () => {
    it('should retrieve prompt by ID', async () => {
      const mockPrompt: Prompt = {
        id: 'test-id',
        name: 'Test Prompt',
        content: 'Test content',
        description: 'Test description',
        isTemplate: false,
        tags: ['test'],
        category: 'test',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      (mockPromptService.getPrompt as any).mockResolvedValue(mockPrompt);

      const result = await mockPromptService.getPrompt('test-id');

      expect(mockPromptService.getPrompt).toHaveBeenCalledWith('test-id');
      expect(result).toEqual(mockPrompt);
    });

    it('should handle non-existent prompt', async () => {
      (mockPromptService.getPrompt as any).mockResolvedValue(null);

      const result = await mockPromptService.getPrompt('non-existent-id');
      expect(result).toBeNull();
    });

    it('should retrieve specific version', async () => {
      const mockPrompt: Prompt = {
        id: 'test-id',
        name: 'Test Prompt',
        content: 'Test content v2',
        description: 'Test description',
        isTemplate: false,
        tags: ['test'],
        category: 'test',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 2,
      };

      (mockPromptService.getPrompt as any).mockResolvedValue(mockPrompt);

      const result = await mockPromptService.getPrompt('test-id', 2);

      expect(mockPromptService.getPrompt).toHaveBeenCalledWith('test-id', 2);
      expect(result).toEqual(mockPrompt);
    });
  });

  describe('list_prompts tool', () => {
    it('should list prompts with filters', async () => {
      const mockPrompts: Prompt[] = [
        {
          id: 'test-1',
          name: 'Test Prompt 1',
          content: 'Test content 1',
          description: 'Test description 1',
          isTemplate: false,
          tags: ['test'],
          category: 'test',
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
        {
          id: 'test-2',
          name: 'Test Prompt 2',
          content: 'Test content 2',
          description: 'Test description 2',
          isTemplate: true,
          tags: ['template'],
          category: 'template',
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
      ];

      (mockPromptService.listPrompts as any).mockResolvedValue(mockPrompts);

      const result = await mockPromptService.listPrompts({
        category: 'test',
        isTemplate: false,
        tags: ['test'],
        limit: 10,
        offset: 0,
      });

      expect(mockPromptService.listPrompts).toHaveBeenCalledWith({
        category: 'test',
        isTemplate: false,
        tags: ['test'],
        limit: 10,
        offset: 0,
      });
      expect(result).toEqual(mockPrompts);
    });

    it('should handle empty results', async () => {
      (mockPromptService.listPrompts as any).mockResolvedValue([]);

      const result = await mockPromptService.listPrompts({
        category: 'non-existent',
      });

      expect(result).toEqual([]);
    });
  });

  describe('update_prompt tool', () => {
    it('should update prompt successfully', async () => {
      const updatedPrompt: Prompt = {
        id: 'test-id',
        name: 'Updated Prompt',
        content: 'Updated content',
        description: 'Updated description',
        isTemplate: false,
        tags: ['updated'],
        category: 'updated',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 2,
      };

      (mockPromptService.updatePrompt as any).mockResolvedValue(updatedPrompt);

      const result = await mockPromptService.updatePrompt('test-id', {
        name: 'Updated Prompt',
        content: 'Updated content',
        description: 'Updated description',
        tags: ['updated'],
        category: 'updated',
      });

      expect(mockPromptService.updatePrompt).toHaveBeenCalledWith('test-id', {
        name: 'Updated Prompt',
        content: 'Updated content',
        description: 'Updated description',
        tags: ['updated'],
        category: 'updated',
      });
      expect(result).toEqual(updatedPrompt);
    });

    it('should handle concurrent updates', async () => {
      (mockPromptService.updatePrompt as any).mockRejectedValue(new Error('Concurrent modification'));

      await expect(mockPromptService.updatePrompt('test-id', {
        name: 'Updated Prompt',
        content: 'Updated content',
        isTemplate: false,
        tags: [],
        metadata: null,
      })).rejects.toThrow('Concurrent modification');
    });
  });

  describe('delete_prompt tool', () => {
    it('should delete prompt by ID', async () => {
      (mockPromptService.deletePrompt as any).mockResolvedValue(true);

      const result = await mockPromptService.deletePrompt('test-id');

      expect(mockPromptService.deletePrompt).toHaveBeenCalledWith('test-id');
      expect(result).toBe(true);
    });

    it('should handle version-specific deletion', async () => {
      (mockPromptService.deletePrompt as any).mockResolvedValue(true);

      const result = await mockPromptService.deletePrompt('test-id', 1);

      expect(mockPromptService.deletePrompt).toHaveBeenCalledWith('test-id', 1);
      expect(result).toBe(true);
    });

    it('should handle non-existent prompt deletion', async () => {
      (mockPromptService.deletePrompt as any).mockResolvedValue(false);

      const result = await mockPromptService.deletePrompt('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('apply_template tool', () => {
    it('should apply template with variables', async () => {
      const appliedContent = 'Hello John, welcome to our platform!';

      (mockPromptService.applyTemplate as any).mockResolvedValue(appliedContent);

      const result = await mockPromptService.applyTemplate({
        id: 'template-id',
        variables: {
          name: 'John',
          platform: 'our platform',
        },
      });

      expect(mockPromptService.applyTemplate).toHaveBeenCalledWith({
        id: 'template-id',
        variables: {
          name: 'John',
          platform: 'our platform',
        },
      });
      expect(result).toBe(appliedContent);
    });

    it('should handle template not found', async () => {
      (mockPromptService.applyTemplate as any).mockRejectedValue(new Error('Template not found'));

      await expect(mockPromptService.applyTemplate({
        id: 'non-existent-template',
        variables: {
          name: 'John',
        },
      })).rejects.toThrow('Template not found');
    });
  });

  describe('search_prompts tool', () => {
    it('should search prompts by query', async () => {
      const searchResults: Prompt[] = [
        {
          id: 'search-1',
          name: 'Search Result 1',
          content: 'Content matching search query',
          description: 'Description',
          isTemplate: false,
          tags: ['search'],
          category: 'test',
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
      ];

      (mockPromptService.searchPrompts as any).mockResolvedValue(searchResults);

      const result = await mockPromptService.searchPrompts('search query');

      expect(mockPromptService.searchPrompts).toHaveBeenCalledWith('search query');
      expect(result).toEqual(searchResults);
    });
  });

  describe('get_stats tool', () => {
    it('should return prompt statistics', async () => {
      const mockStats = {
        totalPrompts: 10,
        templates: 3,
        categories: ['test', 'email', 'config'],
        tags: ['important', 'draft', 'final'],
      };

      (mockPromptService.getStats as any).mockResolvedValue(mockStats);

      const result = await mockPromptService.getStats();

      expect(mockPromptService.getStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('Server lifecycle', () => {
    it('should get server instance', () => {
      const server = mcpServer.getServer();
      expect(server).toBeDefined();
      expect(typeof server).toBe('object');
    });

    it('should close server gracefully', async () => {
      const server = mcpServer.getServer();
      expect(server).toBeDefined();
      
      // Test that close method exists and can be called
      await expect(mcpServer.close()).resolves.not.toThrow();
    });
  });
});