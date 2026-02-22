-- ============================================================================
-- EVENT REGISTRATION SYSTEM MIGRATION
-- Created: 2026-02-05
-- Purpose: Add tables for event registration management
-- ============================================================================

-- ============================================================================
-- EVENT REGISTRATION CONFIGS TABLE
-- Stores the registration form configuration for each event
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_registration_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Registration type: 'internal' (using Event Corner) or 'external' (organizer's own process)
    registration_type VARCHAR(20) NOT NULL DEFAULT 'internal' CHECK (registration_type IN ('internal', 'external')),
    
    -- Template type: 'individual' or 'team'
    template_type VARCHAR(20) DEFAULT 'individual' CHECK (template_type IN ('individual', 'team')),
    
    -- Team configuration (for team registrations)
    team_min_size INTEGER DEFAULT 1,
    team_max_size INTEGER DEFAULT 5,
    
    -- Form configuration stored as JSON
    -- Structure: { fields: [...], settings: {...} }
    form_config JSONB NOT NULL DEFAULT '{"fields": [], "settings": {}}',
    
    -- Registration deadline
    registration_deadline TIMESTAMP WITH TIME ZONE,
    
    -- Status flags
    is_active BOOLEAN DEFAULT TRUE,
    is_registration_open BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one config per event
    UNIQUE(event_id)
);

CREATE INDEX idx_event_reg_configs_event ON event_registration_configs(event_id);
CREATE INDEX idx_event_reg_configs_active ON event_registration_configs(is_active);
CREATE INDEX idx_event_reg_configs_deadline ON event_registration_configs(registration_deadline);

-- ============================================================================
-- EVENT PARTICIPANTS TABLE
-- Stores user registrations for events
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Registration form data stored as JSON
    -- Matches the structure defined in form_config
    form_data JSONB NOT NULL DEFAULT '{}',
    
    -- For team registrations, store team info
    team_name VARCHAR(255),
    team_members JSONB DEFAULT '[]', -- Array of member data
    
    -- File uploads (for ID documents, payment receipts, etc.)
    uploaded_files TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Registration status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    
    -- Review information
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Timestamps
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate registrations (one per user per event)
    UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_participants_event ON event_participants(event_id);
CREATE INDEX idx_event_participants_user ON event_participants(user_id);
CREATE INDEX idx_event_participants_status ON event_participants(status);
CREATE INDEX idx_event_participants_event_status ON event_participants(event_id, status);

-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================

-- ============================================================================
-- PROCEDURE: create_event_registration_config
-- Purpose: Create or update registration configuration for an event
-- ============================================================================

CREATE OR REPLACE FUNCTION create_event_registration_config(
    p_event_id UUID,
    p_registration_type VARCHAR(20),
    p_template_type VARCHAR(20) DEFAULT 'individual',
    p_team_min_size INTEGER DEFAULT 1,
    p_team_max_size INTEGER DEFAULT 5,
    p_form_config JSONB DEFAULT '{"fields": [], "settings": {}}',
    p_registration_deadline TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_config_id UUID;
    v_result JSONB;
BEGIN
    -- Check if config already exists
    SELECT id INTO v_config_id FROM event_registration_configs WHERE event_id = p_event_id;
    
    IF v_config_id IS NOT NULL THEN
        -- Update existing config
        UPDATE event_registration_configs
        SET 
            registration_type = p_registration_type,
            template_type = p_template_type,
            team_min_size = p_team_min_size,
            team_max_size = p_team_max_size,
            form_config = p_form_config,
            registration_deadline = p_registration_deadline,
            updated_at = NOW()
        WHERE id = v_config_id;
    ELSE
        -- Insert new config
        INSERT INTO event_registration_configs (
            event_id, registration_type, template_type, 
            team_min_size, team_max_size, form_config, registration_deadline
        ) VALUES (
            p_event_id, p_registration_type, p_template_type,
            p_team_min_size, p_team_max_size, p_form_config, p_registration_deadline
        )
        RETURNING id INTO v_config_id;
    END IF;
    
    v_result := jsonb_build_object(
        'success', true,
        'config_id', v_config_id,
        'message', 'Registration configuration saved successfully'
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- PROCEDURE: get_event_registration_config
-- Purpose: Get registration configuration for an event
-- ============================================================================

CREATE OR REPLACE FUNCTION get_event_registration_config(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_config RECORD;
    v_result JSONB;
BEGIN
    SELECT * INTO v_config FROM event_registration_configs WHERE event_id = p_event_id;
    
    IF v_config IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Registration configuration not found'
        );
    END IF;
    
    -- Check if registration is still open (based on deadline)
    v_result := jsonb_build_object(
        'success', true,
        'config', jsonb_build_object(
            'id', v_config.id,
            'event_id', v_config.event_id,
            'registration_type', v_config.registration_type,
            'template_type', v_config.template_type,
            'team_min_size', v_config.team_min_size,
            'team_max_size', v_config.team_max_size,
            'form_config', v_config.form_config,
            'registration_deadline', v_config.registration_deadline,
            'is_active', v_config.is_active,
            'is_registration_open', v_config.is_registration_open AND 
                (v_config.registration_deadline IS NULL OR v_config.registration_deadline > NOW()),
            'is_deadline_passed', v_config.registration_deadline IS NOT NULL AND v_config.registration_deadline <= NOW()
        )
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- PROCEDURE: submit_event_registration
-- Purpose: Submit a user registration for an event
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_event_registration(
    p_event_id UUID,
    p_user_id UUID,
    p_form_data JSONB,
    p_team_name VARCHAR(255) DEFAULT NULL,
    p_team_members JSONB DEFAULT '[]',
    p_uploaded_files TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_config RECORD;
    v_participant_id UUID;
    v_existing_registration UUID;
BEGIN
    -- Check if registration config exists and is open
    SELECT * INTO v_config FROM event_registration_configs 
    WHERE event_id = p_event_id AND is_active = true;
    
    IF v_config IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Registration is not available for this event'
        );
    END IF;
    
    -- Check if registration type is internal
    IF v_config.registration_type = 'external' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'This event uses external registration'
        );
    END IF;
    
    -- Check deadline
    IF v_config.registration_deadline IS NOT NULL AND v_config.registration_deadline <= NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Registration deadline has passed'
        );
    END IF;
    
    -- Check if user already registered
    SELECT id INTO v_existing_registration 
    FROM event_participants 
    WHERE event_id = p_event_id AND user_id = p_user_id;
    
    IF v_existing_registration IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You have already registered for this event'
        );
    END IF;
    
    -- Insert registration
    INSERT INTO event_participants (
        event_id, user_id, form_data, team_name, team_members, uploaded_files, status
    ) VALUES (
        p_event_id, p_user_id, p_form_data, p_team_name, p_team_members, p_uploaded_files, 'pending'
    )
    RETURNING id INTO v_participant_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'participant_id', v_participant_id,
        'message', 'Registration submitted successfully. Pending approval.'
    );
END;
$$;

-- ============================================================================
-- PROCEDURE: get_pending_participants
-- Purpose: Get pending participant registrations for organizer's events
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_participants(
    p_organizer_id UUID,
    p_event_id UUID DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_offset INTEGER;
    v_total_count INTEGER;
    v_participants JSONB;
BEGIN
    v_offset := (p_page - 1) * p_limit;
    
    -- Get total count
    SELECT COUNT(*) INTO v_total_count
    FROM event_participants ep
    JOIN events e ON ep.event_id = e.id
    WHERE e.created_by = p_organizer_id
    AND ep.status = 'pending'
    AND (p_event_id IS NULL OR ep.event_id = p_event_id);
    
    -- Get participants grouped by event
    SELECT COALESCE(jsonb_agg(participant_data), '[]'::jsonb) INTO v_participants
    FROM (
        SELECT jsonb_build_object(
            'id', ep.id,
            'event_id', ep.event_id,
            'event_title', e.title,
            'user_id', ep.user_id,
            'user_email', u.email,
            'user_name', u.full_name,
            'form_data', ep.form_data,
            'team_name', ep.team_name,
            'team_members', ep.team_members,
            'uploaded_files', ep.uploaded_files,
            'submitted_at', ep.submitted_at
        ) as participant_data
        FROM event_participants ep
        JOIN events e ON ep.event_id = e.id
        LEFT JOIN users u ON ep.user_id = u.id
        WHERE e.created_by = p_organizer_id
        AND ep.status = 'pending'
        AND (p_event_id IS NULL OR ep.event_id = p_event_id)
        ORDER BY ep.submitted_at DESC
        LIMIT p_limit OFFSET v_offset
    ) sub;
    
    RETURN jsonb_build_object(
        'success', true,
        'data', v_participants,
        'pagination', jsonb_build_object(
            'page', p_page,
            'limit', p_limit,
            'total', v_total_count,
            'total_pages', CEIL(v_total_count::DECIMAL / p_limit)
        )
    );
END;
$$;

-- ============================================================================
-- PROCEDURE: get_approved_participants
-- Purpose: Get approved participant registrations for organizer's events
-- ============================================================================

CREATE OR REPLACE FUNCTION get_approved_participants(
    p_organizer_id UUID,
    p_event_id UUID DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_offset INTEGER;
    v_total_count INTEGER;
    v_participants JSONB;
BEGIN
    v_offset := (p_page - 1) * p_limit;
    
    -- Get total count
    SELECT COUNT(*) INTO v_total_count
    FROM event_participants ep
    JOIN events e ON ep.event_id = e.id
    WHERE e.created_by = p_organizer_id
    AND ep.status = 'approved'
    AND (p_event_id IS NULL OR ep.event_id = p_event_id);
    
    -- Get participants
    SELECT COALESCE(jsonb_agg(participant_data), '[]'::jsonb) INTO v_participants
    FROM (
        SELECT jsonb_build_object(
            'id', ep.id,
            'event_id', ep.event_id,
            'event_title', e.title,
            'user_id', ep.user_id,
            'user_email', u.email,
            'user_name', u.full_name,
            'form_data', ep.form_data,
            'team_name', ep.team_name,
            'team_members', ep.team_members,
            'uploaded_files', ep.uploaded_files,
            'submitted_at', ep.submitted_at,
            'reviewed_at', ep.reviewed_at
        ) as participant_data
        FROM event_participants ep
        JOIN events e ON ep.event_id = e.id
        LEFT JOIN users u ON ep.user_id = u.id
        WHERE e.created_by = p_organizer_id
        AND ep.status = 'approved'
        AND (p_event_id IS NULL OR ep.event_id = p_event_id)
        ORDER BY ep.reviewed_at DESC
        LIMIT p_limit OFFSET v_offset
    ) sub;
    
    RETURN jsonb_build_object(
        'success', true,
        'data', v_participants,
        'pagination', jsonb_build_object(
            'page', p_page,
            'limit', p_limit,
            'total', v_total_count,
            'total_pages', CEIL(v_total_count::DECIMAL / p_limit)
        )
    );
END;
$$;

-- ============================================================================
-- PROCEDURE: approve_participant
-- Purpose: Approve a participant registration
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_participant(
    p_participant_id UUID,
    p_reviewer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_participant RECORD;
    v_event RECORD;
BEGIN
    -- Get participant details
    SELECT ep.*, e.title as event_title, e.created_by as organizer_id
    INTO v_participant
    FROM event_participants ep
    JOIN events e ON ep.event_id = e.id
    WHERE ep.id = p_participant_id;
    
    IF v_participant IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Participant not found'
        );
    END IF;
    
    -- Update status
    UPDATE event_participants
    SET 
        status = 'approved',
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_participant_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'participant_id', p_participant_id,
        'user_id', v_participant.user_id,
        'event_id', v_participant.event_id,
        'event_title', v_participant.event_title,
        'message', 'Participant approved successfully'
    );
END;
$$;

-- ============================================================================
-- PROCEDURE: reject_participant
-- Purpose: Reject a participant registration
-- ============================================================================

CREATE OR REPLACE FUNCTION reject_participant(
    p_participant_id UUID,
    p_reviewer_id UUID,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_participant RECORD;
BEGIN
    -- Get participant details
    SELECT ep.*, e.title as event_title
    INTO v_participant
    FROM event_participants ep
    JOIN events e ON ep.event_id = e.id
    WHERE ep.id = p_participant_id;
    
    IF v_participant IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Participant not found'
        );
    END IF;
    
    -- Update status
    UPDATE event_participants
    SET 
        status = 'rejected',
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        rejection_reason = p_rejection_reason,
        updated_at = NOW()
    WHERE id = p_participant_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'participant_id', p_participant_id,
        'user_id', v_participant.user_id,
        'event_id', v_participant.event_id,
        'event_title', v_participant.event_title,
        'message', 'Participant rejected'
    );
END;
$$;

-- ============================================================================
-- PROCEDURE: get_events_with_participants_count
-- Purpose: Get organizer's events with participant counts for management
-- ============================================================================

CREATE OR REPLACE FUNCTION get_events_with_participants_count(p_organizer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_events JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(event_data), '[]'::jsonb) INTO v_events
    FROM (
        SELECT jsonb_build_object(
            'id', e.id,
            'title', e.title,
            'banner_url', e.banner_url,
            'registration_type', COALESCE(erc.registration_type, 'none'),
            'registration_deadline', erc.registration_deadline,
            'is_registration_open', erc.is_registration_open AND 
                (erc.registration_deadline IS NULL OR erc.registration_deadline > NOW()),
            'pending_count', (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id AND status = 'pending'),
            'approved_count', (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id AND status = 'approved'),
            'rejected_count', (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id AND status = 'rejected')
        ) as event_data
        FROM events e
        LEFT JOIN event_registration_configs erc ON e.id = erc.event_id
        WHERE e.created_by = p_organizer_id
        AND erc.registration_type = 'internal'
        ORDER BY e.created_at DESC
    ) sub;
    
    RETURN jsonb_build_object(
        'success', true,
        'events', v_events
    );
END;
$$;

-- ============================================================================
-- PROCEDURE: get_participant_emails_by_event
-- Purpose: Get all approved participant emails for an event (for bulk email)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_participant_emails_by_event(
    p_event_id UUID,
    p_organizer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_event RECORD;
    v_emails JSONB;
BEGIN
    -- Verify organizer owns the event
    SELECT * INTO v_event FROM events WHERE id = p_event_id AND created_by = p_organizer_id;
    
    IF v_event IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Event not found or access denied'
        );
    END IF;
    
    -- Get emails from form_data (email field) and user accounts
    SELECT COALESCE(jsonb_agg(DISTINCT email_data), '[]'::jsonb) INTO v_emails
    FROM (
        SELECT jsonb_build_object(
            'participant_id', ep.id,
            'email', COALESCE(ep.form_data->>'email', u.email),
            'name', COALESCE(ep.form_data->>'name', u.full_name)
        ) as email_data
        FROM event_participants ep
        LEFT JOIN users u ON ep.user_id = u.id
        WHERE ep.event_id = p_event_id
        AND ep.status = 'approved'
        AND (ep.form_data->>'email' IS NOT NULL OR u.email IS NOT NULL)
    ) sub;
    
    RETURN jsonb_build_object(
        'success', true,
        'event_id', p_event_id,
        'event_title', v_event.title,
        'participants', v_emails
    );
END;
$$;

-- ============================================================================
-- PROCEDURE: check_user_registration_status
-- Purpose: Check if a user has registered for an event and their status
-- ============================================================================

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
    
    IF v_registration IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'has_internal_registration', true,
            'is_registered', false,
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
        'submitted_at', v_registration.submitted_at,
        'reviewed_at', v_registration.reviewed_at
    );
END;
$$;
