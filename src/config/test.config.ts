import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { AuthToken } from '../auth/entities/auth-token.entity';
import { Tenant } from '../auth/entities/tenant.entity';

export const testConfig = {
  type: 'postgres' as const,
  host: 'localhost',
  port: 5432,
  username: 'postgres_test',
  password: 'postgres_test',
  database: 'nestjs_auth_test',
  autoLoadEntities: true,
  synchronize: true, // Be careful with this in production
  entities: [User, AuthToken, Tenant],
};

export const testTypeOrmConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    ...testConfig,
    host: configService.get('DB_HOST', 'localhost'),
    port: configService.get('DB_PORT', 5432),
    username: configService.get('DB_TEST_USER', 'postgres_test'),
    password: configService.get('DB_TEST_PASSWORD', 'postgres_test'),
    database: configService.get('DB_TEST_NAME', 'nestjs_auth_test'),
  }),
  inject: [ConfigService],
};
