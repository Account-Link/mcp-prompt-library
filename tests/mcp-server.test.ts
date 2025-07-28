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
        variables: [],
        category: 'test',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      (mockPromptService.createPrompt as any).mockResolvedValue(mockPrompt);

      const server = mcpServer.getServer();
      const tools = server.getTools();
      const addPromptTool = tools.find(t => t.name === 'add_prompt');

      expect(addPromptTool).toBeDefined();

      const result = await addPromptTool!.handler({
        name: 'Test Prompt',
        content: 'Test content',
        description: 'Test description',
        tags: ['test'],
        category: 'test',
      });

      expect(mockPromptService.createPrompt).toHaveBeenCalledWith({
        name: 'Test Prompt',
        content: 'Test content',
        description: 'Test description',
        isTemplate: false,
        tags: ['test'],
        category: 'test',
        variables: [],
        metadata: null,
      });

      expect(result.content[0].text).toContain('Created prompt "Test Prompt"');
    });

    it('should handle invalid input data', async () => {
      (mockPromptService.createPrompt as any).mockRejectedValue(new Error('Validation failed'));

      const server = mcpServer.getServer();
      const tools = server.getTools();
      const addPromptTool = tools.find(t => t.name === 'add_prompt');

      const result = await addPromptTool!.handler({
        name: '', // Invalid empty name
        content: 'Test content',
      });

      expect(result.content[0].text).toContain('Error creating prompt');
    });

    it('should handle database errors', async () => {
      (mockPromptService.createPrompt as any).mockRejectedValue(new Error('Database connection failed'));

      const server = mcpServer.getServer();
      const tools = server.getTools();
      const addPromptTool = tools.find(t => t.name === 'add_prompt');

      const result = await addPromptTool!.handler({
        name: 'Test Prompt',
        content: 'Test content',
      });

      expect(result.content[0].text).toContain('Error creating prompt');
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
        variables: [],
        category: 'test',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      (mockPromptService.getPrompt as any).mockResolvedValue(mockPrompt);

      const server = mcpServer.getServer();
      const tools = server.getTools();
      const getPromptTool = tools.find(t => t.name === 'get_prompt');

      const result = await getPromptTool!.handler({
        id: 'test-id',
      });

      expect(mockPromptService.getPrompt).toHaveBeenCalledWith('test-id', undefined);
      expect(result.content[0].text).toContain('Test Prompt');
    });

    it('should handle non-existent prompt', async () => {
      (mockPromptService.getPrompt as any).mockResolvedValue(null);

      const server = mcpServer.getServer();
      const tools = server.getTools();
      const getPromptTool = tools.find(t => t.name === 'get_prompt');

      const result = await getPromptTool!.handler({
        id: 'non-existent-id',
      });

      expect(result.content[0].text).toContain('Error retrieving prompt');
    });

    it('should retrieve specific version', async () => {
      const mockPrompt: Prompt = {
        id: 'test-id',
        name: 'Test Prompt',
        content: 'Test content v2',
        description: 'Test description',
        isTemplate: false,
        tags: ['test'],
        variables: [],
        category: 'test',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 2,
      };

      (mockPromptService.getPrompt as any).mockResolvedValue(mockPrompt);

      const server = mcpServer.getServer();
      const tools = server.getTools();
      const getPromptTool = tools.find(t => t.name === 'get_prompt');

      const result = await getPromptTool!.handler({
        id: 'test-id',
        version: 2,
      });

      expect(mockPromptService.getPrompt).toHaveBeenCalledWith('test-id', 2);
      expect(result.content[0].text).toContain('Test Prompt');
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
          variables: [],
          category: 'test',
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
      ];

      (mockPromptService.listPrompts as any).mockResolvedValue(mockPrompts);

      const server = mcpServer.getServer();
      const tools = server.getTools();
      const listPromptsTool = tools.find(t => t.name === 'list_prompts');

      const result = await listPromptsTool!.handler({
        category: 'test',
        tags: ['test'],
        limit: 10,
        offset: 0,
      });

      expect(mockPromptService.listPrompts).toHaveBeenCalledWith({
        category: 'test',
        tags: ['test'],
        limit: 10,
        offset: 0,
      });

      expect(result.content[0].text).toContain('Test Prompt 1');
    });

    it('should handle empty results', async () => {
      (mockPromptService.listPrompts as any).mockResolvedValue([]);

      const server = mcpServer.getServer();
      const tools = server.getTools();
      const listPromptsTool = tools.find(t => t.name === 'list_prompts');

      const result = await listPromptsTool!.handler({
        category: 'non-existent',
      });

      expect(result.content[0].text).toContain('[]');
    });
  });

  describe('update_prompt tool', () => {
    it('should update prompt successfully', async () => {
      const mockPrompt: Prompt = {
        id: 'test-id',
        name: 'Updated Prompt',
        content: 'Updated content',
        description: 'Updated description',
        isTemplate: false,
        tags: ['updated'],
        variables: [],
        category: 'updated',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 2,
      };

      (mockPromptService.updatePrompt as any).mockResolvedValue(mockPrompt);

      const server = mcpServer.getServer();
      const tools = server.getTools();
      const updatePromptTool = tools.find(t => t.name === 'update_prompt');

      const result = await updatePromptTool!.handler({
        id: 'test-id',
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

      expect(result.content[0].text).toContain('Updated prompt "Updated Prompt"');
    });

    it('should handle concurrent updates', async () => {
      (mockPromptService.updatePrompt as any).mockRejectedValue(new Error('Concurrent modification'));

      const server = mcpServer.getServer();
      const tools = server.getTools();
      const updatePromptTool = tools.find(t => t.name === 'update_prompt');

      const result = await updatePromptTool!.handler({
        id: 'test-id',
        name: 'Updated Prompt',
        content: 'Updated content',
      });

      expect(result.content[0].text).toContain('Error updating prompt');
    });
  });

  describe('delete_prompt tool', () => {
    it('should delete prompt by ID', async () => {
      (mockPromptService.deletePrompt as any).mockResolvedValue(true);

      const server = mcpServer.getServer();
      const tools = server.getTools();
      const deletePromptTool = tools.find(t => t.name === 'delete_prompt');

      const result = await deletePromptTool!.handler({
        id: 'test-id',
      });

      expect(mockPromptService.deletePrompt).toHaveBeenCalledWith('test-id', undefined);
      expect(result.content[0].text).toContain('Deleted prompt');
    });

    it('should handle version-specific deletion', async () => {
      (mockPromptService.deletePrompt as any).mockResolvedValue(true);

      const server = mcpServer.getServer();
      const tools = server.getTools();
      const deletePromptTool = tools.find(t => t.name === 'delete_prompt');

      const result = await deletePromptTool!.handler({
        id: 'test-id',
        version: 2,
      });

      expect(mockPromptService.deletePrompt).toHaveBeenCalledWith('test-id', 2);
      expect(result.content[0].text).toContain('Deleted prompt');
    });

    it('should handle non-existent prompt deletion', async () => {
      (mockPromptService.deletePrompt as any).mockResolvedValue(false);

      const server = mcpServer.getServer();
      const tools = server.getTools();
      const deletePromptTool = tools.find(t => t.name === 'delete_prompt');

      const result = await deletePromptTool!.handler({
        id: 'non-existent-id',
      });

      expect(result.content[0].text).toContain('Prompt not found');
    });
  });

  describe('apply_template tool', () => {
    it('should apply template with variables', async () => {
      const mockResult = 'Hello John, welcome to our platform!';

      (mockPromptService.applyTemplate as any).mockResolvedValue(mockResult);

      const server = mcpServer.getServer();
      const tools = server.getTools();
      const applyTemplateTool = tools.find(t => t.name === 'apply_template');

      const result = await applyTemplateTool!.handler({
        id: 'template-id',
        variables: {
          name: 'John',
          platform: 'our platform',
        },
      });

      expect(mockPromptService.applyTemplate).toHaveBeenCalledWith('template-id', {
        name: 'John',
        platform: 'our platform',
      });

      expect(result.content[0].text).toContain(mockResult);
    });

    it('should handle template not found', async () => {
      (mockPromptService.applyTemplate as any).mockRejectedValue(new Error('Template not found'));

      const server = mcpServer.getServer();
      const tools = server.getTools();
      const applyTemplateTool = tools.find(t => t.name === 'apply_template');

      const result = await applyTemplateTool!.handler({
        id: 'non-existent-template',
        variables: { name: 'John' },
      });

      expect(result.content[0].text).toContain('Error applying template');
    });
  });

  describe('search_prompts tool', () => {
    it('should search prompts by query', async () => {
      const mockPrompts: Prompt[] = [
        {
          id: 'search-result',
          name: 'Search Result',
          content: 'Content matching search query',
          description: 'Description',
          isTemplate: false,
          tags: ['search'],
          variables: [],
          category: 'test',
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
      ];

      (mockPromptService.searchPrompts as any).mockResolvedValue(mockPrompts);

      const server = mcpServer.getServer();
      const tools = server.getTools();
      const searchPromptsTool = tools.find(t => t.name === 'search_prompts');

      const result = await searchPromptsTool!.handler({
        query: 'search query',
      });

      expect(mockPromptService.searchPrompts).toHaveBeenCalledWith('search query');
      expect(result.content[0].text).toContain('Search Result');
    });
  });

  describe('get_stats tool', () => {
    it('should return prompt statistics', async () => {
      const mockStats = {
        totalPrompts: 10,
        totalTemplates: 3,
        categories: ['test', 'production'],
        tags: ['important', 'draft'],
      };

      (mockPromptService.getStats as any).mockResolvedValue(mockStats);

      const server = mcpServer.getServer();
      const tools = server.getTools();
      const getStatsTool = tools.find(t => t.name === 'get_stats');

      const result = await getStatsTool!.handler({
        random_string: 'dummy',
      });

      expect(mockPromptService.getStats).toHaveBeenCalledWith('dummy');
      expect(result.content[0].text).toContain('10');
      expect(result.content[0].text).toContain('3');
    });
  });

  describe('Server lifecycle', () => {
    it('should get server instance', () => {
      const server = mcpServer.getServer();
      expect(server).toBeDefined();
      expect(server.getTools).toBeDefined();
    });

    it('should close server gracefully', async () => {
      const server = mcpServer.getServer();
      const closeSpy = vi.spyOn(server, 'close').mockResolvedValue();

      await mcpServer.close();

      expect(closeSpy).toHaveBeenCalled();
    });
  });
}); 
}); 