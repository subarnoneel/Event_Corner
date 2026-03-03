import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Email Service for Event Corner
 * Handles sending emails using Gmail SMTP
 */

// Configure nodemailer transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use SSL on port 465
  auth: {
    user: process.env.GMAIL_USER, // Your Gmail address
    pass: process.env.GMAIL_APP_PASSWORD, // Gmail App Password (not regular password)
  },
  connectionTimeout: 15000, // 15 seconds
  socketTimeout: 20000,
});

/**
 * Verify email connection on startup (with retry)
 * This is a non-critical check — emails can still be sent even if
 * the initial verify times out (nodemailer reconnects per-send).
 */
export const verifyEmailConnection = async () => {
  const maxRetries = 2;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await transporter.verify();
      console.log('✅ Email service is ready to send emails');
      return true;
    } catch (error) {
      if (attempt < maxRetries) {
        console.warn(`⚠️ Email verify attempt ${attempt}/${maxRetries} failed: ${error.message}. Retrying in 5s...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.warn('⚠️ Email service verify failed after retries:', error.message);
        console.warn('   Emails will still be sent on-demand (nodemailer reconnects per send).');
        console.warn('   If emails fail to send later, check GMAIL_USER and GMAIL_APP_PASSWORD in .env');
        return false;
      }
    }
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

// ============================================================================
// PARTICIPANT REGISTRATION EMAIL FUNCTIONS
// ============================================================================

/**
 * Extract email addresses from form data for notifications
 * For individual registration: gets the email from form data
 * For team registration: gets the team leader's email (member1_email)
 * @param {Object} formData - The form data submitted during registration
 * @param {string} templateType - 'individual' or 'team'
 * @returns {string|null} The extracted email address or null
 */
export const extractFormDataEmail = (formData, templateType) => {
  if (!formData) return null;

  if (templateType === 'team') {
    // For team registration, look for team leader email (member1_email)
    for (const [key, value] of Object.entries(formData)) {
      const keyLower = key.toLowerCase();
      if (keyLower.includes('member1') && keyLower.includes('email') && value) {
        return value;
      }
    }
  }

  // For individual registration or fallback, look for any email field
  for (const [key, value] of Object.entries(formData)) {
    const keyLower = key.toLowerCase();
    // Skip member2, member3, etc. emails - only get primary email
    if (keyLower.includes('email') && !keyLower.includes('member2') && !keyLower.includes('member3') && value) {
      return value;
    }
  }

  return null;
};

/**
 * Extract name from form data for email personalization
 * @param {Object} formData - The form data submitted during registration
 * @param {string} templateType - 'individual' or 'team'
 * @returns {string|null} The extracted name or null
 */
export const extractFormDataName = (formData, templateType) => {
  if (!formData) return null;

  if (templateType === 'team') {
    // For team registration, look for team leader name (member1_name)
    for (const [key, value] of Object.entries(formData)) {
      const keyLower = key.toLowerCase();
      if (keyLower.includes('member1') && keyLower.includes('name') && !keyLower.includes('team') && value) {
        return value;
      }
    }
  }

  // For individual registration or fallback, look for name field
  for (const [key, value] of Object.entries(formData)) {
    const keyLower = key.toLowerCase();
    if ((keyLower.includes('name') || keyLower === 'name') &&
      !keyLower.includes('team') &&
      !keyLower.includes('member2') &&
      !keyLower.includes('member3') &&
      value) {
      return value;
    }
  }

  return null;
};

/**
 * Send approval email to participant (supports multiple recipients)
 * @param {Object} params - Email parameters
 * @param {string|string[]} params.emails - Participant's email(s) - can be single email or array
 * @param {string} params.name - Participant's name
 * @param {string} params.eventTitle - Event title
 * @param {string} params.eventId - Event ID for link
 */
export const sendParticipantApprovalEmail = async ({ email, emails, name, eventTitle, eventId }) => {
  try {
    // Support both single email (legacy) and multiple emails
    const recipientEmails = emails || (email ? [email] : []);

    // Remove duplicates and filter out empty values
    const uniqueEmails = [...new Set(recipientEmails.filter(e => e && e.trim()))];

    if (uniqueEmails.length === 0) {
      console.warn('No valid emails provided for approval notification');
      return false;
    }

    const eventUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/events/${eventId}`;

    const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f5f5f5;">
            <div style="background-color: #ffffff; border-radius: 8px; padding: 30px;">
                <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
                    <div style="font-size: 24px; font-weight: bold; color: #10b981;">🎉 Event Corner</div>
                    <h2 style="color: #1f2937;">Registration Approved!</h2>
                </div>
                <div style="padding: 30px 0;">
                    <p>Hi ${name || 'there'},</p>
                    <p>Great news! Your registration for <strong>${eventTitle}</strong> has been <strong style="color: #10b981;">approved</strong>!</p>
                    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                        <h3 style="margin: 0;">📅 ${eventTitle}</h3>
                    </div>
                    <p>You are now officially registered. We look forward to seeing you there!</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${eventUrl}" style="padding: 14px 28px; background-color: #10b981; color: #ffffff; border-radius: 6px; text-decoration: none; font-weight: 600;">View Event Details</a>
                    </div>
                </div>
                <div style="text-align: center; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                    <p>This email was sent by Event Corner</p>
                </div>
            </div>
        </body>
        </html>`;

    // Send to all unique emails
    const emailPromises = uniqueEmails.map(recipientEmail =>
      transporter.sendMail({
        from: `"Event Corner" <${process.env.GMAIL_USER}>`,
        to: recipientEmail,
        subject: `✅ Registration Approved - ${eventTitle}`,
        html,
        text: `Hi ${name || 'there'},\n\nYour registration for "${eventTitle}" has been approved!\n\nView event: ${eventUrl}\n\nBest regards,\nEvent Corner Team`
      })
    );

    await Promise.all(emailPromises);
    console.log(`✅ Participant approval email sent to ${uniqueEmails.length} recipient(s): ${uniqueEmails.join(', ')}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send participant approval email:', error);
    throw error;
  }
};

/**
 * Send rejection email to participant (supports multiple recipients)
 * @param {Object} params - Email parameters
 * @param {string|string[]} params.emails - Participant's email(s) - can be single email or array
 * @param {string} params.name - Participant's name
 * @param {string} params.eventTitle - Event title
 * @param {string} params.reason - Rejection reason (optional)
 */
export const sendParticipantRejectionEmail = async ({ email, emails, name, eventTitle, reason }) => {
  try {
    // Support both single email (legacy) and multiple emails
    const recipientEmails = emails || (email ? [email] : []);

    // Remove duplicates and filter out empty values
    const uniqueEmails = [...new Set(recipientEmails.filter(e => e && e.trim()))];

    if (uniqueEmails.length === 0) {
      console.warn('No valid emails provided for rejection notification');
      return false;
    }

    const exploreUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/explore`;

    const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f5f5f5;">
            <div style="background-color: #ffffff; border-radius: 8px; padding: 30px;">
                <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
                    <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">🎉 Event Corner</div>
                    <h2 style="color: #1f2937;">Registration Update</h2>
                </div>
                <div style="padding: 30px 0;">
                    <p>Hi ${name || 'there'},</p>
                    <p>We regret to inform you that your registration for <strong>${eventTitle}</strong> could not be approved.</p>
                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                        <h3 style="margin: 0 0 10px 0;">📅 ${eventTitle}</h3>
                        ${reason ? `<p style="color: #991b1b;"><strong>Reason:</strong> ${reason}</p>` : ''}
                    </div>
                    <p>Don't be discouraged! There are many other exciting events on Event Corner.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${exploreUrl}" style="padding: 14px 28px; background-color: #3b82f6; color: #ffffff; border-radius: 6px; text-decoration: none; font-weight: 600;">Explore More Events</a>
                    </div>
                </div>
                <div style="text-align: center; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                    <p>This email was sent by Event Corner</p>
                </div>
            </div>
        </body>
        </html>`;

    // Send to all unique emails
    const emailPromises = uniqueEmails.map(recipientEmail =>
      transporter.sendMail({
        from: `"Event Corner" <${process.env.GMAIL_USER}>`,
        to: recipientEmail,
        subject: `Registration Update - ${eventTitle}`,
        html,
        text: `Hi ${name || 'there'},\n\nYour registration for "${eventTitle}" could not be approved.${reason ? `\n\nReason: ${reason}` : ''}\n\nExplore more events: ${exploreUrl}\n\nBest regards,\nEvent Corner Team`
      })
    );

    await Promise.all(emailPromises);
    console.log(`✅ Participant rejection email sent to ${uniqueEmails.length} recipient(s): ${uniqueEmails.join(', ')}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send participant rejection email:', error);
    throw error;
  }
};

/**
 * Send bulk email to all participants of an event
 * @param {Object} params - Email parameters
 * @param {Array} params.participants - List of participants
 * @param {string} params.subject - Email subject
 * @param {string} params.message - Email message
 * @param {string} params.eventTitle - Event title
 */
export const sendBulkEmailToParticipants = async ({ participants, subject, message, eventTitle }) => {
  try {
    const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f5f5f5;">
            <div style="background-color: #ffffff; border-radius: 8px; padding: 30px;">
                <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
                    <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">🎉 Event Corner</div>
                    <h2 style="color: #1f2937;">${eventTitle}</h2>
                </div>
                <div style="padding: 30px 0;">
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</div>
                </div>
                <div style="text-align: center; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                    <p>Sent by the organizer of "${eventTitle}" via Event Corner</p>
                </div>
            </div>
        </body>
        </html>`;

    const emailPromises = participants.map(participant =>
      transporter.sendMail({
        from: `"Event Corner" <${process.env.GMAIL_USER}>`,
        to: participant.email,
        subject: `[${eventTitle}] ${subject}`,
        html,
        text: `${eventTitle}\n\n${message}\n\n---\nSent via Event Corner`
      })
    );

    await Promise.all(emailPromises);
    console.log(`✅ Bulk email sent to ${participants.length} participants`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send bulk email:', error);
    throw error;
  }
};

// ============================================================================
// EVENT CANCELLATION EMAIL
// ============================================================================

/**
 * Send event cancellation email to participants
 * @param {Object} params
 * @param {Array} params.participants - [{email, name, was_paid}]
 * @param {string} params.eventTitle
 * @param {string} params.cancellationReason
 * @param {Object|null} params.refundInfo - {refunded_count, total_amount}
 */
export const sendEventCancellationEmail = async ({ participants, eventTitle, cancellationReason, refundInfo }) => {
  try {
    const emailPromises = participants.map(participant => {
      const html = `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f5f5f5;">
                <div style="background-color: #ffffff; border-radius: 8px; padding: 30px;">
                    <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
                        <div style="font-size: 24px; font-weight: bold; color: #ef4444;">⚠️ Event Corner</div>
                        <h2 style="color: #1f2937;">Event Cancelled</h2>
                    </div>
                    <div style="padding: 30px 0;">
                        <p>Hi ${participant.name || 'there'},</p>
                        <p>We're sorry to inform you that the following event has been <strong style="color: #ef4444;">cancelled</strong>:</p>
                        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                            <h3 style="margin: 0 0 10px 0; color: #991b1b;">📅 ${eventTitle}</h3>
                            <p style="color: #991b1b; margin: 5px 0;"><strong>Reason:</strong> ${cancellationReason}</p>
                        </div>
                        ${participant.was_paid ? `
                        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                            <p style="color: #065f46; margin: 0;"><strong>💰 Refund:</strong> A full refund has been initiated for your payment. Please allow 5-7 business days for the refund to appear in your account.</p>
                        </div>
                        ` : ''}
                        <p>We apologize for any inconvenience caused.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/events" style="padding: 14px 28px; background-color: #3b82f6; color: #ffffff; border-radius: 6px; text-decoration: none; font-weight: 600;">Browse Other Events</a>
                        </div>
                    </div>
                    <div style="text-align: center; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                        <p>This email was sent by Event Corner</p>
                    </div>
                </div>
            </body>
            </html>`;

      return transporter.sendMail({
        from: `"Event Corner" <${process.env.GMAIL_USER}>`,
        to: participant.email,
        subject: `⚠️ Event Cancelled: ${eventTitle}`,
        html,
        text: `Hi ${participant.name || 'there'},\n\nThe event "${eventTitle}" has been cancelled.\n\nReason: ${cancellationReason}\n\n${participant.was_paid ? 'A full refund has been initiated. Please allow 5-7 business days.\n\n' : ''}We apologize for any inconvenience.\n\nBest regards,\nEvent Corner Team`
      });
    });

    await Promise.all(emailPromises);
    console.log(`✅ Cancellation email sent to ${participants.length} participants`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send cancellation email:', error);
    throw error;
  }
};

export default {
  verifyEmailConnection,
  sendApprovalEmail,
  sendCreatorNotification,
  sendParticipantApprovalEmail,
  sendParticipantRejectionEmail,
  sendBulkEmailToParticipants,
  sendEventCancellationEmail,
  extractFormDataEmail,
  extractFormDataName,
};
