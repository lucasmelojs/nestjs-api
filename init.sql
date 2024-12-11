-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types and domains
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    refresh_token TEXT,
    role user_role DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Function to encrypt password using pgcrypto
CREATE OR REPLACE FUNCTION encrypt_password(password TEXT) 
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 8));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify password
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hashed_password TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hashed_password = crypt(password, hashed_password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to register a new user
CREATE OR REPLACE FUNCTION register_user(
    user_email VARCHAR(255),
    user_password TEXT,
    user_role user_role DEFAULT 'user'
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    INSERT INTO users (email, password, role)
    VALUES (user_email, encrypt_password(user_password), user_role)
    RETURNING id INTO new_user_id;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update refresh token
CREATE OR REPLACE FUNCTION update_refresh_token(
    user_id UUID,
    new_refresh_token TEXT
) RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET refresh_token = 
        CASE 
            WHEN new_refresh_token IS NULL THEN NULL 
            ELSE encrypt_password(new_refresh_token)
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate login
CREATE OR REPLACE FUNCTION validate_login(
    login_email VARCHAR(255),
    login_password TEXT
) RETURNS TABLE (
    user_id UUID,
    user_email VARCHAR(255),
    user_role user_role
) AS $$
BEGIN
    RETURN QUERY
    SELECT id, email, role
    FROM users
    WHERE email = login_email 
    AND verify_password(login_password, password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Function to clean expired refresh tokens
CREATE OR REPLACE FUNCTION clean_expired_refresh_tokens()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    WITH updated_rows AS (
        UPDATE users
        SET refresh_token = NULL
        WHERE refresh_token IS NOT NULL
        AND updated_at < (CURRENT_TIMESTAMP - INTERVAL '7 days')
        RETURNING *
    )
    SELECT COUNT(*) INTO cleaned_count FROM updated_rows;
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user by refresh token
CREATE OR REPLACE FUNCTION get_user_by_refresh_token(
    token TEXT
) RETURNS TABLE (
    user_id UUID,
    user_email VARCHAR(255),
    user_role user_role
) AS $$
BEGIN
    RETURN QUERY
    SELECT id, email, role
    FROM users
    WHERE verify_password(token, refresh_token);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO current_user;