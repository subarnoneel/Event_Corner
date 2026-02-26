-- ============================================================================
-- EVENT BOOKMARKS SYSTEM MIGRATION
-- Created: 2026-02-09
-- Purpose: Add table for user event bookmarks
-- ============================================================================

-- ============================================================================
-- EVENT BOOKMARKS TABLE
-- Stores user bookmarks for events
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Timestamps
    bookmarked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate bookmarks (one per user per event)
    UNIQUE(user_id, event_id)
);

CREATE INDEX idx_event_bookmarks_user ON event_bookmarks(user_id);
CREATE INDEX idx_event_bookmarks_event ON event_bookmarks(event_id);
CREATE INDEX idx_event_bookmarks_user_event ON event_bookmarks(user_id, event_id);
CREATE INDEX idx_event_bookmarks_date ON event_bookmarks(bookmarked_at);

-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================

-- ============================================================================
-- PROCEDURE: toggle_event_bookmark
-- Purpose: Add or remove a bookmark for a user
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
    -- Check if bookmark already exists
    SELECT id INTO v_bookmark_id 
    FROM event_bookmarks 
    WHERE user_id = p_user_id AND event_id = p_event_id;
    
    IF v_bookmark_id IS NOT NULL THEN
        -- Remove bookmark
        DELETE FROM event_bookmarks WHERE id = v_bookmark_id;
        v_action := 'removed';
    ELSE
        -- Add bookmark
        INSERT INTO event_bookmarks (user_id, event_id)
        VALUES (p_user_id, p_event_id)
        RETURNING id INTO v_bookmark_id;
        v_action := 'added';
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'action', v_action,
        'bookmark_id', v_bookmark_id,
        'message', CASE 
            WHEN v_action = 'added' THEN 'Event bookmarked successfully'
            ELSE 'Bookmark removed successfully'
        END
    );
END;
$$;

-- ============================================================================
-- PROCEDURE: check_bookmark_status
-- Purpose: Check if a user has bookmarked an event
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
    SELECT * INTO v_bookmark 
    FROM event_bookmarks 
    WHERE user_id = p_user_id AND event_id = p_event_id;
    
    IF v_bookmark IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'is_bookmarked', false
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'is_bookmarked', true,
        'bookmarked_at', v_bookmark.bookmarked_at
    );
END;
$$;

-- ============================================================================
-- PROCEDURE: get_user_bookmarked_events
-- Purpose: Get all bookmarked events for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_bookmarked_events(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_bookmarks JSONB;
    v_total_count INTEGER;
BEGIN
    -- Get total count
    SELECT COUNT(*) INTO v_total_count
    FROM event_bookmarks eb
    JOIN events e ON eb.event_id = e.id
    WHERE eb.user_id = p_user_id
    AND e.status = 'active'; -- Only show active events
    
    -- Get bookmarked events
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
            'created_at', e.created_at
        ) as event_data
        FROM event_bookmarks eb
        JOIN events e ON eb.event_id = e.id
        WHERE eb.user_id = p_user_id
        AND e.status = 'active'
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
