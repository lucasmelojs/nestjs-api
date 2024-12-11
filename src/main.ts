import { NestFactory } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { winstonConfig, logStartupMessage } from './config/winston.config';

async function bootstrap() {
  // Create the app with Winston logger
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('NestJS Multi-Tenant API')
    .setDescription(`
      🚀 Welcome to the NestJS Multi-Tenant API Documentation!

      This API provides a secure, multi-tenant system with the following features:
      - 🔐 Multi-tenant authentication using JWT
      - 🛡️ Row Level Security (RLS) for tenant isolation
      - 🔒 PostgreSQL pgcrypto for password management
      - 👥 User management per tenant
      - 🏢 Tenant management

      ## Authentication
      All endpoints (except /auth/login) require:
      - Bearer token authentication
      - x-tenant-id header

      ## Getting Started
      1. Create a tenant
      2. Create a user in the tenant
      3. Login to get JWT token
      4. Use the token for authenticated requests
    `)
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-tenant-id',
        in: 'header',
        description: 'Enter your tenant ID',
      },
      'tenant-id',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Add custom CSS to Swagger UI
  const customOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'NestJS Multi-Tenant API Docs',
  };

  SwaggerModule.setup('api/docs', app, document, customOptions);

  // Enable CORS
  app.enableCors();

  // Parse PORT environment variable to number with fallback
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);

  // Log startup message
  await logStartupMessage(port);
}

bootstrap();