import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { initiateRefund } from '../services/sslcommerz.service.js';
import emailService from '../services/email.service.js';

dotenv.config();

const router = express.Router();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

/**
 * POST /api/events/:eventId/cancel
 * Cancel an event, refund all paid participants, and optionally notify via email
 * Body: { cancelled_by, cancellation_reason, notify_participants (default: true) }
 */
router.post('/:eventId/cancel', async (req, res) => {
    try {
        const { eventId } = req.params;
        const {
            cancelled_by,
            cancellation_reason,
            notify_participants = true
        } = req.body;

        if (!cancelled_by || !cancellation_reason) {
            return res.status(400).json({
                success: false,
                error: 'cancelled_by and cancellation_reason are required'
            });
        }

        // 1. Verify event exists and user is the creator
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (eventError || !event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        if (event.created_by !== cancelled_by) {
            return res.status(403).json({ success: false, error: 'Only the event creator can cancel this event' });
        }

        if (event.status === 'cancelled') {
            return res.status(400).json({ success: false, error: 'Event is already cancelled' });
        }

        // 2. Update event status to cancelled
        const { error: updateError } = await supabase
            .from('events')
            .update({
                status: 'cancelled',
                updated_at: new Date().toISOString()
            })
            .eq('id', eventId);

        if (updateError) {
            console.error('Error updating event status:', updateError);
            return res.status(500).json({ success: false, error: 'Failed to cancel event' });
        }

        // 3. Get all participants (pending + approved)
        const { data: participants, error: partError } = await supabase
            .from('event_participants')
            .select('*, users!event_participants_user_id_fkey(email, full_name)')
            .eq('event_id', eventId)
            .in('status', ['pending', 'approved']);

        if (partError) {
            console.error('Error fetching participants:', partError);
        }

        const allParticipants = participants || [];
        let cancelledCount = 0;
        let refundedCount = 0;
        let refundTotal = 0;
        let emailsSent = 0;

        // 4. Cancel all participant registrations
        if (allParticipants.length > 0) {
            const participantIds = allParticipants.map(p => p.id);

            const { error: cancelError } = await supabase
                .from('event_participants')
                .update({ status: 'cancelled' })
                .in('id', participantIds);

            if (!cancelError) {
                cancelledCount = participantIds.length;
            } else {
                console.error('Error cancelling participants:', cancelError);
            }
        }

        // 5. Process refunds for paid participants
        const paidParticipants = allParticipants.filter(p => p.payment_status === 'completed');

        for (const participant of paidParticipants) {
            try {
                // Find the completed transaction
                const { data: txn } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('participant_id', participant.id)
                    .eq('event_id', eventId)
                    .eq('status', 'completed')
                    .maybeSingle();

                if (!txn) continue;

                const refundAmount = parseFloat(txn.amount);

                // Create refund record
                const { data: refundData, error: refundError } = await supabase
                    .from('refunds')
                    .insert({
                        transaction_id: txn.id,
                        refund_amount: refundAmount,
                        reason: 'event_cancelled',
                        reason_detail: cancellation_reason,
                        status: 'initiated',
                        initiated_by: cancelled_by
                    })
                    .select()
                    .single();

                if (refundError) {
                    console.error('Error creating refund for participant:', participant.id, refundError);
                    continue;
                }

                // Try SSLCommerz refund API
                if (txn.bank_tran_id) {
                    try {
                        const refe_id = `REFUND_${refundData.id.substring(0, 8)}_${Date.now()}`;
                        const gatewayResult = await initiateRefund(
                            txn.bank_tran_id,
                            refundAmount,
                            `Event cancelled: ${cancellation_reason}`,
                            refe_id
                        );

                        const refundStatus = gatewayResult?.status === 'success' ? 'processing' : 'initiated';
                        await supabase
                            .from('refunds')
                            .update({
                                status: refundStatus,
                                gateway_refund_id: gatewayResult?.refund_ref_id || refe_id,
                                gateway_response: gatewayResult
                            })
                            .eq('id', refundData.id);
                    } catch (refundErr) {
                        console.error('SSLCommerz refund error for participant:', participant.id, refundErr.message);
                        await supabase
                            .from('refunds')
                            .update({
                                status: 'initiated',
                                gateway_response: { error: refundErr.message }
                            })
                            .eq('id', refundData.id);
                    }
                } else {
                    // Sandbox — no bank_tran_id, handle locally
                    await supabase
                        .from('refunds')
                        .update({
                            status: 'processing',
                            gateway_response: { note: 'Refund processed locally — sandbox mode' }
                        })
                        .eq('id', refundData.id);
                }

                // Update transaction and participant payment status
                await supabase
                    .from('transactions')
                    .update({ status: 'refunded' })
                    .eq('id', txn.id);

                await supabase
                    .from('event_participants')
                    .update({ payment_status: 'refunded' })
                    .eq('id', participant.id);

                refundedCount++;
                refundTotal += refundAmount;

            } catch (err) {
                console.error('Refund error for participant:', participant.id, err);
            }
        }

        // 6. Send cancellation emails
        if (notify_participants && allParticipants.length > 0) {
            try {
                // Build participant list with emails
                const emailRecipients = allParticipants
                    .filter(p => p.users?.email)
                    .map(p => ({
                        email: p.users.email,
                        name: p.users.full_name || 'Participant',
                        was_paid: p.payment_status === 'completed',
                        refund_amount: p.payment_status === 'completed' ? parseFloat(
                            paidParticipants.find(pp => pp.id === p.id) ?
                                // Find the transaction amount
                                '0' : '0'
                        ) : 0
                    }));

                await emailService.sendEventCancellationEmail({
                    participants: emailRecipients,
                    eventTitle: event.title,
                    cancellationReason: cancellation_reason,
                    refundInfo: refundedCount > 0 ? {
                        refunded_count: refundedCount,
                        total_amount: refundTotal.toFixed(2)
                    } : null
                });

                emailsSent = emailRecipients.length;
            } catch (emailErr) {
                console.error('Error sending cancellation emails:', emailErr);
                // Don't fail the whole operation for email errors
            }
        }

        console.log(`Event ${eventId} cancelled: ${cancelledCount} participants, ${refundedCount} refunds (৳${refundTotal}), ${emailsSent} emails`);

        res.json({
            success: true,
            message: 'Event cancelled successfully',
            cancelled_count: cancelledCount,
            refunded_count: refundedCount,
            refund_total: refundTotal.toFixed(2),
            emails_sent: emailsSent
        });
    } catch (err) {
        console.error('Event cancellation error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * GET /api/events/:eventId/cancel-preview
 * Get a preview of what cancelling this event will do (participant count, refund totals)
 */
router.get('/:eventId/cancel-preview', async (req, res) => {
    try {
        const { eventId } = req.params;

        // Get event
        const { data: event } = await supabase
            .from('events')
            .select('id, title, status, created_by')
            .eq('id', eventId)
            .single();

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        // Get participants
        const { data: participants } = await supabase
            .from('event_participants')
            .select('id, status, payment_status')
            .eq('event_id', eventId)
            .in('status', ['pending', 'approved']);

        const allParticipants = participants || [];
        const paidParticipants = allParticipants.filter(p => p.payment_status === 'completed');

        // Get total refund amount
        let totalRefundAmount = 0;
        if (paidParticipants.length > 0) {
            const paidIds = paidParticipants.map(p => p.id);
            const { data: txns } = await supabase
                .from('transactions')
                .select('amount')
                .eq('event_id', eventId)
                .eq('status', 'completed')
                .in('participant_id', paidIds);

            totalRefundAmount = (txns || []).reduce((sum, t) => sum + parseFloat(t.amount), 0);
        }

        res.json({
            success: true,
            preview: {
                event_title: event.title,
                event_status: event.status,
                total_participants: allParticipants.length,
                approved_participants: allParticipants.filter(p => p.status === 'approved').length,
                pending_participants: allParticipants.filter(p => p.status === 'pending').length,
                paid_participants: paidParticipants.length,
                total_refund_amount: totalRefundAmount.toFixed(2)
            }
        });
    } catch (err) {
        console.error('Cancel preview error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
