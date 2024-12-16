import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { User } from './auth/entities/user.entity';
import { AuthToken } from './auth/entities/auth-token.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [User, AuthToken],
        synchronize: false, // Set to true only for development
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        limit: 3,
        ttlInSeconds: 60,
      },
      {
        name: 'medium',
        limit: 20,
        ttlInSeconds: 60 * 60,
      },
      {
        name: 'long',
        limit: 100,
        ttlInSeconds: 60 * 60 * 24,
      },
    ]),
    AuthModule,
  ],
})
export class AppModule {}
