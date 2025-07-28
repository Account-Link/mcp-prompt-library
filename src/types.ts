import { z } from 'zod';

// Core Prompt interface
export interface Prompt {
  id: string;
  name: string;
  content: string;
  description: string | null;
  isTemplate: boolean;
  tags: string[];
  category: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// Schema for creating a new prompt (without server-generated fields)
export const createPromptSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot be longer than 100 characters')
    .trim(),
  content: z.string()
    .min(1, 'Content is required')
    .trim(),
  description: z.string()
    .max(500, 'Description cannot be longer than 500 characters')
    .trim()
    .nullable()
    .default(null),
  isTemplate: z.boolean().default(false),
  tags: z.array(z.string().min(1)).default([]),
  category: z.string().nullable().default(null),
  metadata: z.record(z.string(), z.unknown()).nullable().default(null),
});

// Note: promptSchema is not currently used but kept for potential future use

// Schema for updating a prompt (all fields optional, no defaults)
export const updatePromptSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot be longer than 100 characters')
    .trim()
    .optional(),
  content: z.string()
    .min(1, 'Content is required')
    .trim()
    .optional(),
  description: z.string()
    .max(500, 'Description cannot be longer than 500 characters')
    .trim()
    .nullable()
    .optional(),
  isTemplate: z.boolean().optional(),
  tags: z.array(z.string().min(1)).optional(),
  category: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

// Schema for applying template variables (not exported as it's only used for type inference)
const applyTemplateSchema = z.object({
  id: z.string(),
  variables: z.record(z.string(), z.string()),
});

// Schema for listing prompts with filters
export const listPromptsSchema = z.object({
  category: z.string().optional(),
  isTemplate: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
});

// Repository interface
export interface PromptRepository {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  save(prompt: z.infer<typeof createPromptSchema>): Promise<Prompt>;
  getById(id: string, version?: number): Promise<Prompt | null>;
  list(options?: z.infer<typeof listPromptsSchema>): Promise<Prompt[]>;
  update(id: string, updates: z.infer<typeof updatePromptSchema>): Promise<Prompt>;
  delete(id: string, version?: number): Promise<boolean>;
  listVersions(id: string): Promise<number[]>;
  healthCheck(): Promise<boolean>;
}

// Template engine interface
export interface TemplateEngine {
  applyTemplate(content: string, variables: Record<string, string>): string;
}

// Error types
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`);
    this.name = 'NotFoundError';
  }
}

// Note: StorageError is not currently used but kept for potential future use

// Export types for use in other modules
export type CreatePromptArgs = z.infer<typeof createPromptSchema>;
export type UpdatePromptArgs = z.infer<typeof updatePromptSchema>;
export type ApplyTemplateArgs = z.infer<typeof applyTemplateSchema>;
export type ListPromptsArgs = z.infer<typeof listPromptsSchema>; 