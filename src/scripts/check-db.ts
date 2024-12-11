import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function checkDatabase() {
  const app = await NestFactory.create(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Check database connection
    const isConnected = dataSource.isInitialized;
    console.log('Database connection:', isConnected ? 'OK' : 'Failed');

    if (isConnected) {
      // Check extensions
      const extensions = await dataSource.query(`
        SELECT extname FROM pg_extension;
      `);
      console.log('\nInstalled extensions:');
      extensions.forEach((ext: any) => console.log(`- ${ext.extname}`));

      // Check database functions
      const functions = await dataSource.query(`
        SELECT proname, prosecdef
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace;
      `);
      console.log('\nDatabase functions:');
      functions.forEach((func: any) => {
        console.log(`- ${func.proname} (SECURITY ${func.prosecdef ? 'DEFINER' : 'INVOKER'})`);
      });

      // Check migrations
      const migrations = await dataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'migrations'
        );
      `);
      console.log('\nMigrations table:', migrations[0].exists ? 'Exists' : 'Not found');

      // Check users table
      const users = await dataSource.query(`
        SELECT COUNT(*) as count FROM users;
      `);
      console.log('Users in database:', users[0].count);

      // Check refresh tokens
      const tokens = await dataSource.query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE refresh_token IS NOT NULL;
      `);
      console.log('Active refresh tokens:', tokens[0].count);
    }
  } catch (error) {
    console.error('Error checking database:', error.message);
  } finally {
    await app.close();
  }
}

checkDatabase();
