import * as fsp from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import lockfile from 'proper-lockfile';
import { z } from 'zod';
import {
  Prompt,
  PromptRepository,
  CreatePromptArgs,
  UpdatePromptArgs,
  ListPromptsArgs,
  StorageError,
  NotFoundError,
  createPromptSchema,
  updatePromptSchema,
  promptSchema,
} from './types.js';
import { defaultTemplateEngine } from './template-engine.js';

// Index schema for fast metadata lookup
const indexEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  isTemplate: z.boolean(),
  tags: z.array(z.string()),
  category: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});

const indexSchema = z.record(z.string(), indexEntrySchema);

export class FilePromptRepository implements PromptRepository {
  private promptsDir: string;
  private indexPath: string;
  private connected = false;

  constructor(options: { promptsDir: string }) {
    this.promptsDir = options.promptsDir;
    this.indexPath = path.join(this.promptsDir, 'index.json');
  }

  async connect(): Promise<void> {
    try {
      await fsp.mkdir(this.promptsDir, { recursive: true });
      await this.ensureIndexExists();
      this.connected = true;
    } catch (error) {
      throw new StorageError(`Failed to connect to storage: ${error}`, error as Error);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async isConnected(): Promise<boolean> {
    return this.connected;
  }

  async save(promptData: CreatePromptArgs): Promise<Prompt> {
    await this.ensureConnected();
    
    // Validate input
    const validated = createPromptSchema.parse(promptData);
    
    // Extract variables if it's a template
    if (validated.isTemplate) {
      validated.variables = defaultTemplateEngine.extractVariables(validated.content);
    }
    
    // Generate prompt ID and metadata
    const id = this.generateId(validated.name);
    const now = new Date();
    const version = 1;
    
    const prompt: Prompt = {
      id,
      name: validated.name,
      content: validated.content,
      isTemplate: validated.isTemplate,
      variables: validated.variables,
      tags: validated.tags,
      createdAt: now,
      updatedAt: now,
      version,
      ...(validated.description !== undefined && { description: validated.description }),
      ...(validated.category !== undefined && { category: validated.category }),
      ...(validated.metadata !== undefined && { metadata: validated.metadata }),
    };

    // Validate complete prompt
    promptSchema.parse(prompt);

    return await this.withLock(this.indexPath, async () => {
      // Save prompt file
      const promptPath = this.getPromptPath(id, 1);
      await this.atomicWriteFile(promptPath, JSON.stringify(prompt, null, 2));
      
      // Update index
      await this.updateIndex(prompt);
      
      return prompt;
    });
  }

  async getById(id: string, version?: number): Promise<Prompt | null> {
    await this.ensureConnected();
    
    if (!version) {
      // Get latest version from index
      const index = await this.readIndex();
      const entry = index[id];
      if (!entry) return null;
      version = entry.version;
    }

    try {
      const promptPath = this.getPromptPath(id, version!);
      const content = await fsp.readFile(promptPath, 'utf-8');
      const prompt = JSON.parse(content);
      
      // Validate and convert dates
      const validated = promptSchema.parse({
        ...prompt,
        createdAt: new Date(prompt.createdAt),
        updatedAt: new Date(prompt.updatedAt),
      });
      
      return validated as Prompt;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      throw new StorageError(`Failed to read prompt ${id}: ${error}`, error as Error);
    }
  }

  async list(options?: ListPromptsArgs): Promise<Prompt[]> {
    await this.ensureConnected();
    
    const index = await this.readIndex();
    let prompts = Object.values(index);

    // Apply filters
    if (options?.category) {
      prompts = prompts.filter(p => p.category === options.category);
    }
    
    if (options?.isTemplate !== undefined) {
      prompts = prompts.filter(p => p.isTemplate === options.isTemplate);
    }
    
    if (options?.tags && options.tags.length > 0) {
      prompts = prompts.filter(p => 
        options.tags!.some(tag => p.tags.includes(tag))
      );
    }

    // Apply pagination
    if (options?.offset) {
      prompts = prompts.slice(options.offset);
    }
    
    if (options?.limit) {
      prompts = prompts.slice(0, options.limit);
    }

    // Load full prompt data
    const fullPrompts: Prompt[] = [];
    for (const entry of prompts) {
      const prompt = await this.getById(entry.id, entry.version);
      if (prompt) {
        fullPrompts.push(prompt);
      }
    }

    return fullPrompts;
  }

  async update(id: string, updates: UpdatePromptArgs): Promise<Prompt> {
    await this.ensureConnected();
    
    // Validate updates
    const validated = updatePromptSchema.parse(updates);
    
    // Get current prompt
    const current = await this.getById(id);
    if (!current) {
      throw new NotFoundError('Prompt', id);
    }

    // Extract variables if updating to template or updating content
    if (validated.isTemplate && validated.content) {
      validated.variables = defaultTemplateEngine.extractVariables(validated.content);
    } else if (validated.isTemplate === false) {
      validated.variables = [];
    } else if (validated.content && current.isTemplate) {
      validated.variables = defaultTemplateEngine.extractVariables(validated.content);
    }

    // Create updated prompt
    const updated: Prompt = {
      id: current.id,
      name: validated.name ?? current.name,
      content: validated.content ?? current.content,
      isTemplate: validated.isTemplate ?? current.isTemplate,
      variables: validated.variables ?? current.variables,
      tags: validated.tags ?? current.tags,
      createdAt: current.createdAt,
      updatedAt: new Date(),
      version: current.version + 1,
    };

    // Add optional properties only if they exist
    if (validated.description !== undefined) {
      updated.description = validated.description;
    } else if (current.description !== undefined) {
      updated.description = current.description;
    }
    
    if (validated.category !== undefined) {
      updated.category = validated.category;
    } else if (current.category !== undefined) {
      updated.category = current.category;
    }
    
    if (validated.metadata !== undefined) {
      updated.metadata = validated.metadata;
    } else if (current.metadata !== undefined) {
      updated.metadata = current.metadata;
    }

    // Validate complete prompt
    promptSchema.parse(updated);

    return await this.withLock(this.indexPath, async () => {
      // Save new version
      const promptPath = this.getPromptPath(id, updated.version);
      await this.atomicWriteFile(promptPath, JSON.stringify(updated, null, 2));
      
      // Update index
      await this.updateIndex(updated);
      
      return updated;
    });
  }

  async delete(id: string, version?: number): Promise<boolean> {
    await this.ensureConnected();
    
    const current = await this.getById(id);
    if (!current) {
      return false;
    }

    const targetVersion = version || current.version;

    return await this.withLock(this.indexPath, async () => {
      try {
        // Delete prompt file
        const promptPath = this.getPromptPath(id, targetVersion);
        await fsp.unlink(promptPath);
        
        // Update index (remove entry if deleting latest version)
        if (targetVersion === current.version) {
          await this.removeFromIndex(id);
        }
        
        return true;
      } catch (error) {
        if ((error as any).code === 'ENOENT') {
          return false;
        }
        throw new StorageError(`Failed to delete prompt ${id}: ${error}`, error as Error);
      }
    });
  }

  async listVersions(id: string): Promise<number[]> {
    await this.ensureConnected();
    
    try {
      const sanitizedId = this.sanitizePathComponent(id);
      const promptDir = path.join(this.promptsDir, sanitizedId);
      const files = await fsp.readdir(promptDir);
      
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => parseInt(file.replace('.json', ''), 10))
        .filter(version => !isNaN(version))
        .sort((a, b) => a - b);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return [];
      }
      throw new StorageError(`Failed to list versions for prompt ${id}: ${error}`, error as Error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureConnected();
      await this.readIndex();
      return true;
    } catch {
      return false;
    }
  }

  // Private helper methods

  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      throw new StorageError('Repository not connected');
    }
  }

  private async ensureIndexExists(): Promise<void> {
    try {
      await fsp.access(this.indexPath);
    } catch {
      await this.atomicWriteFile(this.indexPath, '{}');
    }
  }

  private async readIndex(): Promise<Record<string, any>> {
    try {
      const content = await fsp.readFile(this.indexPath, 'utf-8');
      const index = JSON.parse(content);
      return indexSchema.parse(index);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return {};
      }
      throw new StorageError(`Failed to read index: ${error}`, error as Error);
    }
  }

  private async updateIndex(prompt: Prompt): Promise<void> {
    const index = await this.readIndex();
    index[prompt.id] = {
      id: prompt.id,
      name: prompt.name,
      description: prompt.description,
      isTemplate: prompt.isTemplate,
      tags: prompt.tags,
      category: prompt.category,
      createdAt: prompt.createdAt.toISOString(),
      updatedAt: prompt.updatedAt.toISOString(),
      version: prompt.version,
    };
    await this.atomicWriteFile(this.indexPath, JSON.stringify(index, null, 2));
  }

  private async removeFromIndex(id: string): Promise<void> {
    const index = await this.readIndex();
    delete index[id];
    await this.atomicWriteFile(this.indexPath, JSON.stringify(index, null, 2));
  }

  private async atomicWriteFile(filePath: string, data: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fsp.mkdir(dir, { recursive: true });
    
    const tempFile = path.join(dir, `${path.basename(filePath)}.${randomUUID()}.tmp`);
    
    try {
      await fsp.writeFile(tempFile, data);
      const fd = await fsp.open(tempFile, 'r+');
      await fd.sync();
      await fd.close();
      await fsp.rename(tempFile, filePath);
    } catch (error) {
      // Clean up temp file on error
      try {
        await fsp.unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  private async withLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
    let release;
    try {
      release = await lockfile.lock(filePath, {
        realpath: false,
        retries: 3,
        stale: 20000,
      });
      return await fn();
    } catch (error) {
      throw new StorageError(`Failed to acquire lock: ${error}`, error as Error);
    } finally {
      if (release) {
        await release();
      }
    }
  }

  private sanitizePathComponent(component: string): string {
    // Remove any path traversal sequences and dangerous characters
    return component
      .replace(/[<>:"|?*\x00-\x1f]/g, '') // Remove invalid filename characters
      .replace(/\.\./g, '') // Remove directory traversal
      .replace(/^[\/\\]+/, '') // Remove leading slashes
      .replace(/[\/\\]+$/, '') // Remove trailing slashes
      .replace(/[\/\\]+/g, '-') // Replace path separators with hyphens
      .substring(0, 100); // Limit length
  }

  private getPromptPath(id: string, version: number): string {
    const sanitizedId = this.sanitizePathComponent(id);
    const sanitizedVersion = this.sanitizePathComponent(version.toString());
    return path.join(this.promptsDir, sanitizedId, `${sanitizedVersion}.json`);
  }

  private generateId(name: string): string {
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return `${sanitized}-${randomUUID().slice(0, 8)}`;
  }
} 