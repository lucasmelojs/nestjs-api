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
CREATE TABLE authAuditLogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenantId UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    userId UUID REFERENCES users(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    ipAddress INET,
    userAgent TEXT,
    metadata JSONB,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit logs
CREATE INDEX idx_audit_logs_tenant ON authAuditLogs(tenantId);
CREATE INDEX idx_audit_logs_user ON authAuditLogs(userId);
CREATE INDEX idx_audit_logs_action ON authAuditLogs(action);
CREATE INDEX idx_audit_logs_created_at ON authAuditLogs(createdAt);

-- Enable RLS for audit logs
ALTER TABLE authAuditLogs ENABLE ROW LEVEL SECURITY;

-- Create RLS Policy for audit logs
CREATE POLICY audit_logs_isolation_policy ON authAuditLogs
    FOR ALL
    USING (tenantId = current_setting('app.current_tenant_id')::UUID);

-- Create function to log auth events
CREATE OR REPLACE FUNCTION log_auth_event(
    p_tenantId UUID,
    p_userId UUID,
    p_action audit_action,
    p_ipAddress INET,
    p_userAgent TEXT,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_logId UUID;
BEGIN
    INSERT INTO authAuditLogs (
        tenantId,
        userId,
        action,
        ipAddress,
        userAgent,
        metadata
    ) VALUES (
        p_tenantId,
        p_userId,
        p_action,
        p_ipAddress,
        p_userAgent,
        p_metadata
    ) RETURNING id INTO v_logId;

    RETURN v_logId;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE authAuditLogs IS 'Stores authentication-related audit logs';
COMMENT ON FUNCTION log_auth_event IS 'Helper function to create audit log entries';