-- Create enum for audit action types
CREATE TYPE audit_action AS ENUM (
    'login_success',
    'login_failure',
    'logout',
    'password_change',
    'password_reset_request',
    'password_reset_complete',
    'account_locked',
    'account_unlocked'
);

-- Create audit logs table
CREATE TABLE auth_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit logs
CREATE INDEX idx_audit_logs_tenant ON auth_audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON auth_audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON auth_audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON auth_audit_logs(created_at);

-- Enable RLS for audit logs
ALTER TABLE auth_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS Policy for audit logs
CREATE POLICY audit_logs_isolation_policy ON auth_audit_logs
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Create function to log auth events
CREATE OR REPLACE FUNCTION log_auth_event(
    p_tenant_id UUID,
    p_user_id UUID,
    p_action audit_action,
    p_ip_address INET,
    p_user_agent TEXT,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO auth_audit_logs (
        tenant_id,
        user_id,
        action,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        p_tenant_id,
        p_user_id,
        p_action,
        p_ip_address,
        p_user_agent,
        p_metadata
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE auth_audit_logs IS 'Stores authentication-related audit logs';
COMMENT ON FUNCTION log_auth_event IS 'Helper function to create audit log entries';