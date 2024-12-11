# NestJS Multi-Tenant API with PostgreSQL

This is a secure, multi-tenant REST API built with NestJS, featuring PostgreSQL with pgcrypto for password management and Docker for containerization.

## Features

- 🔐 Multi-tenant authentication
- 🛡️ Row Level Security (RLS) for tenant isolation
- 🔒 PostgreSQL pgcrypto for password management
- 🎫 JWT-based authentication
- 🐋 Docker and Docker Compose setup
- 🔄 Hot reload for development

## Prerequisites

- Docker and Docker Compose
- Node.js 18 or higher
- npm or yarn

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/lucasmelojs/nestjs-api.git
cd nestjs-api
```

2. Copy the environment file:
```bash
cp .env.example .env
```

3. Update the environment variables in `.env` with your settings

4. Start the containers:
```bash
docker-compose up -d
```

5. Run database migrations:
```bash
docker-compose exec api npm run migration:run
```

The API will be available at `http://localhost:3000`

## Project Structure

```
├── src/
│   ├── auth/                 # Authentication module
│   ├── config/              # Configuration files
│   ├── migrations/          # Database migrations
│   ├── shared/              # Shared modules and utilities
│   ├── tenants/             # Tenant management
│   └── users/               # User management
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile              # Docker container definition
└── init.sql                # Initial database setup
```

## Authentication

The API uses JWT tokens for authentication. Each request must include:

- `Authorization: Bearer <token>` header for authentication
- `x-tenant-id: <tenant-id>` header for tenant context

### Example Login Request

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: your-tenant-id" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'
```

## Database Security

- Uses PostgreSQL's pgcrypto for password management
- Implements Row Level Security (RLS) for tenant isolation
- Custom functions for password hashing and verification

## Development

### Running Tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

### Database Migrations

Create a new migration:
```bash
npm run migration:create -- -n YourMigrationName
```

Run migrations:
```bash
npm run migration:run
```

Revert migrations:
```bash
npm run migration:revert
```

## Docker Commands

Build and start containers:
```bash
docker-compose up -d --build
```

View logs:
```bash
docker-compose logs -f api
```

Stop containers:
```bash
docker-compose down
```

Rebuild a specific service:
```bash
docker-compose up -d --build api
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|----------|
| PORT | API port | 3000 |
| NODE_ENV | Environment | development |
| DB_HOST | Database host | postgres |
| DB_PORT | Database port | 5432 |
| DB_USERNAME | Database user | postgres |
| DB_PASSWORD | Database password | postgres |
| DB_DATABASE | Database name | nestjs_db |
| JWT_SECRET | JWT secret key | - |
| JWT_EXPIRATION | JWT expiration | 1h |

## Security Features

1. **Multi-Tenant Isolation**
   - Row Level Security (RLS)
   - Tenant-specific database schemas
   - Request context isolation

2. **Password Security**
   - pgcrypto for password hashing
   - Secure password verification
   - No plain-text password storage

3. **Authentication**
   - JWT-based authentication
   - Token expiration
   - Role-based access control

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository.
