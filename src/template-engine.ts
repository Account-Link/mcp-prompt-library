import { TemplateEngine } from './types.js';

export class SimpleTemplateEngine implements TemplateEngine {
  /**
   * Apply variables to a template string
   * Supports {{variable}} syntax
   */
  applyTemplate(content: string, variables: Record<string, string>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
      if (variables[variableName] === undefined) {
        throw new Error(`Missing required variable: ${variableName}`);
      }
      return variables[variableName];
    });
  }

  /**
   * Extract variable names from a template string
   * Returns array of variable names found in {{variable}} syntax
   */
  extractVariables(content: string): string[] {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    
    const variables = new Set<string>();
    for (const match of matches) {
      const variableName = match.slice(2, -2); // Remove {{ and }}
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

  /**
   * Apply template with validation
   * Throws error if required variables are missing
   */
  applyTemplateWithValidation(content: string, variables: Record<string, string>): string {
    const validation = this.validateVariables(content, variables);
    
    if (!validation.valid) {
      throw new Error(
        `Missing required variables: ${validation.missing.join(', ')}`
      );
    }
    
    return this.applyTemplate(content, variables);
  }
}

// Default template engine instance
export const defaultTemplateEngine = new SimpleTemplateEngine(); 