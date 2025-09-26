-- Migration: Create contacts table
-- Description: Creates the contacts table for shipper/consignee information
-- Author: LoadBlock Development Team
-- Date: 2025-09-24

CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('shipper', 'consignee', 'carrier', 'broker')),
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),

    -- Address information
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'United States',

    -- Additional fields for carriers
    dot_number VARCHAR(20), -- DOT registration number
    mc_number VARCHAR(20),  -- Motor Carrier number

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_name);
CREATE INDEX IF NOT EXISTS idx_contacts_active ON contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_contacts_city_state ON contacts(city, state);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a unique constraint to prevent duplicate contacts per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique_user_company_type
ON contacts(user_id, company_name, contact_type)
WHERE is_active = true;

COMMENT ON TABLE contacts IS 'Contact information for shippers, consignees, carriers, and brokers';
COMMENT ON COLUMN contacts.contact_type IS 'Type of contact: shipper, consignee, carrier, broker';
COMMENT ON COLUMN contacts.dot_number IS 'Department of Transportation registration number';
COMMENT ON COLUMN contacts.mc_number IS 'Motor Carrier identification number';