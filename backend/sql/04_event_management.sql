-- ============================================================================
-- EVENT CORNER - EVENT MANAGEMENT FUNCTIONS
-- ============================================================================
-- Description: Functions for creating, updating, and managing events
-- Author: Event Corner Team
-- ============================================================================


-- ============================================================================
-- FUNCTION: create_event_with_timeslots
-- Purpose: Create a new event with associated timeslots in a single transaction
-- Parameters: All event fields + timeslots array
-- Returns: event_id, success status, message
-- ============================================================================
CREATE OR REPLACE FUNCTION create_event_with_timeslots(
    p_title VARCHAR(255),
    p_description TEXT,
    p_category VARCHAR(100),
    p_tags TEXT[],
    p_banner_url TEXT,
    p_thumbnail_url TEXT,
    p_image_urls TEXT[],
    p_venue_type VARCHAR(50),
    p_venue_name VARCHAR(255),
    p_event_timezone VARCHAR(100),
    p_venue_address TEXT,
    p_venue_lat NUMERIC,
    p_venue_lng NUMERIC,
    p_google_place_id VARCHAR(255),
    p_venue_city VARCHAR(100),
    p_venue_state VARCHAR(100),
    p_venue_country VARCHAR(100),
    p_created_by UUID,
    p_institution_id UUID,
    p_status VARCHAR(50),
    p_visibility VARCHAR(50),
    p_contact_email VARCHAR(255),
    p_contact_phone VARCHAR(50),
    p_website_url TEXT,
    p_requirements TEXT,
    p_additional_info JSONB,
    p_timeslots JSONB
)
RETURNS TABLE(event_id UUID, success BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_event_id UUID;
    v_timeslot JSONB;
BEGIN
    -- Insert event
    INSERT INTO events (
        title, description, category, tags,
        banner_url, thumbnail_url, image_urls,
        venue_type, venue_name, event_timezone, venue_address,
        venue_lat, venue_lng, google_place_id,
        venue_city, venue_state, venue_country,
        created_by, institution_id,
        status, visibility,
        contact_email, contact_phone, website_url,
        requirements, additional_info
    ) VALUES (
        p_title, p_description, p_category, p_tags,
        p_banner_url, p_thumbnail_url, p_image_urls,
        p_venue_type, p_venue_name, COALESCE(p_event_timezone, 'Asia/Dhaka'), p_venue_address,
        p_venue_lat, p_venue_lng, p_google_place_id,
        p_venue_city, p_venue_state, p_venue_country,
        p_created_by, p_institution_id,
        COALESCE(p_status, 'active'), COALESCE(p_visibility, 'public'),
        p_contact_email, p_contact_phone, p_website_url,
        p_requirements, p_additional_info
    ) RETURNING id INTO v_event_id;

    -- Insert timeslots if provided
    IF p_timeslots IS NOT NULL AND jsonb_array_length(p_timeslots) > 0 THEN
        FOR v_timeslot IN SELECT * FROM jsonb_array_elements(p_timeslots)
        LOOP
            INSERT INTO event_timeslots (
                event_id, title, description, start_time, end_time, color
            ) VALUES (
                v_event_id,
                (v_timeslot->>'title')::VARCHAR(255),
                v_timeslot->>'description',
                (v_timeslot->>'start')::TIMESTAMP WITH TIME ZONE,
                (v_timeslot->>'end')::TIMESTAMP WITH TIME ZONE,
                COALESCE(v_timeslot->>'color', '#3b82f6')
            );
        END LOOP;
    END IF;

    -- Return success
    RETURN QUERY SELECT v_event_id, TRUE, 'Event created successfully'::TEXT;

EXCEPTION WHEN OTHERS THEN
    -- Return error
    RETURN QUERY SELECT NULL::UUID, FALSE, SQLERRM::TEXT;
END;
$$;


-- ============================================================================
-- FUNCTION: update_event_with_timeslots
-- Purpose: Update an existing event and replace all timeslots
-- Parameters: Event fields + timeslots array
-- Returns: success status, message
-- ============================================================================
CREATE OR REPLACE FUNCTION update_event_with_timeslots(
    p_event_id UUID,
    p_title VARCHAR(255),
    p_description TEXT,
    p_category VARCHAR(100),
    p_tags TEXT[],
    p_banner_url TEXT,
    p_thumbnail_url TEXT,
    p_image_urls TEXT[],
    p_venue_type VARCHAR(50),
    p_venue_name VARCHAR(255),
    p_event_timezone VARCHAR(100),
    p_venue_address TEXT,
    p_venue_lat NUMERIC,
    p_venue_lng NUMERIC,
    p_google_place_id VARCHAR(255),
    p_venue_city VARCHAR(100),
    p_venue_state VARCHAR(100),
    p_venue_country VARCHAR(100),
    p_status VARCHAR(50),
    p_visibility VARCHAR(50),
    p_is_featured BOOLEAN,
    p_contact_email VARCHAR(255),
    p_contact_phone VARCHAR(50),
    p_website_url TEXT,
    p_requirements TEXT,
    p_additional_info JSONB,
    p_timeslots JSONB
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_timeslot JSONB;
BEGIN
    -- Update event fields
    UPDATE events SET
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        category = COALESCE(p_category, category),
        tags = COALESCE(p_tags, tags),
        banner_url = COALESCE(p_banner_url, banner_url),
        thumbnail_url = COALESCE(p_thumbnail_url, thumbnail_url),
        image_urls = COALESCE(p_image_urls, image_urls),
        venue_type = COALESCE(p_venue_type, venue_type),
        venue_name = COALESCE(p_venue_name, venue_name),
        event_timezone = COALESCE(p_event_timezone, event_timezone),
        venue_address = COALESCE(p_venue_address, venue_address),
        venue_lat = COALESCE(p_venue_lat, venue_lat),
        venue_lng = COALESCE(p_venue_lng, venue_lng),
        google_place_id = COALESCE(p_google_place_id, google_place_id),
        venue_city = COALESCE(p_venue_city, venue_city),
        venue_state = COALESCE(p_venue_state, venue_state),
        venue_country = COALESCE(p_venue_country, venue_country),
        status = COALESCE(p_status, status),
        visibility = COALESCE(p_visibility, visibility),
        is_featured = COALESCE(p_is_featured, is_featured),
        contact_email = COALESCE(p_contact_email, contact_email),
        contact_phone = COALESCE(p_contact_phone, contact_phone),
        website_url = COALESCE(p_website_url, website_url),
        requirements = COALESCE(p_requirements, requirements),
        additional_info = COALESCE(p_additional_info, additional_info)
    WHERE id = p_event_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Event not found'::TEXT;
        RETURN;
    END IF;

    -- Delete all existing timeslots for this event
    DELETE FROM event_timeslots WHERE event_id = p_event_id;

    -- Insert new timeslots if provided
    IF p_timeslots IS NOT NULL AND jsonb_array_length(p_timeslots) > 0 THEN
        FOR v_timeslot IN SELECT * FROM jsonb_array_elements(p_timeslots)
        LOOP
            INSERT INTO event_timeslots (
                event_id, title, description, start_time, end_time, color
            ) VALUES (
                p_event_id,
                (v_timeslot->>'title')::VARCHAR(255),
                v_timeslot->>'description',
                (v_timeslot->>'start')::TIMESTAMP WITH TIME ZONE,
                (v_timeslot->>'end')::TIMESTAMP WITH TIME ZONE,
                COALESCE(v_timeslot->>'color', '#3b82f6')
            );
        END LOOP;
    END IF;

    -- Return success
    RETURN QUERY SELECT TRUE, 'Event and timeslots updated successfully'::TEXT;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::TEXT;
END;
$$;


-- ============================================================================
-- FUNCTION: get_events
-- Purpose: Get events with filtering, pagination, and sorting
-- Parameters: Various filters
-- Returns: Event records with timeslot count
-- ============================================================================
CREATE OR REPLACE FUNCTION get_events(
    p_category VARCHAR(100) DEFAULT NULL,
    p_visibility VARCHAR(50) DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_institution_id UUID DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
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
    created_at TIMESTAMPTZ,
    timeslot_count BIGINT,
    approval_status VARCHAR(50)
)
LANGUAGE plpgsql
AS $$
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
$$;


-- ============================================================================
-- FUNCTION: get_event_by_id
-- Purpose: Get a single event with all details and timeslots
-- Parameters: event_id
-- Returns: Event record with timeslots as JSONB
-- ============================================================================
CREATE OR REPLACE FUNCTION get_event_by_id(p_event_id UUID)
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    description TEXT,
    category VARCHAR(100),
    tags TEXT[],
    banner_url TEXT,
    thumbnail_url TEXT,
    image_urls TEXT[],
    venue_type VARCHAR(50),
    venue_name VARCHAR(255),
    event_timezone VARCHAR(100),
    venue_address TEXT,
    venue_lat NUMERIC,
    venue_lng NUMERIC,
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
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    approval_status VARCHAR(50),
    requires_approval BOOLEAN,
    timeslots JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.category,
        e.tags,
        e.banner_url,
        e.thumbnail_url,
        e.image_urls,
        e.venue_type,
        e.venue_name,
        e.event_timezone,
        e.venue_address,
        e.venue_lat,
        e.venue_lng,
        e.google_place_id,
        e.venue_city,
        e.venue_state,
        e.venue_country,
        e.created_by,
        e.institution_id,
        e.status,
        e.visibility,
        e.is_featured,
        e.contact_email,
        e.contact_phone,
        e.website_url,
        e.requirements,
        e.additional_info,
        e.view_count,
        e.created_at,
        e.updated_at,
        e.approval_status,
        e.requires_approval,
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
$$;


-- ============================================================================
-- FUNCTION: delete_event
-- Purpose: Delete an event and all associated data (cascading)
-- Parameters: event_id
-- Returns: success status, message
-- ============================================================================
CREATE OR REPLACE FUNCTION delete_event(p_event_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM events WHERE id = p_event_id;

    IF FOUND THEN
        RETURN QUERY SELECT TRUE, 'Event deleted successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'Event not found'::TEXT;
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::TEXT;
END;
$$;


-- ============================================================================
-- FUNCTION: increment_event_view_count
-- Purpose: Increment the view count for an event
-- Parameters: event_id
-- Returns: void
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_event_view_count(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE events 
    SET view_count = view_count + 1 
    WHERE id = p_event_id;
END;
$$;


-- ============================================================================
-- FUNCTION: add_event_timeslot
-- Purpose: Add a single timeslot to an existing event
-- Parameters: Timeslot fields
-- Returns: timeslot_id, success status, message
-- ============================================================================
CREATE OR REPLACE FUNCTION add_event_timeslot(
    p_event_id UUID,
    p_title VARCHAR(255),
    p_description TEXT,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_color VARCHAR(20) DEFAULT '#3b82f6'
)
RETURNS TABLE(timeslot_id UUID, success BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_timeslot_id UUID;
BEGIN
    INSERT INTO event_timeslots (event_id, title, description, start_time, end_time, color)
    VALUES (p_event_id, p_title, p_description, p_start_time, p_end_time, p_color)
    RETURNING id INTO v_timeslot_id;

    RETURN QUERY SELECT v_timeslot_id, TRUE, 'Timeslot added successfully'::TEXT;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, SQLERRM::TEXT;
END;
$$;


-- ============================================================================
-- FUNCTION: update_event_timeslot
-- Purpose: Update a single timeslot
-- Parameters: Timeslot fields
-- Returns: success status, message
-- ============================================================================
CREATE OR REPLACE FUNCTION update_event_timeslot(
    p_timeslot_id UUID,
    p_title VARCHAR(255) DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_start_time TIMESTAMPTZ DEFAULT NULL,
    p_end_time TIMESTAMPTZ DEFAULT NULL,
    p_color VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE event_timeslots SET
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        start_time = COALESCE(p_start_time, start_time),
        end_time = COALESCE(p_end_time, end_time),
        color = COALESCE(p_color, color)
    WHERE id = p_timeslot_id;

    IF FOUND THEN
        RETURN QUERY SELECT TRUE, 'Timeslot updated successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'Timeslot not found'::TEXT;
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::TEXT;
END;
$$;


-- ============================================================================
-- FUNCTION: delete_event_timeslot
-- Purpose: Delete a single timeslot
-- Parameters: timeslot_id
-- Returns: success status, message
-- ============================================================================
CREATE OR REPLACE FUNCTION delete_event_timeslot(p_timeslot_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM event_timeslots WHERE id = p_timeslot_id;

    IF FOUND THEN
        RETURN QUERY SELECT TRUE, 'Timeslot deleted successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'Timeslot not found'::TEXT;
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::TEXT;
END;
$$;
