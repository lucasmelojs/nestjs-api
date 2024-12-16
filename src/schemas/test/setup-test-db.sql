-- Create test role if not exists (with password)
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'postgres_test') THEN
      CREATE ROLE postgres_test WITH LOGIN PASSWORD 'postgres_test';
   END IF;
END
$do$;

-- Grant needed privileges to the test role
ALTER ROLE postgres_test WITH CREATEDB;

-- Drop test database if exists
DROP DATABASE IF EXISTS nestjs_auth_test;

-- Create test database
CREATE DATABASE nestjs_auth_test WITH OWNER = postgres_test;

-- Connect to test database
\c nestjs_auth_test;

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Grant all privileges on test database to test role
GRANT ALL PRIVILEGES ON DATABASE nestjs_auth_test TO postgres_test;

-- Create tables
CREATE TABLE IF NOT EXISTS tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- Grant privileges on all tables to test role
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres_test;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres_test;

-- Insert test data
INSERT INTO tenants (name, domain, status) VALUES
('Test Tenant', 'test.com', 'active');

-- Add test user with password: TestPass123!
INSERT INTO users (tenant_id, email, password_hash, full_name, status) VALUES
((SELECT id FROM tenants WHERE domain = 'test.com'),
'test@example.com',
crypt('TestPass123!', gen_salt('bf', 10)),
'Test User',
'active');
