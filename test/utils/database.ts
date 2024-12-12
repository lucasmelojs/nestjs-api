import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export async function setupTestDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    user: process.env.DB_USER || 'postgres_test',
    password: process.env.DB_PASSWORD || 'postgres_test',
    database: process.env.DB_NAME || 'nestjs_auth_test',
  });

  try {
    // Read and execute schema files
    const schemaDir = path.join(__dirname, '../../init-scripts');
    const schemaFiles = fs.readdirSync(schemaDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure correct order

    for (const file of schemaFiles) {
      const filePath = path.join(schemaDir, file);
      const schema = fs.readFileSync(filePath, 'utf8');
      await pool.query(schema);
    }

    console.log('Test database schema created successfully');
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

export async function cleanupTestDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    user: process.env.DB_USER || 'postgres_test',
    password: process.env.DB_PASSWORD || 'postgres_test',
    database: process.env.DB_NAME || 'nestjs_auth_test',
  });

  try {
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    console.log('Test database cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up test database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}