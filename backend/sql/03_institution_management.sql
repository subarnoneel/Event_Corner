-- ============================================================================
-- INSTITUTION MANAGEMENT FUNCTIONS
-- Purpose: Handle institution registration, verification, and organizer management
-- ============================================================================


-- ============================================================================
-- FUNCTION: get_all_institutions
-- Purpose: Get all institutions with pagination, search, and filtering
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
-- FUNCTION: get_pending_institutions
-- Purpose: Get all pending institution registrations for admin approval
-- ============================================================================
CREATE OR REPLACE FUNCTION get_pending_institutions(
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 10
)
RETURNS JSON AS $$
DECLARE
    v_offset INTEGER;
    v_total_count INTEGER;
    v_institutions JSON;
BEGIN
    v_offset := (p_page - 1) * p_limit;
    
    -- Get total count of pending institutions
    SELECT COUNT(*) INTO v_total_count
    FROM users u 
    JOIN user_roles ur ON u.id = ur.user_id 
    JOIN roles r ON ur.role_id = r.id 
    WHERE r.role_name = 'institution' 
    AND u.is_active = TRUE 
    AND u.verification_status = 'pending';
    
    -- Get pending institutions with all verification details
    SELECT json_agg(row_to_json(t)) INTO v_institutions
    FROM (
        SELECT 
            u.id,
            u.firebase_uid,
            u.email,
            u.username,
            u.full_name,
            u.institution_type,
            u.eiin_number,
            u.verification_documents,
            u.verification_status,
            u.created_at
        FROM users u 
        JOIN user_roles ur ON u.id = ur.user_id 
        JOIN roles r ON ur.role_id = r.id 
        WHERE r.role_name = 'institution' 
        AND u.is_active = TRUE 
        AND u.verification_status = 'pending'
        ORDER BY u.created_at DESC
        LIMIT p_limit OFFSET v_offset
    ) t;
    
    RETURN json_build_object(
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

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to fetch pending institutions: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: get_institution_details
-- Purpose: Get detailed information about an institution including documents
-- ============================================================================
CREATE OR REPLACE FUNCTION get_institution_details(p_institution_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'success', TRUE,
        'data', json_build_object(
            'id', u.id,
            'email', u.email,
            'username', u.username,
            'full_name', u.full_name,
            'institution_type', u.institution_type,
            'eiin_number', u.eiin_number,
            'verification_documents', u.verification_documents,
            'verification_status', u.verification_status,
            'rejection_reason', u.rejection_reason,
            'is_verified', u.is_verified,
            'verified_at', u.verified_at,
            'verified_by', u.verified_by,
            'created_at', u.created_at
        )
    ) INTO v_result
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE u.id = p_institution_id AND r.role_name = 'institution';
    
    IF v_result IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Institution not found.'
        );
    END IF;
    
    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to fetch institution details: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: get_institution_stats
-- Purpose: Get institution statistics for dashboard
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
-- FUNCTION: verify_institution
-- Purpose: Verify or unverify an institution (user with institution role)
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
-- FUNCTION: approve_institution
-- Purpose: Approve an institution registration
-- ============================================================================
CREATE OR REPLACE FUNCTION approve_institution(
    p_institution_id UUID,
    p_approved_by UUID
)
RETURNS JSON AS $$
DECLARE
    v_institution_email VARCHAR(255);
    v_institution_name VARCHAR(255);
BEGIN
    -- Get institution details
    SELECT email, full_name INTO v_institution_email, v_institution_name
    FROM users WHERE id = p_institution_id;
    
    IF v_institution_email IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Institution not found.'
        );
    END IF;
    
    -- Update institution status
    UPDATE users SET
        verification_status = 'approved',
        is_verified = TRUE,
        verified_at = NOW(),
        verified_by = p_approved_by,
        updated_at = NOW()
    WHERE id = p_institution_id;
    
    RETURN json_build_object(
        'success', TRUE,
        'message', 'Institution approved successfully.',
        'institution_id', p_institution_id,
        'institution_email', v_institution_email,
        'institution_name', v_institution_name
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to approve institution: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: reject_institution
-- Purpose: Reject an institution registration with reason
-- ============================================================================
CREATE OR REPLACE FUNCTION reject_institution(
    p_institution_id UUID,
    p_rejection_reason TEXT,
    p_rejected_by UUID
)
RETURNS JSON AS $$
DECLARE
    v_institution_email VARCHAR(255);
    v_institution_name VARCHAR(255);
BEGIN
    -- Get institution details
    SELECT email, full_name INTO v_institution_email, v_institution_name
    FROM users WHERE id = p_institution_id;
    
    IF v_institution_email IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Institution not found.'
        );
    END IF;
    
    -- Update institution status
    UPDATE users SET
        verification_status = 'rejected',
        rejection_reason = p_rejection_reason,
        verified_by = p_rejected_by,
        updated_at = NOW()
    WHERE id = p_institution_id;
    
    RETURN json_build_object(
        'success', TRUE,
        'message', 'Institution rejected.',
        'institution_id', p_institution_id,
        'institution_email', v_institution_email,
        'institution_name', v_institution_name,
        'rejection_reason', p_rejection_reason
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', FALSE,
        'error', 'Failed to reject institution: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- FUNCTION: get_organizers_by_institution
-- Purpose: Get all organizers belonging to a specific institution
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
