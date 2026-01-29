-- ============================================================================
-- ADD EVENT APPROVAL SYSTEM
-- ============================================================================

-- Add approval-related columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved' CHECK (approval_status IN ('pending_approval', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approval_token UUID,
ADD COLUMN IF NOT EXISTS approval_token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approval_responded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_approval_token ON events(approval_token) WHERE approval_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_approval_status ON events(approval_status);

-- Add comments for documentation
COMMENT ON COLUMN events.approval_status IS 'Status of contact email approval: pending_approval, approved, rejected';
COMMENT ON COLUMN events.approval_token IS 'Unique token for email verification link';
COMMENT ON COLUMN events.requires_approval IS 'TRUE if contact email differs from creator email';


-- ============================================================================
-- EVENT APPROVAL HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    contact_email VARCHAR(255) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected')),
    ip_address VARCHAR(45),
    user_agent TEXT,
    responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_approval_history_event_id ON event_approval_history(event_id);

COMMENT ON TABLE event_approval_history IS 'Tracks approval/rejection history for events requiring consent';


-- ============================================================================
-- UPDATE get_events FUNCTION TO FILTER BY APPROVAL STATUS
-- ============================================================================
-- Drop existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_events(VARCHAR, VARCHAR, VARCHAR, UUID, UUID, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_events(
    p_category VARCHAR(100) DEFAULT NULL,
    p_visibility VARCHAR(50) DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT 'active',
    p_created_by UUID DEFAULT NULL,
    p_institution_id UUID DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    title VARCHAR(500),
    description TEXT,
    category VARCHAR(100),
    tags TEXT[],
    banner_url TEXT,
    thumbnail_url TEXT,
    venue_type VARCHAR(50),
    venue_name VARCHAR(255),
    venue_address TEXT,
    created_by UUID,
    institution_id UUID,
    status VARCHAR(50),
    visibility VARCHAR(50),
    is_featured BOOLEAN,
    view_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    timeslot_count BIGINT,
    approval_status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id, e.title, e.description, e.category, e.tags,
        e.banner_url, e.thumbnail_url,
        e.venue_type, e.venue_name, e.venue_address,
        e.created_by, e.institution_id,
        e.status, e.visibility, e.is_featured,
        e.view_count, e.created_at,
        COUNT(et.id) as timeslot_count,
        e.approval_status
    FROM events e
    LEFT JOIN event_timeslots et ON e.id = et.event_id
    WHERE 
        (p_category IS NULL OR e.category = p_category)
        AND (p_visibility IS NULL OR e.visibility = p_visibility)
        AND (p_status IS NULL OR e.status = p_status)
        AND (p_created_by IS NULL OR e.created_by = p_created_by)
        AND (p_institution_id IS NULL OR e.institution_id = p_institution_id)
        AND (p_search IS NULL OR 
             e.title ILIKE '%' || p_search || '%' OR 
             e.description ILIKE '%' || p_search || '%')
        -- Only filter by approval_status when viewing public events (not your own)
        AND (p_created_by IS NOT NULL OR e.approval_status = 'approved')
    GROUP BY e.id
    ORDER BY e.is_featured DESC, e.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- UPDATE get_event_by_id TO INCLUDE APPROVAL STATUS
-- ============================================================================
-- Drop existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_event_by_id(UUID);

CREATE OR REPLACE FUNCTION get_event_by_id(p_event_id UUID)
RETURNS TABLE(
    id UUID,
    title VARCHAR(500),
    description TEXT,
    category VARCHAR(100),
    tags TEXT[],
    banner_url TEXT,
    thumbnail_url TEXT,
    image_urls TEXT[],
    venue_type VARCHAR(50),
    venue_name VARCHAR(255),
    event_timezone VARCHAR(50),
    venue_address TEXT,
    venue_lat DECIMAL(10, 8),
    venue_lng DECIMAL(11, 8),
    google_place_id VARCHAR(255),
    venue_city VARCHAR(100),
    venue_state VARCHAR(100),
    venue_country VARCHAR(100),
    created_by UUID,
    institution_id UUID,
    status VARCHAR(50),
    visibility VARCHAR(50),
    is_featured BOOLEAN,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    website_url TEXT,
    requirements TEXT,
    additional_info JSONB,
    view_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    approval_status VARCHAR(20),
    requires_approval BOOLEAN,
    timeslots JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.*,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', et.id,
                    'title', et.title,
                    'description', et.description,
                    'start', et.start_time,
                    'end', et.end_time,
                    'color', et.color
                ) ORDER BY et.start_time
            ) FILTER (WHERE et.id IS NOT NULL),
            '[]'::jsonb
        ) as timeslots
    FROM events e
    LEFT JOIN event_timeslots et ON e.id = et.event_id
    WHERE e.id = p_event_id
    GROUP BY e.id;
END;
$$ LANGUAGE plpgsql;
