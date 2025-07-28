export const TEST_DB_CONFIG = {
  host: 'localhost',
  port: 5433, // Same port as main database
  database: 'mcp_prompts_test', // Different database name
  user: 'mcp_user',
  password: 'mcp_password_123',
};

export const TEST_DB_URL = `postgresql://${TEST_DB_CONFIG.user}:${TEST_DB_CONFIG.password}@${TEST_DB_CONFIG.host}:${TEST_DB_CONFIG.port}/${TEST_DB_CONFIG.database}`;

// Environment variables for test database
export const TEST_ENV = {
  DB_HOST: TEST_DB_CONFIG.host,
  DB_PORT: TEST_DB_CONFIG.port.toString(),
  DB_NAME: TEST_DB_CONFIG.database,
  DB_USER: TEST_DB_CONFIG.user,
  DB_PASSWORD: TEST_DB_CONFIG.password,
}; 