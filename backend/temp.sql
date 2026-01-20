-- ============================================================================
-- EVENTS TABLE
-- ============================================================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic Information
    title VARCHAR(500) NOT NULL,
    description TEXT, -- Supports markdown formatting

    -- Categorization
    category VARCHAR(100) NOT NULL, -- e.g., 'workshop', 'seminar', 'competition', 'cultural'
    tags TEXT[], -- Array of tags for filtering

    -- Media
    banner_url TEXT,
    thumbnail_url TEXT,
    image_urls TEXT[], -- Additional images

    -- Location
    venue_type VARCHAR(50) NOT NULL, -- 'physical', 'online', 'hybrid'
    venue_name VARCHAR(255), -- Physical: venue name | Online: platform name (e.g., Zoom, Google Meet)
    event_timezone VARCHAR(50) DEFAULT 'Asia/Dhaka', -- IANA timezone identifier (e.g., 'Asia/Dhaka', 'America/New_York', 'Europe/London')
    
    -- Google Maps Integration Fields
    venue_address TEXT, -- Formatted address from Google Maps (for physical events only)
    venue_lat DECIMAL(10, 8), -- Latitude
    venue_lng DECIMAL(11, 8), -- Longitude
    google_place_id VARCHAR(255), -- Google Place ID for reference
    venue_city VARCHAR(100),
    venue_state VARCHAR(100),
    venue_country VARCHAR(100),

    -- Ownership & Management
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Parent institution (if organizer)
    
    -- Status & Visibility
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'cancelled', 'draft'
    visibility VARCHAR(50) DEFAULT 'public', -- 'public', 'private', 'institution_only'
    is_featured BOOLEAN DEFAULT FALSE, -- For highlighting important events

    -- Contact Information
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    website_url TEXT,

    -- Additional Info
    requirements TEXT, -- Prerequisites or requirements to participate (supports markdown formatting)
    additional_info JSONB, -- Flexible field for custom data
    
    -- Metadata
    view_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT venue_type_check CHECK (venue_type IN ('physical', 'online', 'hybrid'))
);

-- Indexes for Performance
CREATE INDEX idx_events_owner ON events(created_by);
CREATE INDEX idx_events_institution ON events(institution_id);
CREATE INDEX idx_events_title ON events(title);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_visibility ON events(visibility);
CREATE INDEX idx_events_featured ON events(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_events_tags ON events USING GIN(tags);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_events_location ON events(venue_lat, venue_lng) WHERE venue_type IN ('physical', 'hybrid');


-- ============================================================================
-- EVENT TIMESLOTS TABLE (Multiple sessions for one event)
-- ============================================================================
CREATE TABLE event_timeslots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL, -- e.g., "Opening Ceremony", "Workshop Session 1"
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    color VARCHAR(20) DEFAULT '#3b82f6', -- Calendar display color
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_timeslot CHECK (end_time > start_time)
);

CREATE INDEX idx_timeslots_event ON event_timeslots(event_id);
CREATE INDEX idx_timeslots_start ON event_timeslots(start_time);


-- ============================================================================
-- EVENT REGISTRATIONS TABLE
-- ============================================================================
CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Registration Status
    registration_status VARCHAR(20) DEFAULT 'pending', 
    CHECK (registration_status IN ('registered', 'pending', 'rejected')),
    
    -- Custom registration data (if organizer has custom form)
    registration_data JSONB,
    
    -- Attendance tracking
    checked_in BOOLEAN DEFAULT FALSE,
    check_in_time TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(event_id, user_id)
);

CREATE INDEX idx_registrations_event ON event_registrations(event_id);
CREATE INDEX idx_registrations_user ON event_registrations(user_id);
CREATE INDEX idx_registrations_status ON event_registrations(registration_status);
CREATE INDEX idx_registrations_checked_in ON event_registrations(checked_in);


-- ============================================================================
-- EVENT BOOKMARKS TABLE
-- ============================================================================
CREATE TABLE event_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Changed from BIGSERIAL to UUID
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE, -- Changed from BIGINT to UUID
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Changed from BIGINT to UUID
    bookmarked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(event_id, user_id)
);

CREATE INDEX idx_bookmarks_event ON event_bookmarks(event_id);
CREATE INDEX idx_bookmarks_user ON event_bookmarks(user_id);


-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATE
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_events_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_events_timestamp();

CREATE TRIGGER timeslots_updated_at
    BEFORE UPDATE ON event_timeslots
    FOR EACH ROW
    EXECUTE FUNCTION update_events_timestamp();

CREATE TRIGGER registrations_updated_at
    BEFORE UPDATE ON event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_events_timestamp();


-- ============================================================================
-- STORED FUNCTIONS AND PROCEDURES FOR EVENT CRUD OPERATIONS
-- ============================================================================

-- ============================================================================
-- CREATE EVENT WITH TIMESLOTS
-- ============================================================================
CREATE OR REPLACE FUNCTION create_event_with_timeslots(
    p_title VARCHAR(500),
    p_description TEXT,
    p_category VARCHAR(100),
    p_tags TEXT[],
    p_banner_url TEXT,
    p_thumbnail_url TEXT,
    p_image_urls TEXT[],
    p_venue_type VARCHAR(50),
    p_venue_name VARCHAR(255),
    p_event_timezone VARCHAR(50),
    p_venue_address TEXT,
    p_venue_lat DECIMAL(10, 8),
    p_venue_lng DECIMAL(11, 8),
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
    p_timeslots JSONB -- Array of {title, description, start, end, color}
)
RETURNS TABLE(
    event_id UUID,
    success BOOLEAN,
    message TEXT
) AS $$
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
$$ LANGUAGE plpgsql;


-- ============================================================================
-- GET EVENT BY ID (with timeslots)
-- ============================================================================
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


-- ============================================================================
-- UPDATE EVENT WITH TIMESLOTS (Replaces all timeslots)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_event_with_timeslots(
    p_event_id UUID,
    p_title VARCHAR(500),
    p_description TEXT,
    p_category VARCHAR(100),
    p_tags TEXT[],
    p_banner_url TEXT,
    p_thumbnail_url TEXT,
    p_image_urls TEXT[],
    p_venue_type VARCHAR(50),
    p_venue_name VARCHAR(255),
    p_event_timezone VARCHAR(50),
    p_venue_address TEXT,
    p_venue_lat DECIMAL(10, 8),
    p_venue_lng DECIMAL(11, 8),
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
    p_timeslots JSONB -- Array of {title, description, start, end, color}
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
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
$$ LANGUAGE plpgsql;


-- ============================================================================
-- DELETE EVENT (Cascades to timeslots, registrations, bookmarks)
-- ============================================================================
CREATE OR REPLACE FUNCTION delete_event(p_event_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
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
$$ LANGUAGE plpgsql;


-- ============================================================================
-- GET ALL EVENTS (with filters and pagination)
-- ============================================================================
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
    timeslot_count BIGINT
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
        COUNT(et.id) as timeslot_count
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
    GROUP BY e.id
    ORDER BY e.is_featured DESC, e.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- INCREMENT VIEW COUNT
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_event_view_count(p_event_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE events 
    SET view_count = view_count + 1 
    WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- TIMESLOT MANAGEMENT FUNCTIONS
-- ============================================================================

-- Add timeslot to event
CREATE OR REPLACE FUNCTION add_event_timeslot(
    p_event_id UUID,
    p_title VARCHAR(255),
    p_description TEXT,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE,
    p_color VARCHAR(20) DEFAULT '#3b82f6'
)
RETURNS TABLE(
    timeslot_id UUID,
    success BOOLEAN,
    message TEXT
) AS $$
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
$$ LANGUAGE plpgsql;

-- Update timeslot
CREATE OR REPLACE FUNCTION update_event_timeslot(
    p_timeslot_id UUID,
    p_title VARCHAR(255),
    p_description TEXT,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE,
    p_color VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
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
$$ LANGUAGE plpgsql;

-- Delete timeslot
CREATE OR REPLACE FUNCTION delete_event_timeslot(p_timeslot_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
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
$$ LANGUAGE plpgsql;


-- ============================================================================
-- EVENT REGISTRATION FUNCTIONS
-- ============================================================================

-- Register user for event
CREATE OR REPLACE FUNCTION register_for_event(
    p_event_id UUID,
    p_user_id UUID,
    p_registration_data JSONB DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
BEGIN
    INSERT INTO event_registrations (event_id, user_id, registration_data, registration_status)
    VALUES (p_event_id, p_user_id, p_registration_data, 'registered');

    RETURN QUERY SELECT TRUE, 'Registration successful'::TEXT;

EXCEPTION 
    WHEN unique_violation THEN
        RETURN QUERY SELECT FALSE, 'Already registered for this event'::TEXT;
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Cancel registration
CREATE OR REPLACE FUNCTION cancel_event_registration(
    p_event_id UUID,
    p_user_id UUID
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
BEGIN
    DELETE FROM event_registrations 
    WHERE event_id = p_event_id AND user_id = p_user_id;

    IF FOUND THEN
        RETURN QUERY SELECT TRUE, 'Registration cancelled'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'Registration not found'::TEXT;
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Check in user
CREATE OR REPLACE FUNCTION check_in_user(
    p_event_id UUID,
    p_user_id UUID
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
BEGIN
    UPDATE event_registrations 
    SET checked_in = TRUE, check_in_time = NOW()
    WHERE event_id = p_event_id AND user_id = p_user_id;

    IF FOUND THEN
        RETURN QUERY SELECT TRUE, 'User checked in successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'Registration not found'::TEXT;
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- EVENT BOOKMARK FUNCTIONS
-- ============================================================================

-- Bookmark event
CREATE OR REPLACE FUNCTION bookmark_event(
    p_event_id UUID,
    p_user_id UUID
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
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
$$ LANGUAGE plpgsql;

-- Remove bookmark
CREATE OR REPLACE FUNCTION remove_bookmark(
    p_event_id UUID,
    p_user_id UUID
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
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
$$ LANGUAGE plpgsql;