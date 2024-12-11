import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export const getTypeOrmConfig = async (configService: ConfigService): Promise<TypeOrmModuleOptions> => {
  const initScript = fs.readFileSync(
    path.join(__dirname, '../../init.sql'),
    'utf8'
  );

  return {
    type: 'postgres',
    host: configService.get('DB_HOST'),
    port: configService.get('DB_PORT'),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_DATABASE'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: true,
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsRun: true,
    migrationsTableName: 'migrations',
    afterConnect: async (connection) => {
      try {
        const hasInitialized = await connection.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'migrations'
          );
        `);

        if (!hasInitialized[0].exists) {
          await connection.query(initScript);
          
          await connection.query(`
            CREATE TABLE IF NOT EXISTS migrations (
              id SERIAL PRIMARY KEY,
              timestamp bigint NOT NULL,
              name character varying NOT NULL
            );
            
            INSERT INTO migrations (timestamp, name) 
            VALUES (${Date.now()}, 'InitialSetup1701234567890');
          `);
        }
      } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
      }
    }
  };
};