import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { Connection, Repository } from 'typeorm';
import { User } from '../src/auth/entities/user.entity';
import { Tenant } from '../src/tenants/entities/tenant.entity';
import { AuthToken } from '../src/auth/entities/auth-token.entity';
import { ConfigService } from '@nestjs/config';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let userRepository: Repository<User>;
  let tenantRepository: Repository<Tenant>;
  let authTokenRepository: Repository<AuthToken>;
  let configService: ConfigService;

  // Test data interfaces
  interface RegisterDto {
    email: string;
    password: string;
    fullName: string;
    tenant?: Tenant;
  }

  interface LoginDto {
    email: string;
    password: string;
  }

  const testTenant = {
    name: 'Test Tenant',
    domain: 'test.com',
    status: 'active'
  };

  const testUserData: RegisterDto = {
    email: 'test@test.com',
    password: 'Test@123456',
    fullName: 'Test User'
  };

  const loginData: LoginDto = {
    email: 'test@test.com',
    password: 'Test@123456'
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    connection = app.get(Connection);
    userRepository = connection.getRepository(User);
    tenantRepository = connection.getRepository(Tenant);
    authTokenRepository = connection.getRepository(AuthToken);
    configService = app.get(ConfigService);

    await app.init();

    // Clean up database before tests
    await connection.dropDatabase();
    await connection.synchronize();
  });

  beforeEach(async () => {
    // Clean repositories before each test
    await authTokenRepository.clear();
    await userRepository.clear();
    await tenantRepository.clear();
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully', async () => {
      // First create a tenant
      const tenant = await tenantRepository.save(testTenant);

      const registerPayload = {
        ...testUserData,
        tenantId: tenant.id
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerPayload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(testUserData.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should fail to register with invalid email', async () => {
      const tenant = await tenantRepository.save(testTenant);

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUserData,
          email: 'invalid-email',
          tenantId: tenant.id
        })
        .expect(400);
    });

    it('should fail to register with weak password', async () => {
      const tenant = await tenantRepository.save(testTenant);

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUserData,
          password: '123',
          tenantId: tenant.id
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      // Create tenant and user before login tests
      const tenant = await tenantRepository.save(testTenant);
      
      const queryRunner = connection.createQueryRunner();
      const hashedPassword = (await queryRunner.query(
        `SELECT crypt($1, gen_salt('bf', 10)) as hash`,
        [testUserData.password]
      ))[0].hash;
      await queryRunner.release();

      await userRepository.save({
        ...testUserData,
        password: hashedPassword,
        tenant
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should fail to login with incorrect password', async () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          ...loginData,
          password: 'wrongpassword'
        })
        .expect(401);
    });

    it('should fail to login with non-existent email', async () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          ...loginData,
          email: 'nonexistent@test.com'
        })
        .expect(401);
    });
  });