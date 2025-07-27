import postgres from 'postgres';
import type { PromptRepository, CreatePromptArgs, UpdatePromptArgs, ListPromptsArgs, Prompt } from './types.js';

export interface PostgresConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}

export class PostgresPromptRepository implements PromptRepository {
  private client: postgres.Sql;

  constructor(config: PostgresConfig) {
    if (config.connectionString) {
      this.client = postgres(config.connectionString);
    } else {
      const { host = 'localhost', port = 5433, database = 'mcp_prompts', user = 'mcp_user', password = 'mcp_password_123' } = config;
      this.client = postgres(`postgresql://${user}:${password}@${host}:${port}/${database}`);
    }
  }

  async connect(): Promise<void> {
    try {
      // Test the connection
      await this.client`SELECT 1`;
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.end();
    } catch (error) {
      throw new Error(`Failed to disconnect from database: ${error}`);
    }
  }

  async save(data: CreatePromptArgs): Promise<Prompt> {
    const now = new Date();
    const id = this.generateId(data.name);
    
    // Insert main prompt
    const [prompt] = await this.client`
      INSERT INTO prompts (id, name, content, description, is_template, category, metadata, created_at, updated_at, version)
      VALUES (${id}, ${data.name}, ${data.content}, ${data.description || null}, ${data.isTemplate}, ${data.category || null}, ${data.metadata ? JSON.stringify(data.metadata) : null}, ${now}, ${now}, 1)
      RETURNING *
    `;
    
    // Insert version record
    await this.client`
      INSERT INTO prompt_versions (id, version, name, content, description, is_template, category, metadata, created_at, updated_at)
      VALUES (${prompt.id}, ${prompt.version}, ${prompt.name}, ${prompt.content}, ${prompt.description}, ${prompt.is_template}, ${prompt.category}, ${prompt.metadata}, ${prompt.created_at}, ${prompt.updated_at})
    `;

    // Handle tags if provided
    if (data.tags && data.tags.length > 0) {
      await this.saveTags(this.client, prompt.id, data.tags);
    }

    // Handle variables if provided
    if (data.variables && data.variables.length > 0) {
      await this.saveVariables(this.client, prompt.id, data.variables);
    }

    // Return complete prompt with tags and variables
    const result = await this.getByIdInternal(this.client, prompt.id);
    if (!result) {
      throw new Error('Failed to create prompt');
    }
    return result;
  }

  async getById(id: string, version?: number): Promise<Prompt | null> {
    if (version) {
      // Get specific version
      const [result] = await this.client`
        SELECT * FROM prompt_versions 
        WHERE id = ${id} AND version = ${version}
      `;
      
      if (!result) return null;

      // Get tags and variables for this version
      const tags = await this.getTagsForPrompt(id);
      const variables = await this.getVariablesForPrompt(id);

      return {
        id: result.id,
        name: result.name,
        content: result.content,
        description: result.description,
        isTemplate: result.is_template,
        tags,
        variables,
        category: result.category,
        metadata: result.metadata ? JSON.parse(result.metadata) : null,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        version: result.version,
      };
    } else {
      // Get latest version
      return await this.getByIdInternal(this.client, id);
    }
  }

  private async getByIdInternal(db: postgres.Sql, id: string): Promise<Prompt | null> {
    const [result] = await db`
      SELECT * FROM prompts WHERE id = ${id}
    `;

    if (!result) return null;

    // Get tags and variables
    const tags = await this.getTagsForPrompt(id);
    const variables = await this.getVariablesForPrompt(id);

    return {
      id: result.id,
      name: result.name,
      content: result.content,
      description: result.description,
      isTemplate: result.is_template,
      tags,
      variables,
      category: result.category,
      metadata: result.metadata ? JSON.parse(result.metadata) : null,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      version: result.version,
    };
  }

  async list(options?: ListPromptsArgs): Promise<Prompt[]> {
    const { category, isTemplate, tags: tagFilter, limit = 50, offset = 0 } = options || {};

    const conditions = [];
    const params = [];

    if (category) {
      conditions.push('category = $' + (params.length + 1));
      params.push(category);
    }
    
    if (isTemplate !== undefined) {
      conditions.push('is_template = $' + (params.length + 1));
      params.push(isTemplate);
    }

    if (tagFilter && tagFilter.length > 0) {
      // Filter by tags using subquery
      const tagPlaceholders = tagFilter.map((_, i) => '$' + (params.length + i + 1)).join(',');
      conditions.push(`id IN (
        SELECT pt.prompt_id 
        FROM prompt_tags pt 
        JOIN tags t ON pt.tag_id = t.id 
        WHERE t.name IN (${tagPlaceholders})
        GROUP BY pt.prompt_id 
        HAVING COUNT(*) = ${tagFilter.length}
      )`);
      params.push(...tagFilter);
    }

    if (conditions.length > 0) {
      const whereClause = conditions.join(' AND ');
      const results = await this.client`SELECT * FROM prompts WHERE ${this.client.unsafe(whereClause)} ORDER BY updated_at DESC LIMIT ${limit} OFFSET ${offset}`;
      return await this.loadPromptsWithRelations(results);
    } else {
      const results = await this.client`SELECT * FROM prompts ORDER BY updated_at DESC LIMIT ${limit} OFFSET ${offset}`;
      return await this.loadPromptsWithRelations(results);
    }
  }

  async update(id: string, data: UpdatePromptArgs): Promise<Prompt> {
    const now = new Date();
    
    // Get current prompt
    const [current] = await this.client`
      SELECT * FROM prompts WHERE id = ${id}
    `;

    if (!current) {
      throw new Error(`Prompt with id ${id} not found`);
    }

    // Prepare update data
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(data.name);
    }
    if (data.content !== undefined) {
      updateFields.push(`content = $${paramIndex++}`);
      updateValues.push(data.content);
    }
    if (data.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(data.description);
    }
    if (data.isTemplate !== undefined) {
      updateFields.push(`is_template = $${paramIndex++}`);
      updateValues.push(data.isTemplate);
    }
    if (data.category !== undefined) {
      updateFields.push(`category = $${paramIndex++}`);
      updateValues.push(data.category);
    }
    if (data.metadata !== undefined) {
      updateFields.push(`metadata = $${paramIndex++}`);
      updateValues.push(data.metadata);
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    updateValues.push(now);
    updateFields.push(`version = $${paramIndex++}`);
    updateValues.push(current.version + 1);

    // Update main prompt
    const [updated] = await this.client`
      UPDATE prompts 
      SET ${this.client.unsafe(updateFields.join(', '))}
      WHERE id = ${id}
      RETURNING *
    `;

    // Save version record
    await this.client`
      INSERT INTO prompt_versions (id, version, name, content, description, is_template, category, metadata, created_at, updated_at)
      VALUES (${updated.id}, ${updated.version}, ${updated.name}, ${updated.content}, ${updated.description}, ${updated.is_template}, ${updated.category}, ${updated.metadata}, ${updated.created_at}, ${updated.updated_at})
    `;

    // Handle tags if provided
    if (data.tags !== undefined) {
      // Delete existing tags
      await this.client`DELETE FROM prompt_tags WHERE prompt_id = ${id}`;
      // Insert new tags
      if (data.tags.length > 0) {
        await this.saveTags(this.client, id, data.tags);
      }
    }

    // Handle variables if provided
    if (data.variables !== undefined) {
      // Delete existing variables
      await this.client`DELETE FROM prompt_variables WHERE prompt_id = ${id}`;
      // Insert new variables
      if (data.variables.length > 0) {
        await this.saveVariables(this.client, id, data.variables);
      }
    }

    const result = await this.getByIdInternal(this.client, id);
    if (!result) {
      throw new Error(`Failed to update prompt with id ${id}`);
    }
    return result;
  }

  async delete(id: string, version?: number): Promise<boolean> {
    if (version) {
      // Delete specific version
      const result = await this.client`
        DELETE FROM prompt_versions 
        WHERE id = ${id} AND version = ${version}
      `;
      return result.length > 0;
    } else {
      // Delete all versions and related data
      await this.client`DELETE FROM prompt_tags WHERE prompt_id = ${id}`;
      await this.client`DELETE FROM prompt_variables WHERE prompt_id = ${id}`;
      await this.client`DELETE FROM prompt_versions WHERE id = ${id}`;
      await this.client`DELETE FROM prompts WHERE id = ${id}`;
      return true;
    }
  }

  async listVersions(id: string): Promise<number[]> {
    const results = await this.client`
      SELECT version FROM prompt_versions 
      WHERE id = ${id} 
      ORDER BY version DESC
    `;

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

  private async saveTags(db: postgres.Sql, promptId: string, tagNames: string[]): Promise<void> {
    for (const tagName of tagNames) {
      // Insert tag if it doesn't exist
      const [tag] = await db`
        INSERT INTO tags (name) 
        VALUES (${tagName}) 
        ON CONFLICT (name) DO NOTHING 
        RETURNING id
      `;

      // Get tag ID (either newly created or existing)
      const tagId = tag?.id || (await db`SELECT id FROM tags WHERE name = ${tagName}`)[0]?.id;

      if (tagId) {
        // Create prompt-tag relationship (ignore if already exists)
        try {
          await db`
            INSERT INTO prompt_tags (prompt_id, tag_id) 
            VALUES (${promptId}, ${tagId})
          `;
        } catch (error: any) {
          // Ignore unique constraint violations
          if (error.code !== '23505') {
            throw error;
          }
        }
      }
    }
  }

  private async saveVariables(db: postgres.Sql, promptId: string, variables: string[]): Promise<void> {
    for (let i = 0; i < variables.length; i++) {
      await db`
        INSERT INTO prompt_variables (prompt_id, variable_name, variable_order)
        VALUES (${promptId}, ${variables[i]}, ${i})
      `;
    }
  }

  private async getTagsForPrompt(promptId: string): Promise<string[]> {
    const results = await this.client`
      SELECT t.name 
      FROM tags t 
      JOIN prompt_tags pt ON t.id = pt.tag_id 
      WHERE pt.prompt_id = ${promptId}
    `;

    return results.map(r => r.name);
  }

  private async getVariablesForPrompt(promptId: string): Promise<string[]> {
    const results = await this.client`
      SELECT variable_name 
      FROM prompt_variables 
      WHERE prompt_id = ${promptId} 
      ORDER BY variable_order
    `;

    return results.map(r => r.variable_name);
  }

  private async loadPromptsWithRelations(results: any[]): Promise<Prompt[]> {
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
          isTemplate: prompt.is_template,
          tags,
          variables,
          category: prompt.category,
          metadata: prompt.metadata ? JSON.parse(prompt.metadata) : null,
          createdAt: prompt.created_at,
          updatedAt: prompt.updated_at,
          version: prompt.version,
        };
      })
    );

    return promptsWithRelations;
  }

  private generateId(name: string): string {
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${sanitized}-${timestamp}-${random}`;
  }

  async close(): Promise<void> {
    await this.client.end();
  }
} 