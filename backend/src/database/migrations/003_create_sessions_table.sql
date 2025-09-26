-- Migration: Create user sessions table
-- Description: Creates the sessions table for JWT token management and tracking
-- Author: LoadBlock Development Team
-- Date: 2025-09-24

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL, -- Hash of JWT token for security
    refresh_token_hash VARCHAR(255), -- Hash of refresh token
    device_info JSONB, -- Device/browser information
    ip_address INET,   -- Client IP address
    user_agent TEXT,   -- Client user agent string

    -- Session lifecycle
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    logout_at TIMESTAMP, -- When user manually logged out

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance and cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_hash ON user_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_cleanup ON user_sessions(expires_at, is_active);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Mark expired sessions as inactive
    UPDATE user_sessions
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE expires_at < CURRENT_TIMESTAMP AND is_active = true;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Delete very old sessions (older than 30 days)
    DELETE FROM user_sessions
    WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to revoke all user sessions (for security)
CREATE OR REPLACE FUNCTION revoke_user_sessions(target_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    revoked_count INTEGER;
BEGIN
    UPDATE user_sessions
    SET is_active = false,
        logout_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = target_user_id AND is_active = true;

    GET DIAGNOSTICS revoked_count = ROW_COUNT;
    RETURN revoked_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE user_sessions IS 'JWT token sessions for user authentication and tracking';
COMMENT ON COLUMN user_sessions.token_hash IS 'SHA-256 hash of the JWT token for security';
COMMENT ON COLUMN user_sessions.device_info IS 'JSON object with device/browser information';
COMMENT ON FUNCTION cleanup_expired_sessions() IS 'Function to clean up expired sessions, returns count of cleaned sessions';
COMMENT ON FUNCTION revoke_user_sessions(INTEGER) IS 'Function to revoke all active sessions for a user';