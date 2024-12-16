-- Insert test tenant
INSERT INTO tenants (name, domain, status) 
VALUES ('Test Tenant', 'test.com', 'active')
ON CONFLICT (domain) DO NOTHING;

-- Insert test user with password: Password123!
INSERT INTO users (
    tenant_id,
    email,
    password_hash,
    full_name,
    status
) 
VALUES (
    (SELECT id FROM tenants WHERE domain = 'test.com'),
    'test@example.com',
    crypt('Password123!', gen_salt('bf', 10)),
    'Test User',
    'active'
)
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Add comment with credentials
COMMENT ON TABLE users IS 'Test user credentials:
Email: test@example.com
Password: Password123!';
