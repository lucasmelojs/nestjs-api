import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../src/auth/entities/user.entity';
import { Tenant } from '../src/auth/entities/tenant.entity';
import { AuthToken } from '../src/auth/entities/auth-token.entity';
import { AuthAuditLog } from '../src/auth/entities/auth-audit-log.entity';
import { Connection } from 'typeorm';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let configService: ConfigService;
  let testTenant: any;
  let testUser: any;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            host: configService.get('DB_HOST'),
            port: configService.get('DB_PORT'),
            username: configService.get('DB_USERNAME'),
            password: configService.get('DB_PASSWORD'),
            database: configService.get('DB_DATABASE'),
            entities: [User, Tenant, AuthToken, AuthAuditLog],
            synchronize: true,
          }),
          inject: [ConfigService],
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    connection = app.get(Connection);
    configService = app.get(ConfigService);

    // Create test tenant
    const tenantRepository = connection.getRepository(Tenant);
    testTenant = await tenantRepository.save({
      name: 'Test Tenant',
      domain: 'test.example.com',
    });
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await app.close();
  });

  describe('Authentication Flow', () => {
    describe('POST /auth/register', () => {
      it('should register a new user successfully', async () => {
        const registerData = {
          email: 'test@example.com',
          password: 'StrongP@ss123',
          fullName: 'Test User',
          tenantId: testTenant.id,
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toBe(registerData.email);
        expect(response.body).not.toHaveProperty('password');
        expect(response.body.tenantId).toBe(testTenant.id);

        testUser = response.body;
      });

      it('should fail to register with existing email', async () => {
        const registerData = {
          email: 'test@example.com',
          password: 'StrongP@ss123',
          fullName: 'Test User 2',
          tenantId: testTenant.id,
        };

        await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerData)
          .expect(400);
      });

      it('should fail to register with weak password', async () => {
        const registerData = {
          email: 'test2@example.com',
          password: 'weak',
          fullName: 'Test User 2',
          tenantId: testTenant.id,
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerData)
          .expect(400);

        expect(response.body.message).toContain('password');
      });
    });

    describe('POST /auth/login', () => {
      it('should login successfully', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'StrongP@ss123',
          tenantId: testTenant.id,
        };

        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send(loginData)
          .expect(200);

        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');

        accessToken = response.body.accessToken;
        refreshToken = response.body.refreshToken;
      });

      it('should fail with incorrect password', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'WrongP@ss123',
          tenantId: testTenant.id,
        };

        await request(app.getHttpServer())
          .post('/auth/login')
          .send(loginData)
          .expect(401);
      });

      it('should fail with non-existent email', async () => {
        const loginData = {
          email: 'nonexistent@example.com',
          password: 'StrongP@ss123',
          tenantId: testTenant.id,
        };

        await request(app.getHttpServer())
          .post('/auth/login')
          .send(loginData)
          .expect(401);
      });
    });

    describe('GET /auth/me', () => {
      it('should get current user profile', async () => {
        const response = await request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.id).toBe(testUser.id);
        expect(response.body.email).toBe(testUser.email);
        expect(response.body).not.toHaveProperty('password');
      });

      it('should fail with invalid token', async () => {
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });

      it('should fail without token', async () => {
        await request(app.getHttpServer())
          .get('/auth/me')
          .expect(401);
      });
    });

    describe('POST /auth/refresh-token', () => {
      it('should refresh tokens successfully', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/refresh-token')
          .send({ refreshToken })
          .expect(200);

        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
        expect(response.body.accessToken).not.toBe(accessToken);
        expect(response.body.refreshToken).not.toBe(refreshToken);

        // Update tokens for subsequent tests
        accessToken = response.body.accessToken;
        refreshToken = response.body.refreshToken;
      });

      it('should fail with invalid refresh token', async () => {
        await request(app.getHttpServer())
          .post('/auth/refresh-token')
          .send({ refreshToken: 'invalid-token' })
          .expect(401);
      });
    });

    describe('POST /auth/change-password', () => {
      it('should change password successfully', async () => {
        const changePasswordData = {
          currentPassword: 'StrongP@ss123',
          newPassword: 'NewStrongP@ss123',
        };

        await request(app.getHttpServer())
          .post('/auth/change-password')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(changePasswordData)
          .expect(200);

        // Verify can login with new password
        const loginData = {
          email: 'test@example.com',
          password: 'NewStrongP@ss123',
          tenantId: testTenant.id,
        };

        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send(loginData)
          .expect(200);

        expect(loginResponse.body).toHaveProperty('accessToken');
      });

      it('should fail with incorrect current password', async () => {
        const changePasswordData = {
          currentPassword: 'WrongP@ss123',
          newPassword: 'NewStrongP@ss456',
        };

        await request(app.getHttpServer())
          .post('/auth/change-password')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(changePasswordData)
          .expect(401);
      });
    });

    describe('POST /auth/logout', () => {
      it('should logout successfully', async () => {
        await request(app.getHttpServer())
          .post('/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        // Verify token is invalidated
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(401);
      });
    });

    describe('POST /auth/forgot-password', () => {
      it('should initiate password reset successfully', async () => {
        await request(app.getHttpServer())
          .post('/auth/forgot-password')
          .send({ email: 'test@example.com', tenantId: testTenant.id })
          .expect(200);
      });

      it('should handle non-existent email gracefully', async () => {
        await request(app.getHttpServer())
          .post('/auth/forgot-password')
          .send({ email: 'nonexistent@example.com', tenantId: testTenant.id })
          .expect(200); // For security, should return 200 even if email doesn't exist
      });
    });

    describe('POST /auth/reset-password', () => {
      let resetToken: string;

      beforeAll(async () => {
        // Get reset token from database for testing
        const userRepository = connection.getRepository(User);
        const user = await userRepository.findOne({ where: { email: 'test@example.com' } });
        const authTokenRepository = connection.getRepository(AuthToken);
        const tokenRecord = await authTokenRepository.save({
          userId: user.id,
          type: 'password_reset',
          expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        });
        resetToken = tokenRecord.token;
      });

      it('should reset password successfully', async () => {
        const resetPasswordData = {
          token: resetToken,
          newPassword: 'ResetP@ss123',
        };

        await request(app.getHttpServer())
          .post('/auth/reset-password')
          .send(resetPasswordData)
          .expect(200);

        // Verify can login with new password
        const loginData = {
          email: 'test@example.com',
          password: 'ResetP@ss123',
          tenantId: testTenant.id,
        };

        await request(app.getHttpServer())
          .post('/auth/login')
          .send(loginData)
          .expect(200);
      });

      it('should fail with invalid reset token', async () => {
        const resetPasswordData = {
          token: 'invalid-token',
          newPassword: 'ResetP@ss456',
        };

        await request(app.getHttpServer())
          .post('/auth/reset-password')
          .send(resetPasswordData)
          .expect(400);
      });
    });
  });
});
