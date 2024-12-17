import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    host: configService.get('DB_HOST', 'localhost'),
    port: configService.get('DB_PORT', 5432),
    username: configService.get('DB_USERNAME', 'postgres'),
    password: configService.get('DB_PASSWORD', 'postgres'),
    database: configService.get('DB_DATABASE', 'nestjs_auth'),
    entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
    migrations: [join(__dirname, '..', 'database', 'migrations', '*{.ts,.js}')],
    migrationsRun: configService.get('DB_MIGRATIONS_RUN', true),
    synchronize: configService.get('NODE_ENV') === 'development',
    logging: configService.get('DB_LOGGING', true),
    maxQueryExecutionTime: configService.get('DB_MAX_QUERY_TIME', 1000),
    ssl: configService.get('DB_SSL', false) 
      ? {
          rejectUnauthorized: false
        } 
      : false,
    extra: {
      max: configService.get('DB_MAX_CONNECTIONS', 100),
      connectionTimeoutMillis: configService.get('DB_TIMEOUT', 2000)
    },
    autoLoadEntities: true,
  };
};
