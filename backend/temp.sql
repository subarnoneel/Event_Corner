-- ============================================================================
-- EVENTS TABLE
-- ============================================================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic Information
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Categorization
    category VARCHAR(100) NOT NULL, -- e.g., 'workshop', 'seminar', 'competition', 'cultural'
    tags TEXT[], -- Array of tags for filtering

    -- Media
    banner_url TEXT,
    thumbnail_url TEXT,
    image_urls TEXT[], -- Additional images

    -- Location
    venue_type VARCHAR(50) NOT NULL, -- 'physical', 'online', 'hybrid'
    venue_name VARCHAR(255), -- For physical/hybrid events
    
    -- Google Maps Integration Fields
    venue_address TEXT, -- Formatted address from Google Maps
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

    -- Additional Info
    requirements TEXT, -- Prerequisites or requirements to participate
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