import postgres from 'postgres';

// Test database connection
async function testConnection() {
  console.log('Testing PostgreSQL connection...');
  
  const client = postgres('postgresql://mcp_user:mcp_password_123@localhost:5433/mcp_prompts');
  
  try {
    // Test basic connection
    const result = await client`SELECT 1 as test`;
    console.log('✅ Connection successful:', result[0]);
    
    // Test if tables exist
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('✅ Available tables:', tables.map(t => t.table_name));
    
    // Test prompts table structure
    const promptColumns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'prompts' 
      ORDER BY ordinal_position
    `;
    console.log('✅ Prompts table columns:', promptColumns);
    
    // Test inserting a simple record
    const testPrompt = {
      id: 'test-prompt-1',
      name: 'Test Prompt',
      content: 'This is a test prompt',
      is_template: false,
      created_at: new Date(),
      updated_at: new Date(),
      version: 1
    };
    
    await client`
      INSERT INTO prompts (id, name, content, is_template, created_at, updated_at, version)
      VALUES (${testPrompt.id}, ${testPrompt.name}, ${testPrompt.content}, ${testPrompt.is_template}, ${testPrompt.created_at}, ${testPrompt.updated_at}, ${testPrompt.version})
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('✅ Insert test successful');
    
    // Test reading the record
    const [readPrompt] = await client`
      SELECT * FROM prompts WHERE id = ${testPrompt.id}
    `;
    console.log('✅ Read test successful:', readPrompt);
    
    // Clean up
    await client`DELETE FROM prompts WHERE id = ${testPrompt.id}`;
    console.log('✅ Cleanup successful');
    
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await client.end();
  }
}

testConnection(); 