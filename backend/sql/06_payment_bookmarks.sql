-- ============================================================================
-- EVENT CORNER - PAYMENT & BOOKMARK FUNCTIONS
-- ============================================================================
-- Description: Functions for payment configuration, transactions, and bookmarks
-- Author: Event Corner Team
-- ============================================================================


-- ============================================================================
-- FUNCTION: upsert_payment_config
-- Purpose: Create or update payment configuration for an event
-- Parameters: Payment config fields
-- Returns: JSONB with config_id and success message
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_payment_config(
    p_event_id UUID,
    p_is_paid_event BOOLEAN DEFAULT false,
    p_fee_amount NUMERIC DEFAULT 0,
    p_fee_type VARCHAR(50) DEFAULT 'per_person',
    p_refund_policy VARCHAR(50) DEFAULT 'full_refund',
    p_refund_percentage INTEGER DEFAULT 100,
    p_accepted_methods JSONB DEFAULT '["bkash", "nagad", "card", "bank"]'::jsonb
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
-- Parameters: event_id
-- Returns: JSONB with payment config
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
-- Purpose: Get all transactions for an event with summary
-- Parameters: event_id, pagination
-- Returns: JSONB with transactions and summary
-- ============================================================================
CREATE OR REPLACE FUNCTION get_event_transactions(
    p_event_id UUID,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 10
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
-- Purpose: Get all transactions for a user
-- Parameters: user_id, pagination
-- Returns: JSONB with transactions
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_transactions(
    p_user_id UUID,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 10
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


-- ============================================================================
-- BOOKMARK FUNCTIONS
-- ============================================================================


-- ============================================================================
-- FUNCTION: toggle_event_bookmark
-- Purpose: Toggle bookmark status for an event (add if not exists, remove if exists)
-- Parameters: user_id, event_id
-- Returns: JSONB with action and bookmark_id
-- ============================================================================
CREATE OR REPLACE FUNCTION toggle_event_bookmark(
    p_user_id UUID,
    p_event_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE 
    v_bookmark_id UUID; 
    v_action VARCHAR(20);
BEGIN
    SELECT id INTO v_bookmark_id FROM event_bookmarks 
    WHERE user_id = p_user_id AND event_id = p_event_id;
    
    IF v_bookmark_id IS NOT NULL THEN
        DELETE FROM event_bookmarks WHERE id = v_bookmark_id;
        v_action := 'removed';
    ELSE
        INSERT INTO event_bookmarks (user_id, event_id) 
        VALUES (p_user_id, p_event_id) 
        RETURNING id INTO v_bookmark_id;
        v_action := 'added';
    END IF;
    
    RETURN jsonb_build_object(
        'success', true, 
        'action', v_action, 
        'bookmark_id', v_bookmark_id, 
        'message', CASE WHEN v_action = 'added' 
            THEN 'Event bookmarked successfully' 
            ELSE 'Bookmark removed successfully' 
        END
    );
END;
$$;


-- ============================================================================
-- FUNCTION: check_bookmark_status
-- Purpose: Check if a user has bookmarked an event
-- Parameters: user_id, event_id
-- Returns: JSONB with bookmark status
-- ============================================================================
CREATE OR REPLACE FUNCTION check_bookmark_status(
    p_user_id UUID,
    p_event_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE 
    v_bookmark RECORD;
BEGIN
    SELECT * INTO v_bookmark FROM event_bookmarks 
    WHERE user_id = p_user_id AND event_id = p_event_id;
    
    IF v_bookmark IS NULL THEN 
        RETURN jsonb_build_object('success', true, 'is_bookmarked', false); 
    END IF;
    
    RETURN jsonb_build_object(
        'success', true, 
        'is_bookmarked', true, 
        'bookmarked_at', v_bookmark.bookmarked_at
    );
END;
$$;


-- ============================================================================
-- FUNCTION: get_user_bookmarked_events
-- Purpose: Get all bookmarked events for a user
-- Parameters: user_id, pagination
-- Returns: JSONB with bookmarked events
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_bookmarked_events(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_bookmarks JSONB;
    v_total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_count
    FROM event_bookmarks eb
    JOIN events e ON eb.event_id = e.id
    WHERE eb.user_id = p_user_id AND e.status = 'active';
    
    SELECT COALESCE(jsonb_agg(event_data), '[]'::jsonb) INTO v_bookmarks
    FROM (
        SELECT jsonb_build_object(
            'bookmark_id', eb.id, 
            'event_id', e.id, 
            'title', e.title, 
            'description', e.description,
            'category', e.category, 
            'banner_url', e.banner_url, 
            'thumbnail_url', e.thumbnail_url,
            'venue_name', e.venue_name, 
            'venue_type', e.venue_type, 
            'venue_address', e.venue_address,
            'visibility', e.visibility, 
            'status', e.status, 
            'bookmarked_at', eb.bookmarked_at,
            'created_at', e.created_at,
            'timeslots', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'id', et.id, 
                        'start_time', et.start_time, 
                        'end_time', et.end_time, 
                        'title', et.title, 
                        'color', et.color
                    )
                    ORDER BY et.start_time
                ), '[]'::jsonb)
                FROM event_timeslots et WHERE et.event_id = e.id
            )
        ) as event_data
        FROM event_bookmarks eb
        JOIN events e ON eb.event_id = e.id
        WHERE eb.user_id = p_user_id AND e.status = 'active'
        ORDER BY eb.bookmarked_at DESC
        LIMIT p_limit OFFSET p_offset
    ) sub;
    
    RETURN jsonb_build_object(
        'success', true, 
        'bookmarks', v_bookmarks, 
        'total_count', v_total_count
    );
END;
$$;


-- ============================================================================
-- FUNCTION: bookmark_event
-- Purpose: Add a bookmark for an event
-- Parameters: event_id, user_id
-- Returns: success status, message
-- ============================================================================
CREATE OR REPLACE FUNCTION bookmark_event(
    p_event_id UUID,
    p_user_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO event_bookmarks (event_id, user_id)
    VALUES (p_event_id, p_user_id);

    RETURN QUERY SELECT TRUE, 'Event bookmarked'::TEXT;

EXCEPTION 
    WHEN unique_violation THEN
        RETURN QUERY SELECT FALSE, 'Event already bookmarked'::TEXT;
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, SQLERRM::TEXT;
END;
$$;


-- ============================================================================
-- FUNCTION: remove_bookmark
-- Purpose: Remove a bookmark from an event
-- Parameters: event_id, user_id
-- Returns: success status, message
-- ============================================================================
CREATE OR REPLACE FUNCTION remove_bookmark(
    p_event_id UUID,
    p_user_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM event_bookmarks 
    WHERE event_id = p_event_id AND user_id = p_user_id;

    IF FOUND THEN
        RETURN QUERY SELECT TRUE, 'Bookmark removed'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'Bookmark not found'::TEXT;
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::TEXT;
END;
$$;
