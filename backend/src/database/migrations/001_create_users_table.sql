-- Migration: Create users table
-- Description: Creates the users table with multi-role support and basic user information
-- Author: LoadBlock Development Team
-- Date: 2025-09-24

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    company_name VARCHAR(255),
    roles TEXT[] NOT NULL DEFAULT '{}', -- Array of roles: admin, carrier, shipper, broker, consignee
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(roles);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_name);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user
INSERT INTO users (
    email,
    password_hash,
    first_name,
    last_name,
    company_name,
    roles,
    is_active,
    email_verified
) VALUES (
    'admin@loadblock.io',
    '$2b$10$placeholder.hash.will.be.replaced.by.seeder', -- Will be replaced by seeder
    'LoadBlock',
    'Administrator',
    'LoadBlock Inc.',
    ARRAY['admin'],
    true,
    true
) ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE users IS 'User accounts with multi-role support for the LoadBlock platform';
COMMENT ON COLUMN users.roles IS 'Array of user roles: admin, carrier, shipper, broker, consignee';
COMMENT ON COLUMN users.is_active IS 'Flag to enable/disable user account';
COMMENT ON COLUMN users.email_verified IS 'Flag to track email verification status';