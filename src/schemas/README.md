# Database Schemas

## Schema Files

1. `01-init.sql`: Initial database schema
   - Creates tables
   - Sets up indexes
   - Enables row-level security
   - Configures constraints

2. `02-test-data.sql`: Test data for development
   - Creates test tenant
   - Creates test user
   - Includes test credentials

## Test Credentials

```
Email: test@example.com
Password: Password123!
```

## How to Apply

### Using Docker

```bash
# Connect to postgres container
docker-compose exec postgres psql -U postgres -d nestjs_auth

# Apply schemas
\i /usr/src/app/src/schemas/01-init.sql
\i /usr/src/app/src/schemas/02-test-data.sql
```

### Using psql

```bash
psql -U postgres -d nestjs_auth -f src/schemas/01-init.sql
psql -U postgres -d nestjs_auth -f src/schemas/02-test-data.sql
```

## Testing Authentication

1. Login to get tokens:
   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Password123!"
     }'
   ```

2. Use the access token for other endpoints:
   ```bash
   curl -X GET http://localhost:3000/auth/me \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

Or use the Swagger UI at `http://localhost:3000/api`
