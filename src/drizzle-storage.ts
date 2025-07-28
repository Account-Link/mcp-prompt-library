import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, desc, asc, inArray, sql } from 'drizzle-orm';
import {
  prompts,
  promptVersions,
  tags,
  promptTags,
  promptVariables,
  insertPromptSchema,
} from './schema.js';
import type { PromptRepository, CreatePromptArgs, UpdatePromptArgs, ListPromptsArgs, Prompt } from './types.js';

export interface PostgresConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}

export class DrizzlePromptRepository implements PromptRepository {
  private db: ReturnType<typeof drizzle>;
  private client: postgres.Sql;
  private connected = false;

  constructor(config: PostgresConfig) {
    if (config.connectionString) {
      this.client = postgres(config.connectionString);
    } else {
      const { host = 'localhost', port = 5433, database = 'mcp_prompts', user = 'mcp_user', password = 'mcp_password_123' } = config;
      this.client = postgres(`postgresql://${user}:${password}@${host}:${port}/${database}`);
    }
    this.db = drizzle(this.client);
  }

  async connect(): Promise<void> {
    try {
      // Test the connection
      await this.client`SELECT 1`;
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.end();
      this.connected = false;
    } catch (error) {
      throw new Error(`Failed to disconnect from database: ${error}`);
    }
  }

  async isConnected(): Promise<boolean> {
    return this.connected;
  }

  async save(data: CreatePromptArgs): Promise<Prompt> {
    const now = new Date();
    
    // Validate input data
    const validatedData = insertPromptSchema.parse({
      ...data,
      createdAt: now,
      updatedAt: now,
    });

    // Use transaction for atomic operations
    const result = await this.db.transaction(async (tx) => {
      // Insert main prompt
      const [prompt] = await tx.insert(prompts).values(validatedData).returning();
      
      // Insert version record
      await tx.insert(promptVersions).values({
        id: prompt.id,
        version: prompt.version,
        name: prompt.name,
        content: prompt.content,
        description: prompt.description,
        isTemplate: prompt.isTemplate,
        category: prompt.category,
        metadata: prompt.metadata,
        createdAt: prompt.createdAt,
        updatedAt: prompt.updatedAt,
      });

      // Handle tags if provided
      if (data.tags && data.tags.length > 0) {
        await this.saveTags(tx, prompt.id, data.tags);
      }

      // Handle variables if provided
      if (data.variables && data.variables.length > 0) {
        await this.saveVariables(tx, prompt.id, data.variables);
      }

      // Return complete prompt with tags and variables
      return await this.getByIdInternal(this.db, prompt.id);
    });

    if (!result) {
      throw new Error('Failed to create prompt');
    }

    return result;
  }

  async getById(id: string, version?: number): Promise<Prompt | null> {
    if (version) {
      // Get specific version
      const [result] = await this.db
        .select()
        .from(promptVersions)
        .where(and(eq(promptVersions.id, id), eq(promptVersions.version, version)))
        .limit(1);
      
      if (!result) return null;

      // Get tags and variables for this version
      const tags = await this.getTagsForPrompt(id);
      const variables = await this.getVariablesForPrompt(id);

      return {
        id: result.id,
        name: result.name,
        content: result.content,
        description: result.description,
        isTemplate: result.isTemplate,
        tags,
        variables,
        category: result.category,
        metadata: result.metadata as Record<string, unknown> | null,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        version: result.version,
      };
    } else {
      // Get latest version
      return await this.getByIdInternal(this.db, id);
    }
  }

  private async getByIdInternal(db: ReturnType<typeof drizzle>, id: string): Promise<Prompt | null> {
    const [result] = await db
      .select()
      .from(prompts)
      .where(eq(prompts.id, id))
      .limit(1);

    if (!result) return null;

    // Get tags and variables
    const tags = await this.getTagsForPrompt(id);
    const variables = await this.getVariablesForPrompt(id);

    return {
      id: result.id,
      name: result.name,
      content: result.content,
      description: result.description,
      isTemplate: result.isTemplate,
      tags,
      variables,
      category: result.category,
      metadata: result.metadata as Record<string, unknown> | null,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      version: result.version,
    };
  }

  async list(options?: ListPromptsArgs): Promise<Prompt[]> {
    const { category, isTemplate, tags: tagFilter, limit = 50, offset = 0 } = options || {};

    let query = this.db.select().from(prompts);
    const conditions = [];

    if (category) {
      conditions.push(eq(prompts.category, category));
    }
    
    if (isTemplate !== undefined) {
      conditions.push(eq(prompts.isTemplate, isTemplate));
    }

    if (tagFilter && tagFilter.length > 0) {
      // Filter by tags using subquery
      const tagIds = await this.getTagIds(tagFilter);
      if (tagIds.length > 0) {
        const promptIds = await this.db
          .select({ promptId: promptTags.promptId })
          .from(promptTags)
          .where(inArray(promptTags.tagId, tagIds))
          .groupBy(promptTags.promptId)
          .having(sql`COUNT(*) = ${tagFilter.length}`);
        
        if (promptIds.length > 0) {
          conditions.push(inArray(prompts.id, promptIds.map(p => p.promptId)));
        }
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = (query.limit(limit).offset(offset).orderBy(desc(prompts.updatedAt))) as any;
    const results = await query;

    // Load tags and variables for all prompts
    const promptsWithRelations = await Promise.all(
      results.map(async (prompt) => {
        const tags = await this.getTagsForPrompt(prompt.id);
        const variables = await this.getVariablesForPrompt(prompt.id);

        return {
          id: prompt.id,
          name: prompt.name,
          content: prompt.content,
          description: prompt.description,
          isTemplate: prompt.isTemplate,
          tags,
          variables,
          category: prompt.category,
          metadata: prompt.metadata as Record<string, unknown> | null,
          createdAt: prompt.createdAt,
          updatedAt: prompt.updatedAt,
          version: prompt.version,
        };
      })
    );

    return promptsWithRelations;
  }

  async update(id: string, data: UpdatePromptArgs): Promise<Prompt> {
    const now = new Date();
    
    return await this.db.transaction(async (tx) => {
      // Get current prompt
      const [current] = await tx
        .select()
        .from(prompts)
        .where(eq(prompts.id, id))
        .limit(1);

      if (!current) {
        throw new Error(`Prompt with id ${id} not found`);
      }

      // Prepare update data
      const updateData = {
        ...data,
        updatedAt: now,
        version: current.version + 1,
      };

      // Validate update data
      const validatedData = insertPromptSchema.parse(updateData);

      // Update main prompt
      const [updated] = await tx
        .update(prompts)
        .set(validatedData)
        .where(eq(prompts.id, id))
        .returning();

      // Save version record
      await tx.insert(promptVersions).values({
        id: updated.id,
        version: updated.version,
        name: updated.name,
        content: updated.content,
        description: updated.description,
        isTemplate: updated.isTemplate,
        category: updated.category,
        metadata: updated.metadata,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });

      // Handle tags if provided
      if (data.tags !== undefined) {
        // Delete existing tags
        await tx.delete(promptTags).where(eq(promptTags.promptId, id));
        // Insert new tags
        if (data.tags.length > 0) {
          await this.saveTags(tx, id, data.tags);
        }
      }

      // Handle variables if provided
      if (data.variables !== undefined) {
        // Delete existing variables
        await tx.delete(promptVariables).where(eq(promptVariables.promptId, id));
        // Insert new variables
        if (data.variables.length > 0) {
          await this.saveVariables(tx, id, data.variables);
        }
      }

      const result = await this.getByIdInternal(tx as any, id);
      if (!result) {
        throw new Error('Failed to update prompt');
      }
      return result;
    });
  }

  async delete(id: string, version?: number): Promise<boolean> {
    if (version) {
      // Delete specific version
      const result = await this.db
        .delete(promptVersions)
        .where(and(eq(promptVersions.id, id), eq(promptVersions.version, version)));
      return result.length > 0;
    } else {
      // Delete all versions and related data
      await this.db.transaction(async (tx) => {
        await tx.delete(promptTags).where(eq(promptTags.promptId, id));
        await tx.delete(promptVariables).where(eq(promptVariables.promptId, id));
        await tx.delete(promptVersions).where(eq(promptVersions.id, id));
        await tx.delete(prompts).where(eq(prompts.id, id));
      });
      return true;
    }
  }

  async listVersions(id: string): Promise<number[]> {
    const results = await this.db
      .select({ version: promptVersions.version })
      .from(promptVersions)
      .where(eq(promptVersions.id, id))
      .orderBy(desc(promptVersions.version));

    return results.map(result => result.version);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async saveTags(tx: any, promptId: string, tagNames: string[]): Promise<void> {
    for (const tagName of tagNames) {
      // Insert tag if it doesn't exist
      const [tag] = await tx
        .insert(tags)
        .values({ name: tagName })
        .onConflictDoNothing()
        .returning();

      // Get tag ID (either newly created or existing)
      const tagId = tag?.id || (await tx.select({ id: tags.id }).from(tags).where(eq(tags.name, tagName)))[0]?.id;

      if (tagId) {
        // Create prompt-tag relationship
        await tx
          .insert(promptTags)
          .values({ promptId, tagId })
          .onConflictDoNothing();
      }
    }
  }

  private async saveVariables(tx: any, promptId: string, variables: string[]): Promise<void> {
    for (let i = 0; i < variables.length; i++) {
      await tx.insert(promptVariables).values({
        promptId,
        variableName: variables[i],
        variableOrder: i,
      });
    }
  }

  private async getTagsForPrompt(promptId: string): Promise<string[]> {
    const results = await this.db
      .select({ name: tags.name })
      .from(tags)
      .innerJoin(promptTags, eq(tags.id, promptTags.tagId))
      .where(eq(promptTags.promptId, promptId));

    return results.map(r => r.name);
  }

  private async getVariablesForPrompt(promptId: string): Promise<string[]> {
    const results = await this.db
      .select({ variableName: promptVariables.variableName })
      .from(promptVariables)
      .where(eq(promptVariables.promptId, promptId))
      .orderBy(asc(promptVariables.variableOrder));

    return results.map(r => r.variableName);
  }

  private async getTagIds(tagNames: string[]): Promise<number[]> {
    const results = await this.db
      .select({ id: tags.id })
      .from(tags)
      .where(inArray(tags.name, tagNames));

    return results.map(r => r.id);
  }

  async close(): Promise<void> {
    await this.disconnect();
  }
}