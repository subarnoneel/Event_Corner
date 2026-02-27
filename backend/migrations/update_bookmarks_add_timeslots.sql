-- ============================================================================
-- UPDATE: get_user_bookmarked_events - Add timeslots
-- Purpose: Include event timeslots in bookmarked events response
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
    AND e.status = 'active';
    
    -- Get bookmarked events with timeslots
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
                    ) ORDER BY et.start_time
                ), '[]'::jsonb)
                FROM event_timeslots et
                WHERE et.event_id = e.id
            )
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
