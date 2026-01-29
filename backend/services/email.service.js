import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Email Service for Event Corner
 * Handles sending emails using Gmail SMTP
 */

// Configure nodemailer transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER, // Your Gmail address
        pass: process.env.GMAIL_APP_PASSWORD, // Gmail App Password (not regular password)
    },
});

/**
 * Verify email connection on startup
 */
export const verifyEmailConnection = async () => {
    try {
        await transporter.verify();
        console.log('✅ Email service is ready to send emails');
        return true;
    } catch (error) {
        console.error('❌ Email service connection failed:', error.message);
        console.error('Please check your GMAIL_USER and GMAIL_APP_PASSWORD in .env file');
        return false;
    }
};

/**
 * Generate approval email HTML template
 * @param {Object} event - Event details
 * @param {string} approvalUrl - URL for approval
 * @param {string} rejectionUrl - URL for rejection
 * @returns {string} HTML email content
 */
const getApprovalEmailTemplate = (event, approvalUrl, rejectionUrl) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Approval Request</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #3b82f6;
          margin-bottom: 10px;
        }
        .content {
          padding: 30px 0;
        }
        .event-details {
          background-color: #f9fafb;
          border-left: 4px solid #3b82f6;
          padding: 15px;
          margin: 20px 0;
        }
        .event-details h3 {
          margin: 0 0 10px 0;
          color: #1f2937;
        }
        .event-details p {
          margin: 5px 0;
          color: #4b5563;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          margin: 10px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s ease;
        }
        .approve-button {
          background-color: #10b981;
          color: #ffffff;
        }
        .approve-button:hover {
          background-color: #059669;
        }
        .reject-button {
          background-color: #ef4444;
          color: #ffffff;
        }
        .reject-button:hover {
          background-color: #dc2626;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
        .warning {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          color: #92400e;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎉 Event Corner</div>
          <h2 style="color: #1f2937; margin: 10px 0;">Event Approval Request</h2>
        </div>
        
        <div class="content">
          <p>Hi there,</p>
          
          <p>An event has been created on <strong>Event Corner</strong> using your email address as the contact information:</p>
          
          <div class="event-details">
            <h3>📅 ${event.title}</h3>
            ${event.description ? `<p><strong>Description:</strong> ${event.description.substring(0, 150)}${event.description.length > 150 ? '...' : ''}</p>` : ''}
            <p><strong>Category:</strong> ${event.category}</p>
            <p><strong>Venue:</strong> ${event.venue_name} (${event.venue_type})</p>
            ${event.created_by_name ? `<p><strong>Created By:</strong> ${event.created_by_name}</p>` : ''}
          </div>
          
          <p><strong>We need your permission</strong> to display this event publicly on our platform.</p>
          
          <div class="warning">
            <strong>⚠️ Important:</strong> If you don't recognize this event or didn't authorize its creation, please reject it.
          </div>
          
          <div class="button-container">
            <a href="${approvalUrl}" class="button approve-button">✅ Approve Event</a>
            <a href="${rejectionUrl}" class="button reject-button">❌ Reject Event</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            <strong>What happens next?</strong><br>
            • If you approve, the event will be published on our website.<br>
            • If you reject, the event will not be shown publicly.
          </p>
          
          <p style="color: #6b7280; font-size: 14px;">
            <em>This verification link expires in 7 days.</em>
          </p>
        </div>
        
        <div class="footer">
          <p>This email was sent by Event Corner</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Send approval email to contact person
 * @param {Object} params - Email parameters
 * @param {Object} params.event - Event details
 * @param {string} params.contactEmail - Email to send to
 * @param {string} params.approvalToken - Unique approval token
 * @param {string} params.baseUrl - Base URL of the website
 * @returns {Promise<boolean>} Success status
 */
export const sendApprovalEmail = async ({ event, contactEmail, approvalToken, baseUrl }) => {
    try {
        const approvalUrl = `${baseUrl}/api/approval/verify/${approvalToken}?action=approve`;
        const rejectionUrl = `${baseUrl}/api/approval/verify/${approvalToken}?action=reject`;

        const mailOptions = {
            from: `"Event Corner" <${process.env.GMAIL_USER}>`,
            to: contactEmail,
            subject: `Event Approval Request - ${event.title}`,
            html: getApprovalEmailTemplate(event, approvalUrl, rejectionUrl),
            text: `
Event Approval Request

Hi there,

An event has been created on Event Corner using your email address as the contact information:

Event Name: ${event.title}
Category: ${event.category}
Venue: ${event.venue_name}
${event.created_by_name ? `Created By: ${event.created_by_name}` : ''}

We need your permission to display this event publicly on our platform.

To APPROVE the event, visit: ${approvalUrl}
To REJECT the event, visit: ${rejectionUrl}

If you approve, the event will be published on our website.
If you reject, the event will not be shown publicly.

This link expires in 7 days.

Best regards,
Event Corner Team
      `.trim(),
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Approval email sent:', info.messageId);
        console.log('   To:', contactEmail);
        console.log('   Event:', event.title);
        return true;
    } catch (error) {
        console.error('❌ Failed to send approval email:', error);
        throw new Error(`Email sending failed: ${error.message}`);
    }
};

/**
 * Send notification to event creator about approval/rejection
 * @param {Object} params - Email parameters
 * @param {string} params.creatorEmail - Creator's email
 * @param {Object} params.event - Event details
 * @param {string} params.action - 'approved' or 'rejected'
 * @returns {Promise<boolean>} Success status
 */
export const sendCreatorNotification = async ({ creatorEmail, event, action }) => {
    try {
        const isApproved = action === 'approved';
        const subject = isApproved
            ? `✅ Event Approved: ${event.title}`
            : `❌ Event Rejected: ${event.title}`;

        const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isApproved ? '#10b981' : '#ef4444'};">
          ${isApproved ? '✅ Event Approved!' : '❌ Event Rejected'}
        </h2>
        <p>Hi,</p>
        <p>The contact person has <strong>${action}</strong> your event:</p>
        <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid ${isApproved ? '#10b981' : '#ef4444'}; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">${event.title}</h3>
          <p style="margin: 5px 0;">Category: ${event.category}</p>
        </div>
        ${isApproved
                ? '<p><strong>Your event is now live</strong> and visible to all users on Event Corner!</p>'
                : '<p>Your event will <strong>not be displayed publicly</strong> on Event Corner. The contact person did not authorize the use of their email.</p>'
            }
        <p>Best regards,<br>Event Corner Team</p>
      </body>
      </html>
    `;

        await transporter.sendMail({
            from: `"Event Corner" <${process.env.GMAIL_USER}>`,
            to: creatorEmail,
            subject,
            html,
        });

        console.log(`✅ Creator notification sent to ${creatorEmail} (${action})`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send creator notification:', error);
        // Don't throw - creator notification is not critical
        return false;
    }
};

export default {
    verifyEmailConnection,
    sendApprovalEmail,
    sendCreatorNotification,
};
