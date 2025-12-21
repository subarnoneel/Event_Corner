CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_roles_name ON roles(role_name);
CREATE INDEX idx_roles_active ON roles(is_active);

-- Seed initial roles
INSERT INTO roles (role_name, display_name, description) VALUES
('super_admin', 'Super Administrator', 'Full system access - can create admins and manage everything'),
('admin', 'Administrator', 'User verification, event management, and content moderation'),
('institution', 'Institution', 'Create events, manage organizers under institution'),
('organizer', 'Event Organizer', 'Create and manage individual events'),
('participant', 'Participant', 'Attend events, bookmark, register for events');


-- ============================================================================
-- USERS TABLE (Base user information)
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    profile_picture_url TEXT DEFAULT 'https://res.cloudinary.com/dfvwazcdk/image/upload/v1753161431/generalProfilePicture_inxppe.png',
    banner_url TEXT DEFAULT 'https://res.cloudinary.com/dfvwazcdk/image/upload/v1753513555/banner_z0sar4.png',
    
    -- Institution-specific fields (nullable)
    additional_info JSONB,
    
    -- Organizer-specific fields (nullable)
    institution_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Reference to parent institution
    
    -- Participant-specific fields (nullable)
    institution VARCHAR(255),
    id_document_urls TEXT[],
    
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_institution ON users(institution);
CREATE INDEX idx_users_institution_id ON users(institution_id);


-- ============================================================================
-- USER ROLES JUNCTION TABLE (Many-to-Many: Users can have multiple roles)
-- ============================================================================

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Who assigned this role
    
    UNIQUE(user_id, role_id) -- Prevent duplicate role assignments
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_combined ON user_roles(user_id, role_id);


-- ============================================================================
-- NOTE: Role-specific attributes are now stored directly in users table
-- institutions, organizers, and participants tables have been consolidated
-- ============================================================================


-- ============================================================================
-- STORED PROCEDURES AND FUNCTIONS
-- ============================================================================

-- ============================================================================
-- PROCEDURE: register_user
-- Purpose: Atomically create a new user and assign a role
-- Parameters:
--   p_firebase_uid: Firebase UID from Firebase Auth
--   p_email: User email
--   p_username: Unique username
--   p_full_name: Full name
--   p_role: Role name ('participant', 'organizer', 'institution')
--   p_institution: Institution name (for participants, optional)
--   p_institution_id: Institution ID (for organizers, optional)
-- Returns: JSON with user_id, email, username, role, and success status
-- ============================================================================
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
