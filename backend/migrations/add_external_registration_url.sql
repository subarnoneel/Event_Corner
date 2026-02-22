-- ============================================================================
-- MIGRATION: Add external registration URL support
-- Created: 2026-02-06
-- Purpose: Add external_registration_url column to event_registration_configs
-- ============================================================================

-- Add the external_registration_url column
ALTER TABLE event_registration_configs 
ADD COLUMN IF NOT EXISTS external_registration_url TEXT;

-- ============================================================================
-- PROCEDURE: create_event_registration_config (UPDATED)
-- Purpose: Create or update registration configuration for an event
-- Change: Added support for external_registration_url
-- ============================================================================

CREATE OR REPLACE FUNCTION create_event_registration_config(
    p_event_id UUID,
    p_registration_type VARCHAR(20),
    p_template_type VARCHAR(20) DEFAULT 'individual',
    p_team_min_size INTEGER DEFAULT 1,
    p_team_max_size INTEGER DEFAULT 5,
    p_form_config JSONB DEFAULT '{"fields": [], "settings": {}}',
    p_registration_deadline TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_external_registration_url TEXT DEFAULT NULL
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
            template_type = CASE WHEN p_registration_type = 'external' THEN NULL ELSE p_template_type END,
            team_min_size = CASE WHEN p_registration_type = 'external' THEN NULL ELSE p_team_min_size END,
            team_max_size = CASE WHEN p_registration_type = 'external' THEN NULL ELSE p_team_max_size END,
            form_config = CASE WHEN p_registration_type = 'external' THEN '{"fields": [], "settings": {}}'::jsonb ELSE p_form_config END,
            registration_deadline = p_registration_deadline,
            external_registration_url = CASE WHEN p_registration_type = 'external' THEN p_external_registration_url ELSE NULL END,
            updated_at = NOW()
        WHERE id = v_config_id;
    ELSE
        -- Insert new config
        INSERT INTO event_registration_configs (
            event_id, registration_type, template_type, 
            team_min_size, team_max_size, form_config, registration_deadline,
            external_registration_url
        ) VALUES (
            p_event_id, 
            p_registration_type, 
            CASE WHEN p_registration_type = 'external' THEN NULL ELSE p_template_type END,
            CASE WHEN p_registration_type = 'external' THEN NULL ELSE p_team_min_size END,
            CASE WHEN p_registration_type = 'external' THEN NULL ELSE p_team_max_size END,
            CASE WHEN p_registration_type = 'external' THEN '{"fields": [], "settings": {}}'::jsonb ELSE p_form_config END,
            p_registration_deadline,
            CASE WHEN p_registration_type = 'external' THEN p_external_registration_url ELSE NULL END
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
-- PROCEDURE: get_event_registration_config (UPDATED)
-- Purpose: Get registration configuration for an event
-- Change: Added external_registration_url to response
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
            'external_registration_url', v_config.external_registration_url,
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
