import React, { useState, useEffect, useContext } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import {
    FiDollarSign, FiTrendingUp, FiRefreshCw, FiUsers, FiSearch,
    FiFilter, FiDownload, FiArrowRight, FiCreditCard, FiCheckCircle,
    FiXCircle, FiClock, FiGift
} from 'react-icons/fi';
import AuthContext from '../../../providers/AuthContext';
import { API_ENDPOINTS } from '../../../config/api';
import axios from 'axios';

const OrganizerPaymentDashboard = () => {
    const { userData } = useContext(AuthContext);
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [txnLoading, setTxnLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        if (userData?.user_id) {
            fetchEvents();
        }
    }, [userData]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const response = await axios.get(API_ENDPOINTS.ORGANIZER_EVENTS_WITH_PARTICIPANTS(userData.user_id));
            if (response.data.success) {
                setEvents(response.data.events || []);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async (eventId) => {
        try {
            setTxnLoading(true);
            setSelectedEvent(eventId);
            const response = await axios.get(API_ENDPOINTS.PAYMENT_TRANSACTIONS(eventId));
            if (response.data.success) {
                setTransactions(response.data.transactions || []);
                setSummary(response.data.summary || null);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            toast.error('Failed to load transactions');
        } finally {
            setTxnLoading(false);
        }
    };

    const handleRefund = async (transactionId) => {
        if (!confirm('Are you sure you want to initiate a refund for this transaction?')) return;
        try {
            const response = await axios.post(API_ENDPOINTS.PAYMENT_REFUND(transactionId), {
                initiated_by: userData.user_id,
                reason: 'manual',
                reason_detail: 'Manual refund by organizer'
            });
            if (response.data?.refund_initiated) {
                toast.success(response.data.message || 'Refund initiated');
                fetchTransactions(selectedEvent);
            } else {
                toast(response.data?.message || 'No refund issued', { icon: 'ℹ️' });
            }
        } catch (err) {
            console.error('Refund error:', err);
            toast.error('Failed to process refund');
        }
    };

    const handleWaiver = async (participantId) => {
        if (!confirm('Waive the fee for this participant? They will be marked as paid without payment.')) return;
        try {
            const response = await axios.post(API_ENDPOINTS.PAYMENT_WAIVE(participantId), {
                waived_by: userData.user_id
            });
            if (response.data.success) {
                toast.success('Fee waived successfully');
                if (selectedEvent) fetchTransactions(selectedEvent);
            }
        } catch (err) {
            console.error('Waiver error:', err);
            toast.error('Failed to waive fee');
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <FiCheckCircle className="text-green-500" />;
            case 'refunded':
            case 'partially_refunded': return <FiRefreshCw className="text-blue-500" />;
            case 'failed': return <FiXCircle className="text-red-500" />;
            case 'initiated': return <FiClock className="text-yellow-500" />;
            case 'cancelled': return <FiXCircle className="text-gray-500" />;
            default: return <FiClock className="text-gray-400" />;
        }
    };

    const getStatusBadge = (status) => {
        const config = {
            completed: 'bg-green-100 text-green-700',
            refunded: 'bg-blue-100 text-blue-700',
            partially_refunded: 'bg-indigo-100 text-indigo-700',
            failed: 'bg-red-100 text-red-700',
            initiated: 'bg-yellow-100 text-yellow-700',
            cancelled: 'bg-gray-100 text-gray-600'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config[status] || 'bg-gray-100 text-gray-600'}`}>
                {status?.replace('_', ' ')}
            </span>
        );
    };

    const filteredTransactions = statusFilter === 'all'
        ? transactions
        : transactions.filter(t => t.status === statusFilter);

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-teal-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading payment dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-gray-900">Payment Dashboard</h2>
                <p className="text-gray-600 mt-1">Track payments, manage refunds, and view transaction history</p>
            </div>

            {/* Event Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiCreditCard className="text-teal-600" />
                    Select Event
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {events.map(event => (
                        <button
                            key={event.id}
                            onClick={() => fetchTransactions(event.id)}
                            className={`text-left p-4 rounded-xl border transition-all ${selectedEvent === event.id
                                    ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200'
                                    : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                                }`}
                        >
                            <h4 className="font-semibold text-gray-900 text-sm truncate">{event.title}</h4>
                            <p className="text-xs text-gray-500 mt-1">
                                {event.participant_count || 0} participants
                            </p>
                        </button>
                    ))}
                </div>

                {events.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No events found. Create a paid event to see transactions here.</p>
                )}
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-green-600 mb-2">
                            <FiTrendingUp size={18} />
                            <span className="text-sm font-medium">Total Revenue</span>
                        </div>
                        <p className="text-2xl font-bold text-green-800">৳{summary.total_revenue}</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-blue-600 mb-2">
                            <FiRefreshCw size={18} />
                            <span className="text-sm font-medium">Refunded</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-800">৳{summary.total_refunded}</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-purple-600 mb-2">
                            <FiDollarSign size={18} />
                            <span className="text-sm font-medium">Net Earnings</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-800">
                            ৳{(summary.total_revenue - summary.total_refunded).toFixed(2)}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-amber-600 mb-2">
                            <FiUsers size={18} />
                            <span className="text-sm font-medium">Transactions</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-800">{summary.total_transactions}</p>
                        <p className="text-xs text-amber-600 mt-1">
                            {summary.completed_count} paid · {summary.refunded_count} refunded · {summary.pending_count} pending
                        </p>
                    </div>
                </div>
            )}

            {/* Transaction Table */}
            {selectedEvent && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-gray-800">Transactions</h3>
                        <div className="flex gap-2 flex-wrap">
                            {['all', 'completed', 'refunded', 'initiated', 'failed'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${statusFilter === s
                                            ? 'bg-teal-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {s === 'all' ? 'All' : s.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {txnLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-teal-600"></div>
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <FiDollarSign size={40} className="mx-auto mb-3 text-gray-300" />
                            <p>No transactions found{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Participant</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Refund</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredTransactions.map(txn => (
                                        <tr key={txn.id} className="hover:bg-gray-50 transition">
                                            <td className="px-5 py-4">
                                                <p className="font-medium text-gray-900 text-sm">{txn.user_name || 'Unknown'}</p>
                                                <p className="text-xs text-gray-500">{txn.user_email || ''}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="font-semibold text-gray-900">
                                                    {txn.payment_method === 'fee_waiver' ? (
                                                        <span className="text-purple-600 flex items-center gap-1">
                                                            <FiGift size={14} /> Waived
                                                        </span>
                                                    ) : (
                                                        `৳${txn.amount}`
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-sm text-gray-600 capitalize">{txn.payment_method || '—'}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(txn.status)}
                                                    {getStatusBadge(txn.status)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-gray-500">
                                                {formatDate(txn.completed_at || txn.initiated_at)}
                                            </td>
                                            <td className="px-5 py-4">
                                                {txn.refund ? (
                                                    <div className="text-xs">
                                                        <span className="text-blue-600 font-medium">৳{txn.refund.refund_amount}</span>
                                                        <span className="text-gray-400 ml-1">({txn.refund.reason?.replace('_', ' ')})</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex gap-2">
                                                    {txn.status === 'completed' && !txn.refund && (
                                                        <button
                                                            onClick={() => handleRefund(txn.id)}
                                                            className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition"
                                                        >
                                                            Refund
                                                        </button>
                                                    )}
                                                    {txn.status === 'initiated' && txn.participant_id && (
                                                        <button
                                                            onClick={() => handleWaiver(txn.participant_id)}
                                                            className="px-3 py-1.5 bg-purple-50 text-purple-600 border border-purple-200 rounded-lg text-xs font-semibold hover:bg-purple-100 transition"
                                                        >
                                                            Waive Fee
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OrganizerPaymentDashboard;
