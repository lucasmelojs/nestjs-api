-- Seed script for tenants and users

-- Function to generate consistent UUIDs for testing
CREATE OR REPLACE FUNCTION generate_test_uuid(seed text) RETURNS uuid AS $$
BEGIN
    RETURN md5(seed)::uuid;
END;
$$ LANGUAGE plpgsql;

-- Insert sample tenants with explicit UUIDs
DO $$ 
DECLARE
    tenant1_id UUID := generate_test_uuid('tenant1');
    tenant2_id UUID := generate_test_uuid('tenant2');
    tenant3_id UUID := generate_test_uuid('tenant3');
BEGIN
    -- Insert tenants
    INSERT INTO tenants (id, name, domain, status, created_at, updated_at)
    VALUES
        (tenant1_id, 'Acme Corporation', 'acme.example.com', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (tenant2_id, 'TechStart Inc', 'techstart.example.com', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (tenant3_id, 'Global Services Ltd', 'globalservices.example.com', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT DO NOTHING;

    -- Insert users with explicit tenant IDs
    -- Default password for all test users is 'Password123!'
    INSERT INTO users (id, tenant_id, email, password_hash, full_name, status, last_login, created_at, updated_at)
    VALUES
        -- Acme Corporation Users
        (
            generate_test_uuid('user1'),
            tenant1_id,
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
            tenant1_id,
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
            tenant2_id,
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
            tenant2_id,
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
            tenant3_id,
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
            tenant3_id,
            'user@globalservices.example.com',
            crypt('Password123!', gen_salt('bf', 10)),
            'Emma User',
            'active',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
    ON CONFLICT DO NOTHING;

    -- Verify users were created with correct tenant IDs
    RAISE NOTICE 'Verifying user-tenant relationships...';
    IF NOT EXISTS (
        SELECT 1 FROM users WHERE tenant_id IS NULL
    ) THEN
        RAISE NOTICE 'All users have been assigned tenant IDs successfully.';
    ELSE
        RAISE WARNING 'Some users are missing tenant IDs!';
    END IF;

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

END $$;

-- Drop the test UUID function as it's no longer needed
DROP FUNCTION IF EXISTS generate_test_uuid(text);

-- Add a note about the default password
DO $$
BEGIN
    RAISE NOTICE 'Seed data has been inserted successfully.';
    RAISE NOTICE 'Default password for all users is: Password123!';
    RAISE NOTICE 'Remember to change these passwords in production!';
END $$;

-- Add verification query
DO $$
BEGIN
    RAISE NOTICE 'Tenants and Users Summary:';
    RAISE NOTICE '------------------------';
    FOR rec IN (
        SELECT 
            t.name as tenant_name,
            COUNT(u.id) as user_count
        FROM tenants t
        LEFT JOIN users u ON t.id = u.tenant_id
        GROUP BY t.name
        ORDER BY t.name
    ) LOOP
        RAISE NOTICE '% has % users', rec.tenant_name, rec.user_count;
    END LOOP;
END $$;