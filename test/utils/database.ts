import { Pool, PoolConfig } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

let pool: Pool;

const getPoolConfig = (): PoolConfig => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  user: process.env.DB_USER || 'postgres_test',
  password: process.env.DB_PASSWORD || 'postgres_test',
  database: process.env.DB_NAME || 'nestjs_auth_test',
  // Add some reasonable pool defaults
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function createPool(): Promise<Pool> {
  if (pool) {
    try {
      const client = await pool.connect();
      client.release();
      return pool;
    } catch (e) {
      console.log('Existing pool is invalid, creating new pool...');
    }
  }

  pool = new Pool(getPoolConfig());
  return pool;
}

async function executeSqlFile(filePath: string): Promise<void> {
  const content = fs.readFileSync(filePath, 'utf8');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    await client.query(content);
    await client.query('COMMIT');
    console.log(`Successfully executed ${path.basename(filePath)}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error executing ${path.basename(filePath)}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function setupTestDatabase() {
  try {
    console.log('Setting up test database...');
    pool = await createPool();

    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Database connection established');

    // Read and execute schema files
    const schemaDir = path.join(__dirname, '../../init-scripts');
    const schemaFiles = fs.readdirSync(schemaDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of schemaFiles) {
      const filePath = path.join(schemaDir, file);
      await executeSqlFile(filePath);
    }

    console.log('Test database setup completed successfully');
  } catch (error) {
    console.error('Failed to set up test database:', error);
    if (pool) {
      await pool.end();
      pool = null;
    }
    throw error;
  }
}

export async function cleanupTestDatabase() {
  try {
    console.log('Cleaning up test database...');
    pool = await createPool();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DROP SCHEMA public CASCADE');
      await client.query('CREATE SCHEMA public');
      await client.query('COMMIT');
      console.log('Test database cleaned up successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to clean up test database:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
      pool = null;
    }
  }
}