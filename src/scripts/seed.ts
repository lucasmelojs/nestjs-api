import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function seed() {
  const app = await NestFactory.create(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Create admin user
    await dataSource.query(`
      SELECT register_user('admin@example.com', 'admin123', 'admin');
    `);

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error.message);
  } finally {
    await app.close();
  }
}

seed();
