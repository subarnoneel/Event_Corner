-- ============================================================================
-- MIGRATION: Allow re-registration after rejection
-- Created: 2026-02-06
-- Purpose: Update submit_event_registration to allow rejected users to re-register
-- ============================================================================

-- ============================================================================
-- PROCEDURE: submit_event_registration (UPDATED)
-- Purpose: Submit a user registration for an event
-- Change: Allow re-registration if previous registration was rejected
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
    v_existing_registration RECORD;
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
    SELECT id, status INTO v_existing_registration 
    FROM event_participants 
    WHERE event_id = p_event_id AND user_id = p_user_id;
    
    IF v_existing_registration IS NOT NULL THEN
        -- If previous registration was rejected, allow re-registration by updating the existing record
        IF v_existing_registration.status = 'rejected' THEN
            UPDATE event_participants
            SET 
                form_data = p_form_data,
                team_name = p_team_name,
                team_members = p_team_members,
                uploaded_files = p_uploaded_files,
                status = 'pending',
                reviewed_by = NULL,
                reviewed_at = NULL,
                rejection_reason = NULL,
                submitted_at = NOW(),
                updated_at = NOW()
            WHERE id = v_existing_registration.id
            RETURNING id INTO v_participant_id;
            
            RETURN jsonb_build_object(
                'success', true,
                'participant_id', v_participant_id,
                'message', 'Registration re-submitted successfully. Pending approval.'
            );
        ELSE
            -- If pending or approved, don't allow re-registration
            RETURN jsonb_build_object(
                'success', false,
                'error', 'You have already registered for this event'
            );
        END IF;
    END IF;
    
    -- Insert new registration
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
