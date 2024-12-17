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

  const testTenant = {
    name: 'Test Tenant',
    domain: 'test.com',
    status: 'active'
  };

  // Define the registration DTO type
  interface RegisterUserDto {
    email: string;
    password: string;
    fullName: string;
    tenant?: Tenant;
  }

  const testUser: RegisterUserDto = {
    email: 'test@test.com',
    password: 'Test@123456',
    fullName: 'Test User'
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

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          fullName: testUser.fullName,
          tenantId: tenant.id
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(testUser.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should fail to register with invalid email', async () => {
      const tenant = await tenantRepository.save(testTenant);

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: testUser.password,
          fullName: testUser.fullName,
          tenantId: tenant.id
        })
        .expect(400);
    });

    it('should fail to register with weak password', async () => {
      const tenant = await tenantRepository.save(testTenant);

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUser.email,
          password: '123',
          fullName: testUser.fullName,
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
        [testUser.password]
      ))[0].hash;
      await queryRunner.release();

      await userRepository.save({
        ...testUser,
        password: hashedPassword,
        tenant
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should fail to login with incorrect password', async () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);
    });

    it('should fail to login with non-existent email', async () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: testUser.password
        })
        .expect(401);
    });
  });

  describe('/auth/me (GET)', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Setup user and get token
      const tenant = await tenantRepository.save(testTenant);
      
      const queryRunner = connection.createQueryRunner();
      const hashedPassword = (await queryRunner.query(
        `SELECT crypt($1, gen_salt('bf', 10)) as hash`,
        [testUser.password]
      ))[0].hash;
      await queryRunner.release();

      await userRepository.save({
        ...testUser,
        password: hashedPassword,
        tenant
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      accessToken = loginResponse.body.accessToken;
    });

    it('should get current user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.email).toBe(testUser.email);
      expect(response.body.fullName).toBe(testUser.fullName);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should fail to get profile without token', async () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });
  });

  describe('/auth/refresh-token (POST)', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Setup user and get tokens
      const tenant = await tenantRepository.save(testTenant);
      
      const queryRunner = connection.createQueryRunner();
      const hashedPassword = (await queryRunner.query(
        `SELECT crypt($1, gen_salt('bf', 10)) as hash`,
        [testUser.password]
      ))[0].hash;
      await queryRunner.release();

      await userRepository.save({
        ...testUser,
        password: hashedPassword,
        tenant
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh tokens successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.refreshToken).not.toBe(refreshToken);
    });

    it('should fail with invalid refresh token', async () => {
      return request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  // ... rest of the test file remains the same
});
