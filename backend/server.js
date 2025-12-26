import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

// Test Supabase connection
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .limit(1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Database connection successful', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

/**
 * POST /api/auth/register
 * Register a new user with Firebase UID
 * Body: {
 *   firebase_uid: string,
 *   email: string,
 *   username: string,
 *   full_name: string,
 *   password: string,
 *   role: 'participant' | 'organizer' | 'institution',
 *   institution: string (optional, for participants),
 *   institution_id: number (optional, for organizers)
 * }
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firebase_uid, email, username, full_name, role, institution, institution_id } = req.body;

    // Validate required fields
    if (!firebase_uid || !email || !username || !full_name || !role) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firebase_uid, email, username, full_name, role'
      });
    }

    // Validate role
    if (!['participant', 'organizer', 'institution'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be one of: participant, organizer, institution'
      });
    }

    // For organizers, validate institution_id
    if (role === 'organizer' && !institution_id) {
      return res.status(400).json({
        success: false,
        error: 'Institution ID is required for organizer registration'
      });
    }

    // Call the stored procedure
    const { data, error } = await supabase.rpc('register_user', {
      p_firebase_uid: firebase_uid,
      p_email: email,
      p_username: username,
      p_full_name: full_name,
      p_role: role,
      p_institution: institution || null,
      p_institution_id: institution_id || null
    });

    if (error) {
      console.error('Registration error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Registration failed'
      });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Unexpected registration error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error during registration'
    });
  }
});

/**
 * POST /api/auth/login
 * Login user with Firebase UID
 * Body: {
 *   firebase_uid: string
 * }
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { firebase_uid } = req.body;

    if (!firebase_uid) {
      return res.status(400).json({
        success: false,
        error: 'firebase_uid is required'
      });
    }

    // Call the stored procedure
    const { data, error } = await supabase.rpc('login_user', {
      p_firebase_uid: firebase_uid
    });

    if (error) {
      console.error('Login error:', error);
      return res.status(401).json({
        success: false,
        error: error.message || 'Login failed'
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected login error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login'
    });
  }
});

// ============================================================================
// INSTITUTION SEARCH ROUTES
// ============================================================================

/**
 * GET /api/institutions/search?q=search_term
 * Search for institutions (users with role 'institution')
 * Query params:
 *   q: search term (institution name)
 */
app.get('/api/institutions/search', async (req, res) => {
  try {
    const searchTerm = req.query.q;

    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search term must be at least 2 characters long'
      });
    }

    // Search for users with role 'institution'
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', 'institution')
      .single();

    if (roleError) {
      console.error('Error fetching institution role:', roleError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch institution role'
      });
    }

    // Search users with institution role by full_name
    const { data: institutions, error: searchError } = await supabase
      .from('users')
      .select('id, full_name')
      .ilike('full_name', `%${searchTerm}%`)
      .eq('is_active', true)
      .limit(10);

    if (searchError) {
      console.error('Search error:', searchError);
      return res.status(500).json({
        success: false,
        error: 'Search failed'
      });
    }

    // Verify each result has the institution role
    const validInstitutions = [];
    for (const institution of institutions) {
      const { data: userRole, error: userRoleError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', institution.id)
        .eq('role_id', roleData.id)
        .single();

      if (!userRoleError && userRole) {
        validInstitutions.push({
          id: institution.id,
          name: institution.full_name
        });
      }
    }

    res.json({
      success: true,
      institutions: validInstitutions
    });
  } catch (err) {
    console.error('Unexpected search error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error during search'
    });
  }
});


// ============================================================================
// USER PROFILE ROUTES (Common for all roles)
// ============================================================================

/**
 * GET /api/users/:userId/profile
 * Get user profile by user ID
 */
app.get('/api/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase.rpc('get_user_by_id', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error fetching user profile:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to fetch user profile'
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected error fetching user profile:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PUT /api/users/:userId/profile
 * Update user profile
 */
app.put('/api/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const { full_name, username, profile_picture_url, banner_url, institution } = req.body;

    const { data, error } = await supabase.rpc('update_user_profile', {
      p_user_id: userId,
      p_full_name: full_name || null,
      p_username: username || null,
      p_profile_picture_url: profile_picture_url || null,
      p_banner_url: banner_url || null,
      p_institution: institution || null
    });

    if (error) {
      console.error('Error updating user profile:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to update user profile'
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected error updating user profile:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ============================================================================
// SUPERADMIN ROUTES
// ============================================================================

/**
 * GET /api/superadmin/institutions
 * Get all institutions with pagination and filtering
 */
app.get('/api/superadmin/institutions', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort_by = 'full_name',
      sort_order = 'ASC',
      search = null,
      verified_filter = 'all'
    } = req.query;

    const { data, error } = await supabase.rpc('get_all_institutions', {
      p_page: parseInt(page),
      p_limit: parseInt(limit),
      p_sort_by: sort_by,
      p_sort_order: sort_order.toUpperCase(),
      p_search: search,
      p_verified_filter: verified_filter
    });

    if (error) {
      console.error('Error fetching institutions:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to fetch institutions'
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected error fetching institutions:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PATCH /api/superadmin/institutions/:userId/verify
 * Verify or unverify an institution user
 */
app.patch('/api/superadmin/institutions/:userId/verify', async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_verified, verified_by } = req.body;

    const { data, error } = await supabase.rpc('verify_institution', {
      p_user_id: userId,
      p_is_verified: is_verified,
      p_verified_by: verified_by || null
    });

    if (error) {
      console.error('Error verifying institution:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to verify institution'
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected error verifying institution:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PATCH /api/superadmin/institutions/bulk-verify
 * Bulk verify or unverify institution users
 */
app.patch('/api/superadmin/institutions/bulk-verify', async (req, res) => {
  try {
    const { user_ids, is_verified, verified_by } = req.body;

    if (!user_ids || !Array.isArray(user_ids)) {
      return res.status(400).json({
        success: false,
        error: 'user_ids array is required'
      });
    }

    const { data, error } = await supabase.rpc('bulk_verify_institutions', {
      p_user_ids: user_ids,
      p_is_verified: is_verified,
      p_verified_by: verified_by || null
    });

    if (error) {
      console.error('Error bulk verifying institutions:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to bulk verify institutions'
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected error bulk verifying institutions:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/superadmin/institutions/stats
 * Get institution statistics
 */
app.get('/api/superadmin/institutions/stats', async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_institution_stats');

    if (error) {
      console.error('Error fetching institution stats:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to fetch institution statistics'
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected error fetching institution stats:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/superadmin/users/search
 * Search users by name, email, or username
 */
app.get('/api/superadmin/users/search', async (req, res) => {
  try {
    const { search, role_filter, exclude_role, limit = 20 } = req.query;

    if (!search || search.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search term must be at least 2 characters long'
      });
    }

    const { data, error } = await supabase.rpc('search_users', {
      p_search_term: search,
      p_role_filter: role_filter || null,
      p_exclude_role: exclude_role || null,
      p_limit: parseInt(limit)
    });

    if (error) {
      console.error('Error searching users:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to search users'
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected error searching users:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});



/**
 * PATCH /api/superadmin/users/:userId/toggle-active
 * Activate or deactivate a user
 */
app.patch('/api/superadmin/users/:userId/toggle-active', async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'is_active must be a boolean value'
      });
    }

    // Update user active status directly
    const { data, error } = await supabase
      .from('users')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error toggling user active status:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to update user status'
      });
    }

    res.json({
      success: true,
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      data
    });
  } catch (err) {
    console.error('Unexpected error toggling user status:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/superadmin/users/:userId/assign-role
 * Assign a role to a user
 */
app.post('/api/superadmin/users/:userId/assign-role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role_id, assigned_by } = req.body;

    if (!role_id) {
      return res.status(400).json({
        success: false,
        error: 'role_id is required'
      });
    }

    const { data, error } = await supabase.rpc('assign_user_role', {
      p_user_id: userId,
      p_role_id: role_id,
      p_assigned_by: assigned_by || null
    });

    if (error) {
      console.error('Error assigning role:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to assign role'
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected error assigning role:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/superadmin/users/:userId/roles/:roleId
 * Remove a role from a user
 */
app.delete('/api/superadmin/users/:userId/roles/:roleId', async (req, res) => {
  try {
    const { userId, roleId } = req.params;
    const { removed_by } = req.body;

    const { data, error } = await supabase.rpc('remove_user_role', {
      p_user_id: userId,
      p_role_id: roleId,
      p_removed_by: removed_by || null
    });

    if (error) {
      console.error('Error removing role:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to remove role'
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected error removing role:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/superadmin/roles
 * Get all available roles
 */
app.get('/api/superadmin/roles', async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_all_roles');

    if (error) {
      console.error('Error fetching roles:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to fetch roles'
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected error fetching roles:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});



/**
 * POST /api/superadmin/roles/bulk-assign
 * Assign a role to multiple users
 */
app.post('/api/superadmin/roles/bulk-assign', async (req, res) => {
  try {
    const { user_ids, role_id, assigned_by } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || !role_id) {
      return res.status(400).json({
        success: false,
        error: 'user_ids array and role_id are required'
      });
    }

    const { data, error } = await supabase.rpc('bulk_assign_role', {
      p_user_ids: user_ids,
      p_role_id: role_id,
      p_assigned_by: assigned_by || null
    });

    if (error) {
      console.error('Error bulk assigning roles:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to bulk assign roles'
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected error bulk assigning roles:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});


// ============================================================================
// INSTITUTION ENDPOINTS
// ============================================================================

/**
 * GET /api/institution/:institutionId/organizers
 * Get all organizers under a specific institution
 * Query params: search, sort_by, sort_order, page, limit
 */
app.get('/api/institution/:institutionId/organizers', async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { 
      search = '', 
      sort_by = 'is_verified', 
      sort_order = 'DESC', 
      page = 1, 
      limit = 50 
    } = req.query;

    const { data, error } = await supabase.rpc('get_organizers_by_institution', {
      p_institution_id: institutionId,
      p_search: search || null,
      p_sort_by: sort_by,
      p_sort_order: sort_order.toUpperCase(),
      p_page: parseInt(page),
      p_limit: parseInt(limit)
    });

    if (error) {
      console.error('Supabase error fetching organizers:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch organizers'
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected error fetching organizers:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PATCH /api/institution/organizers/:organizerId/verify
 * Verify or unverify an organizer
 * Body: { is_verified: boolean, verified_by: uuid }
 */
app.patch('/api/institution/organizers/:organizerId/verify', async (req, res) => {
  try {
    const { organizerId } = req.params;
    const { is_verified, verified_by } = req.body;

    if (typeof is_verified !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'is_verified must be a boolean value'
      });
    }

    const { data, error } = await supabase.rpc('verify_organizer', {
      p_organizer_id: organizerId,
      p_is_verified: is_verified,
      p_verified_by: verified_by || null
    });

    if (error) {
      console.error('Supabase error verifying organizer:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to verify organizer'
      });
    }

    if (!data.success) {
      return res.status(400).json(data);
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected error verifying organizer:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
