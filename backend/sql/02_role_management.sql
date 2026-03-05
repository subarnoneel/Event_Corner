-- ============================================================================
-- ROLE MANAGEMENT FUNCTIONS
-- Purpose: Handle role assignment, removal, and queries
-- ============================================================================


-- ============================================================================
-- FUNCTION: get_all_roles
-- Purpose: Get all available roles in the system
-- ============================================================================
CREATE OR REPLACE FUNCTION get_all_roles()
RETURNS JSON AS $$
DECLARE
    v_roles JSON;
BEGIN
    -- Get all active roles
    SELECT json_agg(
        json_build_object(
            'id', id,
            'role_name', role_name,
            'display_name', display_name,
            'description', description,
            'is_active', is_active,
            'created_at', created_at
        ) ORDER BY display_name ASC
    ) INTO v_roles
    FROM roles
    WHERE is_active = TRUE;
    
    RETURN json_build_object(
        'success', TRUE,
        'data', COALESCE(v_roles, '[]'::json)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to get roles: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: get_user_roles
-- Purpose: Get all roles assigned to a specific user
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_user_exists BOOLEAN;
    v_roles JSON;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id AND is_active = TRUE) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'User not found or inactive.'
        );
    END IF;
    
    -- Get user roles
    SELECT json_agg(json_build_object(
        'id', r.id,
        'role_name', r.role_name,
        'display_name', r.display_name,
        'description', r.description,
        'assigned_at', ur.assigned_at,
        'assigned_by', ur.assigned_by
    )) INTO v_roles
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id AND r.is_active = TRUE
    ORDER BY ur.assigned_at DESC;
    
    RETURN json_build_object(
        'success', TRUE,
        'data', json_build_object(
            'user_id', p_user_id,
            'roles', COALESCE(v_roles, '[]'::json)
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to get user roles: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: assign_user_role
-- Purpose: Assign a role to a user
-- ============================================================================
CREATE OR REPLACE FUNCTION assign_user_role(
    p_user_id UUID,
    p_role_id UUID,
    p_assigned_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user_exists BOOLEAN;
    v_role_exists BOOLEAN;
    v_role_assigned BOOLEAN;
    v_role_name VARCHAR(50);
    v_role_display_name VARCHAR(100);
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id AND is_active = TRUE) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'User not found or inactive.'
        );
    END IF;
    
    -- Check if role exists and get role info
    SELECT EXISTS(SELECT 1 FROM roles WHERE id = p_role_id AND is_active = TRUE),
           role_name, display_name
    INTO v_role_exists, v_role_name, v_role_display_name
    FROM roles WHERE id = p_role_id AND is_active = TRUE;
    
    IF NOT v_role_exists THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Role not found or inactive.'
        );
    END IF;
    
    -- Check if role is already assigned
    SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role_id = p_role_id) INTO v_role_assigned;
    
    IF v_role_assigned THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'User already has this role assigned.'
        );
    END IF;
    
    -- Assign the role
    INSERT INTO user_roles (user_id, role_id, assigned_by)
    VALUES (p_user_id, p_role_id, p_assigned_by);
    
    RETURN json_build_object(
        'success', TRUE,
        'message', 'Role "' || v_role_display_name || '" assigned successfully.',
        'user_id', p_user_id,
        'role_id', p_role_id,
        'role_name', v_role_name,
        'role_display_name', v_role_display_name,
        'assigned_by', p_assigned_by,
        'assigned_at', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to assign role: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: remove_user_role
-- Purpose: Remove a role from a user
-- ============================================================================
CREATE OR REPLACE FUNCTION remove_user_role(
    p_user_id UUID,
    p_role_id UUID,
    p_removed_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_role_assigned BOOLEAN;
    v_role_name VARCHAR(50);
    v_role_display_name VARCHAR(100);
BEGIN
    -- Check if role is assigned and get role info
    SELECT EXISTS(SELECT 1 FROM user_roles ur 
                  JOIN roles r ON ur.role_id = r.id 
                  WHERE ur.user_id = p_user_id AND ur.role_id = p_role_id),
           r.role_name, r.display_name
    INTO v_role_assigned, v_role_name, v_role_display_name
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id AND ur.role_id = p_role_id;
    
    IF NOT v_role_assigned THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'User does not have this role assigned.'
        );
    END IF;
    
    -- Remove the role
    DELETE FROM user_roles 
    WHERE user_id = p_user_id AND role_id = p_role_id;
    
    RETURN json_build_object(
        'success', TRUE,
        'message', 'Role "' || v_role_display_name || '" removed successfully.',
        'user_id', p_user_id,
        'role_id', p_role_id,
        'role_name', v_role_name,
        'role_display_name', v_role_display_name,
        'removed_by', p_removed_by,
        'removed_at', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to remove role: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: bulk_assign_role
-- Purpose: Assign a role to multiple users
-- ============================================================================
CREATE OR REPLACE FUNCTION bulk_assign_role(
    p_user_ids UUID[],
    p_role_id UUID,
    p_assigned_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_role_exists BOOLEAN;
    v_assigned_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
    v_user_id UUID;
    v_role_name VARCHAR(50);
    v_role_display_name VARCHAR(100);
BEGIN
    -- Check if role exists
    SELECT EXISTS(SELECT 1 FROM roles WHERE id = p_role_id AND is_active = TRUE),
           role_name, display_name
    INTO v_role_exists, v_role_name, v_role_display_name
    FROM roles WHERE id = p_role_id AND is_active = TRUE;
    
    IF NOT v_role_exists THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Role not found or inactive.'
        );
    END IF;
    
    -- Loop through each user ID
    FOREACH v_user_id IN ARRAY p_user_ids LOOP
        -- Check if user exists and doesn't already have the role
        IF EXISTS(SELECT 1 FROM users WHERE id = v_user_id AND is_active = TRUE) AND
           NOT EXISTS(SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role_id = p_role_id) THEN
            
            -- Assign the role
            INSERT INTO user_roles (user_id, role_id, assigned_by)
            VALUES (v_user_id, p_role_id, p_assigned_by);
            
            v_assigned_count := v_assigned_count + 1;
        ELSE
            v_skipped_count := v_skipped_count + 1;
        END IF;
    END LOOP;
    
    RETURN json_build_object(
        'success', TRUE,
        'message', 'Bulk role assignment completed.',
        'role_name', v_role_name,
        'role_display_name', v_role_display_name,
        'assigned_count', v_assigned_count,
        'skipped_count', v_skipped_count,
        'total_processed', array_length(p_user_ids, 1)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to bulk assign roles: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;
