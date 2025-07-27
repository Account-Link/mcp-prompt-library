import { SimpleDrizzlePromptRepository } from './dist/simple-drizzle-storage.js';

async function testSimpleDrizzle() {
  console.log('Testing Simple Drizzle Repository...');
  
  const repo = new SimpleDrizzlePromptRepository({
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
      name: 'Test Drizzle Prompt',
      content: 'This is a test prompt created with Drizzle',
      description: 'Testing the Drizzle repository',
      isTemplate: false,
      tags: ['test', 'drizzle'],
      variables: [],
      category: 'testing'
    });
    console.log('✅ Created prompt:', testPrompt);
    
    // Test getting the prompt
    const retrieved = await repo.getById(testPrompt.id);
    console.log('✅ Retrieved prompt:', retrieved);
    
    // Test updating the prompt
    const updated = await repo.update(testPrompt.id, {
      content: 'This is an updated test prompt',
      tags: ['test', 'drizzle', 'updated']
    });
    console.log('✅ Updated prompt:', updated);
    
    // Test listing prompts
    const allPrompts = await repo.list({ limit: 10 });
    console.log('✅ Listed prompts:', allPrompts.length);
    
    // Test versioning
    const versions = await repo.listVersions(testPrompt.id);
    console.log('✅ Prompt versions:', versions);
    
    // Test getting specific version
    const version1 = await repo.getById(testPrompt.id, 1);
    console.log('✅ Version 1:', version1?.content);
    
    // Test deleting the prompt
    const deleted = await repo.delete(testPrompt.id);
    console.log('✅ Deleted prompt:', deleted);
    
    console.log('🎉 All Simple Drizzle tests passed!');
    
  } catch (error) {
    console.error('❌ Simple Drizzle test failed:', error);
  } finally {
    await repo.close();
  }
}

testSimpleDrizzle(); 