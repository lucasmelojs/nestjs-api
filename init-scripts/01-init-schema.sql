-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types for better status management
CREATE TYPE tenant_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');

-- Create tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    status tenant_status DEFAULT 'active',
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger function for updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to tenants table
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenantId UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    passwordHash TEXT NOT NULL,
    firstName VARCHAR(100),
    lastName VARCHAR(100),
    status user_status DEFAULT 'pending',
    emailVerified BOOLEAN DEFAULT false,
    lastLoginAt TIMESTAMPTZ,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenantId, email)
);

-- Add trigger to users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to hash password using pgcrypto
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify password
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hashed_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hashed_password = crypt(password, hashed_password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes
CREATE INDEX idx_users_tenant_email ON users(tenantId, email);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_tenants_slug ON tenants(slug);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY tenant_isolation_policy ON users
    FOR ALL
    USING (tenantId = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_self_policy ON tenants
    FOR ALL
    USING (id = current_setting('app.current_tenant_id')::UUID);

-- Comments for better documentation
COMMENT ON TABLE tenants IS 'Stores organization/tenant information for multi-tenant setup';
COMMENT ON TABLE users IS 'Stores user information with tenant relationship';
COMMENT ON FUNCTION hash_password IS 'Securely hashes passwords using pgcrypto''s blowfish algorithm';
COMMENT ON FUNCTION verify_password IS 'Verifies a password against its hash using pgcrypto';