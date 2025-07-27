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

// Auto-generated Zod schemas for type safety
export const insertPromptSchema = createInsertSchema(prompts);
export const selectPromptSchema = createSelectSchema(prompts);

export const insertPromptVersionSchema = createInsertSchema(promptVersions);
export const selectPromptVersionSchema = createSelectSchema(promptVersions);

export const insertTagSchema = createInsertSchema(tags);
export const selectTagSchema = createSelectSchema(tags);

export const insertPromptTagSchema = createInsertSchema(promptTags);
export const selectPromptTagSchema = createSelectSchema(promptTags);

export const insertPromptVariableSchema = createInsertSchema(promptVariables);
export const selectPromptVariableSchema = createSelectSchema(promptVariables);

// TypeScript types derived from Zod schemas
export type Prompt = z.infer<typeof selectPromptSchema>;
export type CreatePrompt = z.infer<typeof insertPromptSchema>;
export type PromptVersion = z.infer<typeof selectPromptVersionSchema>;
export type CreatePromptVersion = z.infer<typeof insertPromptVersionSchema>;
export type Tag = z.infer<typeof selectTagSchema>;
export type CreateTag = z.infer<typeof insertTagSchema>;
export type PromptTag = z.infer<typeof selectPromptTagSchema>;
export type CreatePromptTag = z.infer<typeof insertPromptTagSchema>;
export type PromptVariable = z.infer<typeof selectPromptVariableSchema>;
export type CreatePromptVariable = z.infer<typeof insertPromptVariableSchema>;

// Extended Prompt type with related data
export interface PromptWithRelations extends Prompt {
  tags: Tag[];
  variables: PromptVariable[];
} 