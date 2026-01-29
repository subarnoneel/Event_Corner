import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { sendCreatorNotification } from '../services/email.service.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/approval/verify/:token
 * Verify event approval or rejection via email link
 * Query params: action=approve|reject
 */
router.get('/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { action } = req.query; // 'approve' or 'reject'

        // Validate action
        if (!action || !['approve', 'reject'].includes(action)) {
            return res.status(400).send(getErrorPage('Invalid action specified'));
        }

        // Find event by approval token
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*, created_by(email, full_name)')
            .eq('approval_token', token)
            .single();

        if (eventError || !event) {
            console.error('Event not found for token:', token);
            return res.status(404).send(getErrorPage('Invalid or expired verification link'));
        }

        // Check if token has expired (7 days)
        if (event.approval_token_expires_at) {
            const expiryDate = new Date(event.approval_token_expires_at);
            if (expiryDate < new Date()) {
                return res.send(getErrorPage('This verification link has expired'));
            }
        }

        // Check if already responded
        if (event.approval_status !== 'pending_approval') {
            const alreadyApproved = event.approval_status === 'approved';
            return res.send(getAlreadyRespondedPage(alreadyApproved));
        }

        // Update event approval status
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        const { error: updateError } = await supabase
            .from('events')
            .update({
                approval_status: newStatus,
                approval_responded_at: new Date().toISOString(),
                approval_token: null, // Invalidate token after use
            })
            .eq('id', event.id);

        if (updateError) {
            console.error('Error updating event:', updateError);
            return res.status(500).send(getErrorPage('Failed to process your response'));
        }

        // Record in approval history
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        await supabase.from('event_approval_history').insert({
            event_id: event.id,
            contact_email: event.contact_email,
            action: newStatus,
            ip_address: ipAddress,
            user_agent: userAgent,
        });

        // Send notification to creator
        try {
            await sendCreatorNotification({
                creatorEmail: event.created_by.email,
                event: {
                    title: event.title,
                    category: event.category,
                },
                action: newStatus,
            });
        } catch (emailError) {
            console.error('Failed to send creator notification:', emailError);
            // Don't fail the request if creator notification fails
        }

        // Return success page
        return res.send(getSuccessPage(action === 'approve', event));
    } catch (error) {
        console.error('Unexpected error in approval route:', error);
        return res.status(500).send(getErrorPage('An unexpected error occurred'));
    }
});

// ============================================================================
// HTML PAGE TEMPLATES
// ============================================================================

/**
 * Success page after approval/rejection
 */
const getSuccessPage = (isApproved, event) => {
    const color = isApproved ? '#10b981' : '#ef4444';
    const icon = isApproved ? '✅' : '❌';
    const title = isApproved ? 'Event Approved!' : 'Event Rejected';
    const message = isApproved
        ? 'Thank you! The event has been approved and is now live on Event Corner.'
        : 'The event has been rejected and will not be displayed publicly on Event Corner.';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - Event Corner</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, ${color}15 0%, ${color}05 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          max-width: 600px;
          width: 100%;
          padding: 60px 40px;
          text-align: center;
        }
        .icon {
          font-size: 80px;
          margin-bottom: 20px;
          animation: scaleIn 0.5s ease-out;
        }
        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }
        h1 {
          color: ${color};
          font-size: 32px;
          margin-bottom: 20px;
        }
        .event-name {
          background: #f3f4f6;
          padding: 20px;
          border-radius: 8px;
          margin: 30px 0;
          border-left: 4px solid ${color};
        }
        .event-name h2 {
          color: #1f2937;
          font-size: 20px;
          margin-bottom: 8px;
        }
        .event-name p {
          color: #6b7280;
          font-size: 14px;
        }
        p {
          color: #4b5563;
          font-size: 18px;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .button {
          display: inline-block;
          background: ${color};
          color: white;
          padding: 14px 32px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          margin-top: 30px;
          transition: all 0.3s ease;
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px ${color}40;
        }
        .footer {
          margin-top: 40px;
          padding-top: 30px;
          border-top: 1px solid #e5e7eb;
          color: #9ca3af;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">${icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        
        <div class="event-name">
          <h2>${event.title}</h2>
          <p>Category: ${event.category}</p>
        </div>
        
        ${isApproved
            ? '<p>The event organizer has been notified and the event is now visible to all users.</p>'
            : '<p>The event organizer has been notified that their event was not approved.</p>'
        }
        
        <a href="/" class="button">View Event Corner</a>
        
        <div class="footer">
          <p>Thank you for using Event Corner</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Error page
 */
const getErrorPage = (errorMessage) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error - Event Corner</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #fef2f2 0%, #fff 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          max-width: 500px;
          width: 100%;
          padding: 60px 40px;
          text-align: center;
        }
        .icon {
          font-size: 80px;
          margin-bottom: 20px;
        }
        h1 {
          color: #dc2626;
          font-size: 28px;
          margin-bottom: 16px;
        }
        p {
          color: #6b7280;
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 30px;
        }
        .button {
          display: inline-block;
          background: #3b82f6;
          color: white;
          padding: 12px 28px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        .button:hover {
          background: #2563eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">⚠️</div>
        <h1>Verification Failed</h1>
        <p>${errorMessage}</p>
        <a href="/" class="button">Go to Event Corner</a>
      </div>
    </body>
    </html>
  `;
};

/**
 * Already responded page
 */
const getAlreadyRespondedPage = (wasApproved) => {
    const status = wasApproved ? 'approved' : 'rejected';
    const icon = wasApproved ? '✅' : '❌';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Already Responded - Event Corner</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #eff6ff 0%, #fff 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          max-width: 500px;
          width: 100%;
          padding: 60px 40px;
          text-align: center;
        }
        .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 {
          color: #1f2937;
          font-size: 28px;
          margin-bottom: 16px;
        }
        p {
          color: #6b7280;
          font-size: 16px;
          line-height: 1.6;
        }
        .status {
          background: #f3f4f6;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          font-weight: 600;
          color: #374151;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">${icon}</div>
        <h1>Already Responded</h1>
        <div class="status">
          This event was previously ${status}
        </div>
        <p>You have already responded to this verification request.</p>
      </div>
    </body>
    </html>
  `;
};

export default router;
