import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getConnection } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  try {
    const connection = getConnection();
    const hasInitialized = await connection.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);
    
    console.log('Database status:', hasInitialized[0].exists ? 'Initialized' : 'Not initialized');
  } catch (error) {
    console.error('Database check failed:', error);
  } finally {
    await app.close();
  }
}

bootstrap();