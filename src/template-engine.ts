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

  /**
   * Extract variable names from a template string
   * Returns array of variable names found in {{variable}} syntax
   */
  extractVariables(content: string): string[] {
    const matches = content.match(/\{\{([^}]+)\}\}/g);
    if (!matches) return [];
    
    const variables = new Set<string>();
    for (const match of matches) {
      const variableName = match.slice(2, -2).trim(); // Remove {{ and }} and trim whitespace
      variables.add(variableName);
    }
    
    return Array.from(variables);
  }

  /**
   * Validate that all required variables are provided
   * Returns validation result with missing and extra variables
   */
  validateVariables(content: string, providedVariables: Record<string, string>): {
    valid: boolean;
    missing: string[];
    extra: string[];
  } {
    const required = this.extractVariables(content);
    const provided = Object.keys(providedVariables);
    
    const missing = required.filter(v => !provided.includes(v));
    const extra = provided.filter(v => !required.includes(v));
    
    return {
      valid: missing.length === 0,
      missing,
      extra,
    };
  }


}

// Default template engine instance
export const defaultTemplateEngine = new SimpleTemplateEngine(); 