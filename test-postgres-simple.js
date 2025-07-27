import postgres from 'postgres';

async function testPostgresSimple() {
  console.log('Testing PostgreSQL with Raw Client...');
  
  const client = postgres('postgresql://mcp_user:mcp_password_123@localhost:5433/mcp_prompts');
  
  try {
    // Test health check
    const health = await client`SELECT 1 as test`;
    console.log('✅ Health check:', health[0]);
    
    // Test creating a prompt
    const now = new Date();
    const promptId = 'test-prompt-' + Date.now();
    
    const [prompt] = await client`
      INSERT INTO prompts (id, name, content, description, is_template, category, metadata, created_at, updated_at, version)
      VALUES (${promptId}, ${'Test Raw PostgreSQL Prompt'}, ${'This is a test prompt created with raw PostgreSQL client'}, ${'Testing raw PostgreSQL implementation'}, ${false}, ${'testing'}, ${null}, ${now}, ${now}, 1)
      RETURNING *
    `;
    console.log('✅ Created prompt:', prompt.id, prompt.name);
    
    // Test creating tags
    const tagNames = ['test', 'postgres', 'raw'];
    for (const tagName of tagNames) {
      // Try to insert tag, ignore if it already exists
      try {
        const [tag] = await client`
          INSERT INTO tags (name) 
          VALUES (${tagName}) 
          RETURNING id
        `;
        
        if (tag) {
          await client`
            INSERT INTO prompt_tags (prompt_id, tag_id) 
            VALUES (${promptId}, ${tag.id})
          `;
        }
      } catch (error) {
        // Tag already exists, get its ID
        const [existingTag] = await client`SELECT id FROM tags WHERE name = ${tagName}`;
        if (existingTag) {
          await client`
            INSERT INTO prompt_tags (prompt_id, tag_id) 
            VALUES (${promptId}, ${existingTag.id})
          `;
        }
      }
    }
    console.log('✅ Added tags:', tagNames);
    
    // Test creating variables
    const variables = ['name', 'company'];
    for (let i = 0; i < variables.length; i++) {
      await client`
        INSERT INTO prompt_variables (prompt_id, variable_name, variable_order)
        VALUES (${promptId}, ${variables[i]}, ${i})
      `;
    }
    console.log('✅ Added variables:', variables);
    
    // Test reading prompt with relations
    const [retrievedPrompt] = await client`SELECT * FROM prompts WHERE id = ${promptId}`;
    
    const promptTags = await client`
      SELECT t.name 
      FROM tags t 
      JOIN prompt_tags pt ON t.id = pt.tag_id 
      WHERE pt.prompt_id = ${promptId}
    `;
    
    const promptVariables = await client`
      SELECT variable_name 
      FROM prompt_variables 
      WHERE prompt_id = ${promptId} 
      ORDER BY variable_order
    `;
    
    console.log('✅ Retrieved prompt:', {
      id: retrievedPrompt.id,
      name: retrievedPrompt.name,
      content: retrievedPrompt.content,
      tags: promptTags.map(t => t.name),
      variables: promptVariables.map(v => v.variable_name)
    });
    
    // Test updating prompt
    const [updatedPrompt] = await client`
      UPDATE prompts 
      SET content = ${'This is an updated test prompt with raw PostgreSQL'}, updated_at = ${new Date()}, version = 2
      WHERE id = ${promptId}
      RETURNING *
    `;
    console.log('✅ Updated prompt:', updatedPrompt.content.substring(0, 50) + '...');
    
    // Test versioning
    await client`
      INSERT INTO prompt_versions (id, version, name, content, description, is_template, category, metadata, created_at, updated_at)
      VALUES (${updatedPrompt.id}, ${updatedPrompt.version}, ${updatedPrompt.name}, ${updatedPrompt.content}, ${updatedPrompt.description}, ${updatedPrompt.is_template}, ${updatedPrompt.category}, ${updatedPrompt.metadata}, ${updatedPrompt.created_at}, ${updatedPrompt.updated_at})
    `;
    
    const versions = await client`SELECT version FROM prompt_versions WHERE id = ${promptId} ORDER BY version DESC`;
    console.log('✅ Prompt versions:', versions.map(v => v.version));
    
    // Test listing prompts
    const allPrompts = await client`SELECT * FROM prompts ORDER BY updated_at DESC LIMIT 10`;
    console.log('✅ Listed prompts:', allPrompts.length);
    
    // Test filtering by category
    const testPrompts = await client`SELECT * FROM prompts WHERE category = 'testing' LIMIT 5`;
    console.log('✅ Filtered by category:', testPrompts.length);
    
    // Test filtering by tags
    const taggedPrompts = await client`
      SELECT DISTINCT p.* 
      FROM prompts p 
      JOIN prompt_tags pt ON p.id = pt.prompt_id 
      JOIN tags t ON pt.tag_id = t.id 
      WHERE t.name = 'postgres' 
      LIMIT 5
    `;
    console.log('✅ Filtered by tags:', taggedPrompts.length);
    
    // Test deleting the prompt
    await client`DELETE FROM prompt_tags WHERE prompt_id = ${promptId}`;
    await client`DELETE FROM prompt_variables WHERE prompt_id = ${promptId}`;
    await client`DELETE FROM prompt_versions WHERE id = ${promptId}`;
    await client`DELETE FROM prompts WHERE id = ${promptId}`;
    console.log('✅ Deleted prompt and all related data');
    
    console.log('🎉 All Raw PostgreSQL tests passed!');
    
  } catch (error) {
    console.error('❌ Raw PostgreSQL test failed:', error);
  } finally {
    await client.end();
  }
}

testPostgresSimple(); 