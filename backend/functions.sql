CREATE OR REPLACE FUNCTION register_user(
    p_firebase_uid VARCHAR(128),
    p_email VARCHAR(255),
    p_username VARCHAR(100),
    p_full_name VARCHAR(255),
    p_role VARCHAR(50),
    p_institution VARCHAR(255) DEFAULT NULL,
    p_institution_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_role_id UUID;
    v_result JSON;
BEGIN
    -- Validate that the role exists and is one of the allowed registration roles
    IF p_role NOT IN ('participant', 'organizer', 'institution') THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Invalid role. Only participant, organizer, and institution can register.'
        );
    END IF;

    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Email already registered.'
        );
    END IF;

    -- Check if username already exists
    IF EXISTS (SELECT 1 FROM users WHERE username = p_username) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Username already taken.'
        );
    END IF;

    -- Get the role_id
    SELECT id INTO v_role_id FROM roles WHERE role_name = p_role AND is_active = TRUE;
    
    IF v_role_id IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Role not found or inactive.'
        );
    END IF;

    -- Create the user
    INSERT INTO users (firebase_uid, email, username, full_name, institution, institution_id)
    VALUES (p_firebase_uid, p_email, p_username, p_full_name, p_institution, p_institution_id)
    RETURNING id INTO v_user_id;

    -- Assign the role
    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_user_id, v_role_id);

    -- Return success response with user data
    SELECT json_build_object(
        'success', TRUE,
        'user_id', v_user_id,
        'firebase_uid', p_firebase_uid,
        'email', p_email,
        'username', p_username,
        'full_name', p_full_name,
        'role', p_role,
        'profile_picture_url', users.profile_picture_url,
        'banner_url', users.banner_url,
        'is_verified', users.is_verified,
        'created_at', users.created_at
    ) INTO v_result
    FROM users WHERE id = v_user_id;

    RETURN v_result;

EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Email or username already exists.'
    );
WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Registration failed: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: get_user_with_roles
-- Purpose: Retrieve user by firebase_uid with all assigned roles
-- Parameters:
--   p_firebase_uid: Firebase UID
-- Returns: JSON with user data and array of roles
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_with_roles(p_firebase_uid VARCHAR(128))
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_result JSON;
BEGIN
    -- Get user ID from firebase_uid
    SELECT id INTO v_user_id FROM users WHERE firebase_uid = p_firebase_uid AND is_active = TRUE;

    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'User not found.'
        );
    END IF;

    -- Return user with roles
    SELECT json_build_object(
        'success', TRUE,
        'user_id', u.id,
        'firebase_uid', u.firebase_uid,
        'email', u.email,
        'username', u.username,
        'full_name', u.full_name,
        'profile_picture_url', u.profile_picture_url,
        'banner_url', u.banner_url,
        'institution', u.institution,
        'is_verified', u.is_verified,
        'is_active', u.is_active,
        'created_at', u.created_at,
        'updated_at', u.updated_at,
        'roles', (
            SELECT json_agg(json_build_object(
                'role_id', r.id,
                'role_name', r.role_name,
                'display_name', r.display_name
            ))
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = u.id AND r.is_active = TRUE
        )
    ) INTO v_result
    FROM users u
    WHERE u.id = v_user_id;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to retrieve user: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: login_user
-- Purpose: Verify user login and return user with roles
-- Parameters:
--   p_firebase_uid: Firebase UID (already authenticated by Firebase)
-- Returns: JSON with user data and roles
-- ============================================================================
CREATE OR REPLACE FUNCTION login_user(p_firebase_uid VARCHAR(128))
RETURNS JSON AS $$
BEGIN
    -- Just verify the user exists and is active, then return their data with roles
    IF NOT EXISTS (SELECT 1 FROM users WHERE firebase_uid = p_firebase_uid AND is_active = TRUE) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'User account is inactive or not found.'
        );
    END IF;

    -- Return user data using the existing function
    RETURN get_user_with_roles(p_firebase_uid);

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Login failed: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: check_user_exists
-- Purpose: Check if user exists by firebase_uid, email, or username
-- Parameters:
--   p_firebase_uid: Firebase UID (optional)
--   p_email: Email (optional)
--   p_username: Username (optional)
-- Returns: JSON with existence status
-- ============================================================================
CREATE OR REPLACE FUNCTION check_user_exists(
    p_firebase_uid VARCHAR(128) DEFAULT NULL,
    p_email VARCHAR(255) DEFAULT NULL,
    p_username VARCHAR(100) DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'exists_firebase_uid', CASE WHEN p_firebase_uid IS NOT NULL THEN EXISTS(SELECT 1 FROM users WHERE firebase_uid = p_firebase_uid) ELSE NULL END,
        'exists_email', CASE WHEN p_email IS NOT NULL THEN EXISTS(SELECT 1 FROM users WHERE email = p_email) ELSE NULL END,
        'exists_username', CASE WHEN p_username IS NOT NULL THEN EXISTS(SELECT 1 FROM users WHERE username = p_username) ELSE NULL END
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: get_user_by_id
-- Purpose: Retrieve user by user_id with all assigned roles
-- Parameters:
--   p_user_id: User UUID
-- Returns: JSON with user data and array of roles
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_by_id(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Check if user exists and is active
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_active = TRUE) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'User not found.'
        );
    END IF;

    -- Return user with roles
    SELECT json_build_object(
        'success', TRUE,
        'user_id', u.id,
        'firebase_uid', u.firebase_uid,
        'email', u.email,
        'username', u.username,
        'full_name', u.full_name,
        'profile_picture_url', u.profile_picture_url,
        'banner_url', u.banner_url,
        'institution', u.institution,
        'institution_id', u.institution_id,
        'additional_info', u.additional_info,
        'id_document_urls', u.id_document_urls,
        'is_verified', u.is_verified,
        'is_active', u.is_active,
        'created_at', u.created_at,
        'updated_at', u.updated_at,
        'roles', (
            SELECT json_agg(json_build_object(
                'role_id', r.id,
                'role_name', r.role_name,
                'display_name', r.display_name,
                'description', r.description,
                'assigned_at', ur.assigned_at
            ))
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = u.id AND r.is_active = TRUE
        )
    ) INTO v_result
    FROM users u
    WHERE u.id = p_user_id;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to retrieve user: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: get_all_institutions
-- Purpose: Fetch all users with institution role with pagination and sorting
-- Parameters:
--   p_page: Page number (default 1)
--   p_limit: Records per page (default 10)
--   p_sort_by: Sort field (name, email, created_at, verified_at)
--   p_sort_order: Sort order (ASC/DESC)
--   p_search: Search term for name or email
--   p_verified_filter: Filter by verification status (all, verified, unverified)
-- Returns: JSON with institutions data and pagination info
-- ============================================================================
CREATE OR REPLACE FUNCTION get_all_institutions(
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 10,
    p_sort_by VARCHAR(50) DEFAULT 'full_name',
    p_sort_order VARCHAR(4) DEFAULT 'ASC',
    p_search VARCHAR(255) DEFAULT NULL,
    p_verified_filter VARCHAR(20) DEFAULT 'all'
)
RETURNS JSON AS $$
DECLARE
    v_offset INTEGER;
    v_total_count INTEGER;
    v_institutions JSON;
    v_result JSON;
    v_where_clause TEXT := '';
    v_order_clause TEXT;
BEGIN
    -- Calculate offset
    v_offset := (p_page - 1) * p_limit;
    
    -- Validate sort order
    IF p_sort_order NOT IN ('ASC', 'DESC') THEN
        p_sort_order := 'ASC';
    END IF;
    
    -- Validate sort field
    IF p_sort_by NOT IN ('full_name', 'email', 'created_at', 'updated_at', 'is_verified') THEN
        p_sort_by := 'full_name';
    END IF;
    
    -- Build where clause for search
    IF p_search IS NOT NULL AND LENGTH(trim(p_search)) > 0 THEN
        v_where_clause := v_where_clause || ' AND (u.full_name ILIKE ''%' || p_search || '%'' OR u.email ILIKE ''%' || p_search || '%'')';
    END IF;
    
    -- Build where clause for verification filter
    IF p_verified_filter = 'verified' THEN
        v_where_clause := v_where_clause || ' AND u.is_verified = TRUE';
    ELSIF p_verified_filter = 'unverified' THEN
        v_where_clause := v_where_clause || ' AND u.is_verified = FALSE';
    END IF;
    
    -- Build order clause
    v_order_clause := ' ORDER BY u.' || p_sort_by || ' ' || p_sort_order;
    
    -- Get total count
    EXECUTE 'SELECT COUNT(*) FROM users u 
             JOIN user_roles ur ON u.id = ur.user_id 
             JOIN roles r ON ur.role_id = r.id 
             WHERE r.role_name = ''institution'' AND u.is_active = TRUE' || v_where_clause
    INTO v_total_count;
    
    -- Get institutions with pagination
    EXECUTE 'SELECT json_agg(row_to_json(t))
             FROM (
                 SELECT 
                     u.id,
                     u.firebase_uid,
                     u.email,
                     u.username,
                     u.full_name,
                     u.profile_picture_url,
                     u.banner_url,
                     u.institution,
                     u.additional_info,
                     u.is_verified,
                     u.is_active,
                     u.created_at,
                     u.updated_at,
                     CASE WHEN u.is_verified THEN u.updated_at ELSE NULL END as verified_at
                 FROM users u 
                 JOIN user_roles ur ON u.id = ur.user_id 
                 JOIN roles r ON ur.role_id = r.id 
                 WHERE r.role_name = ''institution'' AND u.is_active = TRUE' || v_where_clause || v_order_clause || 
                 ' LIMIT ' || p_limit || ' OFFSET ' || v_offset || 
             ') t'
    INTO v_institutions;
    
    -- Build result
    v_result := json_build_object(
        'success', TRUE,
        'data', COALESCE(v_institutions, '[]'::json),
        'pagination', json_build_object(
            'current_page', p_page,
            'per_page', p_limit,
            'total_count', v_total_count,
            'total_pages', CEIL(v_total_count::FLOAT / p_limit),
            'has_next', (p_page * p_limit) < v_total_count,
            'has_prev', p_page > 1
        )
    );
    
    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to fetch institutions: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: verify_institution
-- Purpose: Verify or unverify an institution (user with institution role)
-- Parameters:
--   p_user_id: User ID of the institution user
--   p_is_verified: Verification status (TRUE/FALSE)
--   p_verified_by: User ID of who is verifying (super admin)
-- Returns: JSON with success status
-- ============================================================================
CREATE OR REPLACE FUNCTION verify_institution(
    p_user_id UUID,
    p_is_verified BOOLEAN,
    p_verified_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_institution_exists BOOLEAN;
BEGIN
    -- Check if the user exists and has institution role
    SELECT EXISTS(
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.id = ur.user_id 
        JOIN roles r ON ur.role_id = r.id 
        WHERE u.id = p_user_id AND r.role_name = 'institution' AND u.is_active = TRUE
    ) INTO v_institution_exists;
    
    IF NOT v_institution_exists THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Institution user not found or not active.'
        );
    END IF;
    
    -- Update verification status
    UPDATE users SET
        is_verified = p_is_verified,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN json_build_object(
        'success', TRUE,
        'message', CASE WHEN p_is_verified THEN 'Institution verified successfully.' ELSE 'Institution unverified successfully.' END,
        'user_id', p_user_id,
        'is_verified', p_is_verified,
        'verified_by', p_verified_by
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to update institution verification: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: bulk_verify_institutions
-- Purpose: Verify or unverify multiple institutions in bulk
-- Parameters:
--   p_user_ids: Array of institution user IDs
--   p_is_verified: Verification status (TRUE/FALSE)
--   p_verified_by: User ID of who is verifying (super admin)
-- Returns: JSON with success status and updated count
-- ============================================================================
CREATE OR REPLACE FUNCTION bulk_verify_institutions(
    p_user_ids UUID[],
    p_is_verified BOOLEAN,
    p_verified_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_updated_count INTEGER;
    v_invalid_ids UUID[];
BEGIN
    -- Check for invalid institution user IDs
    SELECT array_agg(id) INTO v_invalid_ids
    FROM unnest(p_user_ids) AS id
    WHERE NOT EXISTS(
        SELECT 1 FROM users u 
        JOIN user_roles ur ON u.id = ur.user_id 
        JOIN roles r ON ur.role_id = r.id 
        WHERE u.id = id AND r.role_name = 'institution' AND u.is_active = TRUE
    );
    
    IF array_length(v_invalid_ids, 1) > 0 THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Some institution user IDs are invalid or not active.',
            'invalid_ids', v_invalid_ids
        );
    END IF;
    
    -- Update verification status for all valid institutions
    UPDATE users SET
        is_verified = p_is_verified,
        updated_at = NOW()
    WHERE id = ANY(p_user_ids);
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN json_build_object(
        'success', TRUE,
        'message', v_updated_count || ' institutions ' || 
                   CASE WHEN p_is_verified THEN 'verified' ELSE 'unverified' END || 
                   ' successfully.',
        'updated_count', v_updated_count,
        'is_verified', p_is_verified,
        'verified_by', p_verified_by
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to bulk update institutions: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: get_institution_stats
-- Purpose: Get institution statistics for dashboard
-- Returns: JSON with counts and percentages
-- ============================================================================
CREATE OR REPLACE FUNCTION get_institution_stats()
RETURNS JSON AS $$
DECLARE
    v_total_institutions INTEGER;
    v_verified_institutions INTEGER;
    v_unverified_institutions INTEGER;
    v_recent_institutions INTEGER;
BEGIN
    -- Get total institutions
    SELECT COUNT(*) INTO v_total_institutions
    FROM users u 
    JOIN user_roles ur ON u.id = ur.user_id 
    JOIN roles r ON ur.role_id = r.id 
    WHERE r.role_name = 'institution' AND u.is_active = TRUE;
    
    -- Get verified institutions
    SELECT COUNT(*) INTO v_verified_institutions
    FROM users u 
    JOIN user_roles ur ON u.id = ur.user_id 
    JOIN roles r ON ur.role_id = r.id 
    WHERE r.role_name = 'institution' AND u.is_active = TRUE AND u.is_verified = TRUE;
    
    -- Get unverified institutions
    v_unverified_institutions := v_total_institutions - v_verified_institutions;
    
    -- Get recent institutions (last 30 days)
    SELECT COUNT(*) INTO v_recent_institutions
    FROM users u 
    JOIN user_roles ur ON u.id = ur.user_id 
    JOIN roles r ON ur.role_id = r.id 
    WHERE r.role_name = 'institution' AND u.is_active = TRUE 
    AND u.created_at >= NOW() - INTERVAL '30 days';
    
    RETURN json_build_object(
        'success', TRUE,
        'stats', json_build_object(
            'total_institutions', v_total_institutions,
            'verified_institutions', v_verified_institutions,
            'unverified_institutions', v_unverified_institutions,
            'recent_institutions', v_recent_institutions,
            'verification_percentage', 
                CASE WHEN v_total_institutions > 0 
                THEN ROUND((v_verified_institutions::FLOAT / v_total_institutions) * 100, 2)
                ELSE 0 END
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to get institution stats: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: search_users
-- Purpose: Search users by name, email, or username with role filtering
-- Parameters:
--   p_search_term: Search term for name, email, or username
--   p_role_filter: Filter by specific role (optional)
--   p_exclude_role: Exclude users with specific role (optional)
--   p_limit: Maximum number of results (default 20)
-- Returns: JSON with users data
-- ============================================================================
CREATE OR REPLACE FUNCTION search_users(
    p_search_term VARCHAR(255),
    p_role_filter VARCHAR(50) DEFAULT NULL,
    p_exclude_role VARCHAR(50) DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS JSON AS $$
DECLARE
    v_users JSON;
BEGIN
    -- Search users with optional role filtering
    SELECT json_agg(row_to_json(t))
    INTO v_users
    FROM (
        SELECT 
            u.id,
            u.firebase_uid,
            u.email,
            u.username,
            u.full_name,
            u.profile_picture_url,
            u.institution,
            u.is_verified,
            u.is_active,
            u.created_at,
            (
                SELECT json_agg(json_build_object(
                    'role_id', r.id,
                    'role_name', r.role_name,
                    'display_name', r.display_name
                ))
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = u.id AND r.is_active = TRUE
            ) as roles
        FROM users u
        WHERE (
            u.full_name ILIKE '%' || p_search_term || '%' OR
            u.email ILIKE '%' || p_search_term || '%' OR
            u.username ILIKE '%' || p_search_term || '%'
        )
        AND (
            p_role_filter IS NULL OR
            EXISTS (
                SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = u.id AND r.role_name = p_role_filter
            )
        )
        AND (
            p_exclude_role IS NULL OR
            NOT EXISTS (
                SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = u.id AND r.role_name = p_exclude_role
            )
        )
        ORDER BY u.full_name ASC
        LIMIT p_limit
    ) t;
    
    RETURN json_build_object(
        'success', TRUE,
        'data', COALESCE(v_users, '[]'::json)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to search users: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: get_user_roles
-- Purpose: Get all roles assigned to a specific user
-- Parameters:
--   p_user_id: User UUID
-- Returns: JSON with user roles data
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
-- Parameters:
--   p_user_id: User UUID
--   p_role_id: Role UUID
--   p_assigned_by: UUID of user doing the assignment (super admin)
-- Returns: JSON with success status
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
-- Parameters:
--   p_user_id: User UUID
--   p_role_id: Role UUID
--   p_removed_by: UUID of user doing the removal (super admin)
-- Returns: JSON with success status
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
-- FUNCTION: get_all_roles
-- Purpose: Get all available roles in the system
-- Parameters: None
-- Returns: JSON with roles data
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
-- FUNCTION: make_user_admin
-- Purpose: Convenient function to make a user an admin
-- Parameters:
--   p_user_id: User UUID
--   p_assigned_by: UUID of super admin doing the assignment
-- Returns: JSON with success status
-- ============================================================================
CREATE OR REPLACE FUNCTION make_user_admin(
    p_user_id UUID,
    p_assigned_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_admin_role_id UUID;
    v_result JSON;
BEGIN
    -- Get admin role ID
    SELECT id INTO v_admin_role_id FROM roles WHERE role_name = 'admin' AND is_active = TRUE;
    
    IF v_admin_role_id IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Admin role not found in system.'
        );
    END IF;
    
    -- Use the assign_user_role function
    SELECT assign_user_role(p_user_id, v_admin_role_id, p_assigned_by) INTO v_result;
    
    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to make user admin: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: bulk_assign_role
-- Purpose: Assign a role to multiple users
-- Parameters:
--   p_user_ids: Array of user UUIDs
--   p_role_id: Role UUID to assign
--   p_assigned_by: UUID of user doing the assignment
-- Returns: JSON with success status and counts
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


-- ============================================================================
-- FUNCTION: update_user_profile
-- Purpose: Update user profile information
-- Parameters:
--   p_user_id: User ID
--   p_name: Full name (optional)
--   p_username: Username (optional)
--   p_profile_picture_url: Profile picture URL (optional)
--   p_banner_url: Banner URL (optional)
--   p_institution: Institution (optional)
-- Returns: JSON with update status
-- ============================================================================
CREATE OR REPLACE FUNCTION update_user_profile(
    p_user_id UUID,
    p_full_name VARCHAR(255) DEFAULT NULL,
    p_username VARCHAR(100) DEFAULT NULL,
    p_profile_picture_url TEXT DEFAULT NULL,
    p_banner_url TEXT DEFAULT NULL,
    p_institution VARCHAR(255) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Update only provided fields
    UPDATE users SET
        full_name = COALESCE(p_full_name, full_name),
        username = COALESCE(p_username, username),
        profile_picture_url = COALESCE(p_profile_picture_url, profile_picture_url),
        banner_url = COALESCE(p_banner_url, banner_url),
        institution = COALESCE(p_institution, institution),
        updated_at = NOW()
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'User not found.'
        );
    END IF;

    -- Return updated user data
    SELECT json_build_object(
        'success', TRUE,
        'message', 'Profile updated successfully.'
    ) INTO v_result;

    RETURN v_result;

EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Email or username already in use.'
    );
WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Update failed: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: get_organizers_by_institution
-- Purpose: Get all organizers under a specific institution with search, sort, and pagination
-- Parameters:
--   p_institution_id: Institution user ID
--   p_search: Search term (name or email)
--   p_sort_by: Field to sort by (verified, active, full_name, email, created_at)
--   p_sort_order: ASC or DESC
--   p_page: Page number (1-based)
--   p_limit: Items per page
-- Returns: JSON with organizers list and pagination info
-- ============================================================================
CREATE OR REPLACE FUNCTION get_organizers_by_institution(
    p_institution_id UUID,
    p_search TEXT DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'is_verified',
    p_sort_order TEXT DEFAULT 'DESC',
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 50
)
RETURNS JSON AS $$
DECLARE
    v_organizers JSON;
    v_total_count INTEGER;
    v_offset INTEGER;
    v_where_clause TEXT := '';
    v_order_clause TEXT;
BEGIN
    -- Calculate offset
    v_offset := (p_page - 1) * p_limit;
    
    -- Validate sort order
    IF p_sort_order NOT IN ('ASC', 'DESC') THEN
        p_sort_order := 'DESC';
    END IF;
    
    -- Validate sort field
    IF p_sort_by NOT IN ('is_verified', 'is_active', 'full_name', 'email', 'created_at') THEN
        p_sort_by := 'is_verified';
    END IF;
    
    -- Build where clause for search
    IF p_search IS NOT NULL AND LENGTH(trim(p_search)) > 0 THEN
        v_where_clause := v_where_clause || ' AND (u.full_name ILIKE ''%' || p_search || '%'' OR u.email ILIKE ''%' || p_search || '%'')';
    END IF;
    
    -- Build order clause
    v_order_clause := ' ORDER BY u.' || p_sort_by || ' ' || p_sort_order || ', u.created_at DESC';
    
    -- Get total count
    EXECUTE 'SELECT COUNT(*) FROM users u 
             JOIN user_roles ur ON u.id = ur.user_id 
             JOIN roles r ON ur.role_id = r.id 
             WHERE r.role_name = ''organizer'' 
             AND u.institution_id = ''' || p_institution_id || '''' || v_where_clause
    INTO v_total_count;
    
    -- Get organizers with pagination
    EXECUTE 'SELECT json_agg(row_to_json(t))
             FROM (
                 SELECT 
                     u.id,
                     u.firebase_uid,
                     u.email,
                     u.username,
                     u.full_name,
                     u.profile_picture_url,
                     u.banner_url,
                     u.institution_id,
                     u.is_verified,
                     u.is_active,
                     u.created_at,
                     u.updated_at
                 FROM users u 
                 JOIN user_roles ur ON u.id = ur.user_id 
                 JOIN roles r ON ur.role_id = r.id 
                 WHERE r.role_name = ''organizer'' 
                 AND u.institution_id = ''' || p_institution_id || '''' || v_where_clause || v_order_clause || 
                 ' LIMIT ' || p_limit || ' OFFSET ' || v_offset || 
             ') t'
    INTO v_organizers;
    
    -- Build result
    RETURN json_build_object(
        'success', TRUE,
        'data', COALESCE(v_organizers, '[]'::json),
        'pagination', json_build_object(
            'current_page', p_page,
            'per_page', p_limit,
            'total_count', v_total_count,
            'total_pages', CEIL(v_total_count::FLOAT / p_limit),
            'has_next', (p_page * p_limit) < v_total_count,
            'has_prev', p_page > 1
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to fetch organizers: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: verify_organizer
-- Purpose: Verify or unverify an organizer by their institution
-- Parameters:
--   p_organizer_id: User ID of the organizer
--   p_is_verified: Verification status (TRUE/FALSE)
--   p_verified_by: User ID of institution verifying
-- Returns: JSON with success status
-- ============================================================================
CREATE OR REPLACE FUNCTION verify_organizer(
    p_organizer_id UUID,
    p_is_verified BOOLEAN,
    p_verified_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_organizer_exists BOOLEAN;
    v_institution_id UUID;
BEGIN
    -- Check if the user exists and has organizer role
    SELECT u.institution_id INTO v_institution_id
    FROM users u 
    JOIN user_roles ur ON u.id = ur.user_id 
    JOIN roles r ON ur.role_id = r.id 
    WHERE u.id = p_organizer_id AND r.role_name = 'organizer';
    
    IF v_institution_id IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Organizer not found or not linked to any institution.'
        );
    END IF;
    
    -- Verify that the verified_by user is the institution
    IF p_verified_by IS NOT NULL AND v_institution_id != p_verified_by THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'You can only verify organizers under your institution.'
        );
    END IF;
    
    -- Update verification status
    UPDATE users SET
        is_verified = p_is_verified,
        updated_at = NOW()
    WHERE id = p_organizer_id;
    
    RETURN json_build_object(
        'success', TRUE,
        'message', CASE WHEN p_is_verified THEN 'Organizer verified successfully.' ELSE 'Organizer unverified successfully.' END,
        'organizer_id', p_organizer_id,
        'is_verified', p_is_verified,
        'verified_by', p_verified_by
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to update organizer verification: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;