import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { 
    sendParticipantApprovalEmail, 
    sendParticipantRejectionEmail, 
    sendBulkEmailToParticipants,
    extractFormDataEmail,
    extractFormDataName
} from '../services/email.service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ============================================================================
// FILE UPLOAD CONFIGURATION FOR REGISTRATION
// ============================================================================

// Create uploads directory for registration files if it doesn't exist
const registrationUploadsDir = path.join(__dirname, '..', 'uploads', 'registration-files');
if (!fs.existsSync(registrationUploadsDir)) {
    fs.mkdirSync(registrationUploadsDir, { recursive: true });
}

// Configure multer for registration file uploads
const registrationStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, registrationUploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'reg-' + uniqueSuffix + ext);
    }
});

const registrationFileFilter = (req, file, cb) => {
    // Accept PDF, JPG, PNG only
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'), false);
    }
};

const registrationUpload = multer({
    storage: registrationStorage,
    fileFilter: registrationFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// ============================================================================
// FILE UPLOAD ENDPOINT FOR REGISTRATION
// ============================================================================

/**
 * POST /api/registration/upload-file
 * Upload a file for registration form
 * Returns the file URL that can be stored in form_data
 */
router.post('/upload-file', registrationUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        // Return the file path that can be used to access the file
        const fileUrl = `/api/registration/files/${req.file.filename}`;
        
        res.json({
            success: true,
            message: 'File uploaded successfully',
            file: {
                url: fileUrl,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            }
        });
    } catch (err) {
        console.error('Error uploading registration file:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to upload file'
        });
    }
});

/**
 * GET /api/registration/files/:filename
 * Serve a registration file
 */
router.get('/files/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(registrationUploadsDir, filename);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        // Send file
        res.sendFile(filePath);
    } catch (err) {
        console.error('Error serving registration file:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to serve file'
        });
    }
});

// ============================================================================
// REGISTRATION CONFIGURATION ROUTES
// ============================================================================

/**
 * POST /api/registration/:eventId/config
 * Create or update registration configuration for an event
 */
router.post('/:eventId/config', async (req, res) => {
    try {
        const { eventId } = req.params;
        const {
            registration_type,
            template_type,
            team_min_size,
            team_max_size,
            form_config,
            registration_deadline,
            external_registration_url
        } = req.body;

        if (!registration_type) {
            return res.status(400).json({
                success: false,
                error: 'registration_type is required'
            });
        }

        // Validate external_registration_url for external registration type
        if (registration_type === 'external' && !external_registration_url) {
            return res.status(400).json({
                success: false,
                error: 'external_registration_url is required for external registration type'
            });
        }

        const { data, error } = await supabase.rpc('create_event_registration_config', {
            p_event_id: eventId,
            p_registration_type: registration_type,
            p_template_type: template_type || 'individual',
            p_team_min_size: team_min_size || 1,
            p_team_max_size: team_max_size || 5,
            p_form_config: form_config || { fields: [], settings: {} },
            p_registration_deadline: registration_deadline || null,
            p_external_registration_url: external_registration_url || null
        });

        if (error) {
            console.error('Error creating registration config:', error);
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
 * GET /api/registration/:eventId/config
 * Get registration configuration for an event
 */
router.get('/:eventId/config', async (req, res) => {
    try {
        const { eventId } = req.params;

        const { data, error } = await supabase.rpc('get_event_registration_config', {
            p_event_id: eventId
        });

        if (error) {
            console.error('Error fetching registration config:', error);
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
 * PUT /api/registration/:eventId/config
 * Update registration configuration
 */
router.put('/:eventId/config', async (req, res) => {
    try {
        const { eventId } = req.params;
        const {
            registration_type,
            template_type,
            team_min_size,
            team_max_size,
            form_config,
            registration_deadline,
            is_registration_open
        } = req.body;

        // Update using direct table update for more flexibility
        const updateData = {};
        if (registration_type !== undefined) updateData.registration_type = registration_type;
        if (template_type !== undefined) updateData.template_type = template_type;
        if (team_min_size !== undefined) updateData.team_min_size = team_min_size;
        if (team_max_size !== undefined) updateData.team_max_size = team_max_size;
        if (form_config !== undefined) updateData.form_config = form_config;
        if (registration_deadline !== undefined) updateData.registration_deadline = registration_deadline;
        if (is_registration_open !== undefined) updateData.is_registration_open = is_registration_open;
        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('event_registration_configs')
            .update(updateData)
            .eq('event_id', eventId)
            .select()
            .single();

        if (error) {
            console.error('Error updating registration config:', error);
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        res.json({
            success: true,
            config: data,
            message: 'Registration configuration updated successfully'
        });
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ============================================================================
// USER REGISTRATION ROUTES
// ============================================================================

/**
 * POST /api/registration/:eventId/register
 * Submit a registration for an event
 */
router.post('/:eventId/register', async (req, res) => {
    try {
        const { eventId } = req.params;
        const {
            user_id,
            form_data,
            team_name,
            team_members,
            uploaded_files
        } = req.body;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                error: 'user_id is required'
            });
        }

        if (!form_data) {
            return res.status(400).json({
                success: false,
                error: 'form_data is required'
            });
        }

        const { data, error } = await supabase.rpc('submit_event_registration', {
            p_event_id: eventId,
            p_user_id: user_id,
            p_form_data: form_data,
            p_team_name: team_name || null,
            p_team_members: team_members || [],
            p_uploaded_files: uploaded_files || []
        });

        if (error) {
            console.error('Error submitting registration:', error);
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
 * GET /api/registration/:eventId/status/:userId
 * Check user's registration status for an event
 */
router.get('/:eventId/status/:userId', async (req, res) => {
    try {
        const { eventId, userId } = req.params;

        const { data, error } = await supabase.rpc('check_user_registration_status', {
            p_event_id: eventId,
            p_user_id: userId
        });

        if (error) {
            console.error('Error checking registration status:', error);
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

// ============================================================================
// ORGANIZER PARTICIPANT MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/registration/organizer/:organizerId/events
 * Get all events with participant counts for an organizer
 */
router.get('/organizer/:organizerId/events', async (req, res) => {
    try {
        const { organizerId } = req.params;

        const { data, error } = await supabase.rpc('get_events_with_participants_count', {
            p_organizer_id: organizerId
        });

        if (error) {
            console.error('Error fetching events with counts:', error);
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
 * GET /api/registration/organizer/:organizerId/pending
 * Get pending participant registrations
 */
router.get('/organizer/:organizerId/pending', async (req, res) => {
    try {
        const { organizerId } = req.params;
        const { event_id, page = 1, limit = 20 } = req.query;

        const { data, error } = await supabase.rpc('get_pending_participants', {
            p_organizer_id: organizerId,
            p_event_id: event_id || null,
            p_page: parseInt(page),
            p_limit: parseInt(limit)
        });

        if (error) {
            console.error('Error fetching pending participants:', error);
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
 * GET /api/registration/organizer/:organizerId/approved
 * Get approved participant registrations
 */
router.get('/organizer/:organizerId/approved', async (req, res) => {
    try {
        const { organizerId } = req.params;
        const { event_id, page = 1, limit = 20 } = req.query;

        const { data, error } = await supabase.rpc('get_approved_participants', {
            p_organizer_id: organizerId,
            p_event_id: event_id || null,
            p_page: parseInt(page),
            p_limit: parseInt(limit)
        });

        if (error) {
            console.error('Error fetching approved participants:', error);
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
 * POST /api/registration/participants/:participantId/approve
 * Approve a participant registration
 */
router.post('/participants/:participantId/approve', async (req, res) => {
    try {
        const { participantId } = req.params;
        const { reviewer_id } = req.body;

        if (!reviewer_id) {
            return res.status(400).json({
                success: false,
                error: 'reviewer_id is required'
            });
        }

        const { data, error } = await supabase.rpc('approve_participant', {
            p_participant_id: participantId,
            p_reviewer_id: reviewer_id
        });

        if (error) {
            console.error('Error approving participant:', error);
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        // Send approval email to BOTH registering user AND form data email
        if (data.success && data.user_id) {
            try {
                // Get user email from users table
                const { data: userData } = await supabase
                    .from('users')
                    .select('email, full_name')
                    .eq('id', data.user_id)
                    .single();

                // Get participant's form data and registration config to extract form email
                const { data: participantData } = await supabase
                    .from('event_participants')
                    .select('form_data, event_id')
                    .eq('id', participantId)
                    .single();

                // Get the registration config to determine template type
                const { data: configData } = await supabase
                    .from('event_registration_configs')
                    .select('template_type')
                    .eq('event_id', participantData?.event_id)
                    .single();

                const templateType = configData?.template_type || 'individual';
                const formData = participantData?.form_data;

                // Collect all emails to notify
                const emailsToNotify = [];
                
                // 1. Always add registering user's email
                if (userData?.email) {
                    emailsToNotify.push(userData.email);
                }
                
                // 2. Add email from form data (individual email or team leader email)
                const formEmail = extractFormDataEmail(formData, templateType);
                if (formEmail) {
                    emailsToNotify.push(formEmail);
                }

                // Get name for personalization
                const formName = extractFormDataName(formData, templateType);
                const displayName = formName || userData?.full_name;

                if (emailsToNotify.length > 0) {
                    await sendParticipantApprovalEmail({
                        emails: emailsToNotify,
                        name: displayName,
                        eventTitle: data.event_title,
                        eventId: data.event_id
                    });
                }
            } catch (emailError) {
                console.error('Failed to send approval email:', emailError);
                // Don't fail the request if email fails
            }
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
 * POST /api/registration/participants/:participantId/reject
 * Reject a participant registration
 */
router.post('/participants/:participantId/reject', async (req, res) => {
    try {
        const { participantId } = req.params;
        const { reviewer_id, rejection_reason } = req.body;

        if (!reviewer_id) {
            return res.status(400).json({
                success: false,
                error: 'reviewer_id is required'
            });
        }

        const { data, error } = await supabase.rpc('reject_participant', {
            p_participant_id: participantId,
            p_reviewer_id: reviewer_id,
            p_rejection_reason: rejection_reason || null
        });

        if (error) {
            console.error('Error rejecting participant:', error);
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        // Send rejection email to BOTH registering user AND form data email
        if (data.success && data.user_id) {
            try {
                // Get user email from users table
                const { data: userData } = await supabase
                    .from('users')
                    .select('email, full_name')
                    .eq('id', data.user_id)
                    .single();

                // Get participant's form data and registration config to extract form email
                const { data: participantData } = await supabase
                    .from('event_participants')
                    .select('form_data, event_id')
                    .eq('id', participantId)
                    .single();

                // Get the registration config to determine template type
                const { data: configData } = await supabase
                    .from('event_registration_configs')
                    .select('template_type')
                    .eq('event_id', participantData?.event_id)
                    .single();

                const templateType = configData?.template_type || 'individual';
                const formData = participantData?.form_data;

                // Collect all emails to notify
                const emailsToNotify = [];
                
                // 1. Always add registering user's email
                if (userData?.email) {
                    emailsToNotify.push(userData.email);
                }
                
                // 2. Add email from form data (individual email or team leader email)
                const formEmail = extractFormDataEmail(formData, templateType);
                if (formEmail) {
                    emailsToNotify.push(formEmail);
                }

                // Get name for personalization
                const formName = extractFormDataName(formData, templateType);
                const displayName = formName || userData?.full_name;

                if (emailsToNotify.length > 0) {
                    await sendParticipantRejectionEmail({
                        emails: emailsToNotify,
                        name: displayName,
                        eventTitle: data.event_title,
                        reason: rejection_reason
                    });
                }
            } catch (emailError) {
                console.error('Failed to send rejection email:', emailError);
            }
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
 * GET /api/registration/participants/:participantId
 * Get detailed information about a participant
 */
router.get('/participants/:participantId', async (req, res) => {
    try {
        const { participantId } = req.params;

        const { data, error } = await supabase
            .from('event_participants')
            .select(`
                *,
                events (id, title, banner_url),
                users!event_participants_user_id_fkey (id, email, full_name, profile_picture_url)
            `)
            .eq('id', participantId)
            .single();

        if (error) {
            console.error('Error fetching participant:', error);
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        res.json({
            success: true,
            participant: data
        });
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/registration/events/:eventId/email-participants
 * Send bulk email to all approved participants of an event
 */
router.post('/events/:eventId/email-participants', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { organizer_id, subject, message } = req.body;

        if (!organizer_id || !subject || !message) {
            return res.status(400).json({
                success: false,
                error: 'organizer_id, subject, and message are required'
            });
        }

        // Get participant emails
        const { data, error } = await supabase.rpc('get_participant_emails_by_event', {
            p_event_id: eventId,
            p_organizer_id: organizer_id
        });

        if (error || !data.success) {
            return res.status(400).json({
                success: false,
                error: error?.message || data?.error || 'Failed to get participant emails'
            });
        }

        const participants = data.participants || [];

        if (participants.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No approved participants found for this event'
            });
        }

        // Send bulk email
        try {
            await sendBulkEmailToParticipants({
                participants,
                subject,
                message,
                eventTitle: data.event_title
            });

            res.json({
                success: true,
                message: `Email sent successfully to ${participants.length} participant(s)`,
                recipient_count: participants.length
            });
        } catch (emailError) {
            console.error('Error sending bulk email:', emailError);
            res.status(500).json({
                success: false,
                error: 'Failed to send emails'
            });
        }
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/registration/events/:eventId/export
 * Export participant data as CSV
 */
router.get('/events/:eventId/export', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { organizer_id, status = 'approved' } = req.query;

        if (!organizer_id) {
            return res.status(400).json({
                success: false,
                error: 'organizer_id is required'
            });
        }

        // Verify organizer owns the event
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('id, title, created_by')
            .eq('id', eventId)
            .eq('created_by', organizer_id)
            .single();

        if (eventError || !event) {
            return res.status(403).json({
                success: false,
                error: 'Event not found or access denied'
            });
        }

        // Get participants - explicitly specify the user_id foreign key relationship
        const { data: participants, error: participantsError } = await supabase
            .from('event_participants')
            .select(`
                id,
                form_data,
                team_name,
                team_members,
                status,
                submitted_at,
                reviewed_at,
                users!event_participants_user_id_fkey (email, full_name)
            `)
            .eq('event_id', eventId)
            .eq('status', status);

        if (participantsError) {
            return res.status(400).json({
                success: false,
                error: participantsError.message
            });
        }

        // Convert to CSV format
        const csvRows = [];
        
        // Get all unique field keys from form_data
        const allFields = new Set();
        participants.forEach(p => {
            if (p.form_data) {
                Object.keys(p.form_data).forEach(key => allFields.add(key));
            }
        });

        // CSV header
        const headers = ['ID', 'User Email', 'User Name', 'Team Name', 'Status', 'Submitted At', ...Array.from(allFields)];
        csvRows.push(headers.join(','));

        // CSV rows
        participants.forEach(p => {
            const row = [
                p.id,
                p.users?.email || '',
                p.users?.full_name || '',
                p.team_name || '',
                p.status,
                p.submitted_at,
                ...Array.from(allFields).map(field => {
                    const value = p.form_data?.[field] || '';
                    // Escape commas and quotes in CSV
                    return `"${String(value).replace(/"/g, '""')}"`;
                })
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${event.title.replace(/[^a-z0-9]/gi, '_')}_participants.csv"`);
        res.send(csvContent);
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

export default router;
