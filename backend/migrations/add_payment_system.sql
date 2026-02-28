-- ============================================================================
-- PAYMENT SYSTEM MIGRATION
-- Created: 2026-02-28
-- Purpose: Add tables for payment/transaction management
-- ============================================================================

-- ============================================================================
-- PAYMENT CONFIGS TABLE
-- Stores payment/fee configuration per event
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Fee configuration
    is_paid_event BOOLEAN DEFAULT FALSE,
    fee_amount DECIMAL(10,2) DEFAULT 0.00,
    fee_type VARCHAR(20) DEFAULT 'per_person' CHECK (fee_type IN ('per_person', 'per_team')),
    currency VARCHAR(3) DEFAULT 'BDT',
    
    -- Refund policy
    refund_policy VARCHAR(20) DEFAULT 'full_refund' CHECK (refund_policy IN ('full_refund', 'partial_refund', 'no_refund', 'custom')),
    refund_percentage INTEGER DEFAULT 100 CHECK (refund_percentage >= 0 AND refund_percentage <= 100),
    
    -- Accepted payment methods
    accepted_methods JSONB DEFAULT '["bkash","nagad","card","bank"]',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One payment config per event
    UNIQUE(event_id)
);

CREATE INDEX idx_payment_configs_event ON payment_configs(event_id);

-- ============================================================================
-- TRANSACTIONS TABLE
-- Records all payment transactions
-- ============================================================================

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES event_participants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BDT',
    payment_method VARCHAR(50),  -- 'bkash', 'nagad', 'visa', 'mastercard', 'bank', etc.
    
    -- SSLCommerz specific
    tran_id VARCHAR(255) UNIQUE NOT NULL,  -- Our generated transaction ID
    gateway_transaction_id VARCHAR(255),    -- SSLCommerz val_id
    bank_tran_id VARCHAR(255),             -- Bank transaction ID (needed for refund)
    
    -- Status
    status VARCHAR(30) NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded')),
    
    -- Gateway response data (full SSLCommerz response for auditing)
    gateway_response JSONB DEFAULT '{}',
    
    -- Timestamps
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Prevent duplicate payments for same registration
    UNIQUE(participant_id, event_id)
);

CREATE INDEX idx_transactions_event ON transactions(event_id);
CREATE INDEX idx_transactions_participant ON transactions(participant_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_tran_id ON transactions(tran_id);

-- ============================================================================
-- REFUNDS TABLE
-- Tracks refund requests and their status
-- ============================================================================

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    
    -- Refund details
    refund_amount DECIMAL(10,2) NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('registration_rejected', 'event_cancelled', 'participant_cancelled', 'manual')),
    reason_detail TEXT,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'processing', 'completed', 'failed')),
    
    -- SSLCommerz refund response
    gateway_refund_id VARCHAR(255),
    gateway_response JSONB DEFAULT '{}',
    
    -- Who initiated the refund
    initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_refunds_transaction ON refunds(transaction_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_initiated_by ON refunds(initiated_by);

-- ============================================================================
-- ALTER event_participants: Add payment_status column
-- ============================================================================

ALTER TABLE event_participants
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'not_required' 
    CHECK (payment_status IN ('not_required', 'pending', 'completed', 'refunded'));

CREATE INDEX IF NOT EXISTS idx_event_participants_payment_status ON event_participants(payment_status);

-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================

-- ============================================================================
-- FUNCTION: upsert_payment_config
-- Purpose: Create or update payment configuration for an event
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_payment_config(
    p_event_id UUID,
    p_is_paid_event BOOLEAN DEFAULT FALSE,
    p_fee_amount DECIMAL DEFAULT 0.00,
    p_fee_type VARCHAR DEFAULT 'per_person',
    p_refund_policy VARCHAR DEFAULT 'full_refund',
    p_refund_percentage INTEGER DEFAULT 100,
    p_accepted_methods JSONB DEFAULT '["bkash","nagad","card","bank"]'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_config_id UUID;
BEGIN
    -- Check if config exists
    SELECT id INTO v_config_id FROM payment_configs WHERE event_id = p_event_id;
    
    IF v_config_id IS NOT NULL THEN
        -- Update existing
        UPDATE payment_configs SET
            is_paid_event = p_is_paid_event,
            fee_amount = p_fee_amount,
            fee_type = p_fee_type,
            refund_policy = p_refund_policy,
            refund_percentage = p_refund_percentage,
            accepted_methods = p_accepted_methods,
            updated_at = NOW()
        WHERE id = v_config_id;
    ELSE
        -- Insert new
        INSERT INTO payment_configs (
            event_id, is_paid_event, fee_amount, fee_type,
            refund_policy, refund_percentage, accepted_methods
        ) VALUES (
            p_event_id, p_is_paid_event, p_fee_amount, p_fee_type,
            p_refund_policy, p_refund_percentage, p_accepted_methods
        )
        RETURNING id INTO v_config_id;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'config_id', v_config_id,
        'message', 'Payment configuration saved successfully'
    );
END;
$$;

-- ============================================================================
-- FUNCTION: get_payment_config
-- Purpose: Get payment configuration for an event
-- ============================================================================

CREATE OR REPLACE FUNCTION get_payment_config(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_config RECORD;
BEGIN
    SELECT * INTO v_config FROM payment_configs WHERE event_id = p_event_id;
    
    IF v_config IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'config', NULL,
            'is_paid_event', false
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'config', jsonb_build_object(
            'id', v_config.id,
            'event_id', v_config.event_id,
            'is_paid_event', v_config.is_paid_event,
            'fee_amount', v_config.fee_amount,
            'fee_type', v_config.fee_type,
            'currency', v_config.currency,
            'refund_policy', v_config.refund_policy,
            'refund_percentage', v_config.refund_percentage,
            'accepted_methods', v_config.accepted_methods
        ),
        'is_paid_event', v_config.is_paid_event
    );
END;
$$;

-- ============================================================================
-- FUNCTION: get_event_transactions
-- Purpose: Get all transactions for an event (organizer view)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_event_transactions(
    p_event_id UUID,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_offset INTEGER;
    v_total INTEGER;
    v_transactions JSONB;
    v_summary JSONB;
BEGIN
    v_offset := (p_page - 1) * p_limit;
    
    -- Total count
    SELECT COUNT(*) INTO v_total
    FROM transactions WHERE event_id = p_event_id;
    
    -- Get transactions with user info
    SELECT COALESCE(jsonb_agg(t_data), '[]'::jsonb) INTO v_transactions
    FROM (
        SELECT jsonb_build_object(
            'id', t.id,
            'tran_id', t.tran_id,
            'amount', t.amount,
            'currency', t.currency,
            'payment_method', t.payment_method,
            'status', t.status,
            'initiated_at', t.initiated_at,
            'completed_at', t.completed_at,
            'user_id', t.user_id,
            'user_name', u.full_name,
            'user_email', u.email,
            'participant_id', t.participant_id,
            'refund', (
                SELECT jsonb_build_object(
                    'id', r.id,
                    'refund_amount', r.refund_amount,
                    'reason', r.reason,
                    'status', r.status,
                    'initiated_at', r.initiated_at,
                    'completed_at', r.completed_at
                )
                FROM refunds r WHERE r.transaction_id = t.id
                ORDER BY r.initiated_at DESC LIMIT 1
            )
        ) as t_data
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.event_id = p_event_id
        ORDER BY t.initiated_at DESC
        LIMIT p_limit OFFSET v_offset
    ) sub;
    
    -- Summary
    SELECT jsonb_build_object(
        'total_revenue', COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0),
        'total_refunded', COALESCE((
            SELECT SUM(r.refund_amount) FROM refunds r
            JOIN transactions t2 ON r.transaction_id = t2.id
            WHERE t2.event_id = p_event_id AND r.status = 'completed'
        ), 0),
        'total_transactions', COUNT(*),
        'completed_count', COUNT(*) FILTER (WHERE status = 'completed'),
        'refunded_count', COUNT(*) FILTER (WHERE status IN ('refunded', 'partially_refunded')),
        'pending_count', COUNT(*) FILTER (WHERE status = 'initiated'),
        'failed_count', COUNT(*) FILTER (WHERE status = 'failed')
    ) INTO v_summary
    FROM transactions WHERE event_id = p_event_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'transactions', v_transactions,
        'summary', v_summary,
        'pagination', jsonb_build_object(
            'page', p_page,
            'limit', p_limit,
            'total', v_total,
            'total_pages', CEIL(v_total::DECIMAL / p_limit)
        )
    );
END;
$$;

-- ============================================================================
-- FUNCTION: get_user_transactions
-- Purpose: Get all transactions for a user (participant view)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_transactions(
    p_user_id UUID,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_offset INTEGER;
    v_total INTEGER;
    v_transactions JSONB;
BEGIN
    v_offset := (p_page - 1) * p_limit;
    
    SELECT COUNT(*) INTO v_total
    FROM transactions WHERE user_id = p_user_id;
    
    SELECT COALESCE(jsonb_agg(t_data), '[]'::jsonb) INTO v_transactions
    FROM (
        SELECT jsonb_build_object(
            'id', t.id,
            'tran_id', t.tran_id,
            'amount', t.amount,
            'currency', t.currency,
            'payment_method', t.payment_method,
            'status', t.status,
            'initiated_at', t.initiated_at,
            'completed_at', t.completed_at,
            'event_id', t.event_id,
            'event_title', e.title,
            'refund', (
                SELECT jsonb_build_object(
                    'id', r.id,
                    'refund_amount', r.refund_amount,
                    'reason', r.reason,
                    'status', r.status,
                    'initiated_at', r.initiated_at,
                    'completed_at', r.completed_at
                )
                FROM refunds r WHERE r.transaction_id = t.id
                ORDER BY r.initiated_at DESC LIMIT 1
            )
        ) as t_data
        FROM transactions t
        LEFT JOIN events e ON t.event_id = e.id
        WHERE t.user_id = p_user_id
        ORDER BY t.initiated_at DESC
        LIMIT p_limit OFFSET v_offset
    ) sub;
    
    RETURN jsonb_build_object(
        'success', true,
        'transactions', v_transactions,
        'pagination', jsonb_build_object(
            'page', p_page,
            'limit', p_limit,
            'total', v_total,
            'total_pages', CEIL(v_total::DECIMAL / p_limit)
        )
    );
END;
$$;
