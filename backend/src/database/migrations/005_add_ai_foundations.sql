-- AI Integration Foundation Schema
-- This migration adds database foundations for future AI features
-- without implementing the AI logic itself

-- Carrier location tracking for Profit-Pilot
CREATE TABLE IF NOT EXISTS carrier_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id UUID REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    accuracy DECIMAL(8,2),
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_carrier_locations_carrier_id (carrier_id),
    INDEX idx_carrier_locations_timestamp (timestamp)
);

-- Performance metrics for Factor-Flow risk engine
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL, -- Can reference users, companies, etc.
    entity_type VARCHAR(50) NOT NULL, -- 'carrier', 'shipper', 'broker'
    metric_type VARCHAR(50) NOT NULL, -- 'on_time', 'document_quality', 'communication', 'payment_speed'
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    weight DECIMAL(3,2) DEFAULT 1.0,
    calculated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_performance_metrics_entity (entity_id, entity_type),
    INDEX idx_performance_metrics_type (metric_type),
    INDEX idx_performance_metrics_calculated (calculated_at)
);

-- Load history for AI learning and optimization
CREATE TABLE IF NOT EXISTS load_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bol_id UUID REFERENCES pending_bols(id) ON DELETE CASCADE,
    route_data JSONB, -- Planned vs actual routes, fuel consumption, etc.
    performance_data JSONB, -- On-time performance, deadhead miles, etc.
    profitability_data JSONB, -- Revenue, costs, profit margins
    ai_recommendations JSONB, -- What AI suggested vs what actually happened
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_load_history_carrier (carrier_id),
    INDEX idx_load_history_bol (bol_id),
    INDEX idx_load_history_completed (completed_at)
);

-- Payment history for predictive analysis
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payer_id UUID REFERENCES users(id), -- Shipper/Broker who paid
    payee_id UUID REFERENCES users(id), -- Carrier who was paid
    bol_id UUID REFERENCES pending_bols(id),
    invoice_amount DECIMAL(12,2) NOT NULL,
    payment_amount DECIMAL(12,2),
    invoice_date DATE NOT NULL,
    payment_date DATE,
    days_to_pay INTEGER GENERATED ALWAYS AS (payment_date - invoice_date) STORED,
    payment_method VARCHAR(50), -- 'factoring', 'direct', 'ach', 'check'
    factoring_company VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'disputed'
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_payment_history_payer (payer_id),
    INDEX idx_payment_history_payee (payee_id),
    INDEX idx_payment_history_bol (bol_id),
    INDEX idx_payment_history_days_to_pay (days_to_pay),
    INDEX idx_payment_history_status (status)
);

-- Extend users table for AI preferences and scores
ALTER TABLE users
ADD COLUMN IF NOT EXISTS ai_preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS performance_score DECIMAL(5,2) DEFAULT 50.0,
ADD COLUMN IF NOT EXISTS risk_score DECIMAL(5,2) DEFAULT 50.0,
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP;

-- Extend pending_bols for AI processing
ALTER TABLE pending_bols
ADD COLUMN IF NOT EXISTS ai_processing JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS risk_indicators JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_risk_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS ai_recommendations JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS pod_data JSONB DEFAULT '{}';

-- Create AI processing status enum type
CREATE TYPE ai_processing_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'manual_review_required'
);

-- AI processing jobs table for async processing
CREATE TABLE IF NOT EXISTS ai_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL, -- 'document_scan', 'risk_analysis', 'route_optimization'
    entity_type VARCHAR(50) NOT NULL, -- 'bol', 'carrier', 'payment'
    entity_id UUID NOT NULL,
    status ai_processing_status DEFAULT 'pending',
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    priority INTEGER DEFAULT 5, -- 1-10, higher is more urgent
    scheduled_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_ai_jobs_status (status),
    INDEX idx_ai_jobs_type (job_type),
    INDEX idx_ai_jobs_priority (priority),
    INDEX idx_ai_jobs_scheduled (scheduled_at)
);

-- Comments for future AI implementation
COMMENT ON TABLE carrier_locations IS 'GPS tracking data for route optimization and geofencing';
COMMENT ON TABLE performance_metrics IS 'Quantified performance scores for AI risk assessment';
COMMENT ON TABLE load_history IS 'Historical load data for machine learning and optimization';
COMMENT ON TABLE payment_history IS 'Payment patterns for predictive analysis and risk scoring';
COMMENT ON TABLE ai_processing_jobs IS 'Async job queue for AI processing tasks';

COMMENT ON COLUMN users.ai_preferences IS 'User preferences for AI features (lanes, equipment, etc.)';
COMMENT ON COLUMN users.performance_score IS 'Overall performance score (0-100)';
COMMENT ON COLUMN users.risk_score IS 'Risk assessment score (0-100, lower is better)';

COMMENT ON COLUMN pending_bols.ai_processing IS 'AI processing metadata (OCR confidence, document quality, etc.)';
COMMENT ON COLUMN pending_bols.risk_indicators IS 'Risk factors identified by AI';
COMMENT ON COLUMN pending_bols.ai_risk_score IS 'Overall AI-calculated risk score';
COMMENT ON COLUMN pending_bols.pod_data IS 'Proof of delivery data with geofencing and signatures';