-- Migration: Create pending Bills of Lading tables
-- Description: Creates tables for storing pending/draft BoLs before blockchain approval
-- Author: LoadBlock Development Team
-- Date: 2025-09-28
-- Purpose: Hybrid Storage Architecture - PostgreSQL for mutable pending BoLs

-- Create enum types for better data integrity
CREATE TYPE bol_status_enum AS ENUM (
    'pending', 'approved', 'assigned', 'accepted',
    'picked_up', 'en_route', 'delivered', 'unpaid', 'paid'
);

CREATE TYPE payment_terms_enum AS ENUM ('prepaid', 'collect', 'third_party');
CREATE TYPE bill_to_enum AS ENUM ('shipper', 'consignee', 'third_party');
CREATE TYPE note_type_enum AS ENUM ('general', 'status_change', 'issue', 'delivery');
CREATE TYPE unit_type_enum AS ENUM ('pieces', 'pallets', 'tons', 'lbs', 'kg', 'cases', 'drums');
CREATE TYPE dimension_unit_enum AS ENUM ('in', 'ft', 'cm', 'm');

-- Main pending BoLs table
CREATE TABLE IF NOT EXISTS pending_bols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bol_number VARCHAR(50) UNIQUE, -- Will be generated: BOL-YYYY-NNNNNN
    status bol_status_enum NOT NULL DEFAULT 'pending',

    -- User and company information
    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shipper_contact_id INTEGER REFERENCES contacts(id),
    consignee_contact_id INTEGER REFERENCES contacts(id),
    carrier_contact_id INTEGER REFERENCES contacts(id),
    broker_contact_id INTEGER REFERENCES contacts(id),

    -- Pickup and delivery information
    pickup_date DATE NOT NULL,
    delivery_date DATE,
    special_instructions TEXT,

    -- Totals (calculated from cargo items)
    total_weight DECIMAL(10,2) DEFAULT 0.00,
    total_value DECIMAL(12,2) DEFAULT 0.00,
    total_pieces INTEGER DEFAULT 0,

    -- Hazmat information (JSON for flexibility)
    hazmat_info JSONB,

    -- Driver assignment (for approved BoLs)
    assigned_driver_id UUID, -- Will reference drivers table when created

    -- Collaboration tracking
    shipper_approved BOOLEAN DEFAULT false,
    carrier_approved BOOLEAN DEFAULT false,
    shipper_approved_at TIMESTAMP,
    carrier_approved_at TIMESTAMP,

    -- Blockchain integration fields
    blockchain_tx_id VARCHAR(255), -- Set when moved to blockchain
    ipfs_hash VARCHAR(255), -- PDF document hash
    blockchain_status VARCHAR(50), -- Track blockchain sync status

    -- Metadata
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_approval_logic CHECK (
        (status = 'pending' AND (shipper_approved = false OR carrier_approved = false)) OR
        (status != 'pending' AND shipper_approved = true AND carrier_approved = true)
    )
);

-- Cargo items table for pending BoLs
CREATE TABLE IF NOT EXISTS pending_bol_cargo_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pending_bol_id UUID REFERENCES pending_bols(id) ON DELETE CASCADE,

    -- Cargo description
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit unit_type_enum NOT NULL DEFAULT 'pieces',
    weight DECIMAL(10,2) NOT NULL CHECK (weight >= 0),
    value DECIMAL(12,2) NOT NULL CHECK (value >= 0),
    packaging VARCHAR(100),

    -- Dimensions (optional)
    length DECIMAL(8,2),
    width DECIMAL(8,2),
    height DECIMAL(8,2),
    dimension_unit dimension_unit_enum DEFAULT 'in',

    -- Hazmat information
    is_hazmat BOOLEAN DEFAULT false,
    hazmat_class VARCHAR(20),
    un_number VARCHAR(10),

    -- Metadata
    item_order INTEGER DEFAULT 1, -- For maintaining order in UI
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Freight charges table for pending BoLs
CREATE TABLE IF NOT EXISTS pending_bol_freight_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pending_bol_id UUID REFERENCES pending_bols(id) ON DELETE CASCADE,

    -- Charge breakdown
    base_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    fuel_surcharge DECIMAL(10,2) DEFAULT 0.00,
    accessorial_charges DECIMAL(10,2) DEFAULT 0.00,
    total_charges DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    -- Payment information
    payment_terms payment_terms_enum NOT NULL DEFAULT 'prepaid',
    bill_to bill_to_enum NOT NULL DEFAULT 'shipper',

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_total_charges CHECK (
        total_charges = (base_rate + fuel_surcharge + accessorial_charges)
    )
);

-- Notes/comments table for pending BoLs
CREATE TABLE IF NOT EXISTS pending_bol_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pending_bol_id UUID REFERENCES pending_bols(id) ON DELETE CASCADE,

    -- Note content
    content TEXT NOT NULL,
    note_type note_type_enum NOT NULL DEFAULT 'general',

    -- User information
    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collaboration history table
CREATE TABLE IF NOT EXISTS pending_bol_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pending_bol_id UUID REFERENCES pending_bols(id) ON DELETE CASCADE,

    -- Change tracking
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'approved', 'status_changed'
    field_changed VARCHAR(100), -- Which field was changed
    old_value TEXT, -- Previous value (JSON string)
    new_value TEXT, -- New value (JSON string)

    -- User information
    changed_by INTEGER REFERENCES users(id) ON DELETE CASCADE,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_bols_created_by ON pending_bols(created_by);
CREATE INDEX IF NOT EXISTS idx_pending_bols_status ON pending_bols(status);
CREATE INDEX IF NOT EXISTS idx_pending_bols_pickup_date ON pending_bols(pickup_date);
CREATE INDEX IF NOT EXISTS idx_pending_bols_bol_number ON pending_bols(bol_number);
CREATE INDEX IF NOT EXISTS idx_pending_bols_active ON pending_bols(is_active);
CREATE INDEX IF NOT EXISTS idx_pending_bols_approval ON pending_bols(shipper_approved, carrier_approved);
CREATE INDEX IF NOT EXISTS idx_pending_bols_blockchain ON pending_bols(blockchain_tx_id) WHERE blockchain_tx_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pending_cargo_bol_id ON pending_bol_cargo_items(pending_bol_id);
CREATE INDEX IF NOT EXISTS idx_pending_cargo_hazmat ON pending_bol_cargo_items(is_hazmat);

CREATE INDEX IF NOT EXISTS idx_pending_freight_bol_id ON pending_bol_freight_charges(pending_bol_id);

CREATE INDEX IF NOT EXISTS idx_pending_notes_bol_id ON pending_bol_notes(pending_bol_id);
CREATE INDEX IF NOT EXISTS idx_pending_notes_created_by ON pending_bol_notes(created_by);

CREATE INDEX IF NOT EXISTS idx_pending_history_bol_id ON pending_bol_history(pending_bol_id);
CREATE INDEX IF NOT EXISTS idx_pending_history_action ON pending_bol_history(action);

-- Create triggers to automatically update updated_at timestamps
CREATE TRIGGER update_pending_bols_updated_at
    BEFORE UPDATE ON pending_bols
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_cargo_updated_at
    BEFORE UPDATE ON pending_bol_cargo_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_freight_updated_at
    BEFORE UPDATE ON pending_bol_freight_charges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate BoL numbers
CREATE OR REPLACE FUNCTION generate_bol_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    current_year INTEGER;
    next_sequence INTEGER;
    bol_number VARCHAR(50);
BEGIN
    -- Get current year
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(bol_number FROM 'BOL-' || current_year || '-(.*)') AS INTEGER)), 0) + 1
    INTO next_sequence
    FROM pending_bols
    WHERE bol_number LIKE 'BOL-' || current_year || '-%';

    -- Handle case where no BoLs exist for current year
    IF next_sequence IS NULL THEN
        next_sequence := 1;
    END IF;

    -- Format: BOL-YYYY-NNNNNN (6-digit sequence)
    bol_number := 'BOL-' || current_year || '-' || LPAD(next_sequence::TEXT, 6, '0');

    RETURN bol_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate BoL number on insert
CREATE OR REPLACE FUNCTION set_bol_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.bol_number IS NULL THEN
        NEW.bol_number := generate_bol_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_bol_number
    BEFORE INSERT ON pending_bols
    FOR EACH ROW
    EXECUTE FUNCTION set_bol_number();

-- Function to update totals when cargo items change
CREATE OR REPLACE FUNCTION update_bol_totals()
RETURNS TRIGGER AS $$
DECLARE
    bol_id UUID;
    total_weight_calc DECIMAL(10,2);
    total_value_calc DECIMAL(12,2);
    total_pieces_calc INTEGER;
BEGIN
    -- Get the BoL ID
    IF TG_OP = 'DELETE' THEN
        bol_id := OLD.pending_bol_id;
    ELSE
        bol_id := NEW.pending_bol_id;
    END IF;

    -- Calculate totals
    SELECT
        COALESCE(SUM(weight), 0),
        COALESCE(SUM(value), 0),
        COALESCE(SUM(quantity), 0)
    INTO total_weight_calc, total_value_calc, total_pieces_calc
    FROM pending_bol_cargo_items
    WHERE pending_bol_id = bol_id;

    -- Update the BoL totals
    UPDATE pending_bols
    SET
        total_weight = total_weight_calc,
        total_value = total_value_calc,
        total_pieces = total_pieces_calc,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = bol_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for cargo item changes
CREATE TRIGGER update_totals_on_cargo_insert
    AFTER INSERT ON pending_bol_cargo_items
    FOR EACH ROW
    EXECUTE FUNCTION update_bol_totals();

CREATE TRIGGER update_totals_on_cargo_update
    AFTER UPDATE ON pending_bol_cargo_items
    FOR EACH ROW
    EXECUTE FUNCTION update_bol_totals();

CREATE TRIGGER update_totals_on_cargo_delete
    AFTER DELETE ON pending_bol_cargo_items
    FOR EACH ROW
    EXECUTE FUNCTION update_bol_totals();

-- Add table comments for documentation
COMMENT ON TABLE pending_bols IS 'Pending/draft Bills of Lading before blockchain approval - supports collaborative editing';
COMMENT ON TABLE pending_bol_cargo_items IS 'Cargo line items for pending BoLs with detailed specifications';
COMMENT ON TABLE pending_bol_freight_charges IS 'Freight cost breakdown for pending BoLs';
COMMENT ON TABLE pending_bol_notes IS 'Comments and notes for pending BoLs collaboration';
COMMENT ON TABLE pending_bol_history IS 'Change tracking for pending BoL collaboration workflow';

COMMENT ON COLUMN pending_bols.blockchain_tx_id IS 'Set when BoL is approved and moved to blockchain';
COMMENT ON COLUMN pending_bols.ipfs_hash IS 'IPFS hash of generated PDF document';
COMMENT ON COLUMN pending_bols.shipper_approved IS 'Shipper approval status for dual-approval workflow';
COMMENT ON COLUMN pending_bols.carrier_approved IS 'Carrier approval status for dual-approval workflow';