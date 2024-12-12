# NestJS API with pgcrypto Authentication

This project is a secure NestJS API using PostgreSQL's pgcrypto for password hashing and token management.

## Features

- Secure password hashing using pgcrypto
- JWT authentication with refresh tokens
- Role-based access control
- Automatic database initialization
- Docker support
- Environment validation

## Prerequisites

- Node.js (v18 or later)
- PostgreSQL (v15 or later)
- Docker (optional)

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd nestjs-api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configurations
```

4. Start the database:
```bash
# Using Docker
npm run docker:db

# Or fresh start (will remove existing data)
npm run docker:db:fresh
```

5. Start the application:
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoints

### Authentication

```bash
# Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "secure_password",
  "role": "user"  # Optional, defaults to 'user'
}

# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "secure_password"
}

# Refresh Token
POST /api/auth/refresh
Headers: Authorization: Bearer <refresh_token>

# Logout
POST /api/auth/logout
Headers: Authorization: Bearer <access_token>

# Get Profile
GET /api/auth/profile
Headers: Authorization: Bearer <access_token>
```

## Database Management

```bash
# Check database status
npm run db:check

# Start fresh database
npm run docker:db:fresh

# Start existing database
npm run docker:db
```

## Security Features

### Password Hashing
Passwords are hashed using PostgreSQL's pgcrypto extension with the following features:
- Blowfish encryption (bf)
- Salt rounds: 8
- Server-side hashing
- Security definer functions

### Token Management
- Access tokens: 15 minutes expiration
- Refresh tokens: 7 days expiration
- Secure token storage with pgcrypto
- Automatic token cleanup

### Database Security
- All sensitive operations use SECURITY DEFINER
- Password operations happen at database level
- Proper parameter binding
- Role-based access control

## Testing

```bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Docker Support

The project includes Docker configuration for PostgreSQL:

```bash
# Start PostgreSQL container
docker-compose up postgres -d

# Stop containers
docker-compose down

# Remove volumes and start fresh
docker-compose down -v && docker-compose up postgres -d
```

## Database Functions

The following PostgreSQL functions are available:

### Authentication
- `encrypt_password(password TEXT)` - Encrypts a password
- `verify_password(password TEXT, hashed_password TEXT)` - Verifies a password
- `update_refresh_token(user_id UUID, new_refresh_token TEXT)` - Updates refresh token
- `register_user(email TEXT, password TEXT, role user_role)` - Registers a new user

### Maintenance
- `clean_expired_refresh_tokens()` - Removes expired refresh tokens
- `update_updated_at_column()` - Automatically updates timestamps

## Environment Variables

```env
# Application
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=nestjs_api

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

## Contributing

1. Create a feature branch
2. Commit your changes
3. Push to the branch
4. Create a Pull Request

## License

This project is licensed under the MIT License.
