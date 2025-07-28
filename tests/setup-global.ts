import { testDbManager } from './test-setup.js';

// Global setup - runs once before all tests
beforeAll(async () => {
  console.log('Starting test database for all tests...');
  await testDbManager.startTestDatabase();
  await testDbManager.connect();
}, 60000); // 60 second timeout for database startup

// Global teardown - runs once after all tests
afterAll(async () => {
  console.log('Stopping test database...');
  // Add a small delay to ensure all tests have finished
  await new Promise(resolve => setTimeout(resolve, 1000));
  await testDbManager.disconnect();
  await testDbManager.stopTestDatabase();
}, 30000); // 30 second timeout for database shutdown 