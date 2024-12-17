-- Seed script for tenants and users

-- Function to generate consistent UUIDs for testing
CREATE OR REPLACE FUNCTION generate_test_uuid(seed text) RETURNS uuid AS $$
BEGIN
    RETURN md5(seed)::uuid;
END;
$$ LANGUAGE plpgsql;

-- Insert sample tenants
INSERT INTO tenants (id, name, domain, status, created_at, updated_at)
VALUES
    (generate_test_uuid('tenant1'), 'Acme Corporation', 'acme.example.com', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (generate_test_uuid('tenant2'), 'TechStart Inc', 'techstart.example.com', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (generate_test_uuid('tenant3'), 'Global Services Ltd', 'globalservices.example.com', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Insert sample users with pgcrypto hashed passwords
-- Default password for all test users is 'Password123!'
INSERT INTO users (id, tenant_id, email, password_hash, full_name, status, last_login, created_at, updated_at)
VALUES
    -- Acme Corporation Users
    (
        generate_test_uuid('user1'),
        (SELECT id FROM tenants WHERE domain = 'acme.example.com'),
        'admin@acme.example.com',
        crypt('Password123!', gen_salt('bf', 10)),
        'John Admin',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        generate_test_uuid('user2'),
        (SELECT id FROM tenants WHERE domain = 'acme.example.com'),
        'user@acme.example.com',
        crypt('Password123!', gen_salt('bf', 10)),
        'Jane User',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),

    -- TechStart Inc Users
    (
        generate_test_uuid('user3'),
        (SELECT id FROM tenants WHERE domain = 'techstart.example.com'),
        'admin@techstart.example.com',
        crypt('Password123!', gen_salt('bf', 10)),
        'Mike Admin',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        generate_test_uuid('user4'),
        (SELECT id FROM tenants WHERE domain = 'techstart.example.com'),
        'user@techstart.example.com',
        crypt('Password123!', gen_salt('bf', 10)),
        'Sarah User',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),

    -- Global Services Ltd Users
    (
        generate_test_uuid('user5'),
        (SELECT id FROM tenants WHERE domain = 'globalservices.example.com'),
        'admin@globalservices.example.com',
        crypt('Password123!', gen_salt('bf', 10)),
        'David Admin',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        generate_test_uuid('user6'),
        (SELECT id FROM tenants WHERE domain = 'globalservices.example.com'),
        'user@globalservices.example.com',
        crypt('Password123!', gen_salt('bf', 10)),
        'Emma User',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT DO NOTHING;

-- Insert sample audit logs for user creation
INSERT INTO auth_audit_logs (id, user_id, tenant_id, action, ip_address, user_agent, created_at)
SELECT 
    generate_test_uuid(u.email || '_creation_log'),
    u.id,
    u.tenant_id,
    'USER_CREATED',
    '127.0.0.1'::inet,
    'Seed Script',
    u.created_at
FROM users u
ON CONFLICT DO NOTHING;

-- Create initial auth tokens for testing
INSERT INTO auth_tokens (id, user_id, token_hash, expires_at, created_at)
SELECT
    generate_test_uuid(u.email || '_initial_token'),
    u.id,
    crypt(gen_random_uuid()::text, gen_salt('bf', 10)),
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    CURRENT_TIMESTAMP
FROM users u
ON CONFLICT DO NOTHING;

-- Drop the test UUID function as it's no longer needed
DROP FUNCTION IF EXISTS generate_test_uuid(text);

-- Add a note about the default password
DO $$
BEGIN
    RAISE NOTICE 'Seed data has been inserted successfully.';
    RAISE NOTICE 'Default password for all users is: Password123!';
    RAISE NOTICE 'Remember to change these passwords in production!';
END $$;