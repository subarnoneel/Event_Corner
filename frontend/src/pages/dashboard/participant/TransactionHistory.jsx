import React, { useState, useEffect, useContext } from 'react';
import {
    FiDollarSign, FiCreditCard, FiCheckCircle, FiXCircle,
    FiClock, FiRefreshCw, FiGift, FiExternalLink, FiFilter
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AuthContext from '../../../providers/AuthContext';
import { API_ENDPOINTS } from '../../../config/api';
import axios from 'axios';

const TransactionHistory = () => {
    const { userData } = useContext(AuthContext);
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        if (userData?.user_id) {
            fetchTransactions();
        }
    }, [userData]);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const response = await axios.get(API_ENDPOINTS.PAYMENT_USER_TRANSACTIONS(userData.user_id));
            if (response.data.success) {
                setTransactions(response.data.transactions || []);
                setSummary(response.data.summary || null);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            toast.error('Failed to load transaction history');
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <FiCheckCircle className="text-green-500" size={16} />;
            case 'refunded':
            case 'partially_refunded': return <FiRefreshCw className="text-blue-500" size={16} />;
            case 'failed': return <FiXCircle className="text-red-500" size={16} />;
            case 'cancelled': return <FiXCircle className="text-gray-400" size={16} />;
            default: return <FiClock className="text-yellow-500" size={16} />;
        }
    };

    const getStatusBadge = (status) => {
        const config = {
            completed: { bg: 'bg-green-100 text-green-700', label: 'Paid' },
            refunded: { bg: 'bg-blue-100 text-blue-700', label: 'Refunded' },
            partially_refunded: { bg: 'bg-indigo-100 text-indigo-700', label: 'Partial Refund' },
            failed: { bg: 'bg-red-100 text-red-700', label: 'Failed' },
            initiated: { bg: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
            cancelled: { bg: 'bg-gray-100 text-gray-600', label: 'Cancelled' },
        };
        const c = config[status] || config.initiated;
        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg}`}>
                {getStatusIcon(status)}
                {c.label}
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: true
        });
    };

    const filteredTransactions = statusFilter === 'all'
        ? transactions
        : transactions.filter(t => t.status === statusFilter);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-teal-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading transaction history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-gray-900">Payment History</h2>
                <p className="text-gray-600 mt-1">View all your event payment transactions and refunds</p>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-teal-600 mb-1">
                            <FiDollarSign size={16} />
                            <span className="text-xs font-medium">Total Spent</span>
                        </div>
                        <p className="text-2xl font-bold text-teal-800">৳{summary.total_spent || summary.total_revenue || 0}</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <FiRefreshCw size={16} />
                            <span className="text-xs font-medium">Refunded</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-800">৳{summary.total_refunded || 0}</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                            <FiCheckCircle size={16} />
                            <span className="text-xs font-medium">Successful</span>
                        </div>
                        <p className="text-2xl font-bold text-green-800">{summary.completed_count || 0}</p>
                    </div>

                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <FiCreditCard size={16} />
                            <span className="text-xs font-medium">Total</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-800">{summary.total_transactions || transactions.length}</p>
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <div className="flex gap-2 flex-wrap">
                {['all', 'completed', 'refunded', 'initiated', 'failed', 'cancelled'].map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${statusFilter === s
                                ? 'bg-teal-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Transaction List */}
            {filteredTransactions.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
                    <FiDollarSign className="mx-auto text-gray-300 mb-4" size={48} />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Transactions Found</h3>
                    <p className="text-gray-600 mb-6">
                        {statusFilter === 'all'
                            ? "You haven't made any payments yet."
                            : `No transactions with status "${statusFilter}".`}
                    </p>
                    <button
                        onClick={() => navigate('/events')}
                        className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition"
                    >
                        Explore Events
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredTransactions.map((txn) => (
                        <div
                            key={txn.id}
                            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Left: Event info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-teal-100 rounded-lg flex-shrink-0">
                                            {txn.payment_method === 'fee_waiver' ? (
                                                <FiGift className="text-purple-600" size={18} />
                                            ) : (
                                                <FiCreditCard className="text-teal-600" size={18} />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-semibold text-gray-900 truncate">
                                                {txn.event_title || 'Event Payment'}
                                            </h4>
                                            <p className="text-xs text-gray-500 truncate">
                                                Transaction: {txn.tran_id || txn.id?.substring(0, 12)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Middle: Amount + Method */}
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-gray-900">
                                            {txn.payment_method === 'fee_waiver' ? (
                                                <span className="text-purple-600">Waived</span>
                                            ) : (
                                                `৳${txn.amount}`
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">{txn.payment_method || '—'}</p>
                                    </div>

                                    {/* Status Badge */}
                                    {getStatusBadge(txn.status)}
                                </div>

                                {/* Right: Date + Action */}
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-sm text-gray-700">{formatDate(txn.completed_at || txn.initiated_at)}</p>
                                        <p className="text-xs text-gray-400">{formatTime(txn.completed_at || txn.initiated_at)}</p>
                                    </div>
                                    {txn.event_id && (
                                        <button
                                            onClick={() => navigate(`/event/${txn.event_id}`)}
                                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                                            title="View Event"
                                        >
                                            <FiExternalLink size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Refund Info */}
                            {(txn.status === 'refunded' || txn.status === 'partially_refunded') && txn.refund && (
                                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                                    <FiRefreshCw className="text-blue-500" size={14} />
                                    <span className="text-sm text-blue-700">
                                        ৳{txn.refund.refund_amount} refunded
                                        {txn.refund.reason && ` — ${txn.refund.reason.replace(/_/g, ' ')}`}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TransactionHistory;
