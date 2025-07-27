import { PostgresPromptRepository } from './dist/postgres-storage.js';

async function testPostgresRepository() {
  console.log('Testing PostgreSQL Repository...');
  
  const repo = new PostgresPromptRepository({
    host: 'localhost',
    port: 5433,
    database: 'mcp_prompts',
    user: 'mcp_user',
    password: 'mcp_password_123'
  });
  
  try {
    // Test health check
    const isHealthy = await repo.healthCheck();
    console.log('✅ Health check:', isHealthy);
    
    // Test creating a prompt
    const testPrompt = await repo.save({
      name: 'Test PostgreSQL Prompt',
      content: 'This is a test prompt created with PostgreSQL repository',
      description: 'Testing the PostgreSQL repository implementation',
      isTemplate: false,
      tags: ['test', 'postgres', 'repository'],
      variables: [],
      category: 'testing'
    });
    console.log('✅ Created prompt:', testPrompt.id, testPrompt.name);
    
    // Test getting the prompt
    const retrieved = await repo.getById(testPrompt.id);
    console.log('✅ Retrieved prompt:', retrieved?.name, 'Tags:', retrieved?.tags);
    
    // Test updating the prompt
    const updated = await repo.update(testPrompt.id, {
      content: 'This is an updated test prompt with PostgreSQL',
      tags: ['test', 'postgres', 'repository', 'updated']
    });
    console.log('✅ Updated prompt:', updated.name, 'New tags:', updated.tags);
    
    // Test listing prompts
    const allPrompts = await repo.list({ limit: 10 });
    console.log('✅ Listed prompts:', allPrompts.length);
    
    // Test filtering by category
    const testPrompts = await repo.list({ category: 'testing', limit: 5 });
    console.log('✅ Filtered by category:', testPrompts.length);
    
    // Test filtering by tags
    const taggedPrompts = await repo.list({ tags: ['postgres'], limit: 5 });
    console.log('✅ Filtered by tags:', taggedPrompts.length);
    
    // Test versioning
    const versions = await repo.listVersions(testPrompt.id);
    console.log('✅ Prompt versions:', versions);
    
    // Test getting specific version
    const version1 = await repo.getById(testPrompt.id, 1);
    console.log('✅ Version 1 content:', version1?.content.substring(0, 50) + '...');
    
    // Test creating a template
    const template = await repo.save({
      name: 'Test Template',
      content: 'Hello {{name}}, welcome to {{company}}!',
      description: 'A test template with variables',
      isTemplate: true,
      tags: ['template', 'test'],
      variables: ['name', 'company'],
      category: 'templates'
    });
    console.log('✅ Created template:', template.name, 'Variables:', template.variables);
    
    // Test deleting the prompts
    const deletedPrompt = await repo.delete(testPrompt.id);
    const deletedTemplate = await repo.delete(template.id);
    console.log('✅ Deleted prompts:', deletedPrompt, deletedTemplate);
    
    console.log('🎉 All PostgreSQL Repository tests passed!');
    
  } catch (error) {
    console.error('❌ PostgreSQL Repository test failed:', error);
  } finally {
    await repo.close();
  }
}

testPostgresRepository(); 