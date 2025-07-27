import { z } from 'zod';

// Compatibility layer for Zod 4.x to work with MCP SDK that expects Zod 3.x
// This creates wrapper schemas that maintain the same interface

export const createCompatibleSchema = <T extends z.ZodTypeAny>(schema: T) => {
  return schema as any;
};

// Re-export commonly used schemas with compatibility
export const zString = (description?: string) => {
  const schema = z.string();
  if (description) {
    return createCompatibleSchema(schema.describe(description));
  }
  return createCompatibleSchema(schema);
};

export const zNumber = (description?: string) => {
  const schema = z.number();
  if (description) {
    return createCompatibleSchema(schema.describe(description));
  }
  return createCompatibleSchema(schema);
};

export const zBoolean = (description?: string) => {
  const schema = z.boolean();
  if (description) {
    return createCompatibleSchema(schema.describe(description));
  }
  return createCompatibleSchema(schema);
};

export const zArray = <T extends z.ZodTypeAny>(itemSchema: T, description?: string) => {
  const schema = z.array(itemSchema);
  if (description) {
    return createCompatibleSchema(schema.describe(description));
  }
  return createCompatibleSchema(schema);
};

export const zOptional = <T extends z.ZodTypeAny>(schema: T, description?: string) => {
  const optionalSchema = schema.optional();
  if (description) {
    return createCompatibleSchema(optionalSchema.describe(description));
  }
  return createCompatibleSchema(optionalSchema);
};

export const zRecord = <V extends z.ZodTypeAny>(
  valueSchema: V, 
  description?: string
) => {
  const schema = z.record(z.string(), valueSchema);
  if (description) {
    return createCompatibleSchema(schema.describe(description));
  }
  return createCompatibleSchema(schema);
}; 