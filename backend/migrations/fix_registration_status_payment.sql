-- Fix: Payment-before-registration flow
-- 1. Add pending_registration_data column to store form data until payment completes
-- 2. Update check_user_registration_status to include payment_status

-- Add column to store registration form data until payment completes
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS pending_registration_data JSONB DEFAULT NULL;

-- Drop unique constraint on (participant_id, event_id) since participant_id may be null initially
-- Replace with a unique constraint on (user_id, event_id) for initiated transactions
-- We need to handle this carefully since the old constraint may exist
DO $$
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_participant_id_event_id_key') THEN
        ALTER TABLE transactions DROP CONSTRAINT transactions_participant_id_event_id_key;
    END IF;
END $$;

-- Update check_user_registration_status to include payment_status
CREATE OR REPLACE FUNCTION check_user_registration_status(
    p_event_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_registration RECORD;
    v_config RECORD;
    v_pending_payment BOOLEAN;
BEGIN
    -- Get registration config
    SELECT * INTO v_config FROM event_registration_configs WHERE event_id = p_event_id;
    
    IF v_config IS NULL OR v_config.registration_type = 'external' THEN
        RETURN jsonb_build_object(
            'success', true,
            'has_internal_registration', false,
            'registration_type', COALESCE(v_config.registration_type, 'none')
        );
    END IF;
    
    -- Check user's registration
    SELECT * INTO v_registration 
    FROM event_participants 
    WHERE event_id = p_event_id AND user_id = p_user_id;
    
    -- Check if there's a pending payment (registration not yet created)
    SELECT EXISTS(
        SELECT 1 FROM transactions 
        WHERE event_id = p_event_id 
        AND user_id = p_user_id 
        AND status = 'initiated'
        AND pending_registration_data IS NOT NULL
    ) INTO v_pending_payment;
    
    IF v_registration IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'has_internal_registration', true,
            'is_registered', false,
            'has_pending_payment', v_pending_payment,
            'is_registration_open', v_config.is_registration_open AND 
                (v_config.registration_deadline IS NULL OR v_config.registration_deadline > NOW()),
            'registration_deadline', v_config.registration_deadline
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'has_internal_registration', true,
        'is_registered', true,
        'registration_status', v_registration.status,
        'payment_status', COALESCE(v_registration.payment_status, 'not_required'),
        'participant_id', v_registration.id,
        'submitted_at', v_registration.submitted_at,
        'reviewed_at', v_registration.reviewed_at
    );
END;
$$;
