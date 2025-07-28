import { describe, it, expect } from 'vitest';
import { SimpleTemplateEngine } from '../src/template-engine.js';

describe('SimpleTemplateEngine', () => {
  const engine = new SimpleTemplateEngine();

  describe('Basic Variable Substitution', () => {
    it('should substitute simple variables', () => {
      const template = 'Hello {{name}}, welcome to {{platform}}!';
      const variables = { name: 'John', platform: 'our platform' };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe('Hello John, welcome to our platform!');
    });

    it('should handle empty variables', () => {
      const template = 'Hello {{name}}!';
      const variables = { name: '' };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe('Hello !');
    });

    it('should handle missing variables', () => {
      const template = 'Hello {{name}}, your email is {{email}}';
      const variables = { name: 'John' };
      expect(() => engine.applyTemplate(template, variables)).toThrow('Missing required variable: email');
    });

    it('should handle no variables', () => {
      const template = 'Hello {{name}}!';
      const variables = {};
      expect(() => engine.applyTemplate(template, variables)).toThrow('Missing required variable: name');
    });
  });

  describe('Complex Variable Substitution', () => {
    it('should handle nested object properties', () => {
      const template = 'Hello {{user.name}}, your role is {{user.role}}';
      const variables = { 
        'user.name': 'John', 
        'user.role': 'admin' 
      };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe('Hello John, your role is admin');
    });

    it('should handle array access', () => {
      const template = 'First item: {{items.0}}, Second item: {{items.1}}';
      const variables = { 'items.0': 'apple', 'items.1': 'banana' };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe('First item: apple, Second item: banana');
    });

    it('should handle mixed nested structures', () => {
      const template = 'User {{users.0.name}} has {{users.0.permissions.length}} permissions';
      const variables = { 
        'users.0.name': 'John', 
        'users.0.permissions.length': '2' 
      };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe('User John has 2 permissions');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed template syntax', () => {
      const template = 'Hello {{name}, welcome to {{platform}}!';
      const variables = { name: 'John', platform: 'our platform' };
      const result = engine.applyTemplate(template, variables);
      // Should handle gracefully - leave malformed parts unchanged
      expect(result).toBe('Hello {{name}, welcome to our platform!');
    });

    it('should handle nested variable substitution', () => {
      const template = 'Hello {{name}}, your template is: {{template}}';
      const variables = { 
        name: 'John', 
        template: 'Welcome {{user}} to {{platform}}' 
      };
      const result = engine.applyTemplate(template, variables);
      // Should not recursively substitute - just use the literal template string
      expect(result).toBe('Hello John, your template is: Welcome {{user}} to {{platform}}');
    });

    it('should handle circular references gracefully', () => {
      const template = 'Value: {{value}}';
      const variables = { value: '{{value}}' }; // Circular reference
      const result = engine.applyTemplate(template, variables);
      // Should handle gracefully without infinite loops
      expect(result).toBe('Value: {{value}}');
    });

    it('should handle very long variable names', () => {
      const longName = 'a'.repeat(1000);
      const template = `Hello {{${longName}}}!`;
      const variables = { [longName]: 'World' };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe('Hello World!');
    });

    it('should handle very long variable values', () => {
      const longValue = 'x'.repeat(10000);
      const template = 'Value: {{value}}';
      const variables = { value: longValue };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe(`Value: ${longValue}`);
    });

    it('should handle special characters in variable names', () => {
      const template = 'Hello {{user-name}}, welcome to {{platform_name}}!';
      const variables = { 'user-name': 'John', 'platform_name': 'our platform' };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe('Hello John, welcome to our platform!');
    });

    it('should handle special characters in variable values', () => {
      const template = 'Message: {{message}}';
      const variables = { message: 'Hello\nWorld\tWith\r\nSpecial\nCharacters' };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe('Message: Hello\nWorld\tWith\r\nSpecial\nCharacters');
    });

    it('should handle unicode characters', () => {
      const template = 'Hello {{name}}, 你好 {{greeting}}!';
      const variables = { name: '世界', greeting: '世界' };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe('Hello 世界, 你好 世界!');
    });

    it('should handle emoji characters', () => {
      const template = 'Hello {{name}} {{emoji}}!';
      const variables = { name: 'John', emoji: '👋' };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe('Hello John 👋!');
    });
  });

  describe('Template Validation', () => {
    it('should handle empty template', () => {
      const template = '';
      const variables = { name: 'John' };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe('');
    });

    it('should handle template with only variables', () => {
      const template = '{{name}}{{age}}{{city}}';
      const variables = { name: 'John', age: '25', city: 'NYC' };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe('John25NYC');
    });

    it('should handle template with only literal text', () => {
      const template = 'Hello World!';
      const variables = { name: 'John' };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe('Hello World!');
    });

    it('should handle template with whitespace around variables', () => {
      const template = 'Hello {{ name }}, welcome to {{ platform }}!';
      const variables = { name: 'John', platform: 'our platform' };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe('Hello John, welcome to our platform!');
    });

    it('should handle template with multiple consecutive variables', () => {
      const template = '{{first}}{{second}}{{third}}';
      const variables = { first: '1', second: '2', third: '3' };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe('123');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of variables efficiently', () => {
      const template = '{{v1}}{{v2}}{{v3}}{{v4}}{{v5}}{{v6}}{{v7}}{{v8}}{{v9}}{{v10}}';
      const variables = {
        v1: '1', v2: '2', v3: '3', v4: '4', v5: '5',
        v6: '6', v7: '7', v8: '8', v9: '9', v10: '10'
      };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe('12345678910');
    });

    it('should handle large template efficiently', () => {
      const largeText = 'x'.repeat(1000);
      const template = `${largeText}{{name}}${largeText}`;
      const variables = { name: 'John' };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe(`${largeText}John${largeText}`);
    });

    it('should handle many variable substitutions efficiently', () => {
      const template = '{{name}} {{name}} {{name}} {{name}} {{name}}';
      const variables = { name: 'John' };
      const result = engine.applyTemplate(template, variables);
      expect(result).toBe('John John John John John');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle email template', () => {
      const template = `
Dear {{recipient_name}},

Thank you for your order #{{order_id}}. Your total is ${{total}}.

Your items:
{{#items}}
- {{name}}: ${{price}}
{{/items}}

Best regards,
{{company_name}}
      `;
      const variables = {
        recipient_name: 'John Doe',
        order_id: '12345',
        total: '99.99',
        '#items': '',
        name: 'Product 1',
        price: '49.99',
        company_name: 'Our Store'
      };
      const result = engine.applyTemplate(template, variables);
      expect(result).toContain('Dear John Doe');
      expect(result).toContain('order #12345');
      expect(result).toContain('$99.99');
      expect(result).toContain('Our Store');
    });

    it('should handle configuration template', () => {
      const template = `
{
  "database": {
    "host": "{{db_host}}",
    "port": {{db_port}},
    "name": "{{db_name}}"
  },
  "api": {
    "baseUrl": "{{api_url}}",
    "timeout": {{api_timeout}}
  }
}
      `;
      const variables = {
        db_host: 'localhost',
        db_port: '5432',
        db_name: 'mcp_prompts',
        api_url: 'https://api.example.com',
        api_timeout: '30000'
      };
      const result = engine.applyTemplate(template, variables);
      expect(result).toContain('"host": "localhost"');
      expect(result).toContain('"port": 5432');
      expect(result).toContain('"name": "mcp_prompts"');
      expect(result).toContain('"baseUrl": "https://api.example.com"');
      expect(result).toContain('"timeout": 30000');
    });
  });
}); 