import React from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { FiXCircle, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';

const PaymentFail = () => {
    const [searchParams] = useSearchParams();
    const tranId = searchParams.get('tran_id');
    const eventId = searchParams.get('event_id');
    const isCancelled = searchParams.get('cancelled') === 'true';
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                {/* Fail Icon */}
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FiXCircle size={40} className="text-red-500" />
                </div>

                <h1 className="text-2xl font-bold text-red-800 mb-2">
                    {isCancelled ? 'Payment Cancelled' : 'Payment Failed'}
                </h1>
                <p className="text-gray-600 mb-6">
                    {isCancelled
                        ? 'You cancelled the payment. No charges have been made to your account.'
                        : 'Something went wrong with your payment. Please try again or use a different payment method.'}
                </p>

                {tranId && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-500 mb-1">Reference</p>
                        <code className="text-sm font-mono text-gray-800 bg-gray-200 px-3 py-1 rounded">
                            {tranId}
                        </code>
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                    {eventId && (
                        <Link
                            to={`/event/${eventId}/register`}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition"
                        >
                            <FiRefreshCw size={16} />
                            Try Again
                        </Link>
                    )}
                    {eventId && (
                        <Link
                            to={`/event/${eventId}`}
                            className="block w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
                        >
                            View Event Details
                        </Link>
                    )}
                    <Link
                        to="/"
                        className="flex items-center justify-center gap-2 w-full py-3 text-gray-500 hover:text-gray-700 transition"
                    >
                        <FiArrowLeft size={16} />
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PaymentFail;
