import SSLCommerzPayment from 'sslcommerz-lts';
import dotenv from 'dotenv';

dotenv.config();

const store_id = process.env.SSLCOMMERZ_STORE_ID;
const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD;
const is_live = process.env.SSLCOMMERZ_IS_LIVE === 'true';

/**
 * Initialize a payment session with SSLCommerz
 * @param {Object} params - Payment parameters
 * @param {string} params.tran_id - Unique transaction ID
 * @param {number} params.total_amount - Amount in BDT
 * @param {string} params.cus_name - Customer name
 * @param {string} params.cus_email - Customer email
 * @param {string} params.cus_phone - Customer phone
 * @param {string} params.product_name - Event title
 * @param {string} params.product_category - Event category
 * @returns {Promise<Object>} - SSLCommerz response with GatewayPageURL
 */
export const initPayment = async (params) => {
    const baseUrl = process.env.NGROK_URL || process.env.BASE_URL || 'http://localhost:5000';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const data = {
        total_amount: params.total_amount,
        currency: 'BDT',
        tran_id: params.tran_id,

        // Callback URLs (use ngrok for IPN, frontend for redirects)
        success_url: `${baseUrl}/api/payment/success`,
        fail_url: `${baseUrl}/api/payment/fail`,
        cancel_url: `${baseUrl}/api/payment/cancel`,
        ipn_url: `${baseUrl}/api/payment/ipn`,

        // Shipping (not applicable for events, but required by SSLCommerz)
        shipping_method: 'NO',
        product_name: params.product_name || 'Event Registration',
        product_category: params.product_category || 'Event',
        product_profile: 'non-physical-goods',

        // Customer info
        cus_name: params.cus_name || 'Participant',
        cus_email: params.cus_email || 'participant@example.com',
        cus_add1: params.cus_address || 'Bangladesh',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: params.cus_phone || '01700000000',

        // Optional: pass event/participant info as value fields
        value_a: params.event_id || '',      // event_id
        value_b: params.participant_id || '', // participant_id
        value_c: params.user_id || '',        // user_id
        value_d: frontendUrl,                 // frontend URL for redirect
    };

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);

    try {
        const apiResponse = await sslcz.init(data);
        return apiResponse;
    } catch (error) {
        console.error('SSLCommerz init error:', error);
        throw new Error('Failed to initialize payment gateway: ' + error.message);
    }
};

/**
 * Validate a transaction with SSLCommerz
 * @param {string} val_id - Validation ID from SSLCommerz callback
 * @returns {Promise<Object>} - Validation response
 */
export const validateTransaction = async (val_id) => {
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);

    try {
        const response = await sslcz.validate({ val_id });
        return response;
    } catch (error) {
        console.error('SSLCommerz validation error:', error);
        throw new Error('Failed to validate transaction: ' + error.message);
    }
};

/**
 * Initiate a refund via SSLCommerz
 * @param {string} bank_tran_id - Bank transaction ID from original payment
 * @param {number} refund_amount - Amount to refund
 * @param {string} refund_remarks - Reason for refund
 * @param {string} refe_id - Unique refund reference ID (we generate this)
 * @returns {Promise<Object>} - Refund response
 */
export const initiateRefund = async (bank_tran_id, refund_amount, refund_remarks = 'Refund', refe_id) => {
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);

    try {
        console.log('=== SSLCommerz Refund Request ===');
        console.log('bank_tran_id:', bank_tran_id);
        console.log('refund_amount:', refund_amount);
        console.log('refe_id:', refe_id);

        const response = await sslcz.initiateRefund({
            bank_tran_id,
            refund_amount,
            refund_remarks,
            refe_id: refe_id || `REF_${Date.now()}`
        });

        console.log('SSLCommerz Refund Response:', JSON.stringify(response, null, 2));

        // SSLCommerz refund API returns different status values
        // In sandbox: APIConnect can be 'DONE' or 'INVALID'
        // status can be 'success' or 'failed'
        return {
            status: response?.APIConnect === 'DONE' ? 'success' : 'failed',
            refund_ref_id: response?.bank_tran_id || null,
            raw_response: response,
            message: response?.errorReason || response?.status || 'Unknown'
        };
    } catch (error) {
        console.error('SSLCommerz refund error:', error);
        throw new Error('Failed to initiate refund: ' + error.message);
    }
};

/**
 * Check refund status
 * @param {string} refund_ref_id - Refund reference ID from initiateRefund
 * @returns {Promise<Object>} - Refund status response
 */
export const checkRefundStatus = async (refund_ref_id) => {
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);

    try {
        const response = await sslcz.refundQuery({ refund_ref_id });
        return response;
    } catch (error) {
        console.error('SSLCommerz refund query error:', error);
        throw new Error('Failed to check refund status: ' + error.message);
    }
};

/**
 * Generate a unique transaction ID
 * @param {string} eventId - Event UUID
 * @param {string} userId - User UUID
 * @returns {string} - Unique transaction ID
 */
export const generateTranId = (eventId, userId) => {
    const timestamp = Date.now();
    const shortEvent = eventId.substring(0, 8);
    const shortUser = userId.substring(0, 8);
    return `EC_${shortEvent}_${shortUser}_${timestamp}`;
};
