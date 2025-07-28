import { pgTable, text, boolean, timestamp, integer, jsonb, serial } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

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
// Note: insertPromptSchema is not currently used but kept for potential future use

 