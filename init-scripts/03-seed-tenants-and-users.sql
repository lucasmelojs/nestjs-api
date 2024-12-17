-- Seed script for tenants and users
-- File: init-scripts/03-seed-tenants-and-users.sql

-- Create default tenants
INSERT INTO tenants (id, name, domain, status, created_at, updated_at)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Default Tenant', 'default.example.com', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('22222222-2222-2222-2222-222222222222', 'Development Tenant', 'dev.example.com', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('33333333-3333-3333-3333-333333333333', 'Testing Tenant', 'test.example.com', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Create default users for each tenant
-- Note: Using pgcrypto to hash passwords. Default password is 'Password@123'
INSERT INTO users (
    id,
    tenant_id,
    email,
    password_hash,
    full_name,
    status,
    last_login,
    created_at,
    updated_at
)
VALUES
    -- Default Tenant Users
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        'admin@default.example.com',
        crypt('Password@123', gen_salt('bf', 10)),
        'Default Admin',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '11111111-1111-1111-1111-111111111111',
        'user@default.example.com',
        crypt('Password@123', gen_salt('bf', 10)),
        'Default User',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    
    -- Development Tenant Users
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '22222222-2222-2222-2222-222222222222',
        'admin@dev.example.com',
        crypt('Password@123', gen_salt('bf', 10)),
        'Development Admin',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '22222222-2222-2222-2222-222222222222',
        'developer@dev.example.com',
        crypt('Password@123', gen_salt('bf', 10)),
        'Development User',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    
    -- Testing Tenant Users
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        '33333333-3333-3333-3333-333333333333',
        'tester@test.example.com',
        crypt('Password@123', gen_salt('bf', 10)),
        'Test User',
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

-- Insert some audit log entries for the seeded users
INSERT INTO auth_audit_logs (
    user_id,
    tenant_id,
    action,
    ip_address,
    user_agent,
    created_at
)
VALUES
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        'SEED_CREATE',
        '127.0.0.1',
        'Seed Script',
        CURRENT_TIMESTAMP
    ),
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '22222222-2222-2222-2222-222222222222',
        'SEED_CREATE',
        '127.0.0.1',
        'Seed Script',
        CURRENT_TIMESTAMP
    ),
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        '33333333-3333-3333-3333-333333333333',
        'SEED_CREATE',
        '127.0.0.1',
        'Seed Script',
        CURRENT_TIMESTAMP
    );

-- Verify data insertion
DO $$
BEGIN
    RAISE NOTICE 'Seed data inserted successfully';
    RAISE NOTICE 'Created 3 tenants and 5 users with audit logs';
    RAISE NOTICE 'Default password for all users: Password@123';
END $$;