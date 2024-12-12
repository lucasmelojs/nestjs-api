import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

let pool: Pool;

export async function setupTestDatabase() {
  try {
    // Wait for database to be ready
    await waitForDatabase();

    // Create pool
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      user: process.env.DB_USER || 'postgres_test',
      password: process.env.DB_PASSWORD || 'postgres_test',
      database: process.env.DB_NAME || 'nestjs_auth_test',
    });

    // Read and execute schema files
    const schemaDir = path.join(__dirname, '../../init-scripts');
    const schemaFiles = fs.readdirSync(schemaDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of schemaFiles) {
      const filePath = path.join(schemaDir, file);
      const schema = fs.readFileSync(filePath, 'utf8');
      await pool.query(schema);
      console.log(`Executed schema file: ${file}`);
    }

    console.log('Test database schema created successfully');
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
}

export async function cleanupTestDatabase() {
  try {
    if (!pool) {
      pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5433'),
        user: process.env.DB_USER || 'postgres_test',
        password: process.env.DB_PASSWORD || 'postgres_test',
        database: process.env.DB_NAME || 'nestjs_auth_test',
      });
    }

    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    console.log('Test database cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up test database:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

async function waitForDatabase(retries = 5, interval = 2000): Promise<void> {
  const testConnection = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    user: process.env.DB_USER || 'postgres_test',
    password: process.env.DB_PASSWORD || 'postgres_test',
    database: process.env.DB_NAME || 'nestjs_auth_test',
  });

  for (let i = 0; i < retries; i++) {
    try {
      await testConnection.query('SELECT 1');
      await testConnection.end();
      console.log('Database is ready');
      return;
    } catch (error) {
      console.log(`Database not ready, attempt ${i + 1} of ${retries}`);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
}