import React, { useState, useEffect } from 'react';
import { FiAlertTriangle, FiX, FiUsers, FiDollarSign, FiMail, FiLoader } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/api';
import axios from 'axios';

/**
 * CancelEventModal — Shared modal for organizer/institution to cancel event
 * Props:
 *   eventId, eventTitle, userId, isOpen, onClose, onCancelled
 */
const CancelEventModal = ({ eventId, eventTitle, userId, isOpen, onClose, onCancelled }) => {
    const [reason, setReason] = useState('');
    const [notifyParticipants, setNotifyParticipants] = useState(true);
    const [preview, setPreview] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && eventId) {
            fetchPreview();
        }
        return () => {
            setReason('');
            setNotifyParticipants(true);
            setPreview(null);
        };
    }, [isOpen, eventId]);

    const fetchPreview = async () => {
        try {
            setLoadingPreview(true);
            const res = await axios.get(API_ENDPOINTS.CANCEL_EVENT_PREVIEW(eventId));
            if (res.data.success) {
                setPreview(res.data.preview);
            }
        } catch (err) {
            console.error('Failed to load preview:', err);
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleCancel = async () => {
        if (!reason.trim()) {
            toast.error('Please provide a cancellation reason');
            return;
        }

        try {
            setSubmitting(true);
            const res = await axios.post(API_ENDPOINTS.CANCEL_EVENT(eventId), {
                cancelled_by: userId,
                cancellation_reason: reason.trim(),
                notify_participants: notifyParticipants
            });

            if (res.data.success) {
                toast.success(
                    `Event cancelled! ${res.data.cancelled_count} registrations cancelled, ${res.data.refunded_count} refunds initiated (৳${res.data.refund_total}), ${res.data.emails_sent} emails sent.`,
                    { duration: 6000 }
                );
                onCancelled?.();
                onClose();
            } else {
                toast.error(res.data.error || 'Failed to cancel event');
            }
        } catch (err) {
            console.error('Cancellation error:', err);
            toast.error(err.response?.data?.error || 'Failed to cancel event');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-red-50 border-b border-red-100 p-6 rounded-t-2xl">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <FiAlertTriangle className="text-red-600" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-red-800">Cancel Event</h3>
                                <p className="text-sm text-red-600 mt-0.5">This action cannot be undone</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-red-100 rounded-lg transition"
                        >
                            <FiX size={20} className="text-red-400" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Event Name */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500">Event</p>
                        <p className="font-bold text-gray-900 text-lg">{eventTitle}</p>
                    </div>

                    {/* Impact Preview */}
                    {loadingPreview ? (
                        <div className="flex items-center justify-center py-6">
                            <FiLoader className="animate-spin text-gray-400" size={24} />
                            <span className="ml-2 text-gray-500 text-sm">Loading impact preview...</span>
                        </div>
                    ) : preview && (
                        <div className="border border-orange-200 bg-orange-50 rounded-lg p-4 space-y-3">
                            <p className="text-sm font-semibold text-orange-800">Cancellation Impact</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2">
                                    <FiUsers className="text-orange-600" size={16} />
                                    <div>
                                        <p className="text-xs text-orange-600">Registrations</p>
                                        <p className="font-bold text-orange-900">{preview.total_participants}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FiDollarSign className="text-orange-600" size={16} />
                                    <div>
                                        <p className="text-xs text-orange-600">Refund Amount</p>
                                        <p className="font-bold text-orange-900">৳{preview.total_refund_amount}</p>
                                    </div>
                                </div>
                            </div>
                            {preview.paid_participants > 0 && (
                                <p className="text-xs text-orange-700">
                                    {preview.paid_participants} paid participant{preview.paid_participants !== 1 ? 's' : ''} will receive a <strong>full refund</strong>
                                </p>
                            )}
                        </div>
                    )}

                    {/* Cancellation Reason */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Cancellation Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Explain why you are cancelling this event..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 transition text-sm resize-none"
                            rows={3}
                        />
                    </div>

                    {/* Notify Participants */}
                    <label className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition">
                        <input
                            type="checkbox"
                            checked={notifyParticipants}
                            onChange={(e) => setNotifyParticipants(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div>
                            <div className="flex items-center gap-1.5">
                                <FiMail className="text-blue-600" size={14} />
                                <span className="text-sm font-semibold text-blue-800">Notify participants via email</span>
                            </div>
                            <p className="text-xs text-blue-600 mt-0.5">
                                {preview ? `${preview.total_participants} participant${preview.total_participants !== 1 ? 's' : ''} will be notified` : 'All registered participants will receive an email'}
                            </p>
                        </div>
                    </label>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-6 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        Go Back
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={submitting || !reason.trim()}
                        className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <FiLoader className="animate-spin" size={16} />
                                Cancelling...
                            </>
                        ) : (
                            <>
                                <FiAlertTriangle size={16} />
                                Cancel Event
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CancelEventModal;
