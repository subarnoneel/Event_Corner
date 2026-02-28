import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiCheckCircle, FiArrowLeft, FiCopy } from 'react-icons/fi';
import { toast, Toaster } from 'react-hot-toast';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const tranId = searchParams.get('tran_id');
    const eventId = searchParams.get('event_id');
    const [copied, setCopied] = useState(false);

    const copyTranId = () => {
        if (tranId) {
            navigator.clipboard.writeText(tranId);
            setCopied(true);
            toast.success('Transaction ID copied!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
            <Toaster position="top-right" />
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                {/* Success Icon */}
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                    <FiCheckCircle size={40} className="text-green-600" />
                </div>

                <h1 className="text-2xl font-bold text-green-800 mb-2">Payment Successful!</h1>
                <p className="text-gray-600 mb-6">
                    Your payment has been received. Your registration is now pending organizer approval.
                </p>

                {/* Transaction Details */}
                {tranId && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-500 mb-1">Transaction ID</p>
                        <div className="flex items-center justify-center gap-2">
                            <code className="text-sm font-mono text-gray-800 bg-gray-200 px-3 py-1 rounded">
                                {tranId}
                            </code>
                            <button
                                onClick={copyTranId}
                                className="p-1.5 text-gray-500 hover:text-gray-700 transition"
                                title="Copy"
                            >
                                <FiCopy size={16} />
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Save this for your records</p>
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                    {eventId && (
                        <Link
                            to={`/event/${eventId}`}
                            className="block w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition"
                        >
                            View Event Details
                        </Link>
                    )}
                    <Link
                        to="/"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
                    >
                        <FiArrowLeft size={16} />
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
