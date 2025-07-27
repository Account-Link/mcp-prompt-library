import { pgTable, text, boolean, timestamp, integer, jsonb, serial } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Prompts table (latest versions)
export const prompts = pgTable('prompts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  description: text('description'),
  isTemplate: boolean('is_template').notNull().default(false),
  category: text('category'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  version: integer('version').notNull().default(1),
});

// Prompt versions table (historical versions)
export const promptVersions = pgTable('prompt_versions', {
  id: text('id').notNull(),
  version: integer('version').notNull(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  description: text('description'),
  isTemplate: boolean('is_template').notNull(),
  category: text('category'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Tags table (normalized)
export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
});

// Prompt-tag relationships
export const promptTags = pgTable('prompt_tags', {
  promptId: text('prompt_id').notNull(),
  tagId: integer('tag_id').notNull(),
});

// Variables table (for templates)
export const promptVariables = pgTable('prompt_variables', {
  promptId: text('prompt_id').notNull(),
  variableName: text('variable_name').notNull(),
  variableOrder: integer('variable_order').notNull(),
});

// Auto-generated Zod schemas for validation (not for type inference)
export const insertPromptSchema = createInsertSchema(prompts);
export const selectPromptSchema = createSelectSchema(prompts);

export const insertPromptVersionSchema = createInsertSchema(promptVersions);
export const selectPromptVersionSchema = createSelectSchema(promptVersions);

export const insertTagSchema = createInsertSchema(tags);
export const selectTagSchema = createSelectSchema(tags);

export const insertPromptTagSchema = createInsertSchema(promptTags);
export const selectPromptTagSchema = createSelectSchema(promptTags);

export const insertPromptVariableSchema = createSelectSchema(promptVariables);
export const selectPromptVariableSchema = createSelectSchema(promptVariables);

// Manual type definitions that match the existing types.ts interface
export interface Prompt {
  id: string;
  name: string;
  content: string;
  description?: string;
  isTemplate: boolean;
  variables: string[];
  tags: string[];
  category?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface CreatePrompt {
  id?: string;
  name: string;
  content: string;
  description?: string;
  isTemplate?: boolean;
  category?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export interface PromptVersion {
  id: string;
  version: number;
  name: string;
  content: string;
  description?: string;
  isTemplate: boolean;
  category?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePromptVersion {
  id: string;
  version: number;
  name: string;
  content: string;
  description?: string;
  isTemplate: boolean;
  category?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: number;
  name: string;
}

export interface CreateTag {
  id?: number;
  name: string;
}

export interface PromptTag {
  promptId: string;
  tagId: number;
}

export interface CreatePromptTag {
  promptId: string;
  tagId: number;
}

export interface PromptVariable {
  promptId: string;
  variableName: string;
  variableOrder: number;
}

export interface CreatePromptVariable {
  promptId: string;
  variableName: string;
  variableOrder: number;
}

// Extended Prompt type with related data
export interface PromptWithRelations {
  id: string;
  name: string;
  content: string;
  description?: string;
  isTemplate: boolean;
  variables: string[];
  tags: string[];
  category?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  // Additional relation data
  tagObjects: Tag[];
  variableObjects: PromptVariable[];
} 