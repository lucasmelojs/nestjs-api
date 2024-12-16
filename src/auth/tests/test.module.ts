import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { testTypeOrmConfig } from '../../config/test.config';
import { AuthService } from '../auth.service';
import { User } from '../entities/user.entity';
import { AuthToken } from '../entities/auth-token.entity';
import { Tenant } from '../entities/tenant.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.test',
    }),
    TypeOrmModule.forRootAsync(testTypeOrmConfig),
    TypeOrmModule.forFeature([User, AuthToken, Tenant]),
    JwtModule.register({
      secret: 'test-secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [AuthService],
  exports: [AuthService, TypeOrmModule],
})
export class TestModule {}
