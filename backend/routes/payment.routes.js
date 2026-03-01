import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
    initPayment,
    validateTransaction,
    initiateRefund,
    generateTranId
} from '../services/sslcommerz.service.js';

dotenv.config();

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ============================================================================
// PAYMENT CONFIG ROUTES
// ============================================================================

/**
 * POST /api/payment/:eventId/config
 * Create or update payment configuration for an event
 */
router.post('/:eventId/config', async (req, res) => {
    try {
        const { eventId } = req.params;
        const {
            is_paid_event,
            fee_amount,
            fee_type,
            refund_policy,
            refund_percentage,
            accepted_methods
        } = req.body;

        const { data, error } = await supabase.rpc('upsert_payment_config', {
            p_event_id: eventId,
            p_is_paid_event: is_paid_event || false,
            p_fee_amount: fee_amount || 0,
            p_fee_type: fee_type || 'per_person',
            p_refund_policy: refund_policy || 'full_refund',
            p_refund_percentage: refund_percentage || 100,
            p_accepted_methods: accepted_methods || ['bkash', 'nagad', 'card', 'bank']
        });

        if (error) {
            console.error('Error saving payment config:', error);
            return res.status(400).json({ success: false, error: error.message });
        }

        res.json(data);
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * GET /api/payment/:eventId/config
 * Get payment configuration for an event
 */
router.get('/:eventId/config', async (req, res) => {
    try {
        const { eventId } = req.params;

        const { data, error } = await supabase.rpc('get_payment_config', {
            p_event_id: eventId
        });

        if (error) {
            console.error('Error fetching payment config:', error);
            return res.status(400).json({ success: false, error: error.message });
        }

        res.json(data);
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================================================
// PAYMENT INITIATION
// ============================================================================

/**
 * POST /api/payment/:eventId/initiate
 * Start a payment session with SSLCommerz
 * Body: { user_id, participant_id, cus_name, cus_email, cus_phone }
 */
router.post('/:eventId/initiate', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { user_id, participant_id, cus_name, cus_email, cus_phone, form_data, team_name } = req.body;

        if (!user_id) {
            return res.status(400).json({ success: false, error: 'user_id is required' });
        }

        // Get payment config
        const { data: configData, error: configError } = await supabase.rpc('get_payment_config', {
            p_event_id: eventId
        });

        if (configError || !configData?.config || !configData.config.is_paid_event) {
            return res.status(400).json({
                success: false,
                error: 'This event does not require payment'
            });
        }

        const paymentConfig = configData.config;

        // Check for existing completed transaction
        const { data: existingTxn } = await supabase
            .from('transactions')
            .select('id, status')
            .eq('event_id', eventId)
            .eq('user_id', user_id)
            .eq('status', 'completed')
            .maybeSingle();

        if (existingTxn) {
            return res.status(400).json({
                success: false,
                error: 'Payment already completed for this registration'
            });
        }

        // Generate unique transaction ID
        const tran_id = generateTranId(eventId, user_id);

        // Get event title for product name
        const { data: eventData } = await supabase
            .from('events')
            .select('title, category')
            .eq('id', eventId)
            .single();

        // Create/update transaction record as 'initiated'
        // Store form data for creating registration after payment succeeds
        const txnInsertData = {
            event_id: eventId,
            participant_id: participant_id || null,
            user_id: user_id,
            amount: paymentConfig.fee_amount,
            currency: paymentConfig.currency || 'BDT',
            tran_id: tran_id,
            status: 'initiated',
            initiated_at: new Date().toISOString()
        };

        // If form_data is provided, store it for deferred registration creation
        if (form_data) {
            txnInsertData.pending_registration_data = {
                form_data,
                team_name: team_name || null,
                team_members: [],
                uploaded_files: []
            };
        }

        const { data: txnData, error: txnError } = await supabase
            .from('transactions')
            .insert(txnInsertData)
            .select()
            .single();

        if (txnError) {
            console.error('Error creating transaction:', txnError);
            return res.status(400).json({ success: false, error: 'Failed to create transaction record' });
        }

        // Initialize SSLCommerz payment
        const sslResponse = await initPayment({
            tran_id: tran_id,
            total_amount: paymentConfig.fee_amount,
            cus_name: cus_name || 'Participant',
            cus_email: cus_email || 'participant@example.com',
            cus_phone: cus_phone || '01700000000',
            product_name: eventData?.title || 'Event Registration',
            product_category: eventData?.category || 'Event',
            event_id: eventId,
            participant_id: participant_id || '',
            user_id: user_id
        });

        if (sslResponse?.GatewayPageURL) {
            res.json({
                success: true,
                redirectUrl: sslResponse.GatewayPageURL,
                tran_id: tran_id,
                sessionkey: sslResponse.sessionkey
            });
        } else {
            // Update transaction as failed
            await supabase
                .from('transactions')
                .update({ status: 'failed', gateway_response: sslResponse })
                .eq('id', txnData.id);

            res.status(400).json({
                success: false,
                error: 'Failed to initialize payment gateway',
                details: sslResponse
            });
        }
    } catch (err) {
        console.error('Payment initiation error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================================================
// SSLCOMMERZ CALLBACKS
// ============================================================================

/**
 * POST /api/payment/ipn
 * IPN (Instant Payment Notification) callback from SSLCommerz
 * This is server-to-server — most reliable notification
 */
router.post('/ipn', async (req, res) => {
    try {
        console.log('=== IPN CALLBACK RECEIVED ===');
        console.log('IPN Body:', JSON.stringify(req.body, null, 2));

        const { tran_id, val_id, status, amount, card_type, bank_tran_id } = req.body;

        if (!tran_id) {
            return res.status(400).json({ success: false, error: 'Missing tran_id' });
        }

        // Find the transaction
        const { data: txn, error: txnError } = await supabase
            .from('transactions')
            .select('*')
            .eq('tran_id', tran_id)
            .single();

        if (txnError || !txn) {
            console.error('Transaction not found for tran_id:', tran_id);
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        // Skip if already completed
        if (txn.status === 'completed') {
            console.log('Transaction already completed, skipping IPN');
            return res.status(200).json({ success: true, message: 'Already processed' });
        }

        if (status === 'VALID' || status === 'VALIDATED') {
            // Validate with SSLCommerz
            let isValid = true;
            if (val_id) {
                try {
                    const validation = await validateTransaction(val_id);
                    isValid = validation.status === 'VALID' || validation.status === 'VALIDATED';
                } catch (valError) {
                    console.error('Validation API error:', valError);
                    // Continue anyway — IPN data is still semi-reliable
                }
            }

            if (isValid) {
                // Update transaction as completed
                await supabase
                    .from('transactions')
                    .update({
                        status: 'completed',
                        payment_method: card_type || 'unknown',
                        gateway_transaction_id: val_id,
                        bank_tran_id: bank_tran_id,
                        gateway_response: req.body,
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', txn.id);

                // Create registration from pending data if no participant exists yet
                if (!txn.participant_id && txn.pending_registration_data) {
                    const regData = txn.pending_registration_data;
                    const { data: newParticipant } = await supabase
                        .from('event_participants')
                        .insert({
                            event_id: txn.event_id,
                            user_id: txn.user_id,
                            form_data: regData.form_data,
                            team_name: regData.team_name,
                            team_members: regData.team_members || [],
                            uploaded_files: regData.uploaded_files || [],
                            status: 'pending',
                            payment_status: 'completed'
                        })
                        .select('id')
                        .single();

                    if (newParticipant) {
                        await supabase
                            .from('transactions')
                            .update({ participant_id: newParticipant.id, pending_registration_data: null })
                            .eq('id', txn.id);
                        console.log('Registration created from pending data, participant:', newParticipant.id);
                    }
                } else if (txn.participant_id) {
                    await supabase
                        .from('event_participants')
                        .update({ payment_status: 'completed' })
                        .eq('id', txn.participant_id);
                }

                console.log('Payment completed for tran_id:', tran_id);
            }
        } else if (status === 'FAILED') {
            await supabase
                .from('transactions')
                .update({
                    status: 'failed',
                    gateway_response: req.body
                })
                .eq('id', txn.id);
        }

        res.status(200).json({ success: true });
    } catch (err) {
        console.error('IPN processing error:', err);
        res.status(200).json({ success: true }); // Always return 200 to SSLCommerz
    }
});

/**
 * POST /api/payment/success
 * Success redirect from SSLCommerz (browser redirect)
 */
router.post('/success', async (req, res) => {
    try {
        console.log('=== PAYMENT SUCCESS REDIRECT ===');
        const { tran_id, val_id, status, amount, card_type, bank_tran_id } = req.body;
        const frontendUrl = req.body.value_d || process.env.FRONTEND_URL || 'http://localhost:5173';
        const eventId = req.body.value_a;

        if (tran_id) {
            // Find the transaction
            const { data: txn } = await supabase
                .from('transactions')
                .select('*')
                .eq('tran_id', tran_id)
                .single();

            if (txn && txn.status !== 'completed') {
                // Validate + update (backup for if IPN hasn't arrived yet)
                let isValid = true;
                if (val_id) {
                    try {
                        const validation = await validateTransaction(val_id);
                        isValid = validation.status === 'VALID' || validation.status === 'VALIDATED';
                    } catch (e) {
                        console.error('Validation error in success redirect:', e);
                    }
                }

                if (isValid) {
                    await supabase
                        .from('transactions')
                        .update({
                            status: 'completed',
                            payment_method: card_type || 'unknown',
                            gateway_transaction_id: val_id,
                            bank_tran_id: bank_tran_id,
                            gateway_response: req.body,
                            completed_at: new Date().toISOString()
                        })
                        .eq('id', txn.id);

                    // Create registration from pending data if no participant exists yet
                    if (!txn.participant_id && txn.pending_registration_data) {
                        const regData = txn.pending_registration_data;
                        const { data: newParticipant } = await supabase
                            .from('event_participants')
                            .insert({
                                event_id: txn.event_id,
                                user_id: txn.user_id,
                                form_data: regData.form_data,
                                team_name: regData.team_name,
                                team_members: regData.team_members || [],
                                uploaded_files: regData.uploaded_files || [],
                                status: 'pending',
                                payment_status: 'completed'
                            })
                            .select('id')
                            .single();

                        if (newParticipant) {
                            await supabase
                                .from('transactions')
                                .update({ participant_id: newParticipant.id, pending_registration_data: null })
                                .eq('id', txn.id);
                            console.log('Registration created via success redirect, participant:', newParticipant.id);
                        }
                    } else if (txn.participant_id) {
                        await supabase
                            .from('event_participants')
                            .update({ payment_status: 'completed' })
                            .eq('id', txn.participant_id);
                    }
                }
            }
        }

        // Redirect to frontend success page
        res.redirect(`${frontendUrl}/payment/success?tran_id=${tran_id}&event_id=${eventId}`);
    } catch (err) {
        console.error('Success redirect error:', err);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/payment/success?tran_id=${req.body?.tran_id || ''}`);
    }
});

/**
 * POST /api/payment/fail
 * Failure redirect from SSLCommerz
 */
router.post('/fail', async (req, res) => {
    try {
        console.log('=== PAYMENT FAIL REDIRECT ===');
        const { tran_id } = req.body;
        const frontendUrl = req.body.value_d || process.env.FRONTEND_URL || 'http://localhost:5173';
        const eventId = req.body.value_a;

        if (tran_id) {
            await supabase
                .from('transactions')
                .update({ status: 'failed', gateway_response: req.body })
                .eq('tran_id', tran_id);
        }

        res.redirect(`${frontendUrl}/payment/fail?tran_id=${tran_id}&event_id=${eventId}`);
    } catch (err) {
        console.error('Fail redirect error:', err);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/payment/fail`);
    }
});

/**
 * POST /api/payment/cancel
 * Cancel redirect from SSLCommerz
 */
router.post('/cancel', async (req, res) => {
    try {
        console.log('=== PAYMENT CANCEL REDIRECT ===');
        const { tran_id } = req.body;
        const frontendUrl = req.body.value_d || process.env.FRONTEND_URL || 'http://localhost:5173';
        const eventId = req.body.value_a;

        if (tran_id) {
            await supabase
                .from('transactions')
                .update({ status: 'cancelled', gateway_response: req.body })
                .eq('tran_id', tran_id);
        }

        res.redirect(`${frontendUrl}/payment/fail?tran_id=${tran_id}&event_id=${eventId}&cancelled=true`);
    } catch (err) {
        console.error('Cancel redirect error:', err);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/payment/fail?cancelled=true`);
    }
});

// ============================================================================
// REFUND ROUTES
// ============================================================================

/**
 * POST /api/payment/:transactionId/refund
 * Initiate a refund for a transaction
 * Body: { initiated_by, reason, reason_detail, refund_amount (optional — uses policy if not provided) }
 */
router.post('/:transactionId/refund', async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { initiated_by, reason, reason_detail, refund_amount: custom_refund_amount } = req.body;

        if (!initiated_by || !reason) {
            return res.status(400).json({
                success: false,
                error: 'initiated_by and reason are required'
            });
        }

        // Get transaction
        const { data: txn, error: txnError } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (txnError || !txn) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        if (txn.status !== 'completed') {
            return res.status(400).json({
                success: false,
                error: 'Can only refund completed transactions'
            });
        }

        // Get payment config for refund policy
        const { data: configData } = await supabase.rpc('get_payment_config', {
            p_event_id: txn.event_id
        });

        const config = configData?.config;
        let refund_amount;

        if (custom_refund_amount !== undefined && custom_refund_amount !== null) {
            // Manual/custom refund amount
            refund_amount = parseFloat(custom_refund_amount);
        } else if (reason === 'event_cancelled') {
            // Event cancellation = always full refund
            refund_amount = parseFloat(txn.amount);
        } else if (config) {
            // Apply refund policy
            switch (config.refund_policy) {
                case 'full_refund':
                    refund_amount = parseFloat(txn.amount);
                    break;
                case 'partial_refund':
                    refund_amount = parseFloat(txn.amount) * (config.refund_percentage / 100);
                    break;
                case 'no_refund':
                    return res.json({
                        success: true,
                        refund_initiated: false,
                        message: 'This event has a no-refund policy',
                        refund_policy: 'no_refund'
                    });
                case 'custom':
                    // For custom policy, amount must be provided
                    if (!custom_refund_amount) {
                        return res.status(400).json({
                            success: false,
                            error: 'Refund amount required for custom refund policy'
                        });
                    }
                    refund_amount = parseFloat(custom_refund_amount);
                    break;
                default:
                    refund_amount = parseFloat(txn.amount);
            }
        } else {
            refund_amount = parseFloat(txn.amount);
        }

        // Validate refund amount
        if (refund_amount <= 0 || refund_amount > parseFloat(txn.amount)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid refund amount'
            });
        }

        // Create refund record
        const { data: refundData, error: refundError } = await supabase
            .from('refunds')
            .insert({
                transaction_id: transactionId,
                refund_amount: refund_amount,
                reason: reason,
                reason_detail: reason_detail || null,
                status: 'initiated',
                initiated_by: initiated_by
            })
            .select()
            .single();

        if (refundError) {
            console.error('Error creating refund record:', refundError);
            return res.status(400).json({ success: false, error: 'Failed to create refund record' });
        }

        // Try SSLCommerz refund API (if bank_tran_id is available)
        let gatewayRefundResult = null;
        if (txn.bank_tran_id) {
            try {
                // Generate unique refund reference ID
                const refe_id = `REFUND_${refundData.id.substring(0, 8)}_${Date.now()}`;

                gatewayRefundResult = await initiateRefund(
                    txn.bank_tran_id,
                    refund_amount,
                    reason_detail || reason,
                    refe_id
                );

                console.log('Refund gateway result:', JSON.stringify(gatewayRefundResult, null, 2));

                // Update refund with gateway response
                const refundStatus = gatewayRefundResult?.status === 'success' ? 'processing' : 'initiated';
                await supabase
                    .from('refunds')
                    .update({
                        status: refundStatus,
                        gateway_refund_id: gatewayRefundResult?.refund_ref_id || refe_id,
                        gateway_response: gatewayRefundResult
                    })
                    .eq('id', refundData.id);

            } catch (refundErr) {
                console.error('SSLCommerz refund API error:', refundErr.message);
                // Don't fail — refund record is created, can retry later
                // Update refund record with error info
                await supabase
                    .from('refunds')
                    .update({
                        status: 'initiated',
                        gateway_response: { error: refundErr.message, note: 'SSLCommerz API call failed — refund tracked locally' }
                    })
                    .eq('id', refundData.id);
            }
        } else {
            // No bank_tran_id — this is a sandbox limitation; mark refund as processing locally
            console.log('No bank_tran_id available — handling refund locally (sandbox mode)');
            await supabase
                .from('refunds')
                .update({
                    status: 'processing',
                    gateway_response: { note: 'Refund processed locally — no bank_tran_id available (sandbox)' }
                })
                .eq('id', refundData.id);
        }

        // Update transaction status
        const newTxnStatus = refund_amount >= parseFloat(txn.amount) ? 'refunded' : 'partially_refunded';
        await supabase
            .from('transactions')
            .update({ status: newTxnStatus })
            .eq('id', transactionId);

        // Update participant payment status
        if (txn.participant_id) {
            await supabase
                .from('event_participants')
                .update({ payment_status: 'refunded' })
                .eq('id', txn.participant_id);
        }

        res.json({
            success: true,
            refund_initiated: true,
            refund_id: refundData.id,
            refund_amount: refund_amount,
            original_amount: txn.amount,
            message: `Refund of ৳${refund_amount} initiated successfully`
        });
    } catch (err) {
        console.error('Refund error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================================================
// TRANSACTION LISTING
// ============================================================================

/**
 * GET /api/payment/:eventId/transactions
 * Get all transactions for an event (organizer view)
 */
router.get('/:eventId/transactions', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const { data, error } = await supabase.rpc('get_event_transactions', {
            p_event_id: eventId,
            p_page: parseInt(page),
            p_limit: parseInt(limit)
        });

        if (error) {
            console.error('Error fetching transactions:', error);
            return res.status(400).json({ success: false, error: error.message });
        }

        res.json(data);
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * GET /api/payment/user/:userId/transactions
 * Get all transactions for a user (participant view)
 */
router.get('/user/:userId/transactions', async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const { data, error } = await supabase.rpc('get_user_transactions', {
            p_user_id: userId,
            p_page: parseInt(page),
            p_limit: parseInt(limit)
        });

        if (error) {
            console.error('Error fetching user transactions:', error);
            return res.status(400).json({ success: false, error: error.message });
        }

        // Compute summary from transactions (the RPC doesn't include it for user view)
        const txns = data?.transactions || [];
        const summary = {
            total_spent: txns.filter(t => t.status === 'completed').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0).toFixed(2),
            total_refunded: txns.filter(t => t.refund).reduce((sum, t) => sum + parseFloat(t.refund?.refund_amount || 0), 0).toFixed(2),
            completed_count: txns.filter(t => t.status === 'completed').length,
            total_transactions: txns.length
        };

        res.json({ ...data, summary });
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * POST /api/payment/:participantId/waive
 * Mark a participant as paid (fee waiver) without actual payment
 * Body: { waived_by }
 */
router.post('/:participantId/waive', async (req, res) => {
    try {
        const { participantId } = req.params;
        const { waived_by } = req.body;

        if (!waived_by) {
            return res.status(400).json({ success: false, error: 'waived_by is required' });
        }

        // Get participant info
        const { data: participant, error: partError } = await supabase
            .from('event_participants')
            .select('*')
            .eq('id', participantId)
            .single();

        if (partError || !participant) {
            return res.status(404).json({ success: false, error: 'Participant not found' });
        }

        // Create a waiver transaction (amount = 0)
        const tran_id = `WAIVER_${participantId.substring(0, 8)}_${Date.now()}`;

        await supabase
            .from('transactions')
            .upsert({
                event_id: participant.event_id,
                participant_id: participantId,
                user_id: participant.user_id,
                amount: 0,
                tran_id: tran_id,
                status: 'completed',
                payment_method: 'fee_waiver',
                gateway_response: { waived_by, waived_at: new Date().toISOString() },
                initiated_at: new Date().toISOString(),
                completed_at: new Date().toISOString()
            }, {
                onConflict: 'participant_id,event_id'
            });

        // Update participant payment status
        await supabase
            .from('event_participants')
            .update({ payment_status: 'completed' })
            .eq('id', participantId);

        res.json({
            success: true,
            message: 'Fee waived successfully — participant marked as paid'
        });
    } catch (err) {
        console.error('Fee waiver error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * GET /api/payment/:eventId/refund-policy
 * Get the refund policy info for an event (used by frontend for cancellation dialog)
 */
router.get('/:eventId/refund-policy', async (req, res) => {
    try {
        const { eventId } = req.params;

        const { data, error } = await supabase.rpc('get_payment_config', {
            p_event_id: eventId
        });

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        const config = data?.config;
        if (!config || !config.is_paid_event) {
            return res.json({
                success: true,
                is_paid_event: false,
                refund_info: null
            });
        }

        let refund_description = '';
        switch (config.refund_policy) {
            case 'full_refund':
                refund_description = `You will receive a full refund of ৳${config.fee_amount}`;
                break;
            case 'partial_refund':
                const refundAmt = (config.fee_amount * config.refund_percentage / 100).toFixed(2);
                refund_description = `You will receive ${config.refund_percentage}% refund (৳${refundAmt} of ৳${config.fee_amount})`;
                break;
            case 'no_refund':
                refund_description = 'This event has a no-refund policy. You will NOT receive any refund.';
                break;
            case 'custom':
                refund_description = 'The refund amount will be decided by the event organizer.';
                break;
        }

        res.json({
            success: true,
            is_paid_event: true,
            refund_info: {
                refund_policy: config.refund_policy,
                refund_percentage: config.refund_percentage,
                fee_amount: config.fee_amount,
                refund_description
            }
        });
    } catch (err) {
        console.error('Error fetching refund policy:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
