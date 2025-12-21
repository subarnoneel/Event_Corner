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


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
