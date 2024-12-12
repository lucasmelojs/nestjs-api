import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupTestDatabase, cleanupTestDatabase, getTestDbClient } from './utils/database';
import { Pool } from 'pg';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let dbPool: Pool;

  const testTenant = {
    name: 'Test Tenant',
    slug: 'test-tenant',
  };

  const testUser = {
    email: 'test@example.com',
    password: 'Password123!',
    firstName: 'John',
    lastName: 'Doe',
    tenantId: '' // Will be set after tenant creation
  };

  beforeAll(async () => {
    // Setup test database schema
    await setupTestDatabase();
    dbPool = await getTestDbClient();

    // Create the testing module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Create and configure the app
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    try {
      // Clean up any existing test data
      await dbPool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
      await dbPool.query('DELETE FROM tenants WHERE slug = $1', [testTenant.slug]);

      // Create test tenant
      const { rows: [tenant] } = await dbPool.query(
        'INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id',
        [testTenant.name, testTenant.slug],
      );
      testUser.tenantId = tenant.id;
      console.log('Test tenant created:', tenant);
    } catch (error) {
      console.error('Error in test setup:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Cleanup test data
      if (dbPool) {
        await dbPool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
        await dbPool.query('DELETE FROM tenants WHERE slug = $1', [testTenant.slug]);
      }
      if (app) {
        await app.close();
      }
      // Clean up database schema
      await cleanupTestDatabase();
    } catch (error) {
      console.error('Error in test cleanup:', error);
      throw error;
    }
  });

  describe('/auth/register (POST)', () => {
    let userId: string;

    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).toHaveProperty('email', testUser.email);
      
      // Store the user ID for verification
      userId = response.body.data.user.id;
      console.log('User registered successfully with ID:', userId);

      // Verify user exists in database
      const { rows: [user] } = await dbPool.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      expect(user).toBeTruthy();
      expect(user.email).toBe(testUser.email);
    });

    it('should fail to register with existing email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(409);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
          tenantId: testUser.tenantId,
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).toHaveProperty('email', testUser.email);

      // Verify user in database
      const { rows: [user] } = await dbPool.query(
        'SELECT * FROM users WHERE email = $1 AND tenant_id = $2',
        [testUser.email, testUser.tenantId]
      );
      expect(user).toBeTruthy();
      console.log('User verified in database before login test');
    });

    it('should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
          tenantId: testUser.tenantId,
        })
        .expect(401);
    });
  });

  describe('/auth/me (GET)', () => {
    let accessToken: string;

    beforeAll(async () => {
      console.log('Getting access token for /me endpoint test');
      
      // Verify user exists before login
      const { rows: [user] } = await dbPool.query(
        'SELECT * FROM users WHERE email = $1 AND tenant_id = $2',
        [testUser.email, testUser.tenantId]
      );
      expect(user).toBeTruthy();
      console.log('User verified in database before getting token');

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
          tenantId: testUser.tenantId,
        });

      expect(loginResponse.body.data).toHaveProperty('accessToken');
      accessToken = loginResponse.body.data.accessToken;
      console.log('Access token received:', accessToken);
    });

    it('should get current user profile', async () => {
      // Verify user exists before /me request
      const { rows: [user] } = await dbPool.query(
        'SELECT * FROM users WHERE email = $1 AND tenant_id = $2',
        [testUser.email, testUser.tenantId]
      );
      expect(user).toBeTruthy();
      console.log('User verified in database before /me request');

      console.log('Testing /me endpoint with token:', accessToken);
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('email', testUser.email);
      expect(response.body.data).toHaveProperty('firstName', testUser.firstName);
      expect(response.body.data).toHaveProperty('lastName', testUser.lastName);
      console.log('User profile retrieved successfully');
    });

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });
  });
});