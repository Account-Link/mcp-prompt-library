import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: 'localhost',
    port: 5433,
    user: 'mcp_user',
    password: 'mcp_password_123',
    database: 'mcp_prompts',
  },
  verbose: true,
  strict: true,
}); 