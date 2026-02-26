import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ============================================================================
// BOOKMARK ROUTES
// ============================================================================

/**
 * POST /api/bookmarks/toggle
 * Toggle bookmark for an event (add or remove)
 */
router.post('/toggle', async (req, res) => {
    try {
        const { user_id, event_id } = req.body;

        if (!user_id || !event_id) {
            return res.status(400).json({
                success: false,
                error: 'user_id and event_id are required'
            });
        }

        const { data, error } = await supabase.rpc('toggle_event_bookmark', {
            p_user_id: user_id,
            p_event_id: event_id
        });

        if (error) {
            console.error('Error toggling bookmark:', error);
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        res.json(data);
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/bookmarks/status/:userId/:eventId
 * Check if user has bookmarked an event
 */
router.get('/status/:userId/:eventId', async (req, res) => {
    try {
        const { userId, eventId } = req.params;

        const { data, error } = await supabase.rpc('check_bookmark_status', {
            p_user_id: userId,
            p_event_id: eventId
        });

        if (error) {
            console.error('Error checking bookmark status:', error);
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        res.json(data);
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/bookmarks/user/:userId
 * Get all bookmarked events for a user
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const { data, error } = await supabase.rpc('get_user_bookmarked_events', {
            p_user_id: userId,
            p_limit: parseInt(limit),
            p_offset: parseInt(offset)
        });

        if (error) {
            console.error('Error fetching bookmarks:', error);
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        res.json(data);
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

export default router;
