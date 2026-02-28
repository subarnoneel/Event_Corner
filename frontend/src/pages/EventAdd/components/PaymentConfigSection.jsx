import React from 'react';
import { FiDollarSign, FiShield, FiCreditCard } from 'react-icons/fi';

const PAYMENT_METHODS = [
    { id: 'bkash', label: 'bKash', icon: '📱' },
    { id: 'nagad', label: 'Nagad', icon: '📱' },
    { id: 'rocket', label: 'Rocket', icon: '📱' },
    { id: 'card', label: 'Visa/Master Card', icon: '💳' },
    { id: 'bank', label: 'Bank Transfer', icon: '🏦' },
];

const REFUND_POLICIES = [
    { value: 'full_refund', label: 'Full Refund', description: 'Participants get 100% refund on cancellation' },
    { value: 'partial_refund', label: 'Partial Refund', description: 'Participants get a percentage of their payment back' },
    { value: 'no_refund', label: 'No Refund', description: 'No refunds will be issued for cancellations' },
    { value: 'custom', label: 'Custom (Case by Case)', description: 'You decide the refund amount for each case' },
];

const PaymentConfigSection = ({ formData, setFormData }) => {
    const paymentConfig = formData.paymentConfig || {
        is_paid_event: false,
        fee_amount: '',
        fee_type: 'per_person',
        refund_policy: 'full_refund',
        refund_percentage: 100,
        accepted_methods: ['bkash', 'nagad', 'card', 'bank']
    };

    const updatePaymentConfig = (field, value) => {
        setFormData(prev => ({
            ...prev,
            paymentConfig: {
                ...prev.paymentConfig || paymentConfig,
                [field]: value
            }
        }));
    };

    const toggleMethod = (methodId) => {
        const current = paymentConfig.accepted_methods || [];
        const updated = current.includes(methodId)
            ? current.filter(m => m !== methodId)
            : [...current, methodId];
        updatePaymentConfig('accepted_methods', updated);
    };

    return (
        <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <FiDollarSign className="text-green-600" />
                Registration Fee & Payment
            </h2>

            {/* Toggle Paid Event */}
            <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={paymentConfig.is_paid_event || false}
                        onChange={(e) => updatePaymentConfig('is_paid_event', e.target.checked)}
                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500 cursor-pointer"
                    />
                    <div>
                        <span className="font-medium text-slate-800">Require Registration Fee</span>
                        <p className="text-sm text-slate-500">Enable to charge participants a fee when registering</p>
                    </div>
                </label>
            </div>

            {paymentConfig.is_paid_event && (
                <div className="space-y-6 border-t border-slate-200 pt-6">
                    {/* Fee Amount & Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Fee Amount (BDT) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">৳</span>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={paymentConfig.fee_amount || ''}
                                    onChange={(e) => updatePaymentConfig('fee_amount', e.target.value)}
                                    placeholder="500"
                                    className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Fee Type
                            </label>
                            <select
                                value={paymentConfig.fee_type || 'per_person'}
                                onChange={(e) => updatePaymentConfig('fee_type', e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                            >
                                <option value="per_person">Per Person</option>
                                <option value="per_team">Per Team</option>
                            </select>
                        </div>
                    </div>

                    {/* Refund Policy */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <FiShield className="text-blue-500" />
                            Refund Policy
                        </label>
                        <div className="space-y-2">
                            {REFUND_POLICIES.map(policy => (
                                <label
                                    key={policy.value}
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${paymentConfig.refund_policy === policy.value
                                            ? 'border-green-400 bg-green-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="refund_policy"
                                        value={policy.value}
                                        checked={paymentConfig.refund_policy === policy.value}
                                        onChange={(e) => updatePaymentConfig('refund_policy', e.target.value)}
                                        className="w-4 h-4 text-green-600 mt-0.5"
                                    />
                                    <div>
                                        <span className="font-medium text-slate-800">{policy.label}</span>
                                        <p className="text-sm text-slate-500">{policy.description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>

                        {/* Partial refund percentage */}
                        {paymentConfig.refund_policy === 'partial_refund' && (
                            <div className="mt-4 ml-7">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Refund Percentage
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="1"
                                        max="99"
                                        value={paymentConfig.refund_percentage || 80}
                                        onChange={(e) => updatePaymentConfig('refund_percentage', parseInt(e.target.value))}
                                        className="w-24 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                                    />
                                    <span className="text-slate-600">% of the registration fee</span>
                                </div>
                                {paymentConfig.fee_amount && (
                                    <p className="text-sm text-green-600 mt-1">
                                        Refund amount: ৳{((paymentConfig.fee_amount * (paymentConfig.refund_percentage || 80)) / 100).toFixed(2)}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Accepted Payment Methods */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <FiCreditCard className="text-purple-500" />
                            Accepted Payment Methods
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {PAYMENT_METHODS.map(method => (
                                <label
                                    key={method.id}
                                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${(paymentConfig.accepted_methods || []).includes(method.id)
                                            ? 'border-purple-400 bg-purple-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={(paymentConfig.accepted_methods || []).includes(method.id)}
                                        onChange={() => toggleMethod(method.id)}
                                        className="w-4 h-4 text-purple-600 rounded"
                                    />
                                    <span className="mr-1">{method.icon}</span>
                                    <span className="text-sm font-medium text-slate-700">{method.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Summary */}
                    {paymentConfig.fee_amount > 0 && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                            <h3 className="font-semibold text-green-800 mb-2">Payment Summary</h3>
                            <div className="space-y-1 text-sm text-green-700">
                                <p>💰 Fee: ৳{paymentConfig.fee_amount} {paymentConfig.fee_type === 'per_team' ? 'per team' : 'per person'}</p>
                                <p>🔄 Refund: {
                                    paymentConfig.refund_policy === 'full_refund' ? 'Full refund on cancellation' :
                                        paymentConfig.refund_policy === 'partial_refund' ? `${paymentConfig.refund_percentage}% refund on cancellation` :
                                            paymentConfig.refund_policy === 'no_refund' ? 'No refunds' :
                                                'Case-by-case decision'
                                }</p>
                                <p>💳 Methods: {(paymentConfig.accepted_methods || []).length} method(s) accepted</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PaymentConfigSection;
