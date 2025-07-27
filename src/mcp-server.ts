import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PromptService } from './prompt-service.js';

export class McpPromptServer {
  private server: McpServer;
  private promptService: PromptService;

  constructor(promptService: PromptService) {
    this.promptService = promptService;
    
    this.server = new McpServer({
      name: 'mcp-prompt-mgmt',
      version: '1.0.0',
    });

    this.registerTools();
    this.registerResources();
  }

  private registerTools(): void {
    // Add a new prompt
    this.server.registerTool(
      'add_prompt',
      {
        title: 'Add Prompt',
        description: 'Create a new prompt or template',
        inputSchema: {
          name: z.string().describe('Name of the prompt'),
          content: z.string().describe('Content of the prompt'),
          description: z.string().optional().describe('Optional description'),
          isTemplate: z.boolean().optional().describe('Whether this is a template'),
          tags: z.array(z.string()).optional().describe('Tags for categorization'),
          category: z.string().optional().describe('Category for organization'),
        },
      },
      async ({ name, content, description, isTemplate = false, tags = [], category }) => {
        try {
          const prompt = await this.promptService.createPrompt({
            name,
            content,
            description,
            isTemplate,
            tags,
            category,
            variables: [],
          });

          return {
            content: [
              {
                type: 'text',
                text: `Created prompt "${prompt.name}" with ID: ${prompt.id}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating prompt: ${error}`,
              },
            ],
          };
        }
      }
    );

    // Get a prompt by ID
    this.server.registerTool(
      'get_prompt',
      {
        title: 'Get Prompt',
        description: 'Retrieve a prompt by its ID',
        inputSchema: {
          id: z.string().describe('ID of the prompt to retrieve'),
          version: z.number().optional().describe('Specific version (optional)'),
        },
      },
      async ({ id, version }) => {
        try {
          const prompt = await this.promptService.getPrompt(id, version);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(prompt, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error retrieving prompt: ${error}`,
              },
            ],
          };
        }
      }
    );

    // List prompts
    this.server.registerTool(
      'list_prompts',
      {
        title: 'List Prompts',
        description: 'List all prompts with optional filtering',
        inputSchema: {
          category: z.string().optional().describe('Filter by category'),
          isTemplate: z.boolean().optional().describe('Filter by template status'),
          tags: z.array(z.string()).optional().describe('Filter by tags'),
          limit: z.number().optional().describe('Maximum number of results'),
          offset: z.number().optional().describe('Number of results to skip'),
        },
      },
      async (options) => {
        try {
          const prompts = await this.promptService.listPrompts(options);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(prompts, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error listing prompts: ${error}`,
              },
            ],
          };
        }
      }
    );

    // Update a prompt
    this.server.registerTool(
      'update_prompt',
      {
        title: 'Update Prompt',
        description: 'Update an existing prompt',
        inputSchema: {
          id: z.string().describe('ID of the prompt to update'),
          name: z.string().optional().describe('New name'),
          content: z.string().optional().describe('New content'),
          description: z.string().optional().describe('New description'),
          isTemplate: z.boolean().optional().describe('New template status'),
          tags: z.array(z.string()).optional().describe('New tags'),
          category: z.string().optional().describe('New category'),
        },
      },
      async ({ id, ...updates }) => {
        try {
          const prompt = await this.promptService.updatePrompt(id, updates);
          return {
            content: [
              {
                type: 'text',
                text: `Updated prompt "${prompt.name}" (version ${prompt.version})`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error updating prompt: ${error}`,
              },
            ],
          };
        }
      }
    );

    // Delete a prompt
    this.server.registerTool(
      'delete_prompt',
      {
        title: 'Delete Prompt',
        description: 'Delete a prompt by its ID',
        inputSchema: {
          id: z.string().describe('ID of the prompt to delete'),
          version: z.number().optional().describe('Specific version to delete (optional)'),
        },
      },
      async ({ id, version }) => {
        try {
          const deleted = await this.promptService.deletePrompt(id, version);
          if (deleted) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Deleted prompt with ID: ${id}`,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `Prompt with ID ${id} not found`,
                },
              ],
            };
          }
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error deleting prompt: ${error}`,
              },
            ],
          };
        }
      }
    );

    // Apply template
    this.server.registerTool(
      'apply_template',
      {
        title: 'Apply Template',
        description: 'Apply variables to a template prompt',
        inputSchema: {
          id: z.string().describe('ID of the template prompt'),
          variables: z.record(z.string()).describe('Variables to substitute'),
        },
      },
      async ({ id, variables }) => {
        try {
          const result = await this.promptService.applyTemplate({ id, variables });
          return {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error applying template: ${error}`,
              },
            ],
          };
        }
      }
    );

    // Search prompts
    this.server.registerTool(
      'search_prompts',
      {
        title: 'Search Prompts',
        description: 'Search prompts by content, name, or tags',
        inputSchema: {
          query: z.string().describe('Search query'),
        },
      },
      async ({ query }) => {
        try {
          const prompts = await this.promptService.searchPrompts(query);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(prompts, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error searching prompts: ${error}`,
              },
            ],
          };
        }
      }
    );

    // Get statistics
    this.server.registerTool(
      'get_stats',
      {
        title: 'Get Statistics',
        description: 'Get statistics about stored prompts',
        inputSchema: {},
      },
      async () => {
        try {
          const stats = await this.promptService.getStats();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(stats, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting statistics: ${error}`,
              },
            ],
          };
        }
      }
    );
  }

  private registerResources(): void {
    // List of all prompts
    this.server.registerResource(
      'prompts',
      'prompts',
      {
        title: 'All Prompts',
        description: 'List of all stored prompts',
      },
      async () => {
        try {
          const prompts = await this.promptService.listPrompts();
          return {
            contents: [
              {
                uri: 'prompts',
                mimeType: 'application/json',
                text: JSON.stringify(prompts, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            contents: [
              {
                uri: 'prompts',
                mimeType: 'text/plain',
                text: `Error loading prompts: ${error}`,
              },
            ],
          };
        }
      }
    );

    // Individual prompt resource
    this.server.registerResource(
      'prompt/{id}',
      'prompt/{id}',
      {
        title: 'Prompt Details',
        description: 'Details of a specific prompt',
      },
      async (uri: URL) => {
        try {
          const id = uri.pathname.split('/').pop()!;
          const prompt = await this.promptService.getPrompt(id);
          return {
            contents: [
              {
                uri: uri.toString(),
                mimeType: 'application/json',
                text: JSON.stringify(prompt, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            contents: [
              {
                uri: uri.toString(),
                mimeType: 'text/plain',
                text: `Error loading prompt: ${error}`,
              },
            ],
          };
        }
      }
    );
  }

  /**
   * Get the MCP server instance
   */
  getServer(): McpServer {
    return this.server;
  }

  /**
   * Close the server
   */
  async close(): Promise<void> {
    await this.server.close();
  }
} 