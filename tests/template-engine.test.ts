import { describe, it, expect } from 'vitest';
import { SimpleTemplateEngine } from '../src/template-engine.js';

describe('SimpleTemplateEngine', () => {
  const engine = new SimpleTemplateEngine();

  describe('applyTemplate', () => {
    it('should substitute variables correctly', () => {
      const content = 'Hello {{name}}, welcome to {{place}}!';
      const variables = { name: 'Alice', place: 'Wonderland' };
      
      const result = engine.applyTemplate(content, variables);
      expect(result).toBe('Hello Alice, welcome to Wonderland!');
    });

    it('should handle multiple occurrences of the same variable', () => {
      const content = '{{name}} says hello to {{name}}!';
      const variables = { name: 'Bob' };
      
      const result = engine.applyTemplate(content, variables);
      expect(result).toBe('Bob says hello to Bob!');
    });

    it('should leave content unchanged when no variables', () => {
      const content = 'Hello, world!';
      const variables = {};
      
      const result = engine.applyTemplate(content, variables);
      expect(result).toBe('Hello, world!');
    });

    it('should throw error for missing variables', () => {
      const content = 'Hello {{name}}!';
      const variables = {};
      
      expect(() => engine.applyTemplate(content, variables))
        .toThrow('Missing required variable: name');
    });

    it('should handle empty variables', () => {
      const content = 'Hello {{name}}!';
      const variables = { name: '' };
      
      const result = engine.applyTemplate(content, variables);
      expect(result).toBe('Hello !');
    });

    it('should handle special characters in variables', () => {
      const content = 'Message: {{message}}';
      const variables = { message: 'Hello\nWorld\tWith\tTabs' };
      
      const result = engine.applyTemplate(content, variables);
      expect(result).toBe('Message: Hello\nWorld\tWith\tTabs');
    });
  });

  describe('extractVariables', () => {
    it('should extract all variables from content', () => {
      const content = 'Hello {{name}}, welcome to {{place}}! Your age is {{age}}.';
      
      const variables = engine.extractVariables(content);
      expect(variables).toEqual(['name', 'place', 'age']);
    });

    it('should handle duplicate variables', () => {
      const content = '{{name}} says hello to {{name}}!';
      
      const variables = engine.extractVariables(content);
      expect(variables).toEqual(['name']);
    });

    it('should return empty array for content without variables', () => {
      const content = 'Hello, world!';
      
      const variables = engine.extractVariables(content);
      expect(variables).toEqual([]);
    });

    it('should handle variables with underscores and numbers', () => {
      const content = '{{user_name}} and {{item_123}}';
      
      const variables = engine.extractVariables(content);
      expect(variables).toEqual(['user_name', 'item_123']);
    });

    it('should ignore malformed variable syntax', () => {
      const content = '{{name}} {{} {{invalid}} {{name}}';
      
      const variables = engine.extractVariables(content);
      expect(variables).toEqual(['name', 'invalid']);
    });
  });

  describe('validateVariables', () => {
    it('should return valid when all required variables are provided', () => {
      const content = 'Hello {{name}}, welcome to {{place}}!';
      const providedVariables = { name: 'Alice', place: 'Wonderland' };
      
      const result = engine.validateVariables(content, providedVariables);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.extra).toEqual([]);
    });

    it('should detect missing variables', () => {
      const content = 'Hello {{name}}, welcome to {{place}}!';
      const providedVariables = { name: 'Alice' };
      
      const result = engine.validateVariables(content, providedVariables);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['place']);
      expect(result.extra).toEqual([]);
    });

    it('should detect extra variables', () => {
      const content = 'Hello {{name}}!';
      const providedVariables = { name: 'Alice', extra: 'value' };
      
      const result = engine.validateVariables(content, providedVariables);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.extra).toEqual(['extra']);
    });

    it('should handle both missing and extra variables', () => {
      const content = 'Hello {{name}}, welcome to {{place}}!';
      const providedVariables = { name: 'Alice', extra: 'value' };
      
      const result = engine.validateVariables(content, providedVariables);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['place']);
      expect(result.extra).toEqual(['extra']);
    });

    it('should be valid when no variables are required', () => {
      const content = 'Hello, world!';
      const providedVariables = { extra: 'value' };
      
      const result = engine.validateVariables(content, providedVariables);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.extra).toEqual(['extra']);
    });
  });

  describe('applyTemplateWithValidation', () => {
    it('should apply template when validation passes', () => {
      const content = 'Hello {{name}}, welcome to {{place}}!';
      const variables = { name: 'Alice', place: 'Wonderland' };
      
      const result = engine.applyTemplateWithValidation(content, variables);
      expect(result).toBe('Hello Alice, welcome to Wonderland!');
    });

    it('should throw error when validation fails', () => {
      const content = 'Hello {{name}}, welcome to {{place}}!';
      const variables = { name: 'Alice' };
      
      expect(() => engine.applyTemplateWithValidation(content, variables))
        .toThrow('Missing required variables: place');
    });

    it('should handle empty content', () => {
      const content = '';
      const variables = {};
      
      const result = engine.applyTemplateWithValidation(content, variables);
      expect(result).toBe('');
    });
  });

  describe('edge cases', () => {
    it('should handle nested braces that are not variables', () => {
      const content = '{{name}} and {not_a_variable} and {{place}}';
      const variables = { name: 'Alice', place: 'Wonderland' };
      
      const result = engine.applyTemplate(content, variables);
      expect(result).toBe('Alice and {not_a_variable} and Wonderland');
    });

    it('should handle variables with spaces (should not match)', () => {
      const content = 'Hello {{ name }}!'; // Note the spaces
      const variables = { name: 'Alice' };
      
      // This should not match due to spaces
      const result = engine.applyTemplate(content, variables);
      expect(result).toBe('Hello {{ name }}!');
    });

    it('should handle case-sensitive variable names', () => {
      const content = 'Hello {{Name}} and {{name}}!';
      const variables = { Name: 'Alice', name: 'Bob' };
      
      const result = engine.applyTemplate(content, variables);
      expect(result).toBe('Hello Alice and Bob!');
    });
  });
}); 