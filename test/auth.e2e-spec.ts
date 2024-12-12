import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { setupTestDatabase, cleanupTestDatabase } from './utils/database';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let dbService: DatabaseService;

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

    // Get database service
    dbService = moduleFixture.get<DatabaseService>(DatabaseService);
    
    try {
      // Clean up any existing test data
      await dbService.query('DELETE FROM users WHERE email = $1', [testUser.email]);
      await dbService.query('DELETE FROM tenants WHERE slug = $1', [testTenant.slug]);

      // Create test tenant
      const { rows: [tenant] } = await dbService.query(
        'INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id',
        [testTenant.name, testTenant.slug],
      );
      testUser.tenantId = tenant.id;
    } catch (error) {
      console.error('Error in test setup:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Cleanup test data
      await dbService.query('DELETE FROM users WHERE email = $1', [testUser.email]);
      await dbService.query('DELETE FROM tenants WHERE slug = $1', [testTenant.slug]);
      await app.close();
      // Clean up database schema
      await cleanupTestDatabase();
    } catch (error) {
      console.error('Error in test cleanup:', error);
      throw error;
    }
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).toHaveProperty('email', testUser.email);
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
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
          tenantId: testUser.tenantId,
        });

      expect(response.body.data).toHaveProperty('accessToken');
      accessToken = response.body.data.accessToken;
    });

    it('should get current user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('email', testUser.email);
      expect(response.body.data).toHaveProperty('firstName', testUser.firstName);
      expect(response.body.data).toHaveProperty('lastName', testUser.lastName);
    });

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });
  });
});