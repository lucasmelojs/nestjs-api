-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create custom parameter for tenant isolation
ALTER DATABASE nestjs_db SET app.tenant_id = '';

-- Create function to hash password using pgcrypto
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(password, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify password
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hashed_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN encode(digest(password, 'sha256'), 'hex') = hashed_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;