import {
  Prompt,
  PromptRepository,
  TemplateEngine,
  CreatePromptArgs,
  UpdatePromptArgs,
  ListPromptsArgs,
  ApplyTemplateArgs,
  NotFoundError,
  ValidationError,
} from './types.js';
import { defaultTemplateEngine } from './template-engine.js';

export class PromptService {
  constructor(
    private repository: PromptRepository,
    private templateEngine: TemplateEngine = defaultTemplateEngine
  ) {}

  /**
   * Create a new prompt
   */
  async createPrompt(data: CreatePromptArgs): Promise<Prompt> {
    return await this.repository.save(data);
  }

  /**
   * Get a prompt by ID
   */
  async getPrompt(id: string, version?: number): Promise<Prompt> {
    const prompt = await this.repository.getById(id, version);
    if (!prompt) {
      throw new NotFoundError('Prompt', id);
    }
    return prompt;
  }

  /**
   * List prompts with optional filtering
   */
  async listPrompts(options?: ListPromptsArgs): Promise<Prompt[]> {
    return await this.repository.list(options);
  }

  /**
   * Update a prompt
   */
  async updatePrompt(id: string, updates: UpdatePromptArgs): Promise<Prompt> {
    return await this.repository.update(id, updates);
  }

  /**
   * Delete a prompt
   */
  async deletePrompt(id: string, version?: number): Promise<boolean> {
    return await this.repository.delete(id, version);
  }

  /**
   * List all versions of a prompt
   */
  async listPromptVersions(id: string): Promise<number[]> {
    return await this.repository.listVersions(id);
  }

  /**
   * Apply variables to a template prompt
   */
  async applyTemplate(args: ApplyTemplateArgs): Promise<string> {
    const prompt = await this.getPrompt(args.id);
    
    if (!prompt.isTemplate) {
      throw new ValidationError(`Prompt '${prompt.name}' is not a template`);
    }

    return this.templateEngine.applyTemplateWithValidation(
      prompt.content,
      args.variables
    );
  }

  /**
   * Get prompt statistics
   */
  async getStats(): Promise<{
    total: number;
    templates: number;
    regular: number;
    categories: Record<string, number>;
    tags: Record<string, number>;
  }> {
    const allPrompts = await this.repository.list();
    
    const stats = {
      total: allPrompts.length,
      templates: allPrompts.filter(p => p.isTemplate).length,
      regular: allPrompts.filter(p => !p.isTemplate).length,
      categories: {} as Record<string, number>,
      tags: {} as Record<string, number>,
    };

    // Count categories
    for (const prompt of allPrompts) {
      if (prompt.category) {
        stats.categories[prompt.category] = (stats.categories[prompt.category] || 0) + 1;
      }
      
      for (const tag of prompt.tags) {
        stats.tags[tag] = (stats.tags[tag] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Search prompts by content
   */
  async searchPrompts(query: string): Promise<Prompt[]> {
    const allPrompts = await this.repository.list();
    
    const searchTerm = query.toLowerCase();
    return allPrompts.filter(prompt => 
      prompt.name.toLowerCase().includes(searchTerm) ||
      prompt.content.toLowerCase().includes(searchTerm) ||
      prompt.description?.toLowerCase().includes(searchTerm) ||
      prompt.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return await this.repository.healthCheck();
  }
} 