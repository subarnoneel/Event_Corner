-- ============================================================================
-- USER AUTHENTICATION & MANAGEMENT FUNCTIONS
-- Purpose: Handle user registration, login, profile management
-- ============================================================================


-- ============================================================================
-- FUNCTION: register_user
-- Purpose: Register a new user with role assignment
-- ============================================================================
CREATE OR REPLACE FUNCTION register_user(
    p_firebase_uid VARCHAR(128),
    p_email VARCHAR(255),
    p_username VARCHAR(100),
    p_full_name VARCHAR(255),
    p_role VARCHAR(50),
    p_institution VARCHAR(255) DEFAULT NULL,
    p_institution_id UUID DEFAULT NULL,
    p_institution_type VARCHAR(50) DEFAULT NULL,
    p_eiin_number VARCHAR(6) DEFAULT NULL,
    p_verification_documents TEXT[] DEFAULT NULL
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

    -- Validate EIIN number format for schools/colleges/madrasas
    IF p_role = 'institution' AND p_institution_type = 'school_college_madrasa' THEN
        IF p_eiin_number IS NULL OR p_eiin_number !~ '^[0-9]{6}$' THEN
            RETURN json_build_object(
                'success', FALSE,
                'error', 'Invalid EIIN number. Must be exactly 6 digits.'
            );
        END IF;
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

    -- Create the user with institution verification fields
    INSERT INTO users (
        firebase_uid, email, username, full_name, institution, institution_id,
        institution_type, eiin_number, verification_documents, verification_status
    )
    VALUES (
        p_firebase_uid, p_email, p_username, p_full_name, p_institution, p_institution_id,
        p_institution_type, p_eiin_number, p_verification_documents,
        CASE WHEN p_role = 'institution' THEN 'pending' ELSE NULL END
    )
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
        'verification_status', users.verification_status,
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
-- FUNCTION: update_user_profile
-- Purpose: Update user profile information
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
-- FUNCTION: search_users
-- Purpose: Search users by name, email, or username with role filtering
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
