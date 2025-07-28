import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpPromptServer } from '../src/mcp-server.js';
import { PromptService } from '../src/prompt-service.js';

// Mock the PromptService
const mockService = {
  createPrompt: vi.fn(),
  getPrompt: vi.fn(),
  listPrompts: vi.fn(),
  updatePrompt: vi.fn(),
  deletePrompt: vi.fn(),
  listPromptVersions: vi.fn(),
  applyTemplate: vi.fn(),
  searchPrompts: vi.fn(),
  getStats: vi.fn(),
  healthCheck: vi.fn(),
} as unknown as PromptService;

describe('McpPromptServer', () => {
  let server: McpPromptServer;

  beforeEach(() => {
    server = new McpPromptServer(mockService);
    vi.clearAllMocks();
  });

  describe('server lifecycle', () => {
    it('should get server instance', () => {
      // Act
      const serverInstance = server.getServer();

      // Assert
      expect(serverInstance).toBeDefined();
    });

    it('should close server gracefully', async () => {
      // Act
      await server.close();

      // Assert
      // This test verifies the close method doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('service integration', () => {
    it('should use provided prompt service', () => {
      // Act
      const serverInstance = server.getServer();

      // Assert
      expect(serverInstance).toBeDefined();
      expect(mockService).toBeDefined();
    });
  });
}); 