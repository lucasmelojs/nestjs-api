import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function maintenance() {
  const app = await NestFactory.create(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Clean expired refresh tokens
    const result = await dataSource.query(
      'SELECT clean_expired_refresh_tokens() as cleaned'
    );
    console.log(`Cleaned ${result[0].cleaned} expired refresh tokens`);

    // Add any other maintenance tasks here

  } catch (error) {
    console.error('Error during maintenance:', error);
  } finally {
    await app.close();
  }
}

maintenance();