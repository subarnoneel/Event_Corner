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

