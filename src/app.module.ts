import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { TenantMiddleware } from './shared/middlewares/tenant.middleware';
import { databaseConfig } from './config/database.config';
import { SeedService } from './config/seed.config';
import { Tenant } from './tenants/tenant.entity';
import { User } from './users/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([Tenant, User]), // Add entities for seed service
    AuthModule,
    UsersModule,
    TenantsModule,
  ],
  providers: [SeedService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'api/docs', method: RequestMethod.GET },
        { path: 'api/docs/(.*)', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}