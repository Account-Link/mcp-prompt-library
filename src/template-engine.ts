import { TemplateEngine } from './types.js';

export class SimpleTemplateEngine implements TemplateEngine {
  /**
   * Apply variables to a template string
   * Supports {{variable}} syntax with dots, hyphens, spaces, etc.
   */
  applyTemplate(content: string, variables: Record<string, string>): string {
    return content.replace(/\{\{([^}]+)\}\}/g, (_match, variableName) => {
      const trimmedName = variableName.trim();
      if (variables[trimmedName] === undefined) {
        throw new Error(`Missing required variable: ${trimmedName}`);
      }
      return variables[trimmedName];
    });
  }
}

// Default template engine instance
export const defaultTemplateEngine = new SimpleTemplateEngine(); 